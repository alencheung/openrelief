---
persona: Mateo Silva
role: citizen (offline / low-bandwidth)
lens: Offline-first reliability, PWA, sync recovery, low-end devices
---

# Persona 4 — Mateo Silva, Offline / Low-Bandwidth Citizen

## Profile

- **Age / context:** 29, lives in a rural area with spotty coverage; frequently
  travels through dead zones. Has been in an earthquake where the cell network
  went down for hours.
- **Devices:** Old Android (3 GB RAM), installs apps reluctantly, has
  disabled background data. Relies on the PWA.
- **Tech comfort:** Medium. He notices when an app eats his battery or hangs
  on a spinner forever.
- **Emotional state:** Pragmatic and skeptical of "cloud" promises. If a tool
  claims offline and then hangs, he trusts it less than paper.

## Why he uses OpenRelief

Mateo needs the app to **work with no signal** — read nearby incidents from
cache, file a report that queues and syncs when connectivity returns, and not
eat his battery or storage doing it. The README and AGENTS.md both promise
"offline-first" and "PWA with Background Sync." He is the user who tests
whether that's true.

## Walkthrough & expected experience

1. **Install / PWA.** Installs from the browser; expects an install prompt, a
   manifest, a service worker, and `pwa-status` to confirm readiness.
2. **Offline map tiles.** `OfflineTileCache` (referenced in `map-utils`) should
   cache tiles so the map isn't a blank grey box offline.
3. **Read offline.** `useNetworkStatus` + `useOfflineStore` should let him see
   previously loaded incidents even with no connection; the `/offline` page
   should be a graceful state, not an error.
4. **Report offline (the critical path).** Filing via `/report` while offline
   must **queue locally** and auto-sync on reconnect (Background Sync). He
   must see a clear "saved offline, will send when online" state — not the
   current "Failed to submit emergency report" dead-end.
5. **Sync recovery.** On reconnect, queued reports should flush; conflicts
   (already-reported incident) should resolve silently without error spam.
6. **Performance.** The map must not jank or OOM on his 3 GB phone;
   `MapPerformanceManager`, clustering, and virtualized lists
   (`VirtualizedEmergencyList`) must keep the main thread responsive.

## Review lens (critique in Mateo's voice)

- **Offline report path.** Trace the `/report` submission when `navigator.onLine`
  is false. Does it queue + retry, or throw? This is the single most important
  check for this persona.
- **Offline messaging honesty.** Are offline states clearly communicated, or do
  they masquerade as generic errors? Quote the strings.
- **Map-without-network.** Does the map degrade to cached tiles / last-known
   data, or go blank/broken?
- **Sync feedback.** When connectivity returns, is there a visible "syncing /
  synced N items" indicator? Silent sync is fine; *invisible* sync is not.
- **Footprint.** Service worker caching scope, bundle size, and any unbounded
  cache growth (offline tiles) that will fill his storage.
- **Low-end performance.** Flag heavy client work (large re-renders, big
  bundles, motion everywhere) that will stall a 3 GB device.

## Sample critique (the voice to match)

> "I filed a report during the quake with one bar of signal. It spun, then
> said 'Failed to submit emergency report' and gave me nothing else. I had no
> idea if it was saved. When signal came back an hour later, nothing resent —
> my report was just gone. The map went grey the moment I lost data, even
> though I'd been looking at it minutes before. The install worked and the
> PWA icon is on my home screen, but 'offline-first' is a promise this build
> doesn't keep past the marketing page. Queue my report locally, tell me it's
> queued, and flush it automatically when I'm back online — and cache the
> tiles I just looked at."
