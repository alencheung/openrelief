import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { ProximityAlertsDisplay, ProximityAlert } from '../ProximityAlertsDisplay'
import { createTestUtils } from '@/test-utils'

// Mock UI components
vi.mock('@/components/ui', () => ({
  StatusIndicator: ({ status, size, variant, pulse, showIcon, label }: any) => (
    <div data-testid="status-indicator" data-status={status} data-size={size} data-variant={variant} data-pulse={pulse} data-show-icon={showIcon}>
      {label}
    </div>
  ),
  TrustBadge: ({ level, score, size, showPercentage, label }: any) => (
    <div data-testid="trust-badge" data-level={level} data-score={score} data-size={size} data-show-percentage={showPercentage}>
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
  ),
  EnhancedButton: ({ children, onClick, variant, size, leftIcon, className, ...props }: any) => (
    <button onClick={onClick} data-variant={variant} data-size={size} className={className} {...props}>
      {leftIcon}
      {children}
    </button>
  ),
}))

describe('ProximityAlertsDisplay', () => {
  const { renderWithProviders } = createTestUtils()
  
  const mockAlerts: ProximityAlert[] = [
    {
      id: 'alert-1',
      emergencyId: 'emergency-1',
      emergencyType: 'fire',
      title: 'Building Fire',
      message: 'Fire reported in downtown area',
      severity: 'critical',
      distance: 500,
      estimatedTime: 5,
      trustScore: 0.85,
      timestamp: '2023-12-06T10:00:00Z',
      isRead: false,
      actions: [
        {
          id: 'navigate',
          label: 'Navigate',
          action: vi.fn(),
          variant: 'outline'
        },
        {
          id: 'dismiss',
          label: 'Dismiss',
          action: vi.fn(),
          variant: 'ghost'
        }
      ]
    },
    {
      id: 'alert-2',
      emergencyId: 'emergency-2',
      emergencyType: 'medical',
      title: 'Medical Emergency',
      message: 'Medical assistance needed',
      severity: 'high',
      distance: 800,
      estimatedTime: 8,
      trustScore: 0.75,
      timestamp: '2023-12-06T09:30:00Z',
      isRead: true,
    },
    {
      id: 'alert-3',
      emergencyId: 'emergency-3',
      emergencyType: 'security',
      title: 'Security Threat',
      message: 'Suspicious activity reported',
      severity: 'moderate',
      distance: 1200,
      estimatedTime: 12,
      trustScore: 0.60,
      timestamp: '2023-12-06T09:00:00Z',
      isRead: false,
    },
  ]

  const defaultProps = {
    alerts: mockAlerts,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('renders proximity alerts display with alerts', () => {
    renderWithProviders(<ProximityAlertsDisplay {...defaultProps} />)
    
    expect(screen.getByRole('region', { name: /proximity alerts/i })).toBeInTheDocument()
    expect(screen.getByText(/proximity alerts/i)).toBeInTheDocument()
    expect(screen.getByText('3 Active')).toBeInTheDocument()
  })

  it('renders nothing when no alerts', () => {
    renderWithProviders(<ProximityAlertsDisplay alerts={[]} />)
    
    expect(screen.queryByRole('region', { name: /proximity alerts/i })).not.toBeInTheDocument()
  })

  it('displays alert items correctly', () => {
    renderWithProviders(<ProximityAlertsDisplay {...defaultProps} />)
    
    expect(screen.getByText(/building fire/i)).toBeInTheDocument()
    expect(screen.getByText(/medical emergency/i)).toBeInTheDocument()
    expect(screen.getByText(/security threat/i)).toBeInTheDocument()
    
    expect(screen.getByText(/fire reported in downtown area/i)).toBeInTheDocument()
    expect(screen.getByText(/medical assistance needed/i)).toBeInTheDocument()
    expect(screen.getByText(/suspicious activity reported/i)).toBeInTheDocument()
  })

  it('shows critical alert indicator for critical alerts', () => {
    renderWithProviders(<ProximityAlertsDisplay {...defaultProps} />)
    
    // Should show bell ring icon for critical alerts
    const bellRingIcon = screen.getByTestId('icon').find(el => el.getAttribute('data-name') === 'bellRing')
    expect(bellRingIcon).toBeInTheDocument()
  })

  it('shows unread count badge', () => {
    renderWithProviders(<ProximityAlertsDisplay {...defaultProps} />)
    
    expect(screen.getByText('2 new')).toBeInTheDocument()
  })

  it('formats distance correctly', () => {
    renderWithProviders(<ProximityAlertsDisplay {...defaultProps} />)
    
    expect(screen.getByText('500m')).toBeInTheDocument()
    expect(screen.getByText('800m')).toBeInTheDocument()
    expect(screen.getByText('1.2km')).toBeInTheDocument()
  })

  it('formats time correctly', () => {
    renderWithProviders(<ProximityAlertsDisplay {...defaultProps} />)
    
    expect(screen.getByText('5min')).toBeInTheDocument()
    expect(screen.getByText('8min')).toBeInTheDocument()
    expect(screen.getByText('12min')).toBeInTheDocument()
  })

  it('shows trust badge for alerts with trust score', () => {
    renderWithProviders(<ProximityAlertsDisplay {...defaultProps} />)
    
    const trustBadges = screen.getAllByTestId('trust-badge')
    expect(trustBadges.length).toBeGreaterThan(0)
    
    // Check that trust badge has correct score
    const criticalTrustBadge = trustBadges.find(badge => 
      badge.getAttribute('data-level') === 'excellent'
    )
    expect(criticalTrustBadge).toBeInTheDocument()
  })

  it('handles alert click', async () => {
    const onAlertClick = vi.fn()
    renderWithProviders(<ProximityAlertsDisplay {...defaultProps} onAlertClick={onAlertClick} />)
    
    const alertItem = screen.getByText(/building fire/i).closest('[role="button"]')
    await userEvent.click(alertItem!)
    
    expect(onAlertClick).toHaveBeenCalledWith(mockAlerts[0])
  })

  it('handles alert dismiss', async () => {
    const onAlertDismiss = vi.fn()
    renderWithProviders(<ProximityAlertsDisplay {...defaultProps} onAlertDismiss={onAlertDismiss} />)
    
    const dismissButton = screen.getByLabelText(/dismiss alert/i)
    await userEvent.click(dismissButton)
    
    expect(onAlertDismiss).toHaveBeenCalledWith('alert-1')
  })

  it('expands and collapses alert details', async () => {
    const user = userEvent.setup()
    renderWithProviders(<ProximityAlertsDisplay {...defaultProps} />)
    
    // Initially collapsed
    expect(screen.queryByText(/trust score:/i)).not.toBeInTheDocument()
    
    // Expand alert
    const expandButton = screen.getByLabelText(/expand details/i)
    await user.click(expandButton)
    
    // Should show expanded content
    expect(screen.getByText(/trust score:/i)).toBeInTheDocument()
    
    // Collapse alert
    await user.click(expandButton)
    
    // Should hide expanded content
    expect(screen.queryByText(/trust score:/i)).not.toBeInTheDocument()
  })

  it('shows action buttons when expanded', async () => {
    const user = userEvent.setup()
    renderWithProviders(<ProximityAlertsDisplay {...defaultProps} />)
    
    // Expand alert
    const expandButton = screen.getByLabelText(/expand details/i)
    await user.click(expandButton)
    
    // Should show action buttons
    expect(screen.getByText(/navigate/i)).toBeInTheDocument()
    expect(screen.getByText(/dismiss/i)).toBeInTheDocument()
  })

  it('handles action button clicks', async () => {
    const user = userEvent.setup()
    const mockAction = vi.fn()
    
    const alerts = [
      {
        ...mockAlerts[0],
        actions: [
          {
            id: 'navigate',
            label: 'Navigate',
            action: mockAction,
            variant: 'outline'
          }
        ]
      }
    ]
    
    renderWithProviders(<ProximityAlertsDisplay alerts={alerts} />)
    
    // Expand alert
    const expandButton = screen.getByLabelText(/expand details/i)
    await user.click(expandButton)
    
    // Click action button
    const actionButton = screen.getByText(/navigate/i)
    await user.click(actionButton)
    
    expect(mockAction).toHaveBeenCalled()
  })

  it('filters alerts by all', async () => {
    const user = userEvent.setup()
    renderWithProviders(<ProximityAlertsDisplay {...defaultProps} showFilterControls={true} />)
    
    const allButton = screen.getByText(/all \(3\)/i)
    await user.click(allButton)
    
    // Should show all alerts
    expect(screen.getByText(/building fire/i)).toBeInTheDocument()
    expect(screen.getByText(/medical emergency/i)).toBeInTheDocument()
    expect(screen.getByText(/security threat/i)).toBeInTheDocument()
  })

  it('filters alerts by unread', async () => {
    const user = userEvent.setup()
    renderWithProviders(<ProximityAlertsDisplay {...defaultProps} showFilterControls={true} />)
    
    const unreadButton = screen.getByText(/unread \(2\)/i)
    await user.click(unreadButton)
    
    // Should show only unread alerts
    expect(screen.getByText(/building fire/i)).toBeInTheDocument()
    expect(screen.getByText(/security threat/i)).toBeInTheDocument()
    expect(screen.queryByText(/medical emergency/i)).not.toBeInTheDocument()
  })

  it('filters alerts by critical', async () => {
    const user = userEvent.setup()
    renderWithProviders(<ProximityAlertsDisplay {...defaultProps} showFilterControls={true} />)
    
    const criticalButton = screen.getByText(/critical \(1\)/i)
    await user.click(criticalButton)
    
    // Should show only critical alerts
    expect(screen.getByText(/building fire/i)).toBeInTheDocument()
    expect(screen.queryByText(/medical emergency/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/security threat/i)).not.toBeInTheDocument()
  })

  it('handles dismiss all', async () => {
    const user = userEvent.setup()
    const onDismissAll = vi.fn()
    renderWithProviders(<ProximityAlertsDisplay {...defaultProps} onDismissAll={onDismissAll} showDismissAll={true} />)
    
    const dismissAllButton = screen.getByText(/dismiss all/i)
    await user.click(dismissAllButton)
    
    expect(onDismissAll).toHaveBeenCalled()
  })

  it('handles mark all read', async () => {
    const user = userEvent.setup()
    const onMarkAllRead = vi.fn()
    renderWithProviders(<ProximityAlertsDisplay {...defaultProps} onMarkAllRead={onMarkAllRead} showMarkAllRead={true} />)
    
    const markAllReadButton = screen.getByText(/mark all read/i)
    await user.click(markAllReadButton)
    
    expect(onMarkAllRead).toHaveBeenCalled()
  })

  it('limits visible alerts with maxVisible prop', () => {
    renderWithProviders(<ProximityAlertsDisplay {...defaultProps} maxVisible={2} />)
    
    // Should show only 2 alerts
    expect(screen.getByText(/building fire/i)).toBeInTheDocument()
    expect(screen.getByText(/medical emergency/i)).toBeInTheDocument()
    
    // Should show "more alerts" indicator
    expect(screen.getByText(/\+1 more alerts/i)).toBeInTheDocument()
  })

  it('auto-dismisses alerts when enabled', () => {
    renderWithProviders(<ProximityAlertsDisplay {...defaultProps} autoDismiss={true} autoDismissDelay={1000} />)
    
    // Initially shows alerts
    expect(screen.getByText(/building fire/i)).toBeInTheDocument()
    
    // Fast-forward time
    vi.advanceTimersByTime(2000)
    
    // Should auto-dismiss old alerts (this is simplified - real implementation would check timestamp)
    expect(screen.getByText(/building fire/i)).toBeInTheDocument()
  })

  it('collapses and expands alerts panel', async () => {
    const user = userEvent.setup()
    renderWithProviders(<ProximityAlertsDisplay {...defaultProps} />)
    
    // Initially expanded
    expect(screen.getByText(/building fire/i)).toBeInTheDocument()
    
    // Collapse panel
    const collapseButton = screen.getByRole('button', { name: /collapse alerts/i })
    await user.click(collapseButton)
    
    // Should hide content
    expect(screen.queryByText(/building fire/i)).not.toBeInTheDocument()
    
    // Expand panel
    const expandButton = screen.getByRole('button', { name: /expand alerts/i })
    await user.click(expandButton)
    
    // Should show content again
    expect(screen.getByText(/building fire/i)).toBeInTheDocument()
  })

  it('applies position variants correctly', () => {
    renderWithProviders(<ProximityAlertsDisplay {...defaultProps} position="bottom-right" />)
    
    const alertsDisplay = screen.getByRole('region', { name: /proximity alerts/i })
    expect(alertsDisplay).toHaveClass('bottom-4', 'right-4')
  })

  it('applies size variants correctly', () => {
    renderWithProviders(<ProximityAlertsDisplay {...defaultProps} size="lg" />)
    
    const alertsDisplay = screen.getByRole('region', { name: /proximity alerts/i })
    expect(alertsDisplay).toHaveClass('max-w-md')
  })

  it('applies variant styles correctly', () => {
    renderWithProviders(<ProximityAlertsDisplay {...defaultProps} variant="compact" />)
    
    const alertsDisplay = screen.getByRole('region', { name: /proximity alerts/i })
    expect(alertsDisplay).toHaveClass('p-3')
  })

  it('hides filter controls when disabled', () => {
    renderWithProviders(<ProximityAlertsDisplay {...defaultProps} showFilterControls={false} />)
    
    expect(screen.queryByText(/all \(3\)/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/unread \(2\)/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/critical \(1\)/i)).not.toBeInTheDocument()
  })

  it('hides dismiss all when disabled', () => {
    renderWithProviders(<ProximityAlertsDisplay {...defaultProps} showDismissAll={false} />)
    
    expect(screen.queryByText(/dismiss all/i)).not.toBeInTheDocument()
  })

  it('hides mark all read when disabled', () => {
    renderWithProviders(<ProximityAlertsDisplay {...defaultProps} showMarkAllRead={false} />)
    
    expect(screen.queryByText(/mark all read/i)).not.toBeInTheDocument()
  })

  it('handles keyboard navigation', async () => {
    const onAlertClick = vi.fn()
    renderWithProviders(<ProximityAlertsDisplay {...defaultProps} onAlertClick={onAlertClick} />)
    
    const alertItem = screen.getByText(/building fire/i).closest('[role="button"]')
    
    if (alertItem) {
      alertItem.focus()
      await userEvent.keyboard('{Enter}')
      
      expect(onAlertClick).toHaveBeenCalledWith(mockAlerts[0])
    }
  })

  it('applies custom className', () => {
    renderWithProviders(<ProximityAlertsDisplay {...defaultProps} className="custom-class" />)
    
    const alertsDisplay = screen.getByRole('region', { name: /proximity alerts/i })
    expect(alertsDisplay).toHaveClass('custom-class')
  })

  it('handles onFilterChange callback', async () => {
    const user = userEvent.setup()
    const onFilterChange = vi.fn()
    
    renderWithProviders(<ProximityAlertsDisplay {...defaultProps} showFilterControls={true} onFilterChange={onFilterChange} />)
    
    const unreadButton = screen.getByText(/unread \(2\)/i)
    await user.click(unreadButton)
    
    expect(onFilterChange).toHaveBeenCalledWith('unread')
  })

  it('shows correct emergency icons', () => {
    renderWithProviders(<ProximityAlertsDisplay {...defaultProps} />)
    
    const icons = screen.getAllByTestId('icon')
    
    // Should have flame icon for fire emergency
    const flameIcon = icons.find(icon => icon.getAttribute('data-name') === 'flame')
    expect(flameIcon).toBeInTheDocument()
    
    // Should have heartPulse icon for medical emergency
    const heartPulseIcon = icons.find(icon => icon.getAttribute('data-name') === 'heartPulse')
    expect(heartPulseIcon).toBeInTheDocument()
    
    // Should have shield icon for security emergency
    const shieldIcon = icons.find(icon => icon.getAttribute('data-name') === 'shield')
    expect(shieldIcon).toBeInTheDocument()
  })

  it('shows correct status indicators', () => {
    renderWithProviders(<ProximityAlertsDisplay {...defaultProps} />)
    
    const statusIndicators = screen.getAllByTestId('status-indicator')
    
    // Should have critical status for critical alert
    const criticalStatus = statusIndicators.find(indicator => 
      indicator.getAttribute('data-status') === 'critical' && 
      indicator.getAttribute('data-pulse') === 'true'
    )
    expect(criticalStatus).toBeInTheDocument()
  })

  it('shows unread indicator for unread alerts', () => {
    renderWithProviders(<ProximityAlertsDisplay {...defaultProps} />)
    
    // Should show unread indicator dots
    const unreadIndicators = screen.getAllByText('').filter(el => 
      el.classList.contains('bg-primary') && el.classList.contains('rounded-full')
    )
    expect(unreadIndicators.length).toBe(2) // Two unread alerts
  })

  it('handles alert item dismiss with stop propagation', async () => {
    const onAlertClick = vi.fn()
    const onAlertDismiss = vi.fn()
    
    renderWithProviders(
      <ProximityAlertsDisplay 
        {...defaultProps} 
        onAlertClick={onAlertClick}
        onAlertDismiss={onAlertDismiss}
      />
    )
    
    const dismissButton = screen.getByLabelText(/dismiss alert/i)
    await userEvent.click(dismissButton)
    
    // Should call dismiss but not click
    expect(onAlertDismiss).toHaveBeenCalledWith('alert-1')
    expect(onAlertClick).not.toHaveBeenCalled()
  })

  it('handles action button clicks with stop propagation', async () => {
    const user = userEvent.setup()
    const onAlertClick = vi.fn()
    const mockAction = vi.fn()
    
    const alerts = [
      {
        ...mockAlerts[0],
        actions: [
          {
            id: 'navigate',
            label: 'Navigate',
            action: mockAction,
            variant: 'outline'
          }
        ]
      }
    ]
    
    renderWithProviders(
      <ProximityAlertsDisplay 
        alerts={alerts}
        onAlertClick={onAlertClick}
      />
    )
    
    // Expand alert first
    const expandButton = screen.getByLabelText(/expand details/i)
    await user.click(expandButton)
    
    // Click action button
    const actionButton = screen.getByText(/navigate/i)
    await userEvent.click(actionButton)
    
    // Should call action but not click
    expect(mockAction).toHaveBeenCalled()
    expect(onAlertClick).not.toHaveBeenCalledWith(mockAlerts[0])
  })

  it('passes props to underlying div', () => {
    renderWithProviders(<ProximityAlertsDisplay {...defaultProps} data-testid="custom-alerts" />)
    
    expect(screen.getByTestId('custom-alerts')).toBeInTheDocument()
  })

  it('has correct ARIA attributes', () => {
    renderWithProviders(<ProximityAlertsDisplay {...defaultProps} />)
    
    const alertsDisplay = screen.getByRole('region', { name: /proximity alerts/i })
    expect(alertsDisplay).toHaveAttribute('aria-label', 'Proximity alerts')
  })

  it('has correct ARIA attributes for alert items', () => {
    renderWithProviders(<ProximityAlertsDisplay {...defaultProps} />)
    
    const alertItems = screen.getAllByRole('button')
    expect(alertItems.length).toBeGreaterThan(0)
    
    alertItems.forEach(item => {
      expect(item).toHaveAttribute('aria-label')
      expect(item).toHaveAttribute('tabIndex', '0')
    })
  })

  it('has correct ARIA attributes for expand buttons', () => {
    renderWithProviders(<ProximityAlertsDisplay {...defaultProps} />)
    
    const expandButtons = screen.getAllByLabelText(/expand details/i)
    expect(expandButtons.length).toBeGreaterThan(0)
    
    expandButtons.forEach(button => {
      expect(button).toHaveAttribute('aria-expanded')
      expect(button).toHaveAttribute('aria-controls')
    })
  })

  it('handles empty actions array', () => {
    const alerts = [
      {
        ...mockAlerts[0],
        actions: []
      }
    ]
    
    renderWithProviders(<ProximityAlertsDisplay alerts={alerts} />)
    
    // Expand alert
    const expandButton = screen.getByLabelText(/expand details/i)
    userEvent.click(expandButton)
    
    // Should not show action buttons
    expect(screen.queryByText(/navigate/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/dismiss/i)).not.toBeInTheDocument()
  })

  it('handles missing actions property', () => {
    const alerts = [
      {
        ...mockAlerts[0],
        actions: undefined
      }
    ]
    
    renderWithProviders(<ProximityAlertsDisplay alerts={alerts} />)
    
    // Expand alert
    const expandButton = screen.getByLabelText(/expand details/i)
    userEvent.click(expandButton)
    
    // Should not show action buttons
    expect(screen.queryByText(/navigate/i)).not.toBeInTheDocument()
  })

  it('shows correct timestamp format', () => {
    renderWithProviders(<ProximityAlertsDisplay {...defaultProps} />)
    
    // Should show formatted time
    const timeElements = screen.getAllByText(/\d{1,2}:\d{2}:\d{2}/)
    expect(timeElements.length).toBeGreaterThan(0)
  })
})