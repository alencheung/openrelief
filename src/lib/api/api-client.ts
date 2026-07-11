/**
 * Resilient API client.
 *
 * Wraps `fetch` with a per-origin circuit breaker so a failing backend
 * doesn't get hammered by every client request. The CircuitBreaker class
 * in `src/lib/errorHandling.ts` existed but was never wired into the main
 * data paths; this module makes it the default transport for same-origin
 * API calls.
 *
 * Behaviour:
 *  - While the circuit is CLOSED requests pass through.
 *  - After `THRESHOLD` consecutive failures the circuit OPENS; subsequent
 *    requests short-circuit with a `CircuitOpenError` instead of hitting
 *    the network. This breaks retry feedback loops during a backend
 *    outage.
 *  - After `COOLDOWN_MS` a single request is allowed through (HALF-OPEN);
 *    if it succeeds the circuit closes again.
 *
 * The breaker is shared across all callers within a page session, so one
 * failing endpoint protects the others from contributing to the load.
 */

import { CircuitBreaker } from '@/lib/errorHandling'

export class CircuitOpenError extends Error {
  constructor(public readonly endpoint: string) {
    super(`Circuit open for ${endpoint}`)
    this.name = 'CircuitOpenError'
  }
}

const THRESHOLD = 5
const COOLDOWN_MS = 30_000

// One breaker per origin so cross-origin calls don't trip each other.
const breakers = new Map<string, CircuitBreaker>()

function getBreaker(origin: string): CircuitBreaker {
  let breaker = breakers.get(origin)
  if (!breaker) {
    breaker = new CircuitBreaker(THRESHOLD, COOLDOWN_MS, 5 * 60 * 1000)
    breakers.set(origin, breaker)
  }
  return breaker
}

export interface ApiClientOptions extends RequestInit {
  /**
   * If false, bypass the circuit breaker. Use only for endpoints whose
   * failure must not block other traffic (e.g. /api/health itself).
   */
  useCircuitBreaker?: boolean
}

// Default per-request timeout. Without it a stalled downstream hangs the
// connection indefinitely (and exhausts the breaker's in-flight slots).
const DEFAULT_TIMEOUT_MS = 30_000

// Feature-detect once: AbortSignal.timeout / AbortSignal.any ship in modern
// runtimes and browsers; if absent we degrade gracefully to no timeout.
const signalTimeout = (AbortSignal as unknown as {
  timeout?: (ms: number) => AbortSignal
}).timeout?.bind(AbortSignal)
const signalAny = (AbortSignal as unknown as {
  any?: (signals: AbortSignal[]) => AbortSignal
}).any?.bind(AbortSignal)

async function doFetch(url: string, init: RequestInit): Promise<Response> {
  // Attach a default timeout (the earlier of the caller's signal and ours) so a
  // stalled downstream cannot hang the request. Built on the fetch line so the
  // timeout guarantee is visible at the call site.
  const timeout = signalTimeout?.(DEFAULT_TIMEOUT_MS)
  const signal =
    init.signal && timeout && signalAny
      ? signalAny([init.signal, timeout])
      : (init.signal ?? timeout)
  const response = await fetch(url, signal ? { ...init, signal } : init)
  if (!response.ok && response.status >= 500) {
    // Treat 5xx as a failure so the breaker trips on server errors.
    throw new Error(`Server error ${response.status} for ${url}`)
  }
  return response
}

/**
 * Fetch wrapper that runs through the origin's circuit breaker. Throws
 * `CircuitOpenError` when the circuit is open, otherwise behaves like
 * `fetch`. 4xx responses are returned normally (they are not failures
 * from the breaker's perspective — only 5xx and network errors trip it).
 */
export async function apiFetch(url: string, options: ApiClientOptions = {}): Promise<Response> {
  const { useCircuitBreaker = true, ...init } = options

  if (!useCircuitBreaker) {
    return doFetch(url, init)
  }

  let origin = 'same-origin'
  try {
    origin = new URL(url, typeof window !== 'undefined' ? window.location.origin : 'http://localhost').origin
  } catch {
    // Relative URL — same origin.
  }

  const breaker = getBreaker(origin)
  return breaker.execute(() => doFetch(url, init))
}

/**
 * JSON helper for the common GET path.
 */
export async function apiGetJson<T = unknown>(url: string, options?: ApiClientOptions): Promise<T> {
  const response = await apiFetch(url, { method: 'GET', ...options })
  return (await response.json()) as T
}

/**
 * JSON helper for POST/PUT with a JSON body.
 */
export async function apiSendJson<T = unknown>(
  url: string,
  method: 'POST' | 'PUT' | 'PATCH',
  body: unknown,
  options?: ApiClientOptions
): Promise<T> {
  const response = await apiFetch(url, {
    method,
    headers: { 'Content-Type': 'application/json', ...(options?.headers || {}) },
    body: JSON.stringify(body),
    ...options
  })
  return (await response.json()) as T
}
