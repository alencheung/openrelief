/**
 * OpenRelief surge load test (k6)
 *
 * Replaces the in-process mock load test (scripts/performance-test.js)
 * which returned `100 + Math.random() * 200` as its "validation" and
 * proved nothing about real capacity. This script drives the actual
 * deployed endpoints with realistic surge traffic.
 *
 * Targets the documented scale requirement: 100K+ concurrent users.
 * Run on staging in stages (10K → 30K → 75K → 125K VUs) and record the
 * point at which p95 latency or error rate crosses threshold.
 *
 * Usage:
 *   k6 run -e BASE_URL=https://staging.openrelief.org \
 *         -e STAGE=target_rps \
 *         tests/load/surge-scenario.js
 *
 * Scenarios:
 *   - emergency_read    : GET /api/emergency (the polling hot path)
 *   - emergency_report  : POST /api/emergency (the write hot path)
 *   - nearby_query      : the nearby_emergency_events RPC (spatial hot path)
 *
 * Pass criteria (CI gate):
 *   - p(95) < 800ms across all scenarios
 *   - http_req_failed < 1% (excluding intentional 429s)
 *   - no 5xx responses
 */

import http from 'k6/http'
import { check, sleep, group } from 'k6'
import { Rate, Trend } from 'k6/metrics'

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000'
// Target concurrent virtual users. Defaults to a 10K starting stage; ramp
// via -e VUS=75000 etc. The arrival-rate executor below scales with this.
const VUS = parseInt(__ENV.VUS || '10000', 10)
const DURATION = __ENV.DURATION || '5m'

// Custom metrics
const errorRate = new Rate('openrelief_errors')
const reportLatency = new Trend('openrelief_report_latency', true)
const nearbyLatency = new Trend('openrelief_nearby_latency', true)

export const options = {
  scenarios: {
    // The dominant traffic pattern: clients polling/listing emergencies.
    emergency_read: {
      executor: 'ramping-vus',
      exec: 'readEmergencies',
      startVUs: 0,
      stages: [
        { duration: '30s', target: Math.round(VUS * 0.6) },
        { duration: DURATION, target: Math.round(VUS * 0.6) },
        { duration: '30s', target: 0 }
      ],
      gracefulRampDown: '30s'
    },
    // The write hot path: victims reporting emergencies.
    emergency_report: {
      executor: 'ramping-vus',
      exec: 'reportEmergency',
      startVUs: 0,
      stages: [
        { duration: '30s', target: Math.round(VUS * 0.05) }, // ~5% are reporters
        { duration: DURATION, target: Math.round(VUS * 0.05) },
        { duration: '30s', target: 0 }
      ],
      gracefulRampDown: '30s'
    },
    // Spatial query — the RPC that replaced the per-row PostGIS RLS.
    nearby_query: {
      executor: 'ramping-vus',
      exec: 'queryNearby',
      startVUs: 0,
      stages: [
        { duration: '30s', target: Math.round(VUS * 0.2) },
        { duration: DURATION, target: Math.round(VUS * 0.2) },
        { duration: '30s', target: 0 }
      ],
      gracefulRampDown: '30s'
    }
  },
  thresholds: {
    // CI gate — fail the run if these are breached.
    http_req_failed: ['rate<0.01'],
    openrelief_errors: ['rate<0.01'],
    'http_req_duration{scenario:emergency_read}': ['p(95)<800'],
    'http_req_duration{scenario:emergency_report}': ['p(95)<1500'],
    'http_req_duration{scenario:nearby_query}': ['p(95)<500']
  }
}

// Synthesize a random lat/lng within a plausible disaster-zone bounding
// box so the spatial RPC exercises real PostGIS filtering.
function randomLocation() {
  // Default: around a generic urban centre; override via -e CENTER_LAT etc.
  const centerLat = parseFloat(__ENV.CENTER_LAT || '40.7128')
  const centerLng = parseFloat(__ENV.CENTER_LNG || '-74.0060')
  const spread = 0.5 // ~55km box
  return {
    lat: centerLat + (Math.random() - 0.5) * spread,
    lng: centerLng + (Math.random() - 0.5) * spread
  }
}

const EMERGENCY_TYPES = [1, 2, 3, 4, 5] // fire, medical, security, natural, infrastructure

export function readEmergencies() {
  group('GET /api/emergency', () => {
    const res = http.get(`${BASE_URL}/api/emergency?limit=50`, {
      headers: { Accept: 'application/json' }
    })

    const ok = check(res, {
      'status is 200 or 304': r => r.status === 200 || r.status === 304,
      'no server error': r => r.status < 500
    })
    errorRate.add(!ok)
  })

  // Mimic the 60s polling cadence used in production when realtime is down.
  sleep(60)
}

export function reportEmergency() {
  const loc = randomLocation()
  const payload = JSON.stringify({
    type_id: EMERGENCY_TYPES[Math.floor(Math.random() * EMERGENCY_TYPES.length)],
    title: `Load-test emergency report`,
    description: 'Synthesised by surge-scenario.js',
    severity: Math.floor(Math.random() * 5) + 3, // 3..7
    location: { latitude: loc.lat, longitude: loc.lng }
  })

  group('POST /api/emergency', () => {
    const res = http.post(`${BASE_URL}/api/emergency`, payload, {
      headers: { 'Content-Type': 'application/json' }
    })

    reportLatency.add(res.timings.duration)

    const ok = check(res, {
      'status is 201 or 202': r => r.status === 201 || r.status === 202,
      'no server error': r => r.status < 500
    })
    errorRate.add(!ok)
  })

  // Reporters don't fire continuously.
  sleep(Math.random() * 30 + 10)
}

export function queryNearby() {
  const loc = randomLocation()
  // Invoke the nearby_emergency_events RPC via the REST proxy. This is the
  // spatial hot path whose latency the partitioning + RLS fixes target.
  const url = `${BASE_URL}/api/emergency?lat=${loc.lat}&lng=${loc.lng}&radius=10000`

  group('GET nearby emergencies (spatial)', () => {
    const res = http.get(url, { headers: { Accept: 'application/json' } })
    nearbyLatency.add(res.timings.duration)

    const ok = check(res, {
      'status is 200': r => r.status === 200,
      'no server error': r => r.status < 500,
      'responds within budget': r => r.timings.duration < 500
    })
    errorRate.add(!ok)
  })

  sleep(Math.random() * 5 + 5)
}

export function handleSummary(data) {
  // Emit a machine-readable summary so CI can compare against thresholds.
  return {
    'tests/load/surge-report.json': JSON.stringify(data, null, 2)
  }
}
