import '@testing-library/jest-dom'
import { configure } from '@testing-library/react'

// Enable React act() test environment (required by React 18 for testing-library)
global.IS_REACT_ACT_ENVIRONMENT = true

// Configure React Testing Library
configure({
  testIdAttribute: 'data-testid',
  asyncUtilTimeout: 5000
})

// Mock Next.js router
jest.mock('next/router', () => ({
  useRouter() {
    return {
      route: '/',
      pathname: '/',
      query: '',
      asPath: '',
      push: jest.fn(),
      pop: jest.fn(),
      reload: jest.fn(),
      back: jest.fn(),
      prefetch: jest.fn(),
      beforePopState: jest.fn(),
      events: {
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn()
      }
    }
  }
}))

// Mock Next.js image
jest.mock('next/image', () => ({
  __esModule: true,
  default: props => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img {...props} />
  }
}))

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn()
}))

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn()
}))

// Mock Geolocation API
const mockGeolocation = {
  getCurrentPosition: jest.fn(),
  watchPosition: jest.fn(),
  clearWatch: jest.fn()
}

global.navigator.geolocation = mockGeolocation

// Mock Service Worker
global.navigator.serviceWorker = {
  register: jest.fn(),
  ready: Promise.resolve({
    showNotification: jest.fn(),
    getNotifications: jest.fn()
  })
}

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
}

global.localStorage = localStorageMock

// Mock sessionStorage
const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
}

global.sessionStorage = sessionStorageMock

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn()
  }))
})

// Mock URL.createObjectURL
global.URL.createObjectURL = jest.fn(() => 'mock-url')
global.URL.revokeObjectURL = jest.fn()

// Mock Canvas
HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
  fillRect: jest.fn(),
  clearRect: jest.fn(),
  getImageData: jest.fn(() => ({
    data: new Array(4)
  })),
  putImageData: jest.fn(),
  createImageData: jest.fn(() => ({ data: new Array(4) })),
  setTransform: jest.fn(),
  drawImage: jest.fn(),
  save: jest.fn(),
  fillText: jest.fn(),
  restore: jest.fn(),
  beginPath: jest.fn(),
  moveTo: jest.fn(),
  lineTo: jest.fn(),
  closePath: jest.fn(),
  stroke: jest.fn(),
  translate: jest.fn(),
  scale: jest.fn(),
  rotate: jest.fn(),
  arc: jest.fn(),
  fill: jest.fn(),
  measureText: jest.fn(() => ({ width: 0 })),
  transform: jest.fn(),
  rect: jest.fn(),
  clip: jest.fn()
}))

// Mock MapLibre GL JS
jest.mock('maplibre-gl', () => ({
  Map: jest.fn(() => ({
    addControl: jest.fn(),
    removeControl: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
    remove: jest.fn(),
    getContainer: jest.fn(() => document.createElement('div')),
    setCenter: jest.fn(),
    setZoom: jest.fn(),
    fitBounds: jest.fn(),
    getCenter: jest.fn(() => ({ lng: 0, lat: 0 })),
    getZoom: jest.fn(() => 10)
  })),
  Marker: jest.fn(() => ({
    addTo: jest.fn(),
    remove: jest.fn(),
    setLngLat: jest.fn(),
    getLngLat: jest.fn(() => ({ lng: 0, lat: 0 }))
  })),
  Popup: jest.fn(() => ({
    addTo: jest.fn(),
    remove: jest.fn(),
    setLngLat: jest.fn(),
    setHTML: jest.fn()
  })),
  NavigationControl: jest.fn(),
  GeolocateControl: jest.fn(),
  ScaleControl: jest.fn()
}))

// Mock Leaflet
jest.mock('leaflet', () => ({
  map: jest.fn(() => ({
    setView: jest.fn(),
    addLayer: jest.fn(),
    removeLayer: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
    invalidateSize: jest.fn()
  })),
  tileLayer: jest.fn(() => ({
    addTo: jest.fn()
  })),
  marker: jest.fn(() => ({
    addTo: jest.fn(),
    bindPopup: jest.fn()
  })),
  popup: jest.fn(() => ({
    setLatLng: jest.fn(),
    setContent: jest.fn(),
    openOn: jest.fn()
  })),
  icon: jest.fn(),
  divIcon: jest.fn()
}))

// Mock Supabase
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    auth: {
      signIn: jest.fn(),
      signOut: jest.fn(),
      onAuthStateChange: jest.fn(),
      getCurrentUser: jest.fn(),
      updateUser: jest.fn()
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
      then: jest.fn().mockReturnThis(),
      catch: jest.fn().mockReturnThis()
    })),
    storage: {
      from: jest.fn(() => ({
        upload: jest.fn(),
        download: jest.fn(),
        remove: jest.fn(),
        getPublicUrl: jest.fn()
      }))
    },
    functions: {
      invoke: jest.fn()
    }
  }))
}))

// Mock TanStack Query
// useQuery/useMutation return sensible default shapes so hooks that
// destructure { data, isLoading } / { mutate, isPending } don't crash when a
// test doesn't explicitly mock the return value. Individual tests can override
// via jest.mocked(...).mockReturnValue(...).
jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn(() => ({
    data: undefined,
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(() => Promise.resolve({ data: undefined })),
    isFetching: false
  })),
  useMutation: jest.fn(() => ({
    mutate: jest.fn(),
    mutateAsync: jest.fn(() => Promise.resolve({})),
    isPending: false,
    isError: false,
    error: null,
    reset: jest.fn()
  })),
  useQueryClient: jest.fn(() => ({
    invalidateQueries: jest.fn(),
    refetchQueries: jest.fn(),
    setQueryData: jest.fn(),
    getQueryData: jest.fn()
  })),
  QueryClient: jest.fn(() => ({
    invalidateQueries: jest.fn(),
    refetchQueries: jest.fn(),
    setQueryData: jest.fn(),
    getQueryData: jest.fn()
  })),
  QueryClientProvider: ({ children }) => children,
  ReactQueryDevtools: () => null
}))

// Mock fetch
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve('')
  })
)

// Polyfill Web APIs that jsdom does not provide but app code relies on
if (typeof global.Request === 'undefined') {
  global.Request = class Request {
    constructor(input, init = {}) {
      const url = typeof input === 'string' ? input : input?.url
      // Use defineProperty so subclasses (NextRequest) that override url
      // don't get "Cannot set property url which has only a getter".
      try {
        this.url = url
      } catch {
        Object.defineProperty(this, 'url', { value: url, writable: true, configurable: true })
      }
      this.method = init.method || 'GET'
      this.headers = new Headers(init.headers || {})
      this.body = init.body || null
      this._json = init.body
    }
    async json() {
      return typeof this._json === 'string' ? JSON.parse(this._json) : this._json
    }
    async text() {
      return typeof this._json === 'string' ? this._json : JSON.stringify(this._json)
    }
  }
}
if (typeof global.Response === 'undefined') {
  global.Response = class Response {
    constructor(body, init = {}) {
      this.body = body
      this.status = init.status || 200
      this.ok = this.status < 400
      this.headers = new Headers(init.headers || {})
    }
    async json() {
      return typeof this.body === 'string' ? JSON.parse(this.body) : this.body
    }
    async text() {
      return typeof this.body === 'string' ? this.body : JSON.stringify(this.body)
    }
    // Static factory used by Next.js route handlers: Response.json(data, init)
    static json(data, init = {}) {
      return new global.Response(JSON.stringify(data), {
        ...init,
        headers: { 'content-type': 'application/json', ...(init.headers || {}) }
      })
    }
    static redirect(url, status = 302) {
      return new global.Response(null, { status, headers: { location: url } })
    }
  }
}
if (typeof global.Headers === 'undefined') {
  global.Headers = class Headers {
    constructor(init = {}) {
      this._h = new Map()
      if (init) {
        if (typeof init.forEach === 'function') {
          init.forEach((v, k) => this._h.set(k.toLowerCase(), v))
        } else {
          for (const [k, v] of Object.entries(init)) {
            this._h.set(k.toLowerCase(), v)
          }
        }
      }
    }
    get(name) {
      return this._h.get(name.toLowerCase()) || null
    }
    set(name, value) {
      this._h.set(name.toLowerCase(), value)
    }
    has(name) {
      return this._h.has(name.toLowerCase())
    }
    forEach(cb) {
      this._h.forEach((v, k) => cb(v, k))
    }
    entries() {
      return this._h.entries()
    }
  }
}
if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = require('util').TextEncoder
}
if (typeof global.TextDecoder === 'undefined') {
  global.TextDecoder = require('util').TextDecoder
}
if (typeof global.Request !== 'undefined' && typeof globalThis.Request === 'undefined') {
  globalThis.Request = global.Request
}
if (typeof global.Response !== 'undefined' && typeof globalThis.Response === 'undefined') {
  globalThis.Response = global.Response
}
if (typeof global.Headers !== 'undefined' && typeof globalThis.Headers === 'undefined') {
  globalThis.Headers = global.Headers
}

// Suppress console warnings in tests
const originalError = console.error
beforeAll(() => {
  console.error = (...args) => {
    if (typeof args[0] === 'string' && args[0].includes('Warning: ReactDOM.render is deprecated')) {
      return
    }
    originalError.call(console, ...args)
  }
})

afterAll(() => {
  console.error = originalError
})

// Cleanup after each test
afterEach(() => {
  jest.clearAllMocks()
  localStorage.clear()
  sessionStorage.clear()
})
