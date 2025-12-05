/**
 * Accessibility configuration for OpenRelief
 * 
 * Defines WCAG compliance levels, testing rules,
 * and accessibility preferences for the application.
 */

export interface AccessibilityConfig {
  /**
   * WCAG compliance level target
   */
  wcagLevel: 'A' | 'AA' | 'AAA'
  
  /**
   * Whether to enable accessibility testing in development
   */
  enableTesting: boolean
  
  /**
   * Whether to enable accessibility linting
   */
  enableLinting: boolean
  
  /**
   * Accessibility testing rules to apply
   */
  testRules: string[]
  
  /**
   * Custom accessibility rules
   */
  customRules: AccessibilityRule[]
  
  /**
   * Default accessibility settings
   */
  defaultSettings: {
    highContrast: boolean
    largeText: boolean
    reducedMotion: boolean
    screenReader: boolean
    keyboardNavigation: boolean
    textSize: 'small' | 'medium' | 'large' | 'extra-large'
    colorScheme: 'light' | 'dark' | 'high-contrast'
    showFocusIndicators: boolean
    audioAnnouncements: boolean
  }
}

export interface AccessibilityRule {
  /**
   * Unique identifier for the rule
   */
  id: string
  
  /**
   * Human-readable name for the rule
   */
  name: string
  
  /**
   * Description of what the rule checks
   */
  description: string
  
  /**
   * WCAG guideline reference
   */
  wcagGuideline: string
  
  /**
   * Severity level for violations
   */
  severity: 'error' | 'warning' | 'info'
  
  /**
   * Selector for elements to test
   */
  selector: string
  
  /**
   * Test function that returns violation details
   */
  test: (element: HTMLElement) => AccessibilityViolation | null
  
  /**
   * Whether the rule is enabled
   */
  enabled: boolean
}

export interface AccessibilityViolation {
  /**
   * Rule that was violated
   */
  rule: string
  
  /**
   * Element that violated the rule
   */
  element: HTMLElement
  
  /**
   * Message describing the violation
   */
  message: string
  
  /**
   * Suggestion for fixing the violation
   */
  suggestion: string
  
  /**
   * Severity of the violation
   */
  severity: 'error' | 'warning' | 'info'
  
  /**
   * WCAG guideline reference
   */
  wcagGuideline: string
}

/**
 * Default accessibility configuration
 */
export const defaultAccessibilityConfig: AccessibilityConfig = {
  wcagLevel: 'AA',
  enableTesting: process.env.NODE_ENV === 'development',
  enableLinting: true,
  testRules: [
    'keyboard-navigation',
    'focus-management',
    'aria-labels',
    'color-contrast',
    'heading-structure',
    'image-alt-text',
    'form-labels',
    'link-purpose',
    'skip-links',
    'landmark-regions',
    'table-headers',
    'list-structure',
    'button-states',
    'form-validation',
    'error-handling',
    'timing-adjustments',
  ],
  customRules: [],
  defaultSettings: {
    highContrast: false,
    largeText: false,
    reducedMotion: false,
    screenReader: false,
    keyboardNavigation: true,
    textSize: 'medium',
    colorScheme: 'light',
    showFocusIndicators: true,
    audioAnnouncements: false,
  },
}

/**
 * WCAG 2.1 guidelines reference
 */
export const wcagGuidelines = {
  '1.1.1': 'Non-text Content: All non-text content that is presented to the user has a text alternative',
  '1.2.1': 'Audio-only and Video-only: For audio-only and video-only content, provide alternatives',
  '1.2.2': 'Captions: Provide captions for synchronized media',
  '1.2.3': 'Audio Description or Media Alternative: Provide an audio description for video',
  '1.2.4': 'Live Captions: Provide live captions for live synchronized media',
  '1.2.5': 'Full Description: Provide full description for synchronized media',
  '1.3.1': 'Info and Relationships: Structure content using markup to convey relationships',
  '1.3.2': 'Meaningful Sequence: Structure content in a meaningful sequence',
  '1.3.3': 'Sensory Characteristics: Provide instructions to help users understand content',
  '1.3.4': 'Orientation: Content does not restrict its orientation',
  '1.3.5': 'Input Modalities: Content can be operated without vision',
  '1.3.6': 'Identify Purpose: Identify input purpose and predict results',
  '1.4.1': 'Use of Color: Color is not used as the only means of conveying information',
  '1.4.2': 'Audio Control: Provide audio control for synchronized media',
  '1.4.3': 'Contrast: Contrast ratio of at least 4.5:1',
  '1.4.4': 'Resize Text: Text can be resized without assistive technology',
  '1.4.5': 'Images of Text: Text images can be resized without assistive technology',
  '1.4.6': 'Contrast Enhanced: Contrast ratio of at least 7:1',
  '1.4.7': 'Low Background: No background audio or background images',
  '1.4.8': 'Foreground: Text spacing and line height can be adjusted',
  '1.4.9': 'Text Images: Text images can be disabled',
  '1.4.10': 'Reflow: Content can be presented without loss of information',
  '2.1.1': 'Keyboard: All functionality is available via keyboard',
  '2.1.2': 'No Keyboard Trap: Keyboard focus can be moved away',
  '2.1.3': 'Keyboard Operation: No keyboard-operated time limits',
  '2.1.4': 'Character Key Shortcuts: Character key shortcuts can be disabled',
  '2.2.1': 'Timing Adjustable: Users can control time limits',
  '2.2.2': 'Pause, Stop, Hide: Users can pause, stop, or hide moving content',
  '2.2.3': 'No Flashing: No content flashes more than 3 times per second',
  '2.2.4': 'Motion Animation: Users can disable motion animations',
  '2.3.1': 'Navigation Order: Navigation order is logical and intuitive',
  '2.3.2': 'Focus Visible: Focus indicator is visible',
  '2.3.3': 'Focus Order: Focus order preserves meaning',
  '2.4.1': 'Component Name: Components have accessible names',
  '2.4.2': 'Role, State, Value: Role, state, and value can be programmatically set',
  '2.4.3': 'Status Messages: Status messages can be programmatically determined',
  '2.4.4': 'Labels: Labels are provided for all form controls',
  '2.4.5': 'Error Identification: Errors are identified and described',
  '2.4.6': 'Labels or Instructions: Labels or instructions are provided when needed',
  '2.5.1': 'Dragging: Dragging movements can be cancelled',
  '2.5.2': 'Label Purpose: Purpose of draggable content is identified',
  '2.5.3': 'Label in Name: Accessible name includes drag purpose',
  '2.5.4': 'Drag Operation: Dragging operation does not change content',
  '3.1.1': 'Language: Language of page can be programmatically determined',
  '3.1.2': 'Reading Order: Reading order is logical and intuitive',
  '3.2.1': 'On Focus: Focus appearance changes are predictable',
  '3.2.2': 'On Input: Input behavior is predictable',
  '3.2.3': 'Navigation Consistent: Navigation is consistent',
  '3.2.4': 'Identification: Components are identified consistently',
  '3.3.1': 'Error Prevention: Error prevention is available and suggested',
  '3.3.2': 'Labels or Instructions: Labels or instructions are provided',
  '3.3.3': 'Error Suggestion: Context-sensitive help is available',
  '3.3.4': 'Error Recovery: Error recovery is possible',
  '4.1.1': 'Parsing: Content can be parsed by assistive technologies',
  '4.1.2': 'Name, Role, Value: Name, role, and value can be programmatically set',
  '4.1.3': 'Status Messages: Status messages can be programmatically determined',
}

/**
 * Accessibility testing categories
 */
export const accessibilityTestCategories = {
  keyboard: 'Keyboard Accessibility',
  focus: 'Focus Management',
  aria: 'ARIA Attributes',
  color: 'Color and Contrast',
  structure: 'Content Structure',
  forms: 'Form Accessibility',
  navigation: 'Navigation',
  media: 'Media Accessibility',
  timing: 'Timing and Animations',
  error: 'Error Handling',
  semantic: 'Semantic HTML',
}

/**
 * Accessibility severity levels
 */
export const accessibilitySeverity = {
  error: 'Error - WCAG A violation',
  warning: 'Warning - WCAG AA violation',
  info: 'Info - Best practice recommendation',
}

/**
 * Screen reader detection patterns
 */
export const screenReaderPatterns = [
  /\bNVDA\b/,
  /\bJAWS\b/,
  /\bWindow-Eyes\b/,
  /\bVoiceOver\b/,
  /\bTalkBack\b/,
  /\bOrca\b/,
  /\bChromeVox\b/,
]

/**
 * Browser accessibility API support
 */
export const accessibilityAPISupport = {
  ariaAttributes: 'aria-attributes' in document.documentElement,
  ariaRoles: 'role' in document.documentElement,
  semanticElements: 'main' in document.createElement('div').constructor.prototype,
  customElements: 'customElements' in window,
  intersectionObserver: 'IntersectionObserver' in window,
  mutationObserver: 'MutationObserver' in window,
  resizeObserver: 'ResizeObserver' in window,
}

/**
 * Accessibility testing thresholds
 */
export const accessibilityThresholds = {
  contrastRatio: {
    minimum: 3.0, // WCAG A
    enhanced: 4.5, // WCAG AA
    maximum: 7.0, // WCAG AAA
  },
  tapTargetSize: {
    minimum: 44, // WCAG AA
    recommended: 48, // iOS HIG
  },
  fontSize: {
    minimum: 16, // WCAG AA
    recommended: 18, // Better readability
  },
  lineHeight: {
    minimum: 1.5, // WCAG AA
    recommended: 1.8, // Better readability
  },
  spacing: {
    minimum: 0.04, // 4% of font size
    recommended: 0.06, // 6% of font size
  },
}

/**
 * Accessibility color schemes
 */
export const accessibilityColorSchemes = {
  light: {
    name: 'Light',
    background: '#ffffff',
    foreground: '#000000',
    primary: '#007bff',
    secondary: '#6c757d',
  },
  dark: {
    name: 'Dark',
    background: '#1a1a1a',
    foreground: '#ffffff',
    primary: '#0d6efd',
    secondary: '#6c757d',
  },
  highContrast: {
    name: 'High Contrast',
    background: '#000000',
    foreground: '#ffffff',
    primary: '#ffff00',
    secondary: '#808080',
  },
}

/**
 * Accessibility font families optimized for readability
 */
export const accessibilityFonts = {
  sans: [
    'Inter',
    'Roboto',
    'Open Sans',
    'Helvetica Neue',
    'Arial',
    'sans-serif',
  ],
  serif: [
    'Georgia',
    'Times New Roman',
    'serif',
  ],
  mono: [
    'JetBrains Mono',
    'Fira Code',
    'Consolas',
    'Monaco',
    'monospace',
  ],
}

/**
 * Accessibility breakpoints for responsive design
 */
export const accessibilityBreakpoints = {
  mobile: {
    max: 767,
    description: 'Mobile devices',
  },
  tablet: {
    min: 768,
    max: 1023,
    description: 'Tablet devices',
  },
  desktop: {
    min: 1024,
    description: 'Desktop devices',
  },
  large: {
    min: 1440,
    description: 'Large screens',
  },
  xlarge: {
    min: 1920,
    description: 'Extra large screens',
  },
}