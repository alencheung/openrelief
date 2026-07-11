import { renderHook, act } from '@testing-library/react'
import { useStatusCheckIn } from '@/hooks/useStatusCheckIn'
import { useCheckInStore } from '@/store/checkInStore'

describe('Status Check-in System', () => {
  beforeEach(() => {
    const { reset } = useCheckInStore.getState()
    reset()
  })

  describe('useStatusCheckIn Hook', () => {
    it('should create a safe check-in', () => {
      const { result } = renderHook(() => useStatusCheckIn())
      let checkIn: any
      act(() => {
        checkIn = result.current.createCheckIn({
          userId: 'user-123', userName: 'John Doe', status: 'safe',
          message: 'I am safe at home', isPublic: true, visibleToContacts: true
        })
      })
      expect(checkIn).toBeDefined()
      expect(checkIn.status).toBe('safe')
      expect(checkIn.userId).toBe('user-123')
      expect(result.current.checkIns.length).toBe(1)
    })

    it('should mark user as safe', () => {
      const { result } = renderHook(() => useStatusCheckIn())
      let checkIn: any
      act(() => { checkIn = result.current.markAsSafe('user-456', 'event-789') })
      expect(checkIn.status).toBe('safe')
      expect(checkIn.eventId).toBe('event-789')
      expect(result.current.myCheckIns.length).toBe(1)
    })

    it('should mark user as needing help', () => {
      const { result } = renderHook(() => useStatusCheckIn())
      let checkIn: any
      act(() => { checkIn = result.current.markAsNeedHelp('user-789', 'event-123', ['medical', 'rescue']) })
      expect(checkIn.status).toBe('need_help')
      expect(result.current.checkIns.length).toBe(1)
    })

    it('should mark user as not in area', () => {
      const { result } = renderHook(() => useStatusCheckIn())
      let checkIn: any
      act(() => { checkIn = result.current.markAsNotInArea('user-321', 'event-456') })
      expect(checkIn.eventId).toBe('event-456')
      expect(result.current.checkIns.length).toBe(1)
    })

    it('should update check-in status', () => {
      const { result } = renderHook(() => useStatusCheckIn())
      let original: any
      act(() => {
        original = result.current.createCheckIn({
          userId: 'user-111', userName: 'Test User', status: 'need_help',
          message: 'Need assistance', isPublic: true, visibleToContacts: true
        })
      })
      act(() => { result.current.updateStatus(original.id, 'safe', 'Update: I am safe now') })
      const updated = result.current.checkIns.find((c: any) => c.id === original.id)
      expect(updated?.status).toBe('safe')
      expect(updated?.message).toBe('Update: I am safe now')
    })

    it('should set public visibility', () => {
      const { result } = renderHook(() => useStatusCheckIn())
      let checkIn: any
      act(() => {
        checkIn = result.current.createCheckIn({
          userId: 'user-222', userName: 'Private User', status: 'safe',
          message: 'Safe', isPublic: false, visibleToContacts: false
        })
      })
      act(() => { result.current.setPublicVisibility(checkIn.id, true) })
      const updated = result.current.checkIns.find((c: any) => c.id === checkIn.id)
      expect(updated?.isPublic).toBe(true)
    })

    it('should get event summary', () => {
      const { result } = renderHook(() => useStatusCheckIn())
      act(() => {
        result.current.createCheckIn({ userId: 'u1', userName: 'U1', status: 'safe', eventId: 'event-x', isPublic: true, visibleToContacts: true })
        result.current.createCheckIn({ userId: 'u2', userName: 'U2', status: 'need_help', eventId: 'event-x', isPublic: true, visibleToContacts: true })
      })
      const summary = result.current.getEventSummary('event-x')
      expect(summary).toBeDefined()
    })

    it('should clean expired check-ins', () => {
      const { result } = renderHook(() => useStatusCheckIn())
      act(() => {
        result.current.createCheckIn({ userId: 'old', userName: 'Old', status: 'safe', isPublic: true, visibleToContacts: true, timestamp: new Date(Date.now() - 48*60*60*1000).toISOString() })
        result.current.createCheckIn({ userId: 'user-456', userName: 'Recent', status: 'safe', isPublic: true, visibleToContacts: true })
      })
      act(() => { result.current.cleanExpiredCheckIns() })
      expect(result.current.checkIns.length).toBe(1)
      expect(result.current.checkIns[0]?.userId).toBe('user-456')
    })
  })

  describe('Check-in Privacy Controls', () => {
    it('should respect isPublic flag', () => {
      const { result } = renderHook(() => useStatusCheckIn())
      act(() => {
        result.current.createCheckIn({ userId: 'a', userName: 'A', status: 'safe', isPublic: true, visibleToContacts: true })
        result.current.createCheckIn({ userId: 'b', userName: 'B', status: 'safe', isPublic: false, visibleToContacts: false })
      })
      act(() => { result.current.setFilters({ isPublic: true }) })
      expect(result.current.checkIns.length).toBe(1)
      expect(result.current.checkIns[0]?.isPublic).toBe(true)
    })

    it('should filter by event ID', () => {
      const { result } = renderHook(() => useStatusCheckIn())
      act(() => {
        result.current.createCheckIn({ userId: 'x', userName: 'X', status: 'safe', eventId: 'event-123', isPublic: true, visibleToContacts: true })
        result.current.createCheckIn({ userId: 'y', userName: 'Y', status: 'safe', eventId: 'event-456', isPublic: true, visibleToContacts: true })
      })
      act(() => { result.current.setFilters({ eventId: 'event-123' }) })
      expect(result.current.checkIns.length).toBe(1)
      expect(result.current.checkIns[0]?.eventId).toBe('event-123')
    })
  })
})
