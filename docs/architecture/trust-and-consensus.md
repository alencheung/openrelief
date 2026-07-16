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
- **Accuracy bonus** — computed over the user's reports from the last 30 days:
  - First, an **accuracy ratio**: `(resolved-by-others reports / total reports) × 0.3`
    rewards reporters whose submissions are corroborated and resolved by others.
  - That ratio is then **overwritten** by a per-report penalty sum: `-0.1` for
    each report whose `dispute_count > confirmation_count`, and `-0.05` for each
    report that `expired` (likely false/unconfirmed). Reports that are neither
    disputed-nor-expired contribute `0` to the penalty sum.
  - (This overwrite is a known quirk of the as-built `calculate_trust_score`
    function: the positive ratio does not stack with the penalty sum — the
    penalty branch replaces it.)
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

Disputes are summed with the same time-decay into a separate `dispute_weight`.
If an event is already `active` and its `dispute_weight` alone reaches the **5.0
threshold**, the event demotes back to `pending` (its displayed weight becomes
`V_total − dispute_weight`). There is no negative-net logic — demotion is driven
purely by dispute weight hitting the same 5.0 bar.

### Why this resists Sybil attacks

An attacker would need to either (a) accumulate genuine trust across many
accounts — which the recency and accuracy factors make expensive — or (b)
create many low-trust accounts, whose combined weight (each ≤ 0.1) still can't
cheaply reach 5.0. The Sybil-detection modules in `src/lib/security/` add
further behavioral and network-graph defenses.

## Alert Dispatch & Relevance (Fatigue Guard)

Once an event is active, `get_users_for_alert_dispatch(event_id, max_distance)`
finds nearby, subscribed users using a **PostGIS spatial query** and ranks them
by a stepped relevance score:

$$R = S_{event} \times \text{trust\_score} \times f(d)$$

where the distance factor `f(d)` is a stepped bucket function (not a smooth
curve):

| Distance `d` | Factor `f(d)` |
| --- | --- |
| `< 1000 m` | `1.0` |
| `1000 – 5000 m` | `0.7` |
| `> 5000 m` | `0.4` |

- `S` = event severity (integer)
- `trust_score` = the recipient's own trust score, so higher-trust responders
  are prioritized for a given event
- `d` = distance in meters from the user to the event

This gives **natural attenuation** — alerts grow less relevant with distance, so
users far away aren't spammed — while keeping the computation cheap (a `CASE`
expression over GIST-indexed distance buckets).

The dispatch query also respects per-user preferences: it only returns users
whose `user_subscriptions` match the event type and are active, whose
`user_notification_settings` are enabled for that type with severity ≥ their
`min_severity` and distance ≤ their `max_distance`, and who are outside their
configured **quiet hours**. (There is no separate `user_mutes` table; muting is
expressed via `user_notification_settings.is_enabled` and quiet-hours windows.)

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
| Spatial dispatch function | `supabase/migrations/20240101000004_database_functions.sql` (`get_users_for_alert_dispatch`) |
| Trust triggers | `20240101000006_database_triggers.sql` |
| Trust integration (app) | `src/lib/security/trust-integration.ts` |
| Sybil detection | `src/lib/security/sybil-detection.ts`, `sybil-prevention.ts` |
| Trust store (client) | `src/store/trustStore.ts` |
| Trust queries (hooks) | `src/hooks/queries/useUserQueries.ts` |
