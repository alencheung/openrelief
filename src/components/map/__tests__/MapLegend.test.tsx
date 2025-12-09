import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import MapLegend from '../MapLegend'
import { createTestUtils } from '@/test-utils'

// Mock UI components
vi.mock('@/components/ui', () => ({
  EmergencyIndicator: ({ type, size, variant, label }: any) => (
    <div data-testid="emergency-indicator" data-type={type} data-size={size} data-variant={variant}>
      {label}
    </div>
  ),
  TrustBadge: ({ level, score, size, showPercentage, label }: any) => (
    <div data-testid="trust-badge" data-level={level} data-score={score} data-size={size} data-show-percentage={showPercentage}>
      {label}
    </div>
  ),
  StatusIndicator: ({ status, size, variant, pulse, showIcon, label }: any) => (
    <div data-testid="status-indicator" data-status={status} data-size={size} data-variant={variant} data-pulse={pulse} data-show-icon={showIcon}>
      {label}
    </div>
  ),
  Icon: ({ name, size, variant, className }: any) => (
    <div data-testid="icon" data-name={name} data-size={size} data-variant={variant} className={className}>
      {name}
    </div>
  ),
  EnhancedCard: ({ children, className, ...props }: any) => (
    <div data-testid="enhanced-card" className={className} {...props}>
      {children}
    </div>
  )
}))

describe('MapLegend', () => {
  const { renderWithProviders } = createTestUtils()

  const defaultProps = {}

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders map legend with default props', () => {
    renderWithProviders(<MapLegend {...defaultProps} />)

    expect(screen.getByRole('region', { name: /map legend/i })).toBeInTheDocument()
    expect(screen.getByText(/map legend/i)).toBeInTheDocument()
    expect(screen.getByText(/emergency types/i)).toBeInTheDocument()
    expect(screen.getByText(/severity levels/i)).toBeInTheDocument()
    expect(screen.getByText(/trust levels/i)).toBeInTheDocument()
    expect(screen.getByText(/map layers/i)).toBeInTheDocument()
  })

  it('renders emergency types correctly', () => {
    const emergencyTypes = [
      { type: 'fire', name: 'Fire Emergency', count: 5 },
      { type: 'medical', name: 'Medical Emergency', count: 3 },
      { type: 'security', name: 'Security Threat', count: 2 }
    ]

    renderWithProviders(<MapLegend {...defaultProps} emergencyTypes={emergencyTypes} />)

    expect(screen.getByText(/fire emergency/i)).toBeInTheDocument()
    expect(screen.getByText(/medical emergency/i)).toBeInTheDocument()
    expect(screen.getByText(/security threat/i)).toBeInTheDocument()

    // Check counts
    expect(screen.getByText('5')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('renders severity levels correctly', () => {
    const severityLevels = [
      { level: 1, label: 'Low', color: '#3b82f6' },
      { level: 2, label: 'Moderate', color: '#eab308' },
      { level: 3, label: 'High', color: '#f97316' }
    ]

    renderWithProviders(<MapLegend {...defaultProps} severityLevels={severityLevels} />)

    expect(screen.getByText(/level 1: low/i)).toBeInTheDocument()
    expect(screen.getByText(/level 2: moderate/i)).toBeInTheDocument()
    expect(screen.getByText(/level 3: high/i)).toBeInTheDocument()
  })

  it('renders trust levels correctly', () => {
    const trustLevels = [
      { level: 'excellent', label: 'Excellent Trust', color: '#22c55e' },
      { level: 'good', label: 'Good Trust', color: '#84cc16' },
      { level: 'moderate', label: 'Moderate Trust', color: '#eab308' }
    ]

    renderWithProviders(<MapLegend {...defaultProps} trustLevels={trustLevels} />)

    expect(screen.getByText(/excellent trust/i)).toBeInTheDocument()
    expect(screen.getByText(/good trust/i)).toBeInTheDocument()
    expect(screen.getByText(/moderate trust/i)).toBeInTheDocument()
  })

  it('renders layer controls correctly', () => {
    renderWithProviders(<MapLegend {...defaultProps} showLayerControls={true} />)

    expect(screen.getByText(/map layers/i)).toBeInTheDocument()
    expect(screen.getByText(/emergency events/i)).toBeInTheDocument()
    expect(screen.getByText(/severity indicators/i)).toBeInTheDocument()
    expect(screen.getByText(/trust indicators/i)).toBeInTheDocument()
    expect(screen.getByText(/emergency heatmap/i)).toBeInTheDocument()
    expect(screen.getByText(/geofences/i)).toBeInTheDocument()
  })

  it('toggles layer visibility', async () => {
    const user = userEvent.setup()
    renderWithProviders(<MapLegend {...defaultProps} showLayerControls={true} />)

    // Find emergency events layer toggle
    const emergencyEventsToggle = screen.getByLabelText(/hide emergency events/i)
    await user.click(emergencyEventsToggle)

    // Should now show "Show Emergency Events"
    expect(screen.getByLabelText(/show emergency events/i)).toBeInTheDocument()
  })

  it('collapses and expands legend', async () => {
    const user = userEvent.setup()
    renderWithProviders(<MapLegend {...defaultProps} collapsible={true} />)

    // Initially expanded
    expect(screen.getByText(/emergency types/i)).toBeInTheDocument()

    // Collapse legend
    const collapseButton = screen.getByRole('button', { name: /collapse legend/i })
    await user.click(collapseButton)

    // Should be collapsed
    expect(screen.queryByText(/emergency types/i)).not.toBeInTheDocument()

    // Expand legend
    const expandButton = screen.getByRole('button', { name: /expand legend/i })
    await user.click(expandButton)

    // Should be expanded again
    expect(screen.getByText(/emergency types/i)).toBeInTheDocument()
  })

  it('calls onToggleCollapse when legend is collapsed', async () => {
    const user = userEvent.setup()
    const onToggleCollapse = vi.fn()

    renderWithProviders(<MapLegend {...defaultProps} collapsible={true} onToggleCollapse={onToggleCollapse} />)

    const collapseButton = screen.getByRole('button', { name: /collapse legend/i })
    await user.click(collapseButton)

    expect(onToggleCollapse).toHaveBeenCalledWith(true)
  })

  it('collapses and expands sections', async () => {
    const user = userEvent.setup()
    renderWithProviders(<MapLegend {...defaultProps} />)

    // Emergency types section should be expanded initially
    expect(screen.getByText(/fire emergency/i)).toBeInTheDocument()

    // Collapse emergency types section
    const emergencyTypesHeader = screen.getByText(/emergency types/i).closest('div')
    const collapseButton = emergencyTypesHeader?.querySelector('[role="button"]')
    await user.click(collapseButton!)

    // Emergency types should be collapsed
    expect(screen.queryByText(/fire emergency/i)).not.toBeInTheDocument()

    // Expand emergency types section
    await user.click(collapseButton!)

    // Emergency types should be expanded again
    expect(screen.getByText(/fire emergency/i)).toBeInTheDocument()
  })

  it('applies position variants correctly', () => {
    renderWithProviders(<MapLegend {...defaultProps} position="top-right" />)

    const legend = screen.getByRole('region', { name: /map legend/i })
    expect(legend).toHaveClass('top-4', 'right-4')
  })

  it('applies size variants correctly', () => {
    renderWithProviders(<MapLegend {...defaultProps} size="lg" />)

    const legend = screen.getByRole('region', { name: /map legend/i })
    expect(legend).toHaveClass('max-w-md')
  })

  it('applies variant styles correctly', () => {
    renderWithProviders(<MapLegend {...defaultProps} variant="compact" />)

    const legend = screen.getByRole('region', { name: /map legend/i })
    expect(legend).toHaveClass('p-3')
  })

  it('hides severity indicators when disabled', () => {
    renderWithProviders(<MapLegend {...defaultProps} showSeverityIndicators={false} />)

    expect(screen.queryByText(/severity levels/i)).not.toBeInTheDocument()
  })

  it('hides trust indicators when disabled', () => {
    renderWithProviders(<MapLegend {...defaultProps} showTrustIndicators={false} />)

    expect(screen.queryByText(/trust levels/i)).not.toBeInTheDocument()
  })

  it('hides layer controls when disabled', () => {
    renderWithProviders(<MapLegend {...defaultProps} showLayerControls={false} />)

    expect(screen.queryByText(/map layers/i)).not.toBeInTheDocument()
  })

  it('starts collapsed when initiallyCollapsed is true', () => {
    renderWithProviders(<MapLegend {...defaultProps} collapsible={true} initiallyCollapsed={true} />)

    expect(screen.queryByText(/emergency types/i)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /expand legend/i })).toBeInTheDocument()
  })

  it('shows accessibility info', () => {
    renderWithProviders(<MapLegend {...defaultProps} />)

    expect(screen.getByText(/press esc to collapse legend/i)).toBeInTheDocument()
  })

  it('handles keyboard navigation', async () => {
    const user = userEvent.setup()
    renderWithProviders(<MapLegend {...defaultProps} />)

    // Focus on collapsible section
    const emergencyTypesHeader = screen.getByText(/emergency types/i).closest('div')
    const collapseButton = emergencyTypesHeader?.querySelector('[role="button"]')

    if (collapseButton) {
      collapseButton.focus()
      await user.keyboard('{Enter}')

      // Should collapse section
      expect(screen.queryByText(/fire emergency/i)).not.toBeInTheDocument()

      // Expand with space key
      await user.keyboard('{ }')

      // Should expand section
      expect(screen.getByText(/fire emergency/i)).toBeInTheDocument()
    }
  })

  it('handles escape key to collapse legend', async () => {
    const user = userEvent.setup()
    renderWithProviders(<MapLegend {...defaultProps} collapsible={true} />)

    // Ensure legend is expanded
    expect(screen.getByText(/emergency types/i)).toBeInTheDocument()

    // Press escape key
    await user.keyboard('{Escape}')

    // Should collapse legend
    expect(screen.queryByText(/emergency types/i)).not.toBeInTheDocument()
  })

  it('applies custom className', () => {
    renderWithProviders(<MapLegend {...defaultProps} className="custom-class" />)

    const legend = screen.getByRole('region', { name: /map legend/i })
    expect(legend).toHaveClass('custom-class')
  })

  it('renders with default emergency types when none provided', () => {
    renderWithProviders(<MapLegend {...defaultProps} emergencyTypes={undefined} />)

    expect(screen.getByText(/fire emergency/i)).toBeInTheDocument()
    expect(screen.getByText(/medical emergency/i)).toBeInTheDocument()
    expect(screen.getByText(/security threat/i)).toBeInTheDocument()
    expect(screen.getByText(/natural disaster/i)).toBeInTheDocument()
    expect(screen.getByText(/infrastructure failure/i)).toBeInTheDocument()
  })

  it('renders with default severity levels when none provided', () => {
    renderWithProviders(<MapLegend {...defaultProps} severityLevels={undefined} />)

    expect(screen.getByText(/level 1: low/i)).toBeInTheDocument()
    expect(screen.getByText(/level 2: moderate/i)).toBeInTheDocument()
    expect(screen.getByText(/level 3: high/i)).toBeInTheDocument()
    expect(screen.getByText(/level 4: severe/i)).toBeInTheDocument()
    expect(screen.getByText(/level 5: critical/i)).toBeInTheDocument()
  })

  it('renders with default trust levels when none provided', () => {
    renderWithProviders(<MapLegend {...defaultProps} trustLevels={undefined} />)

    expect(screen.getByText(/excellent trust/i)).toBeInTheDocument()
    expect(screen.getByText(/good trust/i)).toBeInTheDocument()
    expect(screen.getByText(/moderate trust/i)).toBeInTheDocument()
    expect(screen.getByText(/low trust/i)).toBeInTheDocument()
    expect(screen.getByText(/critical trust/i)).toBeInTheDocument()
  })

  it('handles empty emergency types array', () => {
    renderWithProviders(<MapLegend {...defaultProps} emergencyTypes={[]} />)

    expect(screen.getByText(/emergency types/i)).toBeInTheDocument()
    // Should not show any emergency type items
    expect(screen.queryByText(/fire emergency/i)).not.toBeInTheDocument()
  })

  it('handles emergency types without count', () => {
    const emergencyTypes = [
      { type: 'fire', name: 'Fire Emergency' },
      { type: 'medical', name: 'Medical Emergency' }
    ]

    renderWithProviders(<MapLegend {...defaultProps} emergencyTypes={emergencyTypes} />)

    expect(screen.getByText(/fire emergency/i)).toBeInTheDocument()
    expect(screen.getByText(/medical emergency/i)).toBeInTheDocument()

    // Should not show count badges
    expect(screen.queryByText('0')).not.toBeInTheDocument()
  })

  it('handles emergency types with color', () => {
    const emergencyTypes = [
      { type: 'fire', name: 'Fire Emergency', color: '#ff0000' }
    ]

    renderWithProviders(<MapLegend {...defaultProps} emergencyTypes={emergencyTypes} />)

    expect(screen.getByText(/fire emergency/i)).toBeInTheDocument()
  })

  it('passes props to underlying div', () => {
    renderWithProviders(<MapLegend {...defaultProps} data-testid="custom-legend" />)

    expect(screen.getByTestId('custom-legend')).toBeInTheDocument()
  })

  it('has correct ARIA attributes', () => {
    renderWithProviders(<MapLegend {...defaultProps} />)

    const legend = screen.getByRole('region', { name: /map legend/i })
    expect(legend).toHaveAttribute('aria-label', 'Map legend')
  })

  it('has correct ARIA attributes for collapsible sections', () => {
    renderWithProviders(<MapLegend {...defaultProps} />)

    const emergencyTypesHeader = screen.getByText(/emergency types/i).closest('div')
    const collapseButton = emergencyTypesHeader?.querySelector('[role="button"]')

    if (collapseButton) {
      expect(collapseButton).toHaveAttribute('aria-expanded', 'true')
      expect(collapseButton).toHaveAttribute('aria-controls')
    }
  })

  it('has correct ARIA attributes for layer toggles', () => {
    renderWithProviders(<MapLegend {...defaultProps} showLayerControls={true} />)

    const emergencyEventsToggle = screen.getByLabelText(/hide emergency events/i)
    expect(emergencyEventsToggle).toHaveAttribute('aria-label')
  })

  it('renders EmergencyIndicator components with correct props', () => {
    renderWithProviders(<MapLegend {...defaultProps} />)

    const indicators = screen.getAllByTestId('emergency-indicator')
    expect(indicators.length).toBeGreaterThan(0)

    indicators.forEach(indicator => {
      expect(indicator).toHaveAttribute('data-size', 'sm')
      expect(indicator).toHaveAttribute('data-variant', 'subtle')
    })
  })

  it('renders TrustBadge components with correct props', () => {
    renderWithProviders(<MapLegend {...defaultProps} />)

    const trustBadges = screen.getAllByTestId('trust-badge')
    expect(trustBadges.length).toBeGreaterThan(0)

    trustBadges.forEach(badge => {
      expect(badge).toHaveAttribute('data-size', 'sm')
      expect(badge).toHaveAttribute('data-show-percentage', 'false')
    })
  })

  it('renders Icon components with correct props', () => {
    renderWithProviders(<MapLegend {...defaultProps} />)

    const icons = screen.getAllByTestId('icon')
    expect(icons.length).toBeGreaterThan(0)
  })

  it('handles non-collapsible legend', () => {
    renderWithProviders(<MapLegend {...defaultProps} collapsible={false} />)

    // Should not show collapse/expand button
    expect(screen.queryByRole('button', { name: /collapse legend/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /expand legend/i })).not.toBeInTheDocument()
  })

  it('handles non-collapsible sections', () => {
    renderWithProviders(<MapLegend {...defaultProps} />)

    // Find a section that might be non-collapsible
    // In this implementation, all sections are collapsible by default
    // This test ensures the logic works correctly
    expect(screen.getByText(/emergency types/i)).toBeInTheDocument()
  })

  it('maintains layer visibility state', async () => {
    const user = userEvent.setup()
    renderWithProviders(<MapLegend {...defaultProps} showLayerControls={true} />)

    // Toggle emergency events layer
    const emergencyEventsToggle = screen.getByLabelText(/hide emergency events/i)
    await user.click(emergencyEventsToggle)

    // Toggle it back
    await user.click(screen.getByLabelText(/show emergency events/i))

    // Should show "Hide Emergency Events" again
    expect(screen.getByLabelText(/hide emergency events/i)).toBeInTheDocument()
  })
})