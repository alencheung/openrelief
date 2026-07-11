/**
 * Reverse geocoding utilities.
 *
 * Resolves geographic coordinates to a human-readable address. Uses the free
 * OpenStreetMap Nominatim API which requires no API key (subject to its usage
 * policy: max 1 request/second, a descriptive User-Agent). Results are cached
 * in-memory to respect the rate limit and reduce latency for repeat lookups.
 *
 * Previously the app had no geocoding at all — coordinates were shown raw or
 * discarded. This module supplies both client and server entry points.
 */

export interface ReverseGeocodeResult {
  /** Full formatted address string, e.g. "123 Main St, Springfield, IL, USA" */
  displayName: string
  address?: {
    houseNumber?: string
    road?: string
    neighbourhood?: string
    suburb?: string
    city?: string
    town?: string
    village?: string
    state?: string
    postcode?: string
    country?: string
    countryCode?: string
  }
  raw?: unknown
}

const NOMINATIM_ENDPOINT = 'https://nominatim.openstreetmap.org/reverse'

// Simple TTL cache keyed by rounded coordinates (≈11m precision) to stay within
// Nominatim's rate limits and avoid redundant lookups for nearby points.
const cache = new Map<string, { value: ReverseGeocodeResult; expires: number }>()
const CACHE_TTL = 10 * 60 * 1000 // 10 minutes
const ROUND = 4 // ~11m at the equator

function cacheKey(lat: number, lng: number): string {
  return `${lat.toFixed(ROUND)},${lng.toFixed(ROUND)}`
}

function buildHeaders(): HeadersInit {
  // Nominatim's usage policy asks for a identifying User-Agent / referer.
  // In the browser, the Referer is set automatically; on the server we send UA.
  if (typeof window === 'undefined') {
    return {
      'User-Agent': 'OpenRelief/1.0 (open-source emergency coordination)',
      Accept: 'application/json'
    }
  }
  return { Accept: 'application/json' }
}

/**
 * Reverse-geocode a coordinate to an address via OSM Nominatim.
 * Returns null on failure (network error, rate limit, no result) so callers
 * can fall back to a formatted coordinate string.
 */
export async function reverseGeocode(
  lat: number,
  lng: number,
  opts: { signal?: AbortSignal; language?: string } = {}
): Promise<ReverseGeocodeResult | null> {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null
  }

  const key = cacheKey(lat, lng)
  const cached = cache.get(key)
  if (cached && cached.expires > Date.now()) {
    return cached.value
  }

  const params = new URLSearchParams({
    lat: String(lat),
    lon: String(lng),
    format: 'json',
    addressdetails: '1',
    zoom: '18'
  })
  if (opts.language) {
    params.set('accept-language', opts.language)
  }

  try {
    const response = await fetch(`${NOMINATIM_ENDPOINT}?${params.toString()}`, {
      headers: buildHeaders(),
      signal: opts.signal
    })

    if (!response.ok) {
      return null
    }

    const data = await response.json()
    if (!data || data.error) {
      return null
    }

    const result: ReverseGeocodeResult = {
      displayName: data.display_name || '',
      address: data.address
        ? {
            houseNumber: data.address.house_number,
            road: data.address.road,
            neighbourhood: data.address.neighbourhood,
            suburb: data.address.suburb,
            city: data.address.city,
            town: data.address.town,
            village: data.address.village,
            state: data.address.state,
            postcode: data.address.postcode,
            country: data.address.country,
            countryCode: data.address.country_code
          }
        : undefined,
      raw: data
    }

    cache.set(key, { value: result, expires: Date.now() + CACHE_TTL })
    return result
  } catch (error) {
    // AbortError is expected when callers cancel; anything else is a network
    // failure we swallow so the UI can fall back to coordinates.
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw error
    }
    return null
  }
}

/**
 * Produce a short, human-readable label for a coordinate. Attempts a reverse
 * geocode and falls back to a decimal-degree coordinate string if geocoding
 * fails or is unavailable. Never throws.
 */
export async function reverseGeocodeLabel(
  lat: number,
  lng: number,
  opts: { signal?: AbortSignal; language?: string } = {}
): Promise<string> {
  const result = await reverseGeocode(lat, lng, opts)
  if (result?.displayName) {
    return result.displayName
  }
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`
}
