// Accessibility components for OpenRelief
export {
  SkipLinks,
  DefaultSkipLinks,
  useSkipLinks,
} from './SkipLinks'

export {
  FocusTrap,
  useFocusTrapElement,
  withFocusTrap,
  createTemporaryFocusTrap,
  useFocusTrapStack,
} from './FocusTrap'

export {
  ScreenReaderOnly,
  ScreenReaderStatus,
  ScreenReaderContext,
  ScreenReaderFieldDescription,
  ScreenReaderFieldError,
  ScreenReaderFieldSuccess,
  ScreenReaderTableCaption,
  ScreenReaderFigureDescription,
  useScreenReaderAnnouncer,
  useScreenReaderFocus,
} from './ScreenReaderOnly'

export {
  KeyboardHelp,
  DefaultKeyboardHelp,
  useKeyboardHelp,
} from './KeyboardHelp'

export {
  AccessibilityPanel,
  useAccessibilitySettings,
} from './AccessibilityPanel'

export {
  EmergencyAccessibility,
  useEmergencyAccessibility,
} from './EmergencyAccessibility'

export {
  MotorAccessibility,
  useMotorAccessibility,
} from './MotorAccessibility'

// Re-export types
export type {
  SkipLink,
  SkipLinksProps,
} from './SkipLinks'

export type {
  FocusTrapProps,
} from './FocusTrap'

export type {
  ScreenReaderOnlyProps,
  ScreenReaderStatusProps,
  ScreenReaderContextProps,
  ScreenReaderFieldDescriptionProps,
  ScreenReaderFieldErrorProps,
  ScreenReaderFieldSuccessProps,
  ScreenReaderTableCaptionProps,
  ScreenReaderFigureDescriptionProps,
} from './ScreenReaderOnly'

export type {
  KeyboardShortcut,
  KeyboardHelpProps,
} from './KeyboardHelp'

export type {
  AccessibilitySettings,
  AccessibilityPanelProps,
} from './AccessibilityPanel'

export type {
  EmergencyAccessibilityProps,
  EmergencyAccessibilitySettings,
} from './EmergencyAccessibility'

export type {
  MotorAccessibilityProps,
  MotorAccessibilitySettings,
} from './MotorAccessibility'