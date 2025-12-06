import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { EmergencyDetailsPopup, EmergencyDetails } from '../EmergencyDetailsPopup'
import { createTestUtils } from '@/test-utils'

// Mock navigator.share
Object.defineProperty(navigator, 'share', {
  writable: true,
  value: vi.fn(() => Promise.resolve()),
})

// Mock UI components
vi.mock('@/components/ui', () => ({
  EmergencyIndicator: ({ type, size, variant, showSeverity, severity, label }: any) => (
    <div data-testid="emergency-indicator" data-type={type} data-size={size} data-variant={variant} data-show-severity={showSeverity} data-severity={severity}>
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
  ),
  EnhancedButton: ({ children, onClick, variant, size, leftIcon, className, ...props }: any) => (
    <button onClick={onClick} data-variant={variant} data-size={size} className={className} {...props}>
      {leftIcon}
      {children}
    </button>
  ),
}))

describe('EmergencyDetailsPopup', () => {
  const { renderWithProviders } = createTestUtils()
  
  const mockEmergency: EmergencyDetails = {
    id: 'emergency-1',
    title: 'Building Fire',
    description: 'A fire has been reported in a downtown building. Emergency services are on the scene.',
    emergencyType: 'fire',
    severity: 4,
    status: 'active',
    trustScore: 0.85,
    location: {
      address: '123 Main St, Downtown',
      coordinates: [40.7128, -74.0060],
      distance: 500,
    },
    timestamp: '2023-12-06T10:00:00Z',
    reporter: {
      name: 'John Doe',
      verified: true,
    },
    estimatedResolution: 'Expected within 2 hours',
    affectedArea: 1000,
    requiredAssistance: ['Firefighters', 'Medical Teams'],
    contactInfo: {
      phone: '555-0123',
      email: 'emergency@example.com',
      website: 'https://emergency.example.com',
    },
    resources: [
      {
        type: 'Fire Trucks',
        quantity: 3,
        status: 'deployed',
      },
      {
        type: 'Ambulances',
        quantity: 2,
        status: 'available',
      },
    ],
    updates: [
      {
        id: 'update-1',
        message: 'Firefighters have arrived on scene',
        timestamp: '2023-12-06T10:15:00Z',
        author: 'Fire Department',
      },
      {
        id: 'update-2',
        message: 'Building evacuation in progress',
        timestamp: '2023-12-06T10:30:00Z',
        author: 'Emergency Management',
      },
    ],
    actions: [
      {
        id: 'navigate',
        label: 'Navigate',
        action: vi.fn(),
        variant: 'outline',
      },
      {
        id: 'contact',
        label: 'Contact',
        action: vi.fn(),
        variant: 'outline',
      },
    ],
  }

  const defaultProps = {
    emergency: mockEmergency,
    onClose: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('renders emergency details popup', () => {
    renderWithProviders(<EmergencyDetailsPopup {...defaultProps} />)
    
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText(/building fire/i)).toBeInTheDocument()
    expect(screen.getByText(/a fire has been reported in a downtown building/i)).toBeInTheDocument()
  })

  it('displays emergency indicators correctly', () => {
    renderWithProviders(<EmergencyDetailsPopup {...defaultProps} />)
    
    const emergencyIndicator = screen.getByTestId('emergency-indicator')
    expect(emergencyIndicator).toHaveAttribute('data-type', 'fire')
    expect(emergencyIndicator).toHaveAttribute('data-severity', '4')
    
    const trustBadge = screen.getByTestId('trust-badge')
    expect(trustBadge).toHaveAttribute('data-level', 'good')
    expect(trustBadge).toHaveAttribute('data-score', '85')
    
    const statusIndicator = screen.getByTestId('status-indicator')
    expect(statusIndicator).toHaveAttribute('data-status', 'active')
  })

  it('displays location and time information', () => {
    renderWithProviders(<EmergencyDetailsPopup {...defaultProps} />)
    
    expect(screen.getByText(/123 main st, downtown/i)).toBeInTheDocument()
    expect(screen.getByText(/\(500m away\)/i)).toBeInTheDocument()
    expect(screen.getByText(/john doe/i)).toBeInTheDocument()
  })

  it('shows verified reporter badge', () => {
    renderWithProviders(<EmergencyDetailsPopup {...defaultProps} />)
    
    // Should show verified indicator
    const verifiedIcon = screen.getByTestId('icon').find(el => el.getAttribute('data-name') === 'shield')
    expect(verifiedIcon).toBeInTheDocument()
  })

  it('renders tabs for additional content', () => {
    renderWithProviders(<EmergencyDetailsPopup {...defaultProps} />)
    
    expect(screen.getByText(/details/i)).toBeInTheDocument()
    expect(screen.getByText(/updates \(2\)/i)).toBeInTheDocument()
    expect(screen.getByText(/resources \(2\)/i)).toBeInTheDocument()
  })

  it('switches between tabs correctly', async () => {
    const user = userEvent.setup()
    renderWithProviders(<EmergencyDetailsPopup {...defaultProps} />)
    
    // Initially on details tab
    expect(screen.getByText(/estimated resolution/i)).toBeInTheDocument()
    
    // Switch to updates tab
    const updatesTab = screen.getByText(/updates \(2\)/i)
    await user.click(updatesTab)
    
    // Should show updates
    expect(screen.getByText(/firefighters have arrived on scene/i)).toBeInTheDocument()
    expect(screen.getByText(/building evacuation in progress/i)).toBeInTheDocument()
    
    // Switch to resources tab
    const resourcesTab = screen.getByText(/resources \(2\)/i)
    await user.click(resourcesTab)
    
    // Should show resources
    expect(screen.getByText(/fire trucks/i)).toBeInTheDocument()
    expect(screen.getByText(/ambulances/i)).toBeInTheDocument()
  })

  it('expands and collapses detail sections', async () => {
    const user = userEvent.setup()
    renderWithProviders(<EmergencyDetailsPopup {...defaultProps} />)
    
    // Initially collapsed sections
    expect(screen.queryByText(/expected within 2 hours/i)).not.toBeInTheDocument()
    
    // Expand estimated resolution section
    const resolutionSection = screen.getByText(/estimated resolution/i).closest('div')
    const expandButton = resolutionSection?.querySelector('[role="button"]')
    await user.click(expandButton!)
    
    // Should show expanded content
    expect(screen.getByText(/expected within 2 hours/i)).toBeInTheDocument()
    
    // Collapse section
    await user.click(expandButton!)
    
    // Should hide content
    expect(screen.queryByText(/expected within 2 hours/i)).not.toBeInTheDocument()
  })

  it('handles share functionality', async () => {
    const user = userEvent.setup()
    const onShare = vi.fn()
    
    renderWithProviders(<EmergencyDetailsPopup {...defaultProps} onShare={onShare} />)
    
    const shareButton = screen.getByRole('button', { name: /share emergency details/i })
    await user.click(shareButton)
    
    expect(navigator.share).toHaveBeenCalledWith({
      title: 'Building Fire',
      text: 'A fire has been reported in a downtown building. Emergency services are on the scene.',
      url: window.location.href,
    })
  })

  it('handles close functionality', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    
    renderWithProviders(<EmergencyDetailsPopup {...defaultProps} onClose={onClose} />)
    
    const closeButton = screen.getByRole('button', { name: /close emergency details/i })
    await user.click(closeButton)
    
    expect(onClose).toHaveBeenCalled()
  })

  it('handles navigate action', async () => {
    const user = userEvent.setup()
    const onNavigate = vi.fn()
    
    renderWithProviders(<EmergencyDetailsPopup {...defaultProps} onNavigate={onNavigate} />)
    
    const navigateButton = screen.getByText(/navigate/i)
    await user.click(navigateButton)
    
    expect(onNavigate).toHaveBeenCalled()
  })

  it('handles contact action', async () => {
    const user = userEvent.setup()
    const onContact = vi.fn()
    
    renderWithProviders(<EmergencyDetailsPopup {...defaultProps} onContact={onContact} />)
    
    const contactButton = screen.getByText(/contact/i)
    await user.click(contactButton)
    
    expect(onContact).toHaveBeenCalled()
  })

  it('handles custom actions', async () => {
    const user = userEvent.setup()
    const mockAction = vi.fn()
    
    const emergencyWithCustomAction = {
      ...mockEmergency,
      actions: [
        {
          id: 'custom',
          label: 'Custom Action',
          action: mockAction,
          variant: 'default',
        },
      ],
    }
    
    renderWithProviders(<EmergencyDetailsPopup {...defaultProps} emergency={emergencyWithCustomAction} />)
    
    const customActionButton = screen.getByText(/custom action/i)
    await user.click(customActionButton)
    
    expect(mockAction).toHaveBeenCalled()
  })

  it('auto-closes when enabled', () => {
    vi.useFakeTimers()
    
    renderWithProviders(<EmergencyDetailsPopup {...defaultProps} autoClose={true} autoCloseDelay={1000} />)
    
    // Should be visible initially
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    
    // Fast-forward time
    vi.advanceTimersByTime(2000)
    
    // Should be closed
    expect(defaultProps.onClose).toHaveBeenCalled()
  })

  it('handles escape key to close', async () => {
    const user = userEvent.setup()
    
    renderWithProviders(<EmergencyDetailsPopup {...defaultProps} />)
    
    await user.keyboard('{Escape}')
    
    expect(defaultProps.onClose).toHaveBeenCalled()
  })

  it('applies position variants correctly', () => {
    renderWithProviders(<EmergencyDetailsPopup {...defaultProps} position="top" />)
    
    const popup = screen.getByRole('dialog')
    expect(popup).toHaveClass('top-4', 'left-4', 'right-4')
  })

  it('applies size variants correctly', () => {
    renderWithProviders(<EmergencyDetailsPopup {...defaultProps} size="lg" />)
    
    const popup = screen.getByRole('dialog')
    expect(popup).toHaveClass('max-w-lg')
  })

  it('applies variant styles correctly', () => {
    renderWithProviders(<EmergencyDetailsPopup {...defaultProps} variant="compact" />)
    
    const popup = screen.getByRole('dialog')
    expect(popup).toHaveClass('p-3')
  })

  it('hides actions when disabled', () => {
    renderWithProviders(<EmergencyDetailsPopup {...defaultProps} showActions={false} />)
    
    expect(screen.queryByText(/navigate/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/contact/i)).not.toBeInTheDocument()
  })

  it('hides updates when disabled', () => {
    renderWithProviders(<EmergencyDetailsPopup {...defaultProps} showUpdates={false} />)
    
    expect(screen.queryByText(/updates \(2\)/i)).not.toBeInTheDocument()
  })

  it('hides resources when disabled', () => {
    renderWithProviders(<EmergencyDetailsPopup {...defaultProps} showResources={false} />)
    
    expect(screen.queryByText(/resources \(2\)/i)).not.toBeInTheDocument()
  })

  it('hides contact info when disabled', () => {
    renderWithProviders(<EmergencyDetailsPopup {...defaultProps} showContactInfo={false} />)
    
    expect(screen.queryByText(/contact information/i)).not.toBeInTheDocument()
  })

  it('formats distance correctly', () => {
    const emergencyWithKmDistance = {
      ...mockEmergency,
      location: {
        ...mockEmergency.location,
        distance: 1500, // 1.5km
      },
    }
    
    renderWithProviders(<EmergencyDetailsPopup {...defaultProps} emergency={emergencyWithKmDistance} />)
    
    expect(screen.getByText(/\(1.5km away\)/i)).toBeInTheDocument()
  })

  it('formats time correctly', () => {
    const recentEmergency = {
      ...mockEmergency,
      timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 minutes ago
    }
    
    renderWithProviders(<EmergencyDetailsPopup {...defaultProps} emergency={recentEmergency} />)
    
    expect(screen.getByText(/5 minutes ago/i)).toBeInTheDocument()
  })

  it('shows contact information links', () => {
    renderWithProviders(<EmergencyDetailsPopup {...defaultProps} />)
    
    const phoneLink = screen.getByText(/555-0123/i).closest('a')
    expect(phoneLink).toHaveAttribute('href', 'tel:555-0123')
    
    const emailLink = screen.getByText(/emergency@example.com/i).closest('a')
    expect(emailLink).toHaveAttribute('href', 'mailto:emergency@example.com')
    
    const websiteLink = screen.getByText(/visit website/i).closest('a')
    expect(websiteLink).toHaveAttribute('href', 'https://emergency.example.com')
    expect(websiteLink).toHaveAttribute('target', '_blank')
    expect(websiteLink).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('displays resource status correctly', async () => {
    const user = userEvent.setup()
    renderWithProviders(<EmergencyDetailsPopup {...defaultProps} />)
    
    // Switch to resources tab
    const resourcesTab = screen.getByText(/resources \(2\)/i)
    await user.click(resourcesTab)
    
    // Should show resource status
    const deployedStatus = screen.getByTestId('status-indicator').find(el => 
      el.getAttribute('data-status') === 'pending' // deployed maps to pending
    )
    expect(deployedStatus).toBeInTheDocument()
    
    const availableStatus = screen.getByTestId('status-indicator').find(el => 
      el.getAttribute('data-status') === 'active' // available maps to active
    )
    expect(availableStatus).toBeInTheDocument()
  })

  it('handles emergency without reporter', () => {
    const emergencyWithoutReporter = {
      ...mockEmergency,
      reporter: undefined,
    }
    
    renderWithProviders(<EmergencyDetailsPopup {...defaultProps} emergency={emergencyWithoutReporter} />)
    
    expect(screen.queryByText(/john doe/i)).not.toBeInTheDocument()
  })

  it('handles emergency without updates', () => {
    const emergencyWithoutUpdates = {
      ...mockEmergency,
      updates: undefined,
    }
    
    renderWithProviders(<EmergencyDetailsPopup {...defaultProps} emergency={emergencyWithoutUpdates} />)
    
    expect(screen.queryByText(/updates \(/i)).not.toBeInTheDocument()
  })

  it('handles emergency without resources', () => {
    const emergencyWithoutResources = {
      ...mockEmergency,
      resources: undefined,
    }
    
    renderWithProviders(<EmergencyDetailsPopup {...defaultProps} emergency={emergencyWithoutResources} />)
    
    expect(screen.queryByText(/resources \(/i)).not.toBeInTheDocument()
  })

  it('handles emergency without contact info', () => {
    const emergencyWithoutContact = {
      ...mockEmergency,
      contactInfo: undefined,
    }
    
    renderWithProviders(<EmergencyDetailsPopup {...defaultProps} emergency={emergencyWithoutContact} />)
    
    expect(screen.queryByText(/contact information/i)).not.toBeInTheDocument()
  })

  it('handles emergency without actions', () => {
    const emergencyWithoutActions = {
      ...mockEmergency,
      actions: undefined,
    }
    
    renderWithProviders(<EmergencyDetailsPopup {...defaultProps} emergency={emergencyWithoutActions} />)
    
    expect(screen.queryByText(/navigate/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/contact/i)).not.toBeInTheDocument()
  })

  it('applies custom className', () => {
    renderWithProviders(<EmergencyDetailsPopup {...defaultProps} className="custom-class" />)
    
    const popup = screen.getByRole('dialog')
    expect(popup).toHaveClass('custom-class')
  })

  it('passes props to underlying div', () => {
    renderWithProviders(<EmergencyDetailsPopup {...defaultProps} data-testid="custom-popup" />)
    
    expect(screen.getByTestId('custom-popup')).toBeInTheDocument()
  })

  it('has correct ARIA attributes', () => {
    renderWithProviders(<EmergencyDetailsPopup {...defaultProps} />)
    
    const popup = screen.getByRole('dialog')
    expect(popup).toHaveAttribute('aria-modal', 'true')
    expect(popup).toHaveAttribute('aria-labelledby', 'emergency-title')
    expect(popup).toHaveAttribute('aria-describedby', 'emergency-description')
    expect(popup).toHaveAttribute('tabIndex', '-1')
  })

  it('focuses popup on mount', () => {
    renderWithProviders(<EmergencyDetailsPopup {...defaultProps} />)
    
    const popup = screen.getByRole('dialog')
    expect(popup).toHaveFocus()
  })

  it('handles keyboard navigation for collapsible sections', async () => {
    const user = userEvent.setup()
    renderWithProviders(<EmergencyDetailsPopup {...defaultProps} />)
    
    // Find collapsible section
    const sectionHeader = screen.getByText(/estimated resolution/i).closest('div')
    const expandButton = sectionHeader?.querySelector('[role="button"]')
    
    if (expandButton) {
      expandButton.focus()
      await user.keyboard('{Enter}')
      
      // Should expand section
      expect(screen.getByText(/expected within 2 hours/i)).toBeInTheDocument()
      
      // Collapse with space key
      await user.keyboard('{ }')
      
      // Should collapse section
      expect(screen.queryByText(/expected within 2 hours/i)).not.toBeInTheDocument()
    }
  })

  it('handles share API failure', async () => {
    const user = userEvent.setup()
    const onShare = vi.fn()
    
    // Mock share API failure
    vi.mocked(navigator.share).mockRejectedValue(new Error('Share failed'))
    
    renderWithProviders(<EmergencyDetailsPopup {...defaultProps} onShare={onShare} />)
    
    const shareButton = screen.getByRole('button', { name: /share emergency details/i })
    await user.click(shareButton)
    
    // Should call fallback onShare
    expect(onShare).toHaveBeenCalled()
  })

  it('handles missing share API', async () => {
    const user = userEvent.setup()
    const onShare = vi.fn()
    
    // Mock missing share API
    const originalShare = navigator.share
    delete (navigator as any).share
    
    renderWithProviders(<EmergencyDetailsPopup {...defaultProps} onShare={onShare} />)
    
    const shareButton = screen.getByRole('button', { name: /share emergency details/i })
    await user.click(shareButton)
    
    // Should call fallback onShare
    expect(onShare).toHaveBeenCalled()
    
    // Restore share API
    navigator.share = originalShare
  })

  it('displays correct emergency icons', () => {
    renderWithProviders(<EmergencyDetailsPopup {...defaultProps} />)
    
    const emergencyIndicator = screen.getByTestId('emergency-indicator')
    expect(emergencyIndicator).toHaveAttribute('data-type', 'fire')
  })

  it('displays correct trust levels', () => {
    const emergencyWithLowTrust = {
      ...mockEmergency,
      trustScore: 0.25,
    }
    
    renderWithProviders(<EmergencyDetailsPopup {...defaultProps} emergency={emergencyWithLowTrust} />)
    
    const trustBadge = screen.getByTestId('trust-badge')
    expect(trustBadge).toHaveAttribute('data-level', 'low')
    expect(trustBadge).toHaveAttribute('data-score', '25')
  })

  it('displays correct status indicators', () => {
    const emergencyWithResolvedStatus = {
      ...mockEmergency,
      status: 'resolved',
    }
    
    renderWithProviders(<EmergencyDetailsPopup {...defaultProps} emergency={emergencyWithResolvedStatus} />)
    
    const statusIndicator = screen.getByTestId('status-indicator')
    expect(statusIndicator).toHaveAttribute('data-status', 'resolved')
  })

  it('shows required assistance list', async () => {
    const user = userEvent.setup()
    renderWithProviders(<EmergencyDetailsPopup {...defaultProps} />)
    
    // Expand required assistance section
    const assistanceSection = screen.getByText(/required assistance/i).closest('div')
    const expandButton = assistanceSection?.querySelector('[role="button"]')
    await user.click(expandButton!)
    
    expect(screen.getByText(/firefighters/i)).toBeInTheDocument()
    expect(screen.getByText(/medical teams/i)).toBeInTheDocument()
  })

  it('shows affected area information', async () => {
    const user = userEvent.setup()
    renderWithProviders(<EmergencyDetailsPopup {...defaultProps} />)
    
    // Expand affected area section
    const areaSection = screen.getByText(/affected area/i).closest('div')
    const expandButton = areaSection?.querySelector('[role="button"]')
    await user.click(expandButton!)
    
    expect(screen.getByText(/approximately 1000 square meters/i)).toBeInTheDocument()
  })

  it('handles emergency without distance', () => {
    const emergencyWithoutDistance = {
      ...mockEmergency,
      location: {
        ...mockEmergency.location,
        distance: undefined,
      },
    }
    
    renderWithProviders(<EmergencyDetailsPopup {...defaultProps} emergency={emergencyWithoutDistance} />)
    
    expect(screen.queryByText(/\(.* away\)/i)).not.toBeInTheDocument()
  })

  it('handles emergency without estimated resolution', () => {
    const emergencyWithoutResolution = {
      ...mockEmergency,
      estimatedResolution: undefined,
    }
    
    renderWithProviders(<EmergencyDetailsPopup {...defaultProps} emergency={emergencyWithoutResolution} />)
    
    expect(screen.queryByText(/estimated resolution/i)).not.toBeInTheDocument()
  })

  it('handles emergency without affected area', () => {
    const emergencyWithoutArea = {
      ...mockEmergency,
      affectedArea: undefined,
    }
    
    renderWithProviders(<EmergencyDetailsPopup {...defaultProps} emergency={emergencyWithoutArea} />)
    
    expect(screen.queryByText(/affected area/i)).not.toBeInTheDocument()
  })

  it('handles emergency without required assistance', () => {
    const emergencyWithoutAssistance = {
      ...mockEmergency,
      requiredAssistance: undefined,
    }
    
    renderWithProviders(<EmergencyDetailsPopup {...defaultProps} emergency={emergencyWithoutAssistance} />)
    
    expect(screen.queryByText(/required assistance/i)).not.toBeInTheDocument()
  })
})