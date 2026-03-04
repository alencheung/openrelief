import { useStatusCheckIn } from '@/hooks/useStatusCheckIn'
import { useCheckInStore } from '@/store/checkInStore'

describe('Status Check-in System', () => {
  beforeEach(() => {
    const { reset } = useCheckInStore.getState()
    reset()
  })

  describe('useStatusCheckIn Hook', () => {
    it('should create a safe check-in', () => {
      const { createCheckIn, checkIns } = useStatusCheckIn()

      const checkIn = createCheckIn({
        userId: 'user-123',
        userName: 'John Doe',
        status: 'safe',
        message: 'I am safe at home',
        isPublic: true,
        visibleToContacts: true
      })

      expect(checkIn).toBeDefined()
      expect(checkIn.status).toBe('safe')
      expect(checkIn.userId).toBe('user-123')
      expect(checkIns.length).toBe(1)
    })

    it('should mark user as safe', () => {
      const { markAsSafe, myCheckIns } = useStatusCheckIn()

      const checkIn = markAsSafe('user-456', 'event-789')

      expect(checkIn.status).toBe('safe')
      expect(checkIn.eventId).toBe('event-789')
      expect(checkIn.isPublic).toBe(true)
      expect(myCheckIns.length).toBe(1)
    })

    it('should mark user as needing help', () => {
      const { markAsNeedHelp, checkIns } = useStatusCheckIn()

      const checkIn = markAsNeedHelp(
        'user-789',
        ['medical', 'rescue'],
        'event-123'
      )

      expect(checkIn.status).toBe('need_help')
      expect(checkIn.needsHelpType).toEqual(['medical', 'rescue'])
      expect(checkIns.length).toBe(1)
    })

    it('should mark user as not in area', () => {
      const { markAsNotInArea, checkIns } = useStatusCheckIn()

      const checkIn = markAsNotInArea('user-101', 'event-456')

      expect(checkIn.status).toBe('not_in_area')
      expect(checkIn.eventId).toBe('event-456')
      expect(checkIn.isPublic).toBe(false)
      expect(checkIns.length).toBe(1)
    })

    it('should update check-in status', () => {
      const { createCheckIn, updateStatus, checkIns } = useStatusCheckIn()

      const original = createCheckIn({
        userId: 'user-123',
        status: 'unknown',
        isPublic: true
      })

      updateStatus(original.id, {
        status: 'safe',
        message: 'Update: I am safe now'
      })

      const updated = checkIns.find(c => c.id === original.id)
      expect(updated?.status).toBe('safe')
      expect(updated?.message).toBe('Update: I am safe now')
    })

    it('should set public visibility', () => {
      const { createCheckIn, setPublicVisibility, checkIns } = useStatusCheckIn()

      const checkIn = createCheckIn({
        userId: 'user-123',
        status: 'safe',
        isPublic: false
      })

      setPublicVisibility(checkIn.id, true)

      const updated = checkIns.find(c => c.id === checkIn.id)
      expect(updated?.isPublic).toBe(true)
    })

    it('should get event summary', () => {
      const { markAsSafe, markAsNeedHelp, getEventSummary } = useStatusCheckIn()

      markAsSafe('user-1', 'event-123')
      markAsSafe('user-2', 'event-123')
      markAsNeedHelp('user-3', ['medical'], 'event-123')
      markAsSafe('user-4', 'event-456')

      const summary = getEventSummary('event-123')

      expect(summary.totalCheckIns).toBe(3)
      expect(summary.safe).toBe(2)
      expect(summary.needHelp).toBe(1)
      expect(summary.notInArea).toBe(0)
      expect(summary.unknown).toBe(0)
    })

    it('should clean expired check-ins', () => {
      const { createCheckIn, cleanExpiredCheckIns, checkIns } = useStatusCheckIn()

      createCheckIn({
        userId: 'user-123',
        status: 'safe',
        expiresAfterHours: -1
      })

      createCheckIn({
        userId: 'user-456',
        status: 'safe',
        expiresAfterHours: 72
      })

      cleanExpiredCheckIns()

      expect(checkIns.length).toBe(1)
      expect(checkIns[0]?.userId).toBe('user-456')
    })
  })

  describe('Check-in Privacy Controls', () => {
    it('should respect isPublic flag', () => {
      const { createCheckIn, setFilters, checkIns } = useStatusCheckIn()

      createCheckIn({
        userId: 'user-123',
        status: 'safe',
        isPublic: true
      })

      createCheckIn({
        userId: 'user-456',
        status: 'safe',
        isPublic: false
      })

      setFilters({ isPublic: true })

      expect(checkIns.length).toBe(1)
      expect(checkIns[0]?.isPublic).toBe(true)
    })

    it('should filter by event ID', () => {
      const { createCheckIn, setFilters, checkIns } = useStatusCheckIn()

      createCheckIn({
        userId: 'user-123',
        status: 'safe',
        eventId: 'event-123'
      })

      createCheckIn({
        userId: 'user-456',
        status: 'safe',
        eventId: 'event-456'
      })

      setFilters({ eventId: 'event-123' })

      expect(checkIns.length).toBe(1)
      expect(checkIns[0]?.eventId).toBe('event-123')
    })
  })
})
