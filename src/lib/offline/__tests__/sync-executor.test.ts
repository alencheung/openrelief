/**
 * Tests for the offline sync executor.
 *
 * These verify the behaviour that replaced the silent `setTimeout` stub in
 * offlineStore.processQueue — i.e. that queued actions now actually reach
 * the backend with the right HTTP method and payload, and that failures
 * are classified correctly for retry vs. permanent-failure handling.
 */

/**
 * @jest-environment node
 */

import { executeOfflineAction } from '../sync-executor'

// Mock supabase so the confirmation/generic paths don't hit a real client.
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      insert: jest.fn(() => ({ select: jest.fn(() => ({ single: jest.fn() })) })),
      update: jest.fn(() => ({ eq: jest.fn(() => ({ select: jest.fn(() => ({ single: jest.fn() })) })) })),
      delete: jest.fn(() => ({ eq: jest.fn() }))
    }))
  }
}))

describe('executeOfflineAction', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('POSTs an emergency create to /api/emergency and reports synced on 201', async () => {
    const fetchSpy = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(
        new Response(JSON.stringify({ data: { id: 'evt-123' } }), { status: 201 })
      )

    const outcome = await executeOfflineAction({
      id: 'a1',
      type: 'create',
      table: 'emergency_events',
      data: {
        type_id: 1,
        title: 'Fire',
        severity: 5,
        location: '40.7 -74.0'
      },
      retryCount: 0,
      maxRetries: 5
    })

    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/emergency',
      expect.objectContaining({ method: 'POST' })
    )
    // Location string "lat lng" should be normalised to {latitude, longitude}.
    const body = JSON.parse((fetchSpy.mock.calls[0]?.[1] as any)?.body)
    expect(body.location).toEqual({ latitude: 40.7, longitude: -74 })
    expect(outcome.status).toBe('synced')
    if (outcome.status === 'synced') {
      expect(outcome.remoteId).toBe('evt-123')
    }
  })

  it('classifies a 429 as a transient failure (retryable)', async () => {
    jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify({ error: 'Too many requests' }), { status: 429 }))

    const outcome = await executeOfflineAction({
      id: 'a2',
      type: 'create',
      table: 'emergency_events',
      data: { type_id: 1, title: 'x', severity: 3, location: { lat: 1, lng: 2 } },
      retryCount: 0,
      maxRetries: 5
    })

    expect(outcome.status).toBe('failed_transiently')
  })

  it('classifies a 400 as a permanent failure (not retried)', async () => {
    jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify({ error: 'Bad request' }), { status: 400 }))

    const outcome = await executeOfflineAction({
      id: 'a3',
      type: 'create',
      table: 'emergency_events',
      data: { type_id: 1, title: 'x', severity: 3 },
      retryCount: 0,
      maxRetries: 5
    })

    expect(outcome.status).toBe('failed_permanently')
  })

  it('classifies a 409 as a conflict', async () => {
    jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify({ error: 'Conflict' }), { status: 409 }))

    const outcome = await executeOfflineAction({
      id: 'a4',
      type: 'create',
      table: 'emergency_events',
      data: { type_id: 1, title: 'x', severity: 3 },
      retryCount: 0,
      maxRetries: 5
    })

    expect(outcome.status).toBe('conflict')
  })

  it('treats a network throw as a transient failure', async () => {
    jest.spyOn(global, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'))

    const outcome = await executeOfflineAction({
      id: 'a5',
      type: 'create',
      table: 'emergency_events',
      data: { type_id: 1, title: 'x', severity: 3 },
      retryCount: 0,
      maxRetries: 5
    })

    expect(outcome.status).toBe('failed_transiently')
  })

  it('DELETEs an emergency by id', async () => {
    const fetchSpy = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(new Response('{}', { status: 200 }))

    const outcome = await executeOfflineAction({
      id: 'a6',
      type: 'delete',
      table: 'emergency_events',
      data: { id: 'evt-999' },
      retryCount: 0,
      maxRetries: 5
    })

    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/emergency?id=evt-999',
      expect.objectContaining({ method: 'DELETE' })
    )
    expect(outcome.status).toBe('synced')
  })

  it('returns permanent failure for an unsupported action/table combo', async () => {
    const outcome = await executeOfflineAction({
      id: 'a7',
      type: 'delete',
      table: 'emergency_events',
      data: {}, // missing id
      retryCount: 0,
      maxRetries: 5
    })

    expect(outcome.status).toBe('failed_permanently')
  })
})
