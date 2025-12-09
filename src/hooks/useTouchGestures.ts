'use client'

import { useRef, useCallback, useEffect } from 'react'

export interface TouchPoint {
  x: number
  y: number
  time: number
}

export interface TouchGestureState {
  isActive: boolean
  startPoint: TouchPoint | null
  currentPoint: TouchPoint | null
  velocity: { x: number; y: number }
  distance: { x: number; y: number }
  direction: 'up' | 'down' | 'left' | 'right' | null
  duration: number
}

export interface TouchGestureCallbacks {
  onTap?: (point: TouchPoint) => void
  onDoubleTap?: (point: TouchPoint) => void
  onLongPress?: (point: TouchPoint) => void
  onSwipe?: (direction: 'up' | 'down' | 'left' | 'right', velocity: { x: number; y: number }) => void
  onPinch?: (scale: number, center: TouchPoint) => void
  onRotate?: (rotation: number, center: TouchPoint) => void
  onTouchStart?: (point: TouchPoint) => void
  onTouchMove?: (state: TouchGestureState) => void
  onTouchEnd?: (state: TouchGestureState) => void
}

export interface TouchGestureOptions {
  tapThreshold?: number
  doubleTapDelay?: number
  longPressDelay?: number
  swipeThreshold?: number
  swipeVelocityThreshold?: number
  pinchThreshold?: number
  rotateThreshold?: number
  preventDefault?: boolean
  stopPropagation?: boolean
}

const defaultOptions: Required<TouchGestureOptions> = {
  tapThreshold: 10,
  doubleTapDelay: 300,
  longPressDelay: 500,
  swipeThreshold: 50,
  swipeVelocityThreshold: 0.5,
  pinchThreshold: 20,
  rotateThreshold: 15,
  preventDefault: false,
  stopPropagation: false
}

export function useTouchGestures(
  callbacks: TouchGestureCallbacks = {},
  options: TouchGestureOptions = {}
) {
  const optionsRef = useRef({ ...defaultOptions, ...options })
  const stateRef = useRef<TouchGestureState>({
    isActive: false,
    startPoint: null,
    currentPoint: null,
    velocity: { x: 0, y: 0 },
    distance: { x: 0, y: 0 },
    direction: null,
    duration: 0
  })

  const lastTapRef = useRef<TouchPoint | null>(null)
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null)
  const initialDistanceRef = useRef<number>(0)
  const initialAngleRef = useRef<number>(0)
  const touchesRef = useRef<TouchList | null>(null)

  const calculateDistance = useCallback((p1: TouchPoint, p2: TouchPoint): number => {
    const dx = p2.x - p1.x
    const dy = p2.y - p1.y
    return Math.sqrt(dx * dx + dy * dy)
  }, [])

  const calculateAngle = useCallback((p1: TouchPoint, p2: TouchPoint): number => {
    const dx = p2.x - p1.x
    const dy = p2.y - p1.y
    return Math.atan2(dy, dx) * 180 / Math.PI
  }, [])

  const getTouchPoint = useCallback((touch: Touch): TouchPoint => ({
    x: touch.clientX,
    y: touch.clientY,
    time: Date.now()
  }), [])

  const getMidpoint = useCallback((touch1: Touch, touch2: Touch): TouchPoint => ({
    x: (touch1.clientX + touch2.clientX) / 2,
    y: (touch1.clientY + touch2.clientY) / 2,
    time: Date.now()
  }), [])

  const getDirection = useCallback((dx: number, dy: number): 'up' | 'down' | 'left' | 'right' | null => {
    const absDx = Math.abs(dx)
    const absDy = Math.abs(dy)

    if (Math.max(absDx, absDy) < optionsRef.current.swipeThreshold) {
      return null
    }

    return absDx > absDy ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up')
  }, [])

  const handleTouchStart = useCallback((event: TouchEvent) => {
    const options = optionsRef.current

    if (options.preventDefault) {
      event.preventDefault()
    }
    if (options.stopPropagation) {
      event.stopPropagation()
    }

    touchesRef.current = event.touches
    const touch = event.touches[0]
    const point = getTouchPoint(touch)

    stateRef.current = {
      isActive: true,
      startPoint: point,
      currentPoint: point,
      velocity: { x: 0, y: 0 },
      distance: { x: 0, y: 0 },
      direction: null,
      duration: 0
    }

    // Handle multi-touch gestures
    if (event.touches.length === 2) {
      const touch1 = event.touches[0]
      const touch2 = event.touches[1]

      initialDistanceRef.current = calculateDistance(
        getTouchPoint(touch1),
        getTouchPoint(touch2)
      )
      initialAngleRef.current = calculateAngle(
        getTouchPoint(touch1),
        getTouchPoint(touch2)
      )
    }

    // Clear any existing long press timer
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
    }

    // Set long press timer
    longPressTimerRef.current = setTimeout(() => {
      if (stateRef.current.isActive && event.touches.length === 1) {
        callbacks.onLongPress?.(point)
      }
    }, options.longPressDelay)

    callbacks.onTouchStart?.(point)
  }, [callbacks, getTouchPoint, calculateDistance, calculateAngle])

  const handleTouchMove = useCallback((event: TouchEvent) => {
    const options = optionsRef.current
    const state = stateRef.current

    if (!state.isActive || !state.startPoint) {
      return
    }

    if (options.preventDefault) {
      event.preventDefault()
    }
    if (options.stopPropagation) {
      event.stopPropagation()
    }

    touchesRef.current = event.touches
    const touch = event.touches[0]
    const currentPoint = getTouchPoint(touch)
    const currentTime = currentPoint.time
    const startTime = state.startPoint.time
    const duration = currentTime - startTime

    const dx = currentPoint.x - state.startPoint.x
    const dy = currentPoint.y - state.startPoint.y
    const distance = Math.sqrt(dx * dx + dy * dy)

    // Calculate velocity
    const velocity = {
      x: duration > 0 ? dx / duration : 0,
      y: duration > 0 ? dy / duration : 0
    }

    // Update state
    stateRef.current = {
      ...state,
      currentPoint,
      velocity,
      distance: { x: dx, y: dy },
      direction: getDirection(dx, dy),
      duration
    }

    // Handle multi-touch gestures
    if (event.touches.length === 2) {
      const touch1 = event.touches[0]
      const touch2 = event.touches[1]
      const currentDistance = calculateDistance(
        getTouchPoint(touch1),
        getTouchPoint(touch2)
      )
      const currentAngle = calculateAngle(
        getTouchPoint(touch1),
        getTouchPoint(touch2)
      )
      const center = getMidpoint(touch1, touch2)

      // Pinch gesture
      if (initialDistanceRef.current > 0) {
        const scale = currentDistance / initialDistanceRef.current
        if (Math.abs(1 - scale) * 100 > options.pinchThreshold) {
          callbacks.onPinch?.(scale, center)
        }
      }

      // Rotate gesture
      if (initialAngleRef.current !== null) {
        const rotation = currentAngle - initialAngleRef.current
        if (Math.abs(rotation) > options.rotateThreshold) {
          callbacks.onRotate?.(rotation, center)
        }
      }
    }

    // Clear long press timer if moved too much
    if (distance > options.tapThreshold && longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }

    callbacks.onTouchMove?.(stateRef.current)
  }, [callbacks, getTouchPoint, getMidpoint, calculateDistance, calculateAngle, getDirection])

  const handleTouchEnd = useCallback((event: TouchEvent) => {
    const options = optionsRef.current
    const state = stateRef.current

    if (!state.isActive || !state.startPoint) {
      return
    }

    if (options.preventDefault) {
      event.preventDefault()
    }
    if (options.stopPropagation) {
      event.stopPropagation()
    }

    // Clear long press timer
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }

    const endPoint = state.currentPoint || state.startPoint
    const distance = calculateDistance(state.startPoint, endPoint)
    const dx = endPoint.x - state.startPoint.x
    const dy = endPoint.y - state.startPoint.y
    const direction = getDirection(dx, dy)

    // Handle tap
    if (distance < options.tapThreshold && event.touches.length === 0) {
      const currentTime = Date.now()

      // Check for double tap
      if (lastTapRef.current) {
        const timeSinceLastTap = currentTime - lastTapRef.current.time
        const distanceFromLastTap = calculateDistance(lastTapRef.current, endPoint)

        if (timeSinceLastTap < options.doubleTapDelay
            && distanceFromLastTap < options.tapThreshold) {
          callbacks.onDoubleTap?.(endPoint)
          lastTapRef.current = null
        } else {
          callbacks.onTap?.(endPoint)
          lastTapRef.current = endPoint
        }
      } else {
        callbacks.onTap?.(endPoint)
        lastTapRef.current = endPoint
      }
    }

    // Handle swipe
    if (distance >= options.swipeThreshold && direction) {
      const velocity = state.velocity
      const velocityMagnitude = Math.sqrt(velocity.x ** 2 + velocity.y ** 2)

      if (velocityMagnitude >= options.swipeVelocityThreshold) {
        callbacks.onSwipe?.(direction, velocity)
      }
    }

    // Reset state
    stateRef.current = {
      isActive: false,
      startPoint: null,
      currentPoint: null,
      velocity: { x: 0, y: 0 },
      distance: { x: 0, y: 0 },
      direction: null,
      duration: 0
    }

    touchesRef.current = null
    initialDistanceRef.current = 0
    initialAngleRef.current = 0

    callbacks.onTouchEnd?.(stateRef.current)
  }, [callbacks, calculateDistance, getDirection])

  const elementRef = useRef<HTMLElement | null>(null)

  const ref = useCallback((element: HTMLElement | null) => {
    if (elementRef.current) {
      elementRef.current.removeEventListener('touchstart', handleTouchStart, { passive: false })
      elementRef.current.removeEventListener('touchmove', handleTouchMove, { passive: false })
      elementRef.current.removeEventListener('touchend', handleTouchEnd, { passive: false })
      elementRef.current.removeEventListener('touchcancel', handleTouchEnd, { passive: false })
    }

    elementRef.current = element

    if (element) {
      element.addEventListener('touchstart', handleTouchStart, { passive: false })
      element.addEventListener('touchmove', handleTouchMove, { passive: false })
      element.addEventListener('touchend', handleTouchEnd, { passive: false })
      element.addEventListener('touchcancel', handleTouchEnd, { passive: false })
    }
  }, [handleTouchStart, handleTouchMove, handleTouchEnd])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (elementRef.current) {
        elementRef.current.removeEventListener('touchstart', handleTouchStart, { passive: false })
        elementRef.current.removeEventListener('touchmove', handleTouchMove, { passive: false })
        elementRef.current.removeEventListener('touchend', handleTouchEnd, { passive: false })
        elementRef.current.removeEventListener('touchcancel', handleTouchEnd, { passive: false })
      }

      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current)
      }
    }
  }, [handleTouchStart, handleTouchMove, handleTouchEnd])

  return {
    ref,
    state: stateRef.current
  }
}

// Simplified hooks for common gestures
export function useSwipe(
  onSwipe: (direction: 'up' | 'down' | 'left' | 'right') => void,
  options?: Partial<TouchGestureOptions>
) {
  return useTouchGestures({
    onSwipe: (direction) => onSwipe(direction)
  }, options)
}

export function useTap(
  onTap: (point: TouchPoint) => void,
  options?: Partial<TouchGestureOptions>
) {
  return useTouchGestures({
    onTap
  }, options)
}

export function useLongPress(
  onLongPress: (point: TouchPoint) => void,
  options?: Partial<TouchGestureOptions>
) {
  return useTouchGestures({
    onLongPress
  }, options)
}