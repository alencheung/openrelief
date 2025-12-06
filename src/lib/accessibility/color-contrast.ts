/**
 * Color Contrast Validation for OpenRelief
 * 
 * Provides comprehensive WCAG 2.1 AA color contrast validation
 * for ensuring text meets accessibility standards.
 */

export interface ColorContrastResult {
  /**
   * Whether contrast meets WCAG AA standards
   */
  passesAA: boolean
  /**
   * Whether contrast meets WCAG AAA standards
   */
  passesAAA: boolean
  /**
   * Contrast ratio
   */
  ratio: number
  /**
   * WCAG level achieved
   */
  level: 'AA' | 'AAA' | 'FAIL'
  /**
   * Font size category
   */
  fontSizeCategory: 'normal' | 'large'
  /**
   * Text color in RGB
   */
  textColor: { r: number; g: number; b: number }
  /**
   * Background color in RGB
   */
  backgroundColor: { r: number; g: number; b: number }
  /**
   * Hex color values
   */
  hexColors: {
    text: string
    background: string
  }
  /**
   * Recommendations for improvement
   */
  recommendations: string[]
}

export interface ContrastValidationOptions {
  /**
   * Minimum contrast ratio for AA compliance
   */
  minContrastAA?: number
  /**
   * Minimum contrast ratio for AAA compliance
   */
  minContrastAAA?: number
  /**
   * Font size threshold for large text
   */
  largeTextThreshold?: number
  /**
   * Whether to include color blindness simulation
   */
  includeColorBlindness?: boolean
  /**
   * Types of color blindness to simulate
   */
  colorBlindnessTypes?: ('protanopia' | 'deuteranopia' | 'tritanopia')[]
}

/**
 * WCAG 2.1 Contrast Requirements
 */
const WCAG_CONTRAST = {
  AA_NORMAL: 4.5,
  AA_LARGE: 3.0,
  AAA_NORMAL: 7.0,
  AAA_LARGE: 4.5,
  LARGE_TEXT_THRESHOLD: 18, // 18pt or 14pt bold
}

/**
 * Color Contrast Validator Class
 */
export class ColorContrastValidator {
  private options: ContrastValidationOptions

  constructor(options: ContrastValidationOptions = {}) {
    this.options = {
      minContrastAA: WCAG_CONTRAST.AA_NORMAL,
      minContrastAAA: WCAG_CONTRAST.AAA_NORMAL,
      largeTextThreshold: WCAG_CONTRAST.LARGE_TEXT_THRESHOLD,
      includeColorBlindness: true,
      colorBlindnessTypes: ['protanopia', 'deuteranopia', 'tritanopia'],
      ...options
    }
  }

  /**
   * Parse color from various formats
   */
  private parseColor(color: string): { r: number; g: number; b: number } | null {
    // Handle hex colors
    if (color.startsWith('#')) {
      return this.parseHexColor(color)
    }
    
    // Handle rgb/rgba colors
    if (color.startsWith('rgb')) {
      return this.parseRgbColor(color)
    }
    
    // Handle named colors
    return this.parseNamedColor(color)
  }

  /**
   * Parse hex color to RGB
   */
  private parseHexColor(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    if (!result) return null
    
    return {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    }
  }

  /**
   * Parse RGB color to RGB object
   */
  private parseRgbColor(rgb: string): { r: number; g: number; b: number } | null {
    const result = /rgba?\((\d+),\s*(\d+),\s*(\d+)/i.exec(rgb)
    if (!result) return null
    
    return {
      r: parseInt(result[1], 10),
      g: parseInt(result[2], 10),
      b: parseInt(result[3], 10)
    }
  }

  /**
   * Parse named color to RGB
   */
  private parseNamedColor(color: string): { r: number; g: number; b: number } | null {
    // Create a temporary element to get computed style
    const temp = document.createElement('div')
    temp.style.color = color
    document.body.appendChild(temp)
    
    const computedColor = window.getComputedStyle(temp).color
    document.body.removeChild(temp)
    
    return this.parseRgbColor(computedColor)
  }

  /**
   * Convert RGB to hex
   */
  private rgbToHex(r: number, g: number, b: number): string {
    return '#' + [r, g, b].map(x => {
      const hex = x.toString(16)
      return hex.length === 1 ? '0' + hex : hex
    }).join('')
  }

  /**
   * Calculate relative luminance
   */
  private calculateRelativeLuminance(r: number, g: number, b: number): number {
    const [rs, gs, bs] = [r, g, b].map(c => {
      c = c / 255
      return c <= 0.03928 
        ? c / 12.92 
        : Math.pow((c + 0.055) / 1.055, 2.4)
    })
    
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs
  }

  /**
   * Calculate contrast ratio
   */
  private calculateContrastRatio(l1: number, l2: number): number {
    const lighter = Math.max(l1, l2)
    const darker = Math.min(l1, l2)
    
    return (lighter + 0.05) / (darker + 0.05)
  }

  /**
   * Simulate color blindness
   */
  private simulateColorBlindness(
    r: number, 
    g: number, 
    b: number, 
    type: 'protanopia' | 'deuteranopia' | 'tritanopia'
  ): { r: number; g: number; b: number } {
    switch (type) {
      case 'protanopia': // Red-blind
        return {
          r: Math.round(0.567 * r + 0.433 * g),
          g: Math.round(0.558 * r + 0.442 * g),
          b: Math.round(0.242 * g + 0.758 * b)
        }
      
      case 'deuteranopia': // Green-blind
        return {
          r: Math.round(0.625 * r + 0.375 * g),
          g: Math.round(0.7 * r + 0.3 * g),
          b: Math.round(0.3 * r + 0.3 * g + 0.4 * b)
        }
      
      case 'tritanopia': // Blue-blind
        return {
          r: Math.round(0.95 * r + 0.05 * g),
          g: Math.round(0.433 * r + 0.567 * g),
          b: Math.round(0.475 * r + 0.525 * g)
        }
      
      default:
        return { r, g, b }
    }
  }

  /**
   * Validate color contrast
   */
  validateContrast(
    textColor: string,
    backgroundColor: string,
    fontSize: number = 16,
    isBold: boolean = false
  ): ColorContrastResult {
    // Parse colors
    const textColorRgb = this.parseColor(textColor)
    const backgroundColorRgb = this.parseColor(backgroundColor)
    
    if (!textColorRgb || !backgroundColorRgb) {
      return {
        passesAA: false,
        passesAAA: false,
        ratio: 0,
        level: 'FAIL',
        fontSizeCategory: 'normal',
        textColor: { r: 0, g: 0, b: 0 },
        backgroundColor: { r: 0, g: 0, b: 0 },
        hexColors: { text: '#000000', background: '#FFFFFF' },
        recommendations: ['Invalid color format provided']
      }
    }

    // Calculate relative luminance
    const textLuminance = this.calculateRelativeLuminance(textColorRgb.r, textColorRgb.g, textColorRgb.b)
    const bgLuminance = this.calculateRelativeLuminance(backgroundColorRgb.r, backgroundColorRgb.g, backgroundColorRgb.b)
    
    // Calculate contrast ratio
    const contrastRatio = this.calculateContrastRatio(textLuminance, bgLuminance)
    
    // Determine font size category
    const fontSizeCategory = fontSize >= this.options.largeTextThreshold || isBold 
      ? 'large' 
      : 'normal'
    
    // Determine WCAG compliance
    const minContrastAA = fontSizeCategory === 'large' 
      ? this.options.minContrastAA! || WCAG_CONTRAST.AA_LARGE
      : this.options.minContrastAA! || WCAG_CONTRAST.AA_NORMAL
    
    const minContrastAAA = fontSizeCategory === 'large' 
      ? this.options.minContrastAAA! || WCAG_CONTRAST.AAA_LARGE
      : this.options.minContrastAAA! || WCAG_CONTRAST.AAA_NORMAL
    
    const passesAA = contrastRatio >= minContrastAA
    const passesAAA = contrastRatio >= minContrastAAA
    
    // Generate recommendations
    const recommendations: string[] = []
    
    if (!passesAA) {
      const neededRatio = minContrastAA - contrastRatio
      recommendations.push(`Increase contrast ratio by at least ${neededRatio.toFixed(2)} to meet WCAG AA standards`)
      
      if (contrastRatio < 2) {
        recommendations.push('Consider using significantly different colors for better contrast')
      }
    }
    
    if (!passesAAA && passesAA) {
      const neededRatio = minContrastAAA - contrastRatio
      recommendations.push(`Increase contrast ratio by ${neededRatio.toFixed(2)} to meet WCAG AAA standards`)
    }
    
    // Check for color blindness issues
    if (this.options.includeColorBlindness) {
      for (const blindnessType of this.options.colorBlindnessTypes!) {
        const simulatedText = this.simulateColorBlindness(textColorRgb.r, textColorRgb.g, textColorRgb.b, blindnessType)
        const simulatedBg = this.simulateColorBlindness(backgroundColorRgb.r, backgroundColorRgb.g, backgroundColorRgb.b, blindnessType)
        const simulatedContrast = this.calculateContrastRatio(
          this.calculateRelativeLuminance(simulatedText.r, simulatedText.g, simulatedText.b),
          this.calculateRelativeLuminance(simulatedBg.r, simulatedBg.g, simulatedBg.b)
        )
        
        if (simulatedContrast < minContrastAA) {
          recommendations.push(`Poor contrast for users with ${blindnessType} color blindness`)
        }
      }
    }
    
    return {
      passesAA,
      passesAAA,
      ratio: Math.round(contrastRatio * 100) / 100,
      level: passesAAA ? 'AAA' : passesAA ? 'AA' : 'FAIL',
      fontSizeCategory,
      textColor: textColorRgb,
      backgroundColor: backgroundColorRgb,
      hexColors: {
        text: this.rgbToHex(textColorRgb.r, textColorRgb.g, textColorRgb.b),
        background: this.rgbToHex(backgroundColorRgb.r, backgroundColorRgb.g, backgroundColorRgb.b)
      },
      recommendations
    }
  }

  /**
   * Validate element contrast
   */
  validateElementContrast(element: HTMLElement): ColorContrastResult | null {
    const styles = window.getComputedStyle(element)
    const textColor = styles.color
    const backgroundColor = styles.backgroundColor
    
    // Get font size
    const fontSize = parseFloat(styles.fontSize || '16')
    const fontWeight = styles.fontWeight || 'normal'
    const isBold = fontWeight === 'bold' || parseInt(fontWeight) >= 700
    
    return this.validateContrast(textColor, backgroundColor, fontSize, isBold)
  }

  /**
   * Validate all text elements on page
   */
  validatePageContrast(): ColorContrastResult[] {
    const results: ColorContrastResult[] = []
    const textElements = document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, span, div, td, th, li, a, button')
    
    for (const element of textElements) {
      const result = this.validateElementContrast(element as HTMLElement)
      if (result && !result.passesAA) {
        results.push(result)
      }
    }
    
    return results
  }

  /**
   * Get contrast improvement suggestions
   */
  getContrastImprovements(
    textColor: string,
    backgroundColor: string
  ): { lightText: string; darkText: string; lightBg: string; darkBg: string } {
    const textRgb = this.parseColor(textColor)
    const bgRgb = this.parseColor(backgroundColor)
    
    if (!textRgb || !bgRgb) {
      return {
        lightText: '#000000',
        darkText: '#FFFFFF',
        lightBg: '#FFFFFF',
        darkBg: '#000000'
      }
    }
    
    // Calculate luminance
    const textLuminance = this.calculateRelativeLuminance(textRgb.r, textRgb.g, textRgb.b)
    const bgLuminance = this.calculateRelativeLuminance(bgRgb.r, bgRgb.g, bgRgb.b)
    
    // Determine which is lighter
    const textIsLighter = textLuminance > bgLuminance
    
    // Generate suggestions
    if (textIsLighter) {
      // Text is lighter than background - need darker text or lighter background
      return {
        lightText: this.rgbToHex(textRgb.r, textRgb.g, textRgb.b),
        darkText: '#000000',
        lightBg: this.rgbToHex(bgRgb.r, bgRgb.g, bgRgb.b),
        darkBg: '#FFFFFF'
      }
    } else {
      // Text is darker than background - need lighter text or darker background
      return {
        lightText: '#FFFFFF',
        darkText: this.rgbToHex(textRgb.r, textRgb.g, textRgb.b),
        lightBg: '#FFFFFF',
        darkBg: '#000000'
      }
    }
  }

  /**
   * Generate contrast report
   */
  generateContrastReport(issues: ColorContrastResult[]): string {
    if (issues.length === 0) {
      return '✅ All text elements meet WCAG 2.1 AA contrast requirements'
    }
    
    const report = [
      '# Color Contrast Accessibility Report',
      `Generated: ${new Date().toISOString()}`,
      `Issues Found: ${issues.length}`,
      '',
      '## Contrast Issues',
      ''
    ]
    
    for (const issue of issues) {
      report.push(`### ${issue.fontSizeCategory.toUpperCase()} Text (Ratio: ${issue.ratio}:1)`)
      report.push(`- Text: ${issue.hexColors.text}`)
      report.push(`- Background: ${issue.hexColors.background}`)
      report.push(`- WCAG Level: ${issue.level}`)
      report.push(`- Recommendations:`)
      
      for (const recommendation of issue.recommendations) {
        report.push(`  - ${recommendation}`)
      }
      
      report.push('')
    }
    
    return report.join('\n')
  }

  /**
   * Apply high contrast mode to page
   */
  applyHighContrastMode(): void {
    const root = document.documentElement
    
    // Add high contrast class
    root.classList.add('high-contrast-mode')
    
    // Override CSS variables for high contrast
    const highContrastColors = {
      '--color-primary': '59, 130, 246', // Blue with high contrast
      '--color-primary-foreground': '255, 255, 255',
      '--color-secondary': '107, 114, 128',
      '--color-secondary-foreground': '255, 255, 255',
      '--color-background': '255, 255, 255',
      '--color-foreground': '0, 0, 0',
      '--color-border': '0, 0, 0',
      '--color-muted': '240, 240, 240',
      '--color-muted-foreground': '0, 0, 0',
    }
    
    for (const [property, value] of Object.entries(highContrastColors)) {
      root.style.setProperty(property, value)
    }
    
    // Add announcement for screen readers
    const announcement = document.createElement('div')
    announcement.setAttribute('aria-live', 'polite')
    announcement.setAttribute('aria-atomic', 'true')
    announcement.className = 'sr-only'
    announcement.textContent = 'High contrast mode activated'
    
    document.body.appendChild(announcement)
    setTimeout(() => {
      document.body.removeChild(announcement)
    }, 1000)
  }

  /**
   * Remove high contrast mode
   */
  removeHighContrastMode(): void {
    const root = document.documentElement
    
    // Remove high contrast class
    root.classList.remove('high-contrast-mode')
    
    // Reset CSS variables to default
    const defaultColors = {
      '--color-primary': '59, 130, 246',
      '--color-primary-foreground': '255, 255, 255',
      '--color-secondary': '107, 114, 128',
      '--color-secondary-foreground': '255, 255, 255',
      '--color-background': '255, 255, 255',
      '--color-foreground': '17, 24, 39',
      '--color-border': '229, 231, 235',
      '--color-muted': '249, 250, 251',
      '--color-muted-foreground': '107, 114, 128',
    }
    
    for (const [property, value] of Object.entries(defaultColors)) {
      root.style.setProperty(property, value)
    }
    
    // Add announcement for screen readers
    const announcement = document.createElement('div')
    announcement.setAttribute('aria-live', 'polite')
    announcement.setAttribute('aria-atomic', 'true')
    announcement.className = 'sr-only'
    announcement.textContent = 'High contrast mode deactivated'
    
    document.body.appendChild(announcement)
    setTimeout(() => {
      document.body.removeChild(announcement)
    }, 1000)
  }

  /**
   * Toggle high contrast mode
   */
  toggleHighContrastMode(): boolean {
    const root = document.documentElement
    const isActive = root.classList.contains('high-contrast-mode')
    
    if (isActive) {
      this.removeHighContrastMode()
    } else {
      this.applyHighContrastMode()
    }
    
    return !isActive
  }

  /**
   * Check if high contrast mode is active
   */
  isHighContrastModeActive(): boolean {
    return document.documentElement.classList.contains('high-contrast-mode')
  }
}

/**
 * Create and export validator instance
 */
export const colorContrastValidator = new ColorContrastValidator()

/**
 * Convenience functions
 */
export function validateContrast(
  textColor: string,
  backgroundColor: string,
  fontSize?: number,
  isBold?: boolean
): ColorContrastResult {
  return colorContrastValidator.validateContrast(textColor, backgroundColor, fontSize, isBold)
}

export function validateElementContrast(element: HTMLElement): ColorContrastResult | null {
  return colorContrastValidator.validateElementContrast(element)
}

export function validatePageContrast(): ColorContrastResult[] {
  return colorContrastValidator.validatePageContrast()
}

export function getContrastImprovements(
  textColor: string,
  backgroundColor: string
): { lightText: string; darkText: string; lightBg: string; darkBg: string } {
  return colorContrastValidator.getContrastImprovements(textColor, backgroundColor)
}

export function applyHighContrastMode(): void {
  colorContrastValidator.applyHighContrastMode()
}

export function removeHighContrastMode(): void {
  colorContrastValidator.removeHighContrastMode()
}

export function toggleHighContrastMode(): boolean {
  return colorContrastValidator.toggleHighContrastMode()
}

export function isHighContrastModeActive(): boolean {
  return colorContrastValidator.isHighContrastModeActive()
}

/**
 * Hook for color contrast validation
 */
export function useColorContrast() {
  const [contrastIssues, setContrastIssues] = useState<ColorContrastResult[]>([])
  const [isHighContrast, setIsHighContrast] = useState(false)

  /**
   * Validate page contrast
   */
  const validatePageContrast = useCallback(() => {
    const issues = colorContrastValidator.validatePageContrast()
    setContrastIssues(issues)
  }, [])

  /**
   * Toggle high contrast mode
   */
  const toggleHighContrast = useCallback(() => {
    const newState = colorContrastValidator.toggleHighContrastMode()
    setIsHighContrast(newState)
  }, [])

  /**
   * Initialize contrast validation
   */
  useEffect(() => {
    validatePageContrast()
    setIsHighContrast(colorContrastValidator.isHighContrastModeActive())
  }, [])

  return {
    contrastIssues,
    isHighContrast,
    validatePageContrast,
    toggleHighContrast,
    validateContrast: colorContrastValidator.validateContrast.bind(colorContrastValidator),
    validateElementContrast: colorContrastValidator.validateElementContrast.bind(colorContrastValidator),
    getContrastImprovements: colorContrastValidator.getContrastImprovements.bind(colorContrastValidator),
  }
}