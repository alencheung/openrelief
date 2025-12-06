import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import EmergencyReportInterface from '../EmergencyReportInterface'
import { createTestUtils, createMockEmergencyEvent, createMockLocation } from '@/test-utils'

// Mock store hooks
vi.mock('@/store', () => ({
  useEmergencyStore: vi.fn(() => ({
    addOfflineAction: vi.fn(),
  })),
  useLocationStore: vi.fn(() => ({
    currentLocation: createMockLocation({ lat: 40.7128, lng: -74.0060 }),
  })),
  useOfflineStore: vi.fn(() => ({
    addAction: vi.fn(),
  })),
}))

// Mock accessibility hooks
vi.mock('@/hooks/accessibility', () => ({
  useFocusManagement: vi.fn(() => ({
    containerRef: { current: null },
    getFocusableElements: vi.fn(() => []),
    focusFirstElement: vi.fn(),
  })),
  useAriaAnnouncer: vi.fn(() => ({
    announcePolite: vi.fn(),
    announceAssertive: vi.fn(),
  })),
  useFormValidationAnnouncer: vi.fn(() => ({
    announceValidationErrors: vi.fn(),
    announceFieldError: vi.fn(),
    announceFieldSuccess: vi.fn(),
  })),
}))

// Mock UI components
vi.mock('@/components/ui', () => ({
  EnhancedCard: ({ children, ...props }: any) => <div data-testid="enhanced-card" {...props}>{children}</div>,
  EnhancedCardHeader: ({ children, ...props }: any) => <div data-testid="enhanced-card-header" {...props}>{children}</div>,
  EnhancedCardTitle: ({ children, ...props }: any) => <div data-testid="enhanced-card-title" {...props}>{children}</div>,
  EnhancedCardContent: ({ children, ...props }: any) => <div data-testid="enhanced-card-content" {...props}>{children}</div>,
  FormFeedback: ({ message, type }: any) => <div data-testid={`form-feedback-${type}`}>{message}</div>,
  EnhancedButton: ({ children, onClick, loading, disabled, ...props }: any) => (
    <button onClick={onClick} disabled={disabled || loading} data-testid="enhanced-button" {...props}>
      {loading ? 'Loading...' : children}
    </button>
  ),
}))

// Mock form components
vi.mock('@/components/ui/forms', () => ({
  EnhancedInput: ({ label, value, onChange, errorText, ...props }: any) => (
    <div>
      <label>{label}</label>
      <input value={value} onChange={onChange} data-testid="enhanced-input" {...props} />
      {errorText && <span data-testid="input-error">{errorText}</span>}
    </div>
  ),
  EnhancedTextarea: ({ label, value, onChange, errorText, ...props }: any) => (
    <div>
      <label>{label}</label>
      <textarea value={value} onChange={onChange} data-testid="enhanced-textarea" {...props} />
      {errorText && <span data-testid="textarea-error">{errorText}</span>}
    </div>
  ),
  EnhancedRadioGroup: ({ label, options, value, onChange, ...props }: any) => (
    <div>
      <label>{label}</label>
      <div data-testid="enhanced-radio-group">
        {options.map((option: any) => (
          <label key={option.value}>
            <input
              type="radio"
              value={option.value}
              checked={value === option.value}
              onChange={(e) => onChange(e.target.value)}
            />
            {option.label}
          </label>
        ))}
      </div>
    </div>
  ),
  EnhancedRangeSlider: ({ label, value, onChange, ...props }: any) => (
    <div>
      <label>{label}</label>
      <input
        type="range"
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        data-testid="enhanced-range-slider"
        {...props}
      />
    </div>
  ),
  EnhancedFileUpload: ({ label, onFilesChange, ...props }: any) => (
    <div>
      <label>{label}</label>
      <input
        type="file"
        onChange={(e) => onFilesChange(Array.from(e.target.files || []), [])}
        data-testid="enhanced-file-upload"
        {...props}
      />
    </div>
  ),
  AudioRecorder: ({ label, onRecordingStop, ...props }: any) => (
    <div>
      <label>{label}</label>
      <button onClick={() => onRecordingStop({ url: 'mock-audio-url', duration: 30 })} data-testid="audio-recorder">
        Record Audio
      </button>
    </div>
  ),
  ImagePreview: ({ src, onRemove }: any) => (
    <div data-testid="image-preview">
      <img src={src} alt="Preview" />
      <button onClick={onRemove}>Remove</button>
    </div>
  ),
  EmergencyFormLayout: ({ children, ...props }: any) => <div data-testid="emergency-form-layout">{children}</div>,
  EmergencyFormSection: ({ children, title, ...props }: any) => (
    <div data-testid="emergency-form-section">
      <h3>{title}</h3>
      {children}
    </div>
  ),
  EmergencyFormActions: ({ children, ...props }: any) => <div data-testid="emergency-form-actions">{children}</div>,
  FormProgress: ({ steps, currentStep, onStepClick, ...props }: any) => (
    <div data-testid="form-progress">
      {steps.map((step: any, index: number) => (
        <button
          key={step.id}
          onClick={() => onStepClick(index)}
          data-testid={`progress-step-${step.id}`}
        >
          {step.title}
        </button>
      ))}
    </div>
  ),
  FormProgressSummary: ({ currentStep, totalSteps, ...props }: any) => (
    <div data-testid="form-progress-summary">
      Step {currentStep + 1} of {totalSteps}
    </div>
  ),
}))

// Mock navigator permissions
Object.defineProperty(navigator, 'permissions', {
  writable: true,
  value: {
    query: vi.fn(() => Promise.resolve({ state: 'granted' })),
  },
})

// Mock navigator online status
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true,
})

describe('EmergencyReportInterface', () => {
  const { renderWithProviders } = createTestUtils()
  
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onReportSubmitted: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders nothing when not open', () => {
    renderWithProviders(<EmergencyReportInterface {...defaultProps} isOpen={false} />)
    
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('renders dialog when open', () => {
    renderWithProviders(<EmergencyReportInterface {...defaultProps} />)
    
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: /report emergency/i })).toBeInTheDocument()
  })

  it('renders emergency type selection step initially', () => {
    renderWithProviders(<EmergencyReportInterface {...defaultProps} />)
    
    expect(screen.getByText(/emergency type/i)).toBeInTheDocument()
    expect(screen.getByText(/select type of emergency you are reporting/i)).toBeInTheDocument()
    
    // Should show emergency type cards
    expect(screen.getByText(/fire/i)).toBeInTheDocument()
    expect(screen.getByText(/medical/i)).toBeInTheDocument()
    expect(screen.getByText(/security/i)).toBeInTheDocument()
    expect(screen.getByText(/natural/i)).toBeInTheDocument()
    expect(screen.getByText(/infrastructure/i)).toBeInTheDocument()
  })

  it('allows selecting emergency type', async () => {
    const user = userEvent.setup()
    renderWithProviders(<EmergencyReportInterface {...defaultProps} />)
    
    const fireCard = screen.getByText(/fire/i).closest('[data-testid="enhanced-card"]')
    await user.click(fireCard!)
    
    expect(screen.getByText(/fire/i).closest('[data-testid="enhanced-card"]')).toHaveClass('ring-2 ring-primary border-primary')
  })

  it('validates emergency type selection', async () => {
    const user = userEvent.setup()
    renderWithProviders(<EmergencyReportInterface {...defaultProps} />)
    
    const nextButton = screen.getByRole('button', { name: /next/i })
    await user.click(nextButton)
    
    expect(screen.getByText(/please select an emergency type/i)).toBeInTheDocument()
  })

  it('navigates to details step after selecting type', async () => {
    const user = userEvent.setup()
    renderWithProviders(<EmergencyReportInterface {...defaultProps} />)
    
    // Select emergency type
    const fireCard = screen.getByText(/fire/i).closest('[data-testid="enhanced-card"]')
    await user.click(fireCard!)
    
    // Click next
    const nextButton = screen.getByRole('button', { name: /next/i })
    await user.click(nextButton)
    
    // Should be on details step
    expect(screen.getByText(/emergency details/i)).toBeInTheDocument()
    expect(screen.getByText(/provide detailed information about emergency/i)).toBeInTheDocument()
  })

  it('renders form fields in details step', async () => {
    const user = userEvent.setup()
    renderWithProviders(<EmergencyReportInterface {...defaultProps} />)
    
    // Navigate to details step
    const fireCard = screen.getByText(/fire/i).closest('[data-testid="enhanced-card"]')
    await user.click(fireCard!)
    
    const nextButton = screen.getByRole('button', { name: /next/i })
    await user.click(nextButton)
    
    // Check form fields
    expect(screen.getByLabelText(/title/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/severity level/i)).toBeInTheDocument()
  })

  it('validates title field', async () => {
    const user = userEvent.setup()
    renderWithProviders(<EmergencyReportInterface {...defaultProps} />)
    
    // Navigate to details step
    const fireCard = screen.getByText(/fire/i).closest('[data-testid="enhanced-card"]')
    await user.click(fireCard!)
    
    const nextButton = screen.getByRole('button', { name: /next/i })
    await user.click(nextButton)
    
    // Try to proceed without filling title
    const detailsNextButton = screen.getByRole('button', { name: /next/i })
    await user.click(detailsNextButton)
    
    expect(screen.getByText(/title is required/i)).toBeInTheDocument()
  })

  it('validates title length', async () => {
    const user = userEvent.setup()
    renderWithProviders(<EmergencyReportInterface {...defaultProps} />)
    
    // Navigate to details step
    const fireCard = screen.getByText(/fire/i).closest('[data-testid="enhanced-card"]')
    await user.click(fireCard!)
    
    const nextButton = screen.getByRole('button', { name: /next/i })
    await user.click(nextButton)
    
    // Enter title that's too short
    const titleInput = screen.getByLabelText(/title/i)
    await user.type(titleInput, 'abc')
    
    const detailsNextButton = screen.getByRole('button', { name: /next/i })
    await user.click(detailsNextButton)
    
    expect(screen.getByText(/title must be at least 5 characters/i)).toBeInTheDocument()
  })

  it('validates description field', async () => {
    const user = userEvent.setup()
    renderWithProviders(<EmergencyReportInterface {...defaultProps} />)
    
    // Navigate to details step
    const fireCard = screen.getByText(/fire/i).closest('[data-testid="enhanced-card"]')
    await user.click(fireCard!)
    
    const nextButton = screen.getByRole('button', { name: /next/i })
    await user.click(nextButton)
    
    // Fill title but not description
    const titleInput = screen.getByLabelText(/title/i)
    await user.type(titleInput, 'Test Emergency Title')
    
    const detailsNextButton = screen.getByRole('button', { name: /next/i })
    await user.click(detailsNextButton)
    
    expect(screen.getByText(/description is required/i)).toBeInTheDocument()
  })

  it('allows filling valid details', async () => {
    const user = userEvent.setup()
    renderWithProviders(<EmergencyReportInterface {...defaultProps} />)
    
    // Navigate to details step
    const fireCard = screen.getByText(/fire/i).closest('[data-testid="enhanced-card"]')
    await user.click(fireCard!)
    
    const nextButton = screen.getByRole('button', { name: /next/i })
    await user.click(nextButton)
    
    // Fill valid details
    const titleInput = screen.getByLabelText(/title/i)
    await user.type(titleInput, 'Test Emergency Title')
    
    const descriptionInput = screen.getByLabelText(/description/i)
    await user.type(descriptionInput, 'This is a test emergency description that is long enough')
    
    // Should be able to proceed
    const detailsNextButton = screen.getByRole('button', { name: /next/i })
    await user.click(detailsNextButton)
    
    expect(screen.getByText(/location/i)).toBeInTheDocument()
  })

  it('navigates to location step after details', async () => {
    const user = userEvent.setup()
    renderWithProviders(<EmergencyReportInterface {...defaultProps} />)
    
    // Navigate through steps
    const fireCard = screen.getByText(/fire/i).closest('[data-testid="enhanced-card"]')
    await user.click(fireCard!)
    
    await user.click(screen.getByRole('button', { name: /next/i }))
    
    // Fill details
    await user.type(screen.getByLabelText(/title/i), 'Test Emergency Title')
    await user.type(screen.getByLabelText(/description/i), 'This is a test emergency description that is long enough')
    
    await user.click(screen.getByRole('button', { name: /next/i }))
    
    // Should be on location step
    expect(screen.getByText(/location/i)).toBeInTheDocument()
    expect(screen.getByText(/specify exact location and affected area/i)).toBeInTheDocument()
  })

  it('shows current location when available', async () => {
    const user = userEvent.setup()
    renderWithProviders(<EmergencyReportInterface {...defaultProps} />)
    
    // Navigate to location step
    const fireCard = screen.getByText(/fire/i).closest('[data-testid="enhanced-card"]')
    await user.click(fireCard!)
    
    await user.click(screen.getByRole('button', { name: /next/i }))
    
    await user.type(screen.getByLabelText(/title/i), 'Test Emergency Title')
    await user.type(screen.getByLabelText(/description/i), 'This is a test emergency description that is long enough')
    
    await user.click(screen.getByRole('button', { name: /next/i }))
    
    // Should show current location
    expect(screen.getByText(/40\.712800, -74\.006000/i)).toBeInTheDocument()
  })

  it('allows selecting location on map', async () => {
    const user = userEvent.setup()
    const mockMapInstance = {
      getCanvas: vi.fn(() => ({ style: {} })),
      on: vi.fn(),
      off: vi.fn(),
    }
    
    renderWithProviders(<EmergencyReportInterface {...defaultProps} mapInstance={mockMapInstance} />)
    
    // Navigate to location step
    const fireCard = screen.getByText(/fire/i).closest('[data-testid="enhanced-card"]')
    await user.click(fireCard!)
    
    await user.click(screen.getByRole('button', { name: /next/i }))
    
    await user.type(screen.getByLabelText(/title/i), 'Test Emergency Title')
    await user.type(screen.getByLabelText(/description/i), 'This is a test emergency description that is long enough')
    
    await user.click(screen.getByRole('button', { name: /next/i }))
    
    // Click select on map button
    const selectMapButton = screen.getByRole('button', { name: /select on map/i })
    await user.click(selectMapButton)
    
    expect(mockMapInstance.getCanvas).toHaveBeenCalled()
    expect(mockMapInstance.on).toHaveBeenCalledWith('click', expect.any(Function))
  })

  it('navigates to evidence step after location', async () => {
    const user = userEvent.setup()
    renderWithProviders(<EmergencyReportInterface {...defaultProps} />)
    
    // Navigate through steps
    const fireCard = screen.getByText(/fire/i).closest('[data-testid="enhanced-card"]')
    await user.click(fireCard!)
    
    await user.click(screen.getByRole('button', { name: /next/i }))
    
    await user.type(screen.getByLabelText(/title/i), 'Test Emergency Title')
    await user.type(screen.getByLabelText(/description/i), 'This is a test emergency description that is long enough')
    
    await user.click(screen.getByRole('button', { name: /next/i }))
    
    // Should be on evidence step
    expect(screen.getByText(/evidence & media/i)).toBeInTheDocument()
    expect(screen.getByText(/add photos or audio recordings to support your report/i)).toBeInTheDocument()
  })

  it('allows uploading images', async () => {
    const user = userEvent.setup()
    renderWithProviders(<EmergencyReportInterface {...defaultProps} />)
    
    // Navigate to evidence step
    const fireCard = screen.getByText(/fire/i).closest('[data-testid="enhanced-card"]')
    await user.click(fireCard!)
    
    await user.click(screen.getByRole('button', { name: /next/i }))
    
    await user.type(screen.getByLabelText(/title/i), 'Test Emergency Title')
    await user.type(screen.getByLabelText(/description/i), 'This is a test emergency description that is long enough')
    
    await user.click(screen.getByRole('button', { name: /next/i }))
    await user.click(screen.getByRole('button', { name: /next/i }))
    
    // Should have file upload
    expect(screen.getByLabelText(/photos/i)).toBeInTheDocument()
  })

  it('allows audio recording', async () => {
    const user = userEvent.setup()
    renderWithProviders(<EmergencyReportInterface {...defaultProps} />)
    
    // Navigate to evidence step
    const fireCard = screen.getByText(/fire/i).closest('[data-testid="enhanced-card"]')
    await user.click(fireCard!)
    
    await user.click(screen.getByRole('button', { name: /next/i }))
    
    await user.type(screen.getByLabelText(/title/i), 'Test Emergency Title')
    await user.type(screen.getByLabelText(/description/i), 'This is a test emergency description that is long enough')
    
    await user.click(screen.getByRole('button', { name: /next/i }))
    await user.click(screen.getByRole('button', { name: /next/i }))
    
    // Should have audio recorder
    expect(screen.getByLabelText(/audio recording/i)).toBeInTheDocument()
    expect(screen.getByTestId('audio-recorder')).toBeInTheDocument()
  })

  it('navigates to review step after evidence', async () => {
    const user = userEvent.setup()
    renderWithProviders(<EmergencyReportInterface {...defaultProps} />)
    
    // Navigate through steps
    const fireCard = screen.getByText(/fire/i).closest('[data-testid="enhanced-card"]')
    await user.click(fireCard!)
    
    await user.click(screen.getByRole('button', { name: /next/i }))
    
    await user.type(screen.getByLabelText(/title/i), 'Test Emergency Title')
    await user.type(screen.getByLabelText(/description/i), 'This is a test emergency description that is long enough')
    
    await user.click(screen.getByRole('button', { name: /next/i }))
    await user.click(screen.getByRole('button', { name: /next/i }))
    
    // Should be on review step
    expect(screen.getByText(/review report/i)).toBeInTheDocument()
    expect(screen.getByText(/please review your emergency report before submitting/i)).toBeInTheDocument()
  })

  it('displays review information correctly', async () => {
    const user = userEvent.setup()
    renderWithProviders(<EmergencyReportInterface {...defaultProps} />)
    
    // Navigate through steps
    const fireCard = screen.getByText(/fire/i).closest('[data-testid="enhanced-card"]')
    await user.click(fireCard!)
    
    await user.click(screen.getByRole('button', { name: /next/i }))
    
    await user.type(screen.getByLabelText(/title/i), 'Test Emergency Title')
    await user.type(screen.getByLabelText(/description/i), 'This is a test emergency description that is long enough')
    
    await user.click(screen.getByRole('button', { name: /next/i }))
    await user.click(screen.getByRole('button', { name: /next/i }))
    
    // Check review information
    expect(screen.getByText(/test emergency title/i)).toBeInTheDocument()
    expect(screen.getByText(/this is a test emergency description that is long enough/i)).toBeInTheDocument()
    expect(screen.getByText(/fire/i)).toBeInTheDocument()
  })

  it('submits form when submit button is clicked', async () => {
    const user = userEvent.setup()
    const onReportSubmitted = vi.fn()
    
    renderWithProviders(<EmergencyReportInterface {...defaultProps} onReportSubmitted={onReportSubmitted} />)
    
    // Navigate through steps
    const fireCard = screen.getByText(/fire/i).closest('[data-testid="enhanced-card"]')
    await user.click(fireCard!)
    
    await user.click(screen.getByRole('button', { name: /next/i }))
    
    await user.type(screen.getByLabelText(/title/i), 'Test Emergency Title')
    await user.type(screen.getByLabelText(/description/i), 'This is a test emergency description that is long enough')
    
    await user.click(screen.getByRole('button', { name: /next/i }))
    await user.click(screen.getByRole('button', { name: /next/i }))
    
    // Submit form
    const submitButton = screen.getByRole('button', { name: /submit emergency report/i })
    await user.click(submitButton)
    
    expect(onReportSubmitted).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Test Emergency Title',
        description: 'This is a test emergency description that is long enough',
        type_id: 1, // Fire emergency type
      })
    )
  })

  it('shows loading state during submission', async () => {
    const user = userEvent.setup()
    const onReportSubmitted = vi.fn(() => new Promise(resolve => setTimeout(resolve, 1000)))
    
    renderWithProviders(<EmergencyReportInterface {...defaultProps} onReportSubmitted={onReportSubmitted} />)
    
    // Navigate through steps
    const fireCard = screen.getByText(/fire/i).closest('[data-testid="enhanced-card"]')
    await user.click(fireCard!)
    
    await user.click(screen.getByRole('button', { name: /next/i }))
    
    await user.type(screen.getByLabelText(/title/i), 'Test Emergency Title')
    await user.type(screen.getByLabelText(/description/i), 'This is a test emergency description that is long enough')
    
    await user.click(screen.getByRole('button', { name: /next/i }))
    await user.click(screen.getByRole('button', { name: /next/i }))
    
    // Submit form
    const submitButton = screen.getByRole('button', { name: /submit emergency report/i })
    await user.click(submitButton)
    
    // Should show loading state
    expect(screen.getByText(/submitting.../i)).toBeInTheDocument()
    expect(submitButton).toBeDisabled()
  })

  it('closes dialog when close button is clicked', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    
    renderWithProviders(<EmergencyReportInterface {...defaultProps} onClose={onClose} />)
    
    const closeButton = screen.getByRole('button', { name: /close emergency report/i })
    await user.click(closeButton)
    
    expect(onClose).toHaveBeenCalled()
  })

  it('closes dialog when cancel button is clicked', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    
    renderWithProviders(<EmergencyReportInterface {...defaultProps} onClose={onClose} />)
    
    // Navigate to details step to show cancel button
    const fireCard = screen.getByText(/fire/i).closest('[data-testid="enhanced-card"]')
    await user.click(fireCard!)
    
    await user.click(screen.getByRole('button', { name: /next/i }))
    
    const cancelButton = screen.getByRole('button', { name: /cancel/i })
    await user.click(cancelButton)
    
    expect(onClose).toHaveBeenCalled()
  })

  it('allows navigation between steps', async () => {
    const user = userEvent.setup()
    renderWithProviders(<EmergencyReportInterface {...defaultProps} />)
    
    // Go to details step
    const fireCard = screen.getByText(/fire/i).closest('[data-testid="enhanced-card"]')
    await user.click(fireCard!)
    
    await user.click(screen.getByRole('button', { name: /next/i }))
    
    // Go back to type step
    const previousButton = screen.getByRole('button', { name: /previous/i })
    await user.click(previousButton)
    
    // Should be back on type step
    expect(screen.getByText(/emergency type/i)).toBeInTheDocument()
  })

  it('allows jumping between completed steps', async () => {
    const user = userEvent.setup()
    renderWithProviders(<EmergencyReportInterface {...defaultProps} />)
    
    // Complete first step
    const fireCard = screen.getByText(/fire/i).closest('[data-testid="enhanced-card"]')
    await user.click(fireCard!)
    
    await user.click(screen.getByRole('button', { name: /next/i }))
    
    // Click on progress step to go back
    const typeStep = screen.getByTestId('progress-step-type')
    await user.click(typeStep)
    
    // Should be back on type step
    expect(screen.getByText(/emergency type/i)).toBeInTheDocument()
  })

  it('shows online status indicator', () => {
    renderWithProviders(<EmergencyReportInterface {...defaultProps} />)
    
    expect(screen.getByText(/online - report will be submitted immediately/i)).toBeInTheDocument()
  })

  it('shows offline status when offline', () => {
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: false,
    })
    
    renderWithProviders(<EmergencyReportInterface {...defaultProps} />)
    
    expect(screen.getByText(/offline - report will be saved locally/i)).toBeInTheDocument()
  })

  it('handles offline submission', async () => {
    const user = userEvent.setup()
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: false,
    })
    
    const { addAction } = vi.mocked(require('@/store').useOfflineStore()).mockReturnValue({
      addAction: vi.fn(),
    })
    
    renderWithProviders(<EmergencyReportInterface {...defaultProps} />)
    
    // Navigate through steps
    const fireCard = screen.getByText(/fire/i).closest('[data-testid="enhanced-card"]')
    await user.click(fireCard!)
    
    await user.click(screen.getByRole('button', { name: /next/i }))
    
    await user.type(screen.getByLabelText(/title/i), 'Test Emergency Title')
    await user.type(screen.getByLabelText(/description/i), 'This is a test emergency description that is long enough')
    
    await user.click(screen.getByRole('button', { name: /next/i }))
    await user.click(screen.getByRole('button', { name: /next/i }))
    
    // Submit form
    const submitButton = screen.getByRole('button', { name: /submit emergency report/i })
    await user.click(submitButton)
    
    expect(addAction).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'create',
        table: 'emergency_events',
        priority: 'critical',
      })
    )
  })

  it('resets form after successful submission', async () => {
    const user = userEvent.setup()
    const onReportSubmitted = vi.fn()
    const onClose = vi.fn()
    
    renderWithProviders(<EmergencyReportInterface {...defaultProps} onReportSubmitted={onReportSubmitted} onClose={onClose} />)
    
    // Navigate through steps
    const fireCard = screen.getByText(/fire/i).closest('[data-testid="enhanced-card"]')
    await user.click(fireCard!)
    
    await user.click(screen.getByRole('button', { name: /next/i }))
    
    await user.type(screen.getByLabelText(/title/i), 'Test Emergency Title')
    await user.type(screen.getByLabelText(/description/i), 'This is a test emergency description that is long enough')
    
    await user.click(screen.getByRole('button', { name: /next/i }))
    await user.click(screen.getByRole('button', { name: /next/i }))
    
    // Submit form
    const submitButton = screen.getByRole('button', { name: /submit emergency report/i })
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(onClose).toHaveBeenCalled()
    })
  })

  it('handles submission errors', async () => {
    const user = userEvent.setup()
    const onReportSubmitted = vi.fn(() => {
      throw new Error('Submission failed')
    })
    
    renderWithProviders(<EmergencyReportInterface {...defaultProps} onReportSubmitted={onReportSubmitted} />)
    
    // Navigate through steps
    const fireCard = screen.getByText(/fire/i).closest('[data-testid="enhanced-card"]')
    await user.click(fireCard!)
    
    await user.click(screen.getByRole('button', { name: /next/i }))
    
    await user.type(screen.getByLabelText(/title/i), 'Test Emergency Title')
    await user.type(screen.getByLabelText(/description/i), 'This is a test emergency description that is long enough')
    
    await user.click(screen.getByRole('button', { name: /next/i }))
    await user.click(screen.getByRole('button', { name: /next/i }))
    
    // Submit form
    const submitButton = screen.getByRole('button', { name: /submit emergency report/i })
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(/failed to submit report/i)).toBeInTheDocument()
    })
  })

  it('announces step changes', async () => {
    const user = userEvent.setup()
    const { announcePolite } = vi.mocked(require('@/hooks/accessibility').useAriaAnnouncer()).mockReturnValue({
      announcePolite: vi.fn(),
      announceAssertive: vi.fn(),
    })
    
    renderWithProviders(<EmergencyReportInterface {...defaultProps} />)
    
    // Select emergency type
    const fireCard = screen.getByText(/fire/i).closest('[data-testid="enhanced-card"]')
    await user.click(fireCard!)
    
    await user.click(screen.getByRole('button', { name: /next/i }))
    
    expect(announcePolite).toHaveBeenCalledWith('Moved to step 2: Emergency Details')
  })

  it('validates form before submission', async () => {
    const user = userEvent.setup()
    renderWithProviders(<EmergencyReportInterface {...defaultProps} />)
    
    // Navigate to review step without filling required fields
    const fireCard = screen.getByText(/fire/i).closest('[data-testid="enhanced-card"]')
    await user.click(fireCard!)
    
    await user.click(screen.getByRole('button', { name: /next/i }))
    await user.click(screen.getByRole('button', { name: /next/i })
    await user.click(screen.getByRole('button', { name: /next/i })
    
    // Try to submit
    const submitButton = screen.getByRole('button', { name: /submit emergency report/i })
    await user.click(submitButton)
    
    // Should show validation error
    const { announceAssertive } = vi.mocked(require('@/hooks/accessibility').useAriaAnnouncer()).mockReturnValue({
      announcePolite: vi.fn(),
      announceAssertive: vi.fn(),
    })
    
    expect(announceAssertive).toHaveBeenCalledWith('Please fix form errors before submitting')
  })
})