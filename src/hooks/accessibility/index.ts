// Accessibility hooks for OpenRelief
export {
  useFocusManagement,
  useFocusRestore,
  useFocusOrder,
} from './useFocusManagement'

export {
  useKeyboardNavigation,
  useArrowNavigation,
  useRovingTabIndex,
} from './useKeyboardNavigation'

export {
  useAriaAnnouncer,
  usePageTitleAnnouncer,
  useStatusAnnouncer,
  useFormValidationAnnouncer,
} from './useAriaAnnouncer'

export {
  useReducedMotion,
  useReducedMotionAnimation,
  useReducedMotionTransition,
  useReducedMotionClass,
  useReducedMotionAnimationFrame,
  useReducedMotionScroll,
  useReducedMotionCarousel,
  useReducedMotionVideo,
  useReducedMotionCSSProperties,
} from './useReducedMotion'

// Re-export types
export type {
  FocusManagementOptions,
  FocusElement,
} from './useFocusManagement'

export type {
  KeyboardShortcut,
  KeyboardNavigationOptions,
  KeyboardNavigationState,
} from './useKeyboardNavigation'

export type {
  AriaAnnouncement,
  AriaAnnouncerOptions,
} from './useAriaAnnouncer'

export type {
  ReducedMotionOptions,
  ReducedMotionState,
} from './useReducedMotion'