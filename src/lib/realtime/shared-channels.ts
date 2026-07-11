/**
 * Shared Supabase Realtime channel registry.
 *
 * Problem being solved: previously every React subscriber opened its own
 * channel with a `Date.now()`-suffixed name. At 100K concurrent users with
 * ~6 `postgres_changes` subscriptions each, this produced ~600K distinct
 * Realtime channels — each requiring Supabase to evaluate RLS and dispatch
 * a message, which blew past Realtime's connection and message quotas in
 * minutes.
 *
 * Solution: every subscriber to the same `(table, event, filter)` tuple
 * reuses ONE shared channel. Supabase's `RealtimeChannel` supports
 * multiple `on()` handlers, so we attach each subscriber's callback to
 * the shared channel and detach on unsubscribe. When the last subscriber
 * leaves, the channel is removed.
 *
 * This collapses the channel count from O(users) to O(distinct filters),
 * which is bounded by the small set of geographic/typed scopes clients
 * actually subscribe to.
 */

import { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

export interface SharedChannelKey {
  table: string
  event?: string
  filter?: string
}

interface SharedChannelEntry {
  channel: RealtimeChannel
  subscribers: number
  /** Stable refcount so the channel is only removed once. */
  removing: boolean
}

const channelRegistry = new Map<string, SharedChannelEntry>()

function keyToString(key: SharedChannelKey): string {
  return `shared:${key.table}:${key.event ?? '*'}:${key.filter ?? ''}`
}

/**
 * A stable channel name for a given key. Deterministic — every client that
 * asks for the same filter gets the same channel name, so Supabase
 * de-duplicates the underlying subscription.
 */
export function sharedChannelName(key: SharedChannelKey): string {
  // `shared:` prefix avoids collision with any legacy `realtime-...` names
  // still in flight during a rolling deploy.
  return keyToString(key)
}

/**
 * Acquire a shared channel for the given key, attaching `onMessage` as a
 * `postgres_changes` listener. Returns the channel and a disposer that
 * detaches the listener and releases the channel when the last subscriber
 * leaves.
 */
export function acquireSharedChannel(
  key: SharedChannelKey,
  onMessage: (payload: any) => void
): { channel: RealtimeChannel; release: () => void } {
  const name = keyToString(key)
  let entry = channelRegistry.get(name)

  if (!entry) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const channel: any = supabase.channel(name)
    channel.on(
      'postgres_changes' as any,
      {
        event: key.event || '*',
        schema: 'public',
        table: key.table,
        filter: key.filter
      },
      (payload: any) => {
        // Dispatch to the per-channel listener set maintained below.
        const listeners = listenersByChannel.get(name)
        if (listeners) {
          for (const fn of listeners) {
            try {
              fn(payload)
            } catch (err) {
              console.error('[Realtime] shared channel listener error:', err)
            }
          }
        }
      }
    )
    channel.subscribe()
    entry = { channel, subscribers: 0, removing: false }
    channelRegistry.set(name, entry)
    listenersByChannel.set(name, new Set())
  }

  const listeners = listenersByChannel.get(name)!
  listeners.add(onMessage)
  entry.subscribers += 1

  return {
    channel: entry.channel,
    release: () => {
      const current = channelRegistry.get(name)
      const listenerSet = listenersByChannel.get(name)
      if (listenerSet) {
        listenerSet.delete(onMessage)
      }
      if (!current) return
      current.subscribers = Math.max(0, current.subscribers - 1)
      if (current.subscribers === 0 && !current.removing) {
        current.removing = true
        try {
          supabase.removeChannel(current.channel)
        } catch (err) {
          console.error('[Realtime] failed to remove shared channel:', err)
        }
        channelRegistry.delete(name)
        listenersByChannel.delete(name)
      }
    }
  }
}

const listenersByChannel = new Map<string, Set<(payload: any) => void>>()

/**
 * Inspect the registry — primarily for tests and observability.
 */
export function getSharedChannelStats(): {
  channelCount: number
  totalSubscribers: number
} {
  let total = 0
  for (const entry of channelRegistry.values()) {
    total += entry.subscribers
  }
  return { channelCount: channelRegistry.size, totalSubscribers: total }
}
