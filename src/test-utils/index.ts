/**
 * Central test utilities for OpenRelief emergency coordination system
 * 
 * This file provides common testing utilities, custom render functions,
 * and helper functions for testing emergency response features.
 */

import React, { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { ConfigProvider } from 'antd'
import { ThemeProvider } from 'next-themes'
import { Providers } from '@/components/providers/Providers'

// Create a custom render function that includes providers
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  })

  return (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          <ConfigProvider>
            <Providers>
              {children}
            </Providers>
          </ConfigProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </BrowserRouter>
  )
}

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options })

// Re-export everything from React Testing Library
export * from '@testing-library/react'
export { customRender as render }
export { default as userEvent } from '@testing-library/user-event'

// Emergency-specific test utilities
export const createMockEmergencyEvent = (overrides = {}) => ({
  id: 'test-emergency-1',
  type: 'medical',
  severity: 'high',
  title: 'Test Emergency',
  description: 'Test emergency description',
  location: {
    latitude: 40.7128,
    longitude: -74.0060,
    address: '123 Test St, Test City',
  },
  reportedBy: 'test-user-id',
  reportedAt: new Date().toISOString(),
  status: 'active',
  trustScore: 0.85,
  responders: [],
  resources: [],
  updates: [],
  ...overrides,
})

export const createMockUser = (overrides = {}) => ({
  id: 'test-user-id',
  email: 'test@example.com',
  name: 'Test User',
  role: 'citizen',
  trustScore: 0.8,
  verified: true,
  location: {
    latitude: 40.7128,
    longitude: -74.0060,
  },
  skills: ['first_aid', 'search_rescue'],
  availability: 'available',
  ...overrides,
})

export const createMockTrustScore = (overrides = {}) => ({
  userId: 'test-user-id',
  overall: 0.85,
  components: {
    reliability: 0.9,
    accuracy: 0.8,
    responseTime: 0.85,
    communityFeedback: 0.8,
    skillVerification: 0.9,
  },
  history: [],
  lastUpdated: new Date().toISOString(),
  ...overrides,
})

export const createMockNotification = (overrides = {}) => ({
  id: 'test-notification-1',
  userId: 'test-user-id',
  type: 'emergency_alert',
  title: 'Test Emergency Alert',
  message: 'Test emergency message',
  priority: 'high',
  read: false,
  createdAt: new Date().toISOString(),
  data: {
    emergencyId: 'test-emergency-1',
    location: {
      latitude: 40.7128,
      longitude: -74.0060,
    },
  },
  ...overrides,
})

// Map testing utilities
export const createMockMapInstance = () => ({
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
  getZoom: jest.fn(() => 10),
  addLayer: jest.fn(),
  removeLayer: jest.fn(),
  addSource: jest.fn(),
  removeSource: jest.fn(),
})

export const createMockGeolocation = (position = { latitude: 40.7128, longitude: -74.0060 }) => ({
  getCurrentPosition: jest.fn().mockImplementation((success) => {
    success({
      coords: {
        latitude: position.latitude,
        longitude: position.longitude,
        accuracy: 10,
        altitude: null,
        altitudeAccuracy: null,
        heading: null,
        speed: null,
      },
      timestamp: Date.now(),
    })
  }),
  watchPosition: jest.fn().mockImplementation((success) => {
    const watchId = Math.random().toString(36)
    success({
      coords: {
        latitude: position.latitude,
        longitude: position.longitude,
        accuracy: 10,
        altitude: null,
        altitudeAccuracy: null,
        heading: null,
        speed: null,
      },
      timestamp: Date.now(),
    })
    return watchId
  }),
  clearWatch: jest.fn(),
})

// Network status testing utilities
export const createMockNetworkStatus = (online = true) => ({
  online,
  effectiveType: online ? '4g' : 'slow-2g',
  downlink: online ? 10 : 0.1,
  rtt: online ? 50 : 1000,
  saveData: false,
})

// Service Worker testing utilities
export const createMockServiceWorker = () => ({
  register: jest.fn().mockResolvedValue({
    installing: null,
    waiting: null,
    active: {
      postMessage: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    },
  }),
  ready: Promise.resolve({
    showNotification: jest.fn(),
    getNotifications: jest.fn(() => Promise.resolve([])),
  }),
})

// Storage testing utilities
export const createMockStorage = () => {
  const store: Record<string, string> = {}
  return {
    getItem: jest.fn((key) => store[key] || null),
    setItem: jest.fn((key, value) => {
      store[key] = value
    }),
    removeItem: jest.fn((key) => {
      delete store[key]
    }),
    clear: jest.fn(() => {
      Object.keys(store).forEach(key => delete store[key])
    }),
    key: jest.fn((index) => Object.keys(store)[index] || null),
    length: Object.keys(store).length,
  }
}

// Date testing utilities
export const createMockDate = (dateString: string) => {
  const mockDate = new Date(dateString)
  jest.useFakeTimers()
  jest.setSystemTime(mockDate)
  return mockDate
}

// Emergency scenario test data
export const emergencyScenarios = {
  medicalEmergency: {
    type: 'medical',
    severity: 'high',
    title: 'Medical Emergency',
    description: 'Person experiencing chest pain',
    location: {
      latitude: 40.7128,
      longitude: -74.0060,
      address: '123 Main St, New York, NY',
    },
    requiredResources: ['ambulance', 'paramedic'],
    estimatedResponseTime: 8,
  },
  naturalDisaster: {
    type: 'natural_disaster',
    severity: 'critical',
    title: 'Flooding',
    description: 'Severe flooding in downtown area',
    location: {
      latitude: 40.7589,
      longitude: -73.9851,
      address: '456 Park Ave, New York, NY',
    },
    requiredResources: ['rescue_team', 'helicopter', 'emergency_supplies'],
    estimatedResponseTime: 15,
  },
  fire: {
    type: 'fire',
    severity: 'critical',
    title: 'Building Fire',
    description: 'Fire reported in apartment building',
    location: {
      latitude: 40.7614,
      longitude: -73.9776,
      address: '789 5th Ave, New York, NY',
    },
    requiredResources: ['fire_truck', 'firefighters'],
    estimatedResponseTime: 5,
  },
}

// Performance testing utilities
export const measureRenderTime = async (component: ReactElement) => {
  const start = performance.now()
  render(component)
  const end = performance.now()
  return end - start
}

// Accessibility testing utilities
export const checkAccessibility = async (container: HTMLElement) => {
  // This would integrate with axe-core for accessibility testing
  // For now, return a mock implementation
  return {
    passes: true,
    violations: [],
    incomplete: [],
  }
}

// Error boundary testing utilities
export const createMockErrorBoundary = () => {
  class MockErrorBoundary extends React.Component<
    { children: React.ReactNode; onError?: (error: Error) => void },
    { hasError: boolean; error?: Error }
  > {
    constructor(props: any) {
      super(props)
      this.state = { hasError: false }
    }

    static getDerivedStateFromError(error: Error) {
      return { hasError: true, error }
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
      if (this.props.onError) {
        this.props.onError(error)
      }
    }

    render() {
      if (this.state.hasError) {
        return <div data-testid="error-boundary-fallback">Error: {this.state.error?.message}</div>
      }

      return this.props.children
    }
  }

  return MockErrorBoundary
}