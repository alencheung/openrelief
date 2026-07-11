/**
 * Tests for the shared Supabase Realtime channel registry.
 *
 * Verifies the core scalability invariant: every subscriber to the same
 * (table, event, filter) tuple reuses ONE channel, collapsing O(users)
 * channels down to O(distinct filters).
 */

/**
 * @jest-environment node
 */

// Track channels created by the mocked supabase so we can assert cardinality.
const createdChannels: any[] = []

const mockChannel = () => {
  const handlers: Record<string, Array<(payload: any) => void>> = {}
  const channel = {
    state: 'joined',
    on: jest.fn((_: string, __: any, cb: (payload: any) => void) => {
      handlers.postgres_changes = handlers.postgres_changes || []
      handlers.postgres_changes.push(cb)
      return channel
    }),
    subscribe: jest.fn(),
    // Test helper to simulate an inbound postgres_changes payload.
    __emit(payload: any) {
      for (const cb of handlers.postgres_changes || []) {
        cb(payload)
      }
    }
  }
  createdChannels.push(channel)
  return channel
}

jest.mock('@/lib/supabase', () => ({
  supabase: {
    channel: jest.fn((name: string) => {
      const ch = mockChannel()
      ch.__name = name
      return ch
    }),
    removeChannel: jest.fn()
  }
}))

import { acquireSharedChannel, getSharedChannelStats } from '../shared-channels'

describe('shared realtime channel registry', () => {
  beforeEach(() => {
    createdChannels.length = 0
    jest.clearAllMocks()
  })

  it('creates one channel for identical (table, event, filter) tuples', () => {
    const key = { table: 'emergency_events', event: '*', filter: undefined }
    const sub1 = acquireSharedChannel(key, jest.fn())
    const sub2 = acquireSharedChannel(key, jest.fn())
    const sub3 = acquireSharedChannel(key, jest.fn())

    // Three subscribers, but only one underlying channel.
    const stats = getSharedChannelStats()
    expect(stats.channelCount).toBe(1)
    expect(stats.totalSubscribers).toBe(3)

    sub1.release()
    sub2.release()
    sub3.release()
  })

  it('dispatches a payload to every subscriber on the shared channel', () => {
    const key = { table: 'emergency_events', event: 'INSERT' }
    const cb1 = jest.fn()
    const cb2 = jest.fn()
    const sub1 = acquireSharedChannel(key, cb1)
    const sub2 = acquireSharedChannel(key, cb2)

    // Simulate the channel emitting a payload.
    const channel = createdChannels[0]
    channel.__emit({ eventType: 'INSERT', new: { id: 'e1' }, old: null })

    expect(cb1).toHaveBeenCalledTimes(1)
    expect(cb2).toHaveBeenCalledTimes(1)
    expect(cb1).toHaveBeenCalledWith({ eventType: 'INSERT', new: { id: 'e1' }, old: null })

    sub1.release()
    sub2.release()
  })

  it('removes the channel only when the last subscriber releases', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { supabase } = require('@/lib/supabase')
    const key = { table: 'event_confirmations', event: 'INSERT' }
    const sub1 = acquireSharedChannel(key, jest.fn())
    const sub2 = acquireSharedChannel(key, jest.fn())

    // Releasing one subscriber must NOT remove the shared channel.
    sub1.release()
    expect((supabase.removeChannel as jest.Mock).mock.calls.length).toBe(0)
    expect(getSharedChannelStats().totalSubscribers).toBe(1)

    // Releasing the last subscriber removes it.
    sub2.release()
    expect((supabase.removeChannel as jest.Mock).mock.calls.length).toBe(1)
    expect(getSharedChannelStats().channelCount).toBe(0)
  })

  it('creates separate channels for distinct filters', () => {
    const a = acquireSharedChannel({ table: 'emergency_events', filter: 'region=us' }, jest.fn())
    const b = acquireSharedChannel({ table: 'emergency_events', filter: 'region=eu' }, jest.fn())

    expect(getSharedChannelStats().channelCount).toBe(2)

    a.release()
    b.release()
  })

  it('isolates a throwing listener from other listeners', () => {
    const key = { table: 'emergency_events' }
    const throwing = jest.fn(() => {
      throw new Error('boom')
    })
    const healthy = jest.fn()
    const sub1 = acquireSharedChannel(key, throwing)
    const sub2 = acquireSharedChannel(key, healthy)

    const channel = createdChannels[0]
    // Should not throw out of __emit; the healthy listener still runs.
    expect(() => channel.__emit({ eventType: 'UPDATE', new: {}, old: {} })).not.toThrow()
    expect(throwing).toHaveBeenCalled()
    expect(healthy).toHaveBeenCalled()

    sub1.release()
    sub2.release()
  })
})
