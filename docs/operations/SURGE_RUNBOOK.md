# Surge Runbook — Major-Emergency Traffic Spike

> **When to use this runbook:** a real-world mass-casualty event (earthquake,
> flood, large-scale incident) is expected to drive a 5–10× traffic surge in
> 30 minutes or less. Target: absorb 100K+ concurrent users without losing
> victim reports.

This is an **SRE runbook**, not a user-facing first-aid guide. For community
first-aid see `docs/emergency-procedures/EMERGENCY_RESPONSE_GUIDE.md`.

---

## 0. Severity classification

| SEV | Trigger | Response |
|-----|---------|----------|
| **SEV-1** | Predicted or active surge > 100K concurrent users, or live incident with elevated error rate | Page on-call SRE + product lead immediately. Open incident channel. |
| **SEV-2** | Surge 30K–100K, or p95 latency > 1.5s sustained | On-call SRE acknowledges within 15 min. |
| **SEV-3** | Surge 10K–30K, monitoring only | Watch dashboards; no action unless thresholds breach. |

---

## 1. Pre-event (predictive — e.g. major storm forecast, planned event)

Do these as soon as a surge is anticipated, before traffic arrives.

1. **Scale the app tier.**
   - Vercel: confirm the project is on a plan that allows the needed
     concurrency; pre-warm by raising `maxDuration` on critical routes if
     needed.
   - Confirm the Cloudflare dispatch worker quota can absorb the expected
     `emergency_report` rate. Raise the per-worker limit in
     `wrangler.production.toml` (`max_requests_per_minute`) if the forecast
     exceeds 1000 req/min — a single worker is hard-capped there.

2. **Enable emergency mode (rate-limit override).**
   - Set the feature flag / env var that flips `checkEmergencyMode()` to
     `true` in `src/middleware.ts`. This RAISES the victim-facing rate
     limits (emergency + auth tiers) per the corrected
     `RATE_LIMIT_TIERS.emergencyModeMultiplier` in
     `src/lib/redis/rate-limiter.ts`. **Verify it raises, not lowers** —
     the original logic cut limits during emergencies and was reverted.
   - Confirm Redis (Upstash) is healthy — the limiter degrades to
     per-instance in-memory limits when Redis is unreachable, which
     over-counts under multi-instance deploys.

3. **Database capacity.**
   - Confirm Supavisor transaction pooling is in front of Postgres (port
     6543, transaction mode). See `docs/deployment/DATABASE_POOLING.md`.
   - Check `max_connections` headroom:
     ```sql
     SELECT count(*), state FROM pg_stat_activity GROUP BY state;
     ```
   - Run `SELECT ensure_monthly_partitions('notification_queue_partitioned', 3);`
     to guarantee the next 3 months of partitions exist.
   - Confirm `pg_cron` jobs for `drain_consensus_work` /
     `drain_trust_recompute_work` are scheduled and have run recently.

4. **Map tile capacity.**
   - Confirm `NEXT_PUBLIC_MAPTILER_API_KEY` (or self-hosted tile server) is
     configured and its quota can absorb the surge. Without it the map
     falls back to `demotiles.maplibre.org`, which is rate-limited and not
     production-grade — the map will 429 and go blank.

5. **Notify.**
   - Inform the on-call SRE rotation and product lead.
   - If a partner emergency service integration exists, notify them that
     report volume will spike.

---

## 2. During the surge (live)

### Dashboards to watch
- `/api/health` uptime + latency
- `http_req_failed` rate (target < 1%)
- p95 latency for `/api/emergency` GET and POST
- Supabase: connection count, active queries, slow-query log
- Realtime: channel count and message rate (should be flat thanks to the
  shared-channel registry — if it climbs linearly with users, a subscriber
  is opening per-client channels again; see
  `src/lib/realtime/shared-channels.ts` and `getSharedChannelStats()`)
- Redis (Upstash): `openrelief:*` key count and request rate
- Cloudflare Worker: dispatch invocations, CPU time, errors

### If error rate climbs

1. **Check the backend health circuit.** If `recoverFromError` has tripped
   it (every client now short-circuits and suppresses error reports), the
   underlying issue is upstream. Look at Postgres/Supabase first.
2. **Confirm rate limits aren't throttling victims.** Emergency mode
   should be ON. Spot-check:
   ```bash
   curl -I https://app.openrelief.org/api/emergency
   # X-RateLimit-Remaining should be high; victims should NOT see 429
   ```
3. **If Postgres is saturated:** scale the Supavisor pool size, confirm
   no long-running queries are blocking (check `pg_stat_activity` for
   `state = 'active'` with old `query_start`). The batched consensus
   drain should be the only heavy periodic job.
4. **If Realtime is saturated:** the shared-channel registry should keep
   channel count bounded. If not, an emergency rollback to disable the
   `useUserProfilesSubscription` location fan-out is the fastest relief.

### Losing victim reports is unacceptable. If you must shed load:
- Disable non-critical reads (analytics, user-profile polling) FIRST.
- Keep `/api/emergency` POST on the highest-capacity path.
- The offline queue (`src/store/offlineStore.ts`) is now backed by real
  network sync (`src/lib/offline/sync-executor.ts`); clients offline will
  replay reports when connectivity returns. Verify the SW background-sync
  tag `emergency-offline-sync` is registered.

---

## 3. After the surge

1. **Drain the consensus/trust queues.**
   ```sql
   SELECT drain_consensus_work(2000);
   SELECT drain_trust_recompute_work(2000);
   ```
   Repeat until both return 0. This catches up any recomputation that
   lagged behind the write rate during the surge.

2. **Review the surge-report.** Run or retrieve the k6 summary from
   `tests/load/surge-report.json` for a comparable load test against the
   post-surge codebase.

3. **File follow-ups** for any threshold that breached during the run.

4. **Post-incident review** if SEV-1. Cover: detection time, mitigation
   taken, what broke that this runbook didn't anticipate.

---

## 4. Quick verification commands

```bash
# Health
curl -fsS https://app.openrelief.org/api/health | jq

# Emergency mode is ON (limits should be RAISED)
curl -sS -D - https://app.openrelief.org/api/emergency -o /dev/null | grep -i ratelimit

# Realtime channel cardinality is bounded (run in browser console)
import('/src/lib/realtime/shared-channels').then(m => console.log(m.getSharedChannelStats()))
```

```sql
-- Queue depth after a surge
SELECT
  (SELECT count(*) FROM consensus_work WHERE processed_at IS NULL) AS consensus_pending,
  (SELECT count(*) FROM trust_recompute_work WHERE processed_at IS NULL) AS trust_pending,
  (SELECT count(*) FROM pg_stat_activity WHERE state = 'active') AS active_backends;
```
