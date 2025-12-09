// Accessibility hooks for OpenRelief
export {
  useFocusManagement,
  useFocusRestore,
  useFocusOrder
} from './useFocusManagement'

export {
  useKeyboardNavigation,
  useArrowNavigation,
  useRovingTabIndex
} from './useKeyboardNavigation'

export {
  useAriaAnnouncer,
  usePageTitleAnnouncer,
  useStatusAnnouncer,
  useFormValidationAnnouncer
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
  useReducedMotionCSSProperties
} from './useReducedMotion'

export {
  useColorContrast,
  validateContrast,
  validateElementContrast,
  validatePageContrast,
  getContrastImprovements,
  applyHighContrastMode,
  removeHighContrastMode,
  toggleHighContrastMode,
  isHighContrastModeActive
} from '../lib/accessibility/color-contrast'

export {
  runAccessibilityAudit,
  runDefaultAccessibilityTests,
  runCIAccessibilityTests,
  accessibilityAuditor
} from '../lib/accessibility/accessibility-audit'

export {
  runAccessibilityTests,
  AccessibilityTestSuite,
  defaultTestConfig,
  AccessibilityTestResult,
  AccessibilityTestConfig
} from '../lib/accessibility/accessibility-testing'

// Re-export types
export type {
  FocusManagementOptions,
  FocusElement
} from './useFocusManagement'

export type {
  KeyboardShortcut,
  KeyboardNavigationOptions,
  KeyboardNavigationState
} from './useKeyboardNavigation'

export type {
  AriaAnnouncement,
  AriaAnnouncerOptions
} from './useAriaAnnouncer'

export type {
  ReducedMotionOptions,
  ReducedMotionState
} from './useReducedMotion'

export type {
  AccessibilityAuditResult,
  AccessibilityIssue,
  AccessibilityRecommendation
} from '../lib/accessibility/accessibility-audit'

export type {
  AccessibilityTestResult,
  AccessibilityTestConfig,
  AccessibilityTestCase
} from '../lib/accessibility/accessibility-testing'

export type {
  ColorContrastResult,
  ContrastValidationOptions
} from '../lib/accessibility/color-contrast'