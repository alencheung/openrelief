# Trust & Consensus

> This documents the **as-built** trust scoring and consensus algorithms.
> These run primarily as PostgreSQL functions (see
> [`../database/schema.md`](../database/schema.md) for the DDL) and are
> extended by application logic in `src/lib/security/` and `src/store/`.

OpenRelief resists Sybil attacks, false reporting, and alarm fatigue through
two coupled mechanisms: a **per-user trust score** and an **event-level
consensus threshold**.

## Trust Score

Every user has a `trust_score` in the range **0.0–1.0**, enforced by a CHECK
constraint. New users start at **0.1** (a deliberate "low trust" baseline so
fresh accounts have limited power until they build a track record).

The score affects:

- **Rate-limit thresholds** — higher-trust users get more lenient limits.
- **Voting weight** — a confirmation from a high-trust user counts for more.
- **Feature access** — certain actions require a minimum trust floor.

### Calculation

The `calculate_trust_score(user_id)` function computes the score from two
factors:

$$\text{score} = \text{base} + (\text{accuracyBonus} \times \text{recencyMultiplier})$$

- **Base**: `0.1`
- **Accuracy bonus** — averaged over the user's reports from the last 30 days:
  - `+0.1` per report that was `resolved` by someone else (confirmed accurate)
  - `-0.05` per report that `expired` (likely false/unconfirmed)
  - `0` otherwise
- **Recency multiplier** — based on days since the user's last activity:
  - `< 7 days` → `1.2` (active-user bonus)
  - `7–30 days` → `1.0` (normal)
  - `> 30 days` → `0.3` (inactive penalty)
  - `never` → `0.5` (new-user penalty)

The final score is clamped to **[0.0, 1.0]**.

### When it updates

Trust scores recalculate via a trigger whenever an `event_confirmations` row is
inserted, updated, or deleted. Batched recomputation also runs through the
`trust_recompute_work` queue table (added in `20240620000001_batched_consensus.sql`).

### Application-layer extensions

Beyond the DB function, `src/lib/security/trust-integration.ts` (and helpers)
integrate trust into API decisions, and `src/lib/security/sybil-*` modules add
behavioral, geographic, and network-cluster analysis to detect and suppress
Sybil-style attacks. `src/store/trustStore.ts` holds the client-side trust
cache.

## Consensus Engine

A freshly reported event has `status = 'pending'` and is **not** broadly
visible. It only becomes an active, dispatched alert once corroborated.

### The threshold

The `calculate_event_consensus(event_id)` function sums the trust-weighted
confirmations for an event:

$$V_{total} = \sum_{i} \big(\text{trust\_score}_i \times w_{decay}\big)$$

with time decay on each confirmation:

| Confirmation age | Weight |
| --- | --- |
| `< 30 minutes` | `1.0` |
| `30 min – 1 hour` | `0.8` |
| `1 – 2 hours` | `0.6` |
| `> 2 hours` | `0.4` |

When `V_total` reaches the **threshold of 5.0**, the event promotes from
`pending` to `active` and the function fires `pg_notify('event_activated', ...)`,
which Supabase Realtime relays to subscribed clients (the map updates live).

Disputes count negatively; if the weighted sum drops below `-5.0`, an active
event can demote back to `pending`.

### Why this resists Sybil attacks

An attacker would need to either (a) accumulate genuine trust across many
accounts — which the recency and accuracy factors make expensive — or (b)
create many low-trust accounts, whose combined weight (each ≤ 0.1) still can't
cheaply reach 5.0. The Sybil-detection modules in `src/lib/security/` add
further behavioral and network-graph defenses.

## Alert Dispatch & Relevance (Fatigue Guard)

Once an event is active, `get_users_for_alert_dispatch(event_id, max_distance)`
finds nearby, subscribed users using a **PostGIS spatial query** and ranks them
by an inverse-square relevance score:

$$R = \frac{S_{event}}{1 + (d / 500)^2}$$

- `S` = event severity (1–5)
- `d` = distance in meters from the user to the event
- `500m` = half-value distance (the point where relevance halves)

This formula has two important properties:

1. **Natural attenuation** — alerts grow less relevant with distance, so users
   far away aren't spammed.
2. **No singularity** — the `+1` term keeps relevance finite even at `d = 0`,
   unlike a raw inverse-square.

The dispatch query also respects per-user **mutes** (`user_mutes` table) and
subscription radii, so opted-out or quiet-hours users aren't disturbed.

## Performance

- Spatial filtering is **O(log N)** thanks to GIST indexes — the dispatch
  query typically completes in **under 100ms** even at 50K+ concurrent users.
- Consensus runs in a trigger, so it's synchronous with confirmation inserts —
  no separate job needed for the common case.
- Batched trust recomputation (`trust_recompute_work` queue) prevents
  thundering-herd recalculation under load.

## Related Code

| Component | Location |
| --- | --- |
| Trust score function | `supabase/migrations/20240101000004_database_functions.sql` |
| Consensus function | same |
| Spatial dispatch function | `supabase/migrations/20240115000010_spatial_functions.sql` |
| Trust triggers | `20240101000006_database_triggers.sql` |
| Trust integration (app) | `src/lib/security/trust-integration.ts` |
| Sybil detection | `src/lib/security/sybil-detection.ts`, `sybil-prevention.ts` |
| Trust store (client) | `src/store/trustStore.ts` |
| Trust queries (hooks) | `src/hooks/queries/useUserQueries.ts` |
