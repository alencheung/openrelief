/**
 * Enhanced MapLibre GL JS mocks for OpenRelief emergency coordination system
 *
 * This file provides comprehensive mocking for MapLibre GL JS, including
 * map instances, markers, popups, and controls for emergency mapping features.
 */

import { jest } from '@jest/globals'

// Mock MapLibre GL JS Map class
export const createMockMap = (overrides = {}) => {
  const mockMap = {
    // Basic map properties
    _container: null,
    _style: { layers: [], sources: {} },
    _markers: [],
    _popups: [],
    _controls: [],
    _eventListeners: {},

    // Core map methods
    addControl: jest.fn().mockImplementation((control) => {
      mockMap._controls.push(control)
      return mockMap
    }),
    removeControl: jest.fn().mockImplementation((control) => {
      const index = mockMap._controls.indexOf(control)
      if (index > -1) {
        mockMap._controls.splice(index, 1)
      }
      return mockMap
    }),

    // Event handling
    on: jest.fn().mockImplementation((event, callback) => {
      if (!mockMap._eventListeners[event]) {
        mockMap._eventListeners[event] = []
      }
      mockMap._eventListeners[event].push(callback)
      return mockMap
    }),
    off: jest.fn().mockImplementation((event, callback) => {
      if (mockMap._eventListeners[event]) {
        const index = mockMap._eventListeners[event].indexOf(callback)
        if (index > -1) {
          mockMap._eventListeners[event].splice(index, 1)
        }
      }
      return mockMap
    }),

    // Map lifecycle
    remove: jest.fn().mockImplementation(() => {
      // Clean up event listeners
      mockMap._eventListeners = {}
      mockMap._markers = []
      mockMap._popups = []
      mockMap._controls = []
      return mockMap
    }),

    // Container and rendering
    getContainer: jest.fn().mockReturnValue(() => {
      if (!mockMap._container) {
        mockMap._container = document.createElement('div')
        mockMap._container.id = 'mock-map-container'
        mockMap._container.style.width = '100%'
        mockMap._container.style.height = '400px'
      }
      return mockMap._container
    }),

    // View and navigation
    setCenter: jest.fn().mockImplementation((center) => {
      mockMap._center = center
      return mockMap
    }),
    getCenter: jest.fn().mockReturnValue(() => mockMap._center || { lng: -74.0060, lat: 40.7128 }),

    setZoom: jest.fn().mockImplementation((zoom) => {
      mockMap._zoom = zoom
      return mockMap
    }),
    getZoom: jest.fn().mockReturnValue(() => mockMap._zoom || 10),

    fitBounds: jest.fn().mockImplementation((bounds, options) => {
      mockMap._bounds = bounds
      return mockMap
    }),

    jumpTo: jest.fn().mockImplementation((options) => {
      if (options.center) {
        mockMap._center = options.center
      }
      if (options.zoom) {
        mockMap._zoom = options.zoom
      }
      return mockMap
    }),

    flyTo: jest.fn().mockImplementation((options) => {
      setTimeout(() => {
        if (options.center) {
          mockMap._center = options.center
        }
        if (options.zoom) {
          mockMap._zoom = options.zoom
        }
        // Trigger moveend event
        if (mockMap._eventListeners.moveend) {
          mockMap._eventListeners.moveend.forEach(cb => cb())
        }
      }, 1000)
      return mockMap
    }),

    // Layers and sources
    addLayer: jest.fn().mockImplementation((layer, beforeId) => {
      mockMap._style.layers.push(layer)
      return mockMap
    }),
    removeLayer: jest.fn().mockImplementation((layerId) => {
      mockMap._style.layers = mockMap._style.layers.filter(layer => layer.id !== layerId)
      return mockMap
    }),

    addSource: jest.fn().mockImplementation((sourceId, source) => {
      mockMap._style.sources[sourceId] = source
      return mockMap
    }),
    removeSource: jest.fn().mockImplementation((sourceId) => {
      delete mockMap._style.sources[sourceId]
      return mockMap
    }),

    getSource: jest.fn().mockImplementation((sourceId) => {
      return mockMap._style.sources[sourceId]
    }),

    getLayer: jest.fn().mockImplementation((layerId) => {
      return mockMap._style.layers.find(layer => layer.id === layerId)
    }),

    // Feature interaction
    queryRenderedFeatures: jest.fn().mockReturnValue([]),
    querySourceFeatures: jest.fn().mockReturnValue([]),

    // Geolocation
    _geolocateControl: null,

    // Helper methods for testing
    _triggerEvent: jest.fn().mockImplementation((event, data) => {
      if (mockMap._eventListeners[event]) {
        mockMap._eventListeners[event].forEach(callback => callback(data))
      }
    }),

    _addMarker: jest.fn().mockImplementation((marker) => {
      mockMap._markers.push(marker)
      return marker
    }),

    _removeMarker: jest.fn().mockImplementation((marker) => {
      const index = mockMap._markers.indexOf(marker)
      if (index > -1) {
        mockMap._markers.splice(index, 1)
      }
    }),

    _addPopup: jest.fn().mockImplementation((popup) => {
      mockMap._popups.push(popup)
      return popup
    }),

    ...overrides
  }

  return mockMap
}

// Mock Marker class
export const createMockMarker = (overrides = {}) => {
  const mockMarker = {
    _lngLat: { lng: 0, lat: 0 },
    _element: null,
    _map: null,

    setLngLat: jest.fn().mockImplementation((lngLat) => {
      mockMarker._lngLat = lngLat
      return mockMarker
    }),

    getLngLat: jest.fn().mockReturnValue(() => mockMarker._lngLat),

    addTo: jest.fn().mockImplementation((map) => {
      mockMarker._map = map
      if (map._addMarker) {
        map._addMarker(mockMarker)
      }
      return mockMarker
    }),

    remove: jest.fn().mockImplementation(() => {
      if (mockMarker._map && mockMarker._map._removeMarker) {
        mockMarker._map._removeMarker(mockMarker)
      }
      mockMarker._map = null
      return mockMarker
    }),

    getElement: jest.fn().mockReturnValue(() => {
      if (!mockMarker._element) {
        mockMarker._element = document.createElement('div')
        mockMarker._element.className = 'mock-marker'
        mockMarker._element.style.width = '20px'
        mockMarker._element.style.height = '20px'
        mockMarker._element.style.backgroundColor = 'red'
        mockMarker._element.style.borderRadius = '50%'
      }
      return mockMarker._element
    }),

    ...overrides
  }

  return mockMarker
}

// Mock Popup class
export const createMockPopup = (overrides = {}) => {
  const mockPopup = {
    _lngLat: { lng: 0, lat: 0 },
    _content: '',
    _map: null,
    _isOpen: false,

    setLngLat: jest.fn().mockImplementation((lngLat) => {
      mockPopup._lngLat = lngLat
      return mockPopup
    }),

    setHTML: jest.fn().mockImplementation((html) => {
      mockPopup._content = html
      return mockPopup
    }),

    setText: jest.fn().mockImplementation((text) => {
      mockPopup._content = text
      return mockPopup
    }),

    addTo: jest.fn().mockImplementation((map) => {
      mockPopup._map = map
      if (map._addPopup) {
        map._addPopup(mockPopup)
      }
      mockPopup._isOpen = true
      return mockPopup
    }),

    remove: jest.fn().mockImplementation(() => {
      if (mockPopup._map && mockPopup._map._removePopup) {
        mockPopup._map._removePopup(mockPopup)
      }
      mockPopup._map = null
      mockPopup._isOpen = false
      return mockPopup
    }),

    isOpen: jest.fn().mockReturnValue(() => mockPopup._isOpen),

    ...overrides
  }

  return mockPopup
}

// Mock NavigationControl
export const createMockNavigationControl = () => ({
  onAdd: jest.fn().mockReturnValue(() => {
    const container = document.createElement('div')
    container.className = 'maplibregl-ctrl-nav'
    return container
  }),
  onRemove: jest.fn()
})

// Mock GeolocateControl
export const createMockGeolocateControl = () => ({
  onAdd: jest.fn().mockReturnValue(() => {
    const container = document.createElement('div')
    container.className = 'maplibregl-ctrl-geolocate'
    return container
  }),
  onRemove: jest.fn(),
  trigger: jest.fn().mockImplementation(() => {
    // Simulate geolocation success
    return Promise.resolve({
      coords: {
        latitude: 40.7128,
        longitude: -74.0060,
        accuracy: 10
      },
      timestamp: Date.now()
    })
  })
})

// Mock ScaleControl
export const createMockScaleControl = () => ({
  onAdd: jest.fn().mockReturnValue(() => {
    const container = document.createElement('div')
    container.className = 'maplibregl-ctrl-scale'
    return container
  }),
  onRemove: jest.fn()
})

// Mock MapLibre GL JS module
export const mockMapLibre = {
  Map: jest.fn().mockImplementation(createMockMap),
  Marker: jest.fn().mockImplementation(createMockMarker),
  Popup: jest.fn().mockImplementation(createMockPopup),
  NavigationControl: jest.fn().mockImplementation(createMockNavigationControl),
  GeolocateControl: jest.fn().mockImplementation(createMockGeolocateControl),
  ScaleControl: jest.fn().mockImplementation(createMockScaleControl),

  // Utility functions
  supported: jest.fn().mockReturnValue(true),
  version: jest.fn().mockReturnValue('3.6.2'),

  // Style and source helpers
  Expression: {
    get: jest.fn(),
    eq: jest.fn(),
    ne: jest.fn(),
    gt: jest.fn(),
    gte: jest.fn(),
    lt: jest.fn(),
    lte: jest.fn(),
    all: jest.fn(),
    any: jest.fn(),
    not: jest.fn()
  },

  // Event types
  Event: {
    DataLoadingEvent: jest.fn(),
    ErrorEvent: jest.fn(),
    MapDataEvent: jest.fn(),
    MapEvent: jest.fn(),
    StyleDataEvent: jest.fn()
  }
}

// Helper functions for testing
export const simulateMapClick = (map: any, lngLat: { lng: number; lat: number }) => {
  if (map._triggerEvent) {
    map._triggerEvent('click', {
      type: 'click',
      target: map,
      lngLat,
      point: { x: 100, y: 100 } // Mock point
    })
  }
}

export const simulateMarkerClick = (marker: any) => {
  if (marker.getElement) {
    const element = marker.getElement()
    const clickEvent = new MouseEvent('click', {
      bubbles: true,
      cancelable: true
    })
    element.dispatchEvent(clickEvent)
  }
}

export const simulateGeolocationSuccess = (map: any, position: { latitude: number; longitude: number }) => {
  if (map._eventListeners.geolocate) {
    map._eventListeners.geolocate.forEach(callback => {
      callback({
        coords: {
          latitude: position.latitude,
          longitude: position.longitude,
          accuracy: 10,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          speed: null
        },
        timestamp: Date.now()
      })
    })
  }
}

export default mockMapLibre