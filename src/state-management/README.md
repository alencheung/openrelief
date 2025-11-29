# OpenRelief State Management System

This comprehensive state management system provides robust, real-time, and offline-capable state management for the OpenRelief emergency coordination platform.

## Overview

The state management system consists of:

- **Zustand Stores** - Client-side state management with persistence
- **TanStack Query Hooks** - Server state management with caching and synchronization
- **Real-time Subscriptions** - Live data updates from Supabase
- **Offline Synchronization** - Queue-based offline support with automatic sync
- **Error Handling** - Comprehensive error classification and recovery
- **Performance Optimization** - Emergency-optimized performance patterns

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    State Management Layer                   │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────────────────────┐  │
│  │   Zustand      │  │     TanStack Query            │  │
│  │   Stores       │  │     Hooks                    │  │
│  │                 │  │                               │  │
│  │ • Auth          │  │ • Emergency Events           │  │
│  │ • Emergency      │  │ • User Profiles              │  │
│  │ • Trust         │  │ • Real-time Subscriptions    │  │
│  │ • Location      │  │ • Optimistic Updates         │  │
│  │ • Notifications │  │ • Error Handling             │  │
│  │ • Offline       │  │ • Retry Logic                │  │
│  └─────────────────┘  └─────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│                    Data Layer                            │
│  ┌─────────────────────────────────────────────────────┐  │
│  │              Supabase Backend                  │  │
│  │                                                 │  │
│  │ • Real-time Database                              │  │
│  │ • Authentication                                   │  │
│  │ • Storage                                        │  │
│  │ • Edge Functions                                 │  │
│  └─────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. Zustand Stores

Located in `src/store/`, these stores manage client-side state with persistence:

#### Auth Store (`authStore.ts`)
- User authentication state
- Session management
- User profile information
- Trust score integration

#### Emergency Store (`emergencyStore.ts`)
- Emergency events and filters
- Map state and viewport
- Search and filtering
- Offline action queue

#### Trust Store (`trustStore.ts`)
- Trust score calculations
- Trust history tracking
- Factor-based scoring
- Threshold management

#### Location Store (`locationStore.ts`)
- GPS location tracking
- Geofence management
- Proximity alerts
- Location permissions

#### Notification Store (`notificationStore.ts`)
- In-app notifications
- Push notification management
- Quiet hours and settings
- Notification queue

#### Offline Store (`offlineStore.ts`)
- Offline action queue
- Cache management
- Sync coordination
- Conflict resolution

### 2. TanStack Query Hooks

Located in `src/hooks/queries/`, these hooks manage server state:

#### Emergency Queries (`useEmergencyQueries.ts`)
- `useEmergencyEvents()` - List emergency events with filters
- `useCreateEmergencyEvent()` - Create with optimistic updates
- `useConfirmEvent()` - Confirm/dispute events
- `useNearbyEmergencyEvents()` - Location-based queries

#### User Queries (`useUserQueries.ts`)
- `useUserProfile()` - User profile management
- `useTrustScore()` - Trust score queries
- `useUserSubscriptions()` - Emergency type subscriptions
- `useUserStats()` - User statistics and expertise

#### Real-time Subscriptions (`useRealtimeSubscriptions.ts`)
- `useEmergencyEventsSubscription()` - Live emergency updates
- `useEventConfirmationsSubscription()` - Live confirmation updates
- `usePresenceTracking()` - User presence and coordination
- `useEmergencyBroadcast()` - Emergency coordination broadcasts

### 3. Error Handling System

Located in `src/lib/errorHandling.ts`:

- **Error Classification** - Automatic error type detection
- **Retry Logic** - Exponential backoff with jitter
- **Circuit Breaker** - Prevent cascading failures
- **Error Recovery** - Automatic recovery strategies
- **Error Reporting** - Centralized error tracking

### 4. State Management Provider

Located in `src/components/providers/StateManagementProvider.tsx`:

- **Initialization** - Coordinated store setup
- **Real-time Setup** - Automatic subscription management
- **Performance Monitoring** - Query performance tracking
- **Emergency Mode** - Automatic emergency detection
- **Error Boundaries** - Global error handling

## Usage Patterns

### Basic Usage

```typescript
// Import stores and hooks
import { useEmergencyStore, useEmergencyEvents } from '@/store'
import { useCreateEmergencyEvent } from '@/hooks/queries'

// Use store state
const { events, filters, setFilters } = useEmergencyStore()

// Use query hooks
const { data: emergencyEvents, isLoading, error } = useEmergencyEvents(filters)

// Use mutations
const createEvent = useCreateEmergencyEvent()

// Create emergency event
const handleSubmit = async (eventData) => {
  await createEvent.mutateAsync(eventData)
}
```

### Advanced Usage with Optimistic Updates

```typescript
// Optimistic updates are built into the hooks
const createEvent = useCreateEmergencyEvent()

// The hook automatically:
// 1. Adds optimistic update to local store
// 2. Queues action if offline
// 3. Updates trust scores
// 4. Creates notifications
// 5. Handles rollbacks on error
```

### Real-time Subscriptions

```typescript
import { 
  useEmergencyEventsSubscription,
  useEmergencyBroadcast 
} from '@/hooks/queries'

// Automatic real-time updates
useEmergencyEventsSubscription()

// Emergency coordination
const { broadcast, subscribe } = useEmergencyBroadcast(eventId)

// Send coordination message
await broadcast('status_update', { 
  message: 'Team assembled',
  location: userLocation 
})

// Listen for updates
useEffect(() => {
  const unsubscribe = subscribe('status_update', (payload) => {
    console.log('Team update:', payload)
  })
  return unsubscribe
}, [])
```

### Offline Support

```typescript
import { useOfflineStore } from '@/store'

// Offline actions are automatically queued
const { isOnline, addAction, processQueue } = useOfflineStore()

// Manual sync control
if (isOnline) {
  await processQueue()
}
```

### Error Handling

```typescript
import { 
  withErrorHandling, 
  classifyError, 
  globalErrorBoundary 
} from '@/lib/errorHandling'

// Wrap functions with error handling
const safeFunction = withErrorHandling(
  async (data) => {
    // Your async function
    return await apiCall(data)
  },
  {
    retry: { maxRetries: 3, baseDelay: 1000 },
    onError: (errorInfo) => {
      console.error('Operation failed:', errorInfo)
    }
  }
)

// Global error handling
const errorState = globalErrorBoundary.getState()
if (errorState.hasError) {
  console.log('Global error:', errorState.error)
}
```

## Performance Optimizations

### Emergency-Optimized Patterns

1. **Prioritized Queries** - Critical data fetched first
2. **Intelligent Caching** - Emergency data cached longer
3. **Background Sync** - Non-blocking synchronization
4. **Connection Awareness** - Adaptive behavior based on network
5. **Memory Management** - Automatic cleanup of old data

### Query Optimization

```typescript
// Emergency-optimized query configuration
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: false, // Avoid unnecessary refetches
      refetchOnReconnect: true, // Sync on reconnection
      networkMode: 'online', // Respect offline state
    },
  },
})
```

### Store Optimization

```typescript
// Selective persistence
const store = create<State>()(
  persist(
    (set, get) => ({ ... }),
    {
      name: 'store-name',
      partialize: (state) => ({
        // Only persist critical data
        criticalField: state.criticalField,
        settings: state.settings,
      }),
    }
  )
)
```

## Emergency Scenarios

### High Traffic Emergency

1. **Automatic Prioritization** - Critical queries get priority
2. **Connection Pooling** - Efficient resource usage
3. **Debounced Updates** - Reduce unnecessary operations
4. **Emergency Mode** - UI optimizations for critical situations

### Network Interruption

1. **Graceful Degradation** - Continue with cached data
2. **Offline Queue** - Queue all user actions
3. **Automatic Sync** - Resume when connection restored
4. **Conflict Resolution** - Handle data conflicts intelligently

### Low Battery/Device

1. **Reduced Frequency** - Lower update intervals
2. **Selective Sync** - Only sync critical data
3. **Compressed Data** - Minimize bandwidth usage
4. **Background Processing** - Efficient resource usage

## Best Practices

### 1. Store Usage

- Use selectors for specific data needs
- Leverage partialize for persistence
- Implement proper cleanup in effects
- Use middleware for cross-cutting concerns

### 2. Query Usage

- Implement proper error boundaries
- Use appropriate stale times
- Leverage optimistic updates
- Handle loading and error states

### 3. Real-time Usage

- Subscribe only to needed data
- Implement proper cleanup
- Handle connection states
- Use presence for coordination

### 4. Error Handling

- Classify errors appropriately
- Implement retry strategies
- Provide user feedback
- Report errors for monitoring

### 5. Performance

- Monitor query performance
- Optimize for emergency scenarios
- Implement proper caching
- Use background processing

## Testing

### Unit Testing

```typescript
// Test stores
import { act, renderHook } from '@testing-library/react'
import { useEmergencyStore } from '@/store'

test('should add emergency event', () => {
  const { result } = renderHook(() => useEmergencyStore())
  
  act(() => {
    result.current.addEvent(mockEvent)
  })
  
  expect(result.current.events).toContain(mockEvent)
})
```

### Integration Testing

```typescript
// Test query hooks with mock server
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useEmergencyEvents } from '@/hooks/queries'

test('should fetch emergency events', async () => {
  const queryClient = new QueryClient()
  const wrapper = ({ children }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  
  const { result } = renderHook(() => useEmergencyEvents(), { wrapper })
  
  await waitFor(() => expect(result.current.data).toHaveLength(1))
})
```

## Monitoring and Debugging

### Development Tools

1. **React Query Devtools** - Query inspection
2. **Zustand Devtools** - Store inspection
3. **Performance Monitor** - Built-in performance tracking
4. **Error Boundary** - Global error tracking

### Production Monitoring

1. **Error Reporting** - Automatic error collection
2. **Performance Metrics** - Query performance tracking
3. **Usage Analytics** - Store usage patterns
4. **Health Checks** - System health monitoring

## Migration Guide

### From Basic State

1. Gradually introduce stores
2. Migrate component by component
3. Test thoroughly at each step
4. Monitor performance impact

### From Other Solutions

1. Assess current state management
2. Plan migration strategy
3. Implement compatibility layer
4. Gradual migration with rollback

## Troubleshooting

### Common Issues

1. **Stale Data** - Check cache settings
2. **Memory Leaks** - Verify cleanup
3. **Sync Issues** - Check offline queue
4. **Performance** - Monitor query times

### Debug Tools

1. Store inspection in devtools
2. Query inspection in React Query Devtools
3. Network tab for API calls
4. Console for error logs

## Contributing

### Adding New Stores

1. Follow existing patterns
2. Implement proper types
3. Add persistence if needed
4. Include tests
5. Update documentation

### Adding New Queries

1. Use consistent patterns
2. Implement error handling
3. Add optimistic updates
4. Include offline support
5. Add real-time subscriptions

This state management system is designed to handle the demanding requirements of emergency coordination while maintaining excellent performance and reliability.