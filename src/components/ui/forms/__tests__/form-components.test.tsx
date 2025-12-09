import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, beforeEach } from 'vitest'
import {
  EnhancedInput,
  EnhancedTextarea,
  EnhancedSelect,
  EnhancedCheckbox,
  EnhancedRadioGroup,
  EnhancedFileUpload,
  EnhancedRangeSlider,
  PasswordStrengthIndicator,
  FormProgress,
  AudioRecorder,
  ImagePreview
} from '../index'

// Mock data for testing
const mockOptions = [
  { value: 'option1', label: 'Option 1' },
  { value: 'option2', label: 'Option 2' },
  { value: 'option3', label: 'Option 3' }
]

const mockRadioOptions = [
  { value: 'radio1', label: 'Radio 1' },
  { value: 'radio2', label: 'Radio 2' }
]

describe('Enhanced Form Components', () => {
  beforeEach(() => {
    // Clear any existing announcements
    const liveRegion = document.getElementById('validation-announcements')
    if (liveRegion) {
      liveRegion.textContent = ''
    }
  })

  describe('EnhancedInput', () => {
    it('renders correctly with basic props', () => {
      render(
        <EnhancedInput
          label="Test Input"
          placeholder="Enter text"
          data-testid="test-input"
        />
      )

      expect(screen.getByLabelText('Test Input')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument()
    })

    it('validates input correctly', async () => {
      let isValid = false
      let errorMessage = ''

      render(
        <EnhancedInput
          label="Test Input"
          required
          validateOnChange
          validator={(value) => {
            isValid = value.length > 5
            return isValid ? null : 'Must be at least 5 characters'
          }}
          onValidationChange={(valid, message) => {
            isValid = valid
            errorMessage = message || ''
          }}
          data-testid="test-input"
        />
      )

      const input = screen.getByTestId('test-input') as HTMLInputElement

      // Test invalid input
      await userEvent.type(input, '123')
      expect(isValid).toBe(false)
      expect(errorMessage).toBe('Must be at least 5 characters')

      // Test valid input
      await userEvent.type(input, '67890')
      expect(isValid).toBe(true)
      expect(errorMessage).toBe('')
    })

    it('supports floating labels', () => {
      render(
        <EnhancedInput
          label="Floating Label"
          floatingLabel
          value="test value"
          data-testid="floating-input"
        />
      )

      const label = screen.getByText('Floating Label')
      expect(label).toHaveClass('text-xs')
    })

    it('shows password toggle when type is password', () => {
      render(
        <EnhancedInput
          label="Password"
          type="password"
          showPasswordToggle
          data-testid="password-input"
        />
      )

      const toggleButton = screen.getByLabelText(/show password/i)
      expect(toggleButton).toBeInTheDocument()
    })
  })

  describe('EnhancedTextarea', () => {
    it('renders correctly with basic props', () => {
      render(
        <EnhancedTextarea
          label="Test Textarea"
          placeholder="Enter description"
          data-testid="test-textarea"
        />
      )

      expect(screen.getByLabelText('Test Textarea')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Enter description')).toBeInTheDocument()
    })

    it('shows character count when enabled', async () => {
      render(
        <EnhancedTextarea
          label="Test Textarea"
          maxLength={100}
          showCharacterCount
          data-testid="test-textarea"
        />
      )

      const textarea = screen.getByTestId('test-textarea') as HTMLTextAreaElement
      await userEvent.type(textarea, 'Hello World')

      expect(screen.getByText('11 / 100')).toBeInTheDocument()
    })

    it('supports expand functionality', () => {
      render(
        <EnhancedTextarea
          label="Test Textarea"
          showExpandButton
          data-testid="test-textarea"
        />
      )

      const expandButton = screen.getByLabelText(/expand/i)
      expect(expandButton).toBeInTheDocument()
    })
  })

  describe('EnhancedSelect', () => {
    it('renders correctly with basic props', () => {
      render(
        <EnhancedSelect
          label="Test Select"
          options={mockOptions}
          data-testid="test-select"
        />
      )

      expect(screen.getByLabelText('Test Select')).toBeInTheDocument()
      expect(screen.getByText('Select an option')).toBeInTheDocument()
    })

    it('opens dropdown when clicked', async () => {
      render(
        <EnhancedSelect
          label="Test Select"
          options={mockOptions}
          data-testid="test-select"
        />
      )

      const trigger = screen.getByTestId('test-select')
      await userEvent.click(trigger)

      expect(screen.getByText('Option 1')).toBeInTheDocument()
      expect(screen.getByText('Option 2')).toBeInTheDocument()
      expect(screen.getByText('Option 3')).toBeInTheDocument()
    })

    it('supports search functionality', async () => {
      render(
        <EnhancedSelect
          label="Test Select"
          options={mockOptions}
          searchable
          data-testid="test-select"
        />
      )

      const trigger = screen.getByTestId('test-select')
      await userEvent.click(trigger)

      const searchInput = screen.getByPlaceholderText('Search...')
      expect(searchInput).toBeInTheDocument()

      await userEvent.type(searchInput, 'Option 1')
      expect(screen.getByText('Option 1')).toBeInTheDocument()
      expect(screen.queryByText('Option 2')).not.toBeInTheDocument()
    })

    it('supports multi-select', async () => {
      render(
        <EnhancedSelect
          label="Test Select"
          options={mockOptions}
          multi
          data-testid="test-select"
        />
      )

      const trigger = screen.getByTestId('test-select')
      await userEvent.click(trigger)

      await userEvent.click(screen.getByText('Option 1'))
      await userEvent.click(screen.getByText('Option 2'))

      expect(screen.getByText('Option 1')).toBeInTheDocument()
      expect(screen.getByText('Option 2')).toBeInTheDocument()
    })
  })

  describe('EnhancedCheckbox', () => {
    it('renders correctly with basic props', () => {
      render(
        <EnhancedCheckbox
          label="Test Checkbox"
          data-testid="test-checkbox"
        />
      )

      expect(screen.getByLabelText('Test Checkbox')).toBeInTheDocument()
    })

    it('toggles state when clicked', async () => {
      render(
        <EnhancedCheckbox
          label="Test Checkbox"
          data-testid="test-checkbox"
        />
      )

      const checkbox = screen.getByRole('checkbox')
      expect(checkbox).not.toBeChecked()

      await userEvent.click(checkbox)
      expect(checkbox).toBeChecked()
    })

    it('supports indeterminate state', () => {
      render(
        <EnhancedCheckbox
          label="Test Checkbox"
          indeterminate
          data-testid="test-checkbox"
        />
      )

      const checkbox = screen.getByRole('checkbox')
      expect(checkbox).toHaveAttribute('data-indeterminate', 'true')
    })
  })

  describe('EnhancedRadioGroup', () => {
    it('renders correctly with basic props', () => {
      render(
        <EnhancedRadioGroup
          label="Test Radio Group"
          options={mockRadioOptions}
          data-testid="test-radio-group"
        />
      )

      expect(screen.getByText('Test Radio Group')).toBeInTheDocument()
      expect(screen.getByLabelText('Radio 1')).toBeInTheDocument()
      expect(screen.getByLabelText('Radio 2')).toBeInTheDocument()
    })

    it('selects option when clicked', async () => {
      render(
        <EnhancedRadioGroup
          label="Test Radio Group"
          options={mockRadioOptions}
          data-testid="test-radio-group"
        />
      )

      const radio1 = screen.getByLabelText('Radio 1')
      const radio2 = screen.getByLabelText('Radio 2')

      expect(radio1).not.toBeChecked()
      expect(radio2).not.toBeChecked()

      await userEvent.click(radio1)
      expect(radio1).toBeChecked()
      expect(radio2).not.toBeChecked()
    })
  })

  describe('EnhancedFileUpload', () => {
    it('renders correctly with basic props', () => {
      render(
        <EnhancedFileUpload
          label="Test File Upload"
          data-testid="test-file-upload"
        />
      )

      expect(screen.getByText('Test File Upload')).toBeInTheDocument()
      expect(screen.getByText(/Drop files here or click to browse/)).toBeInTheDocument()
    })

    it('handles file selection', async () => {
      const file = new File(['test'], 'test.txt', { type: 'text/plain' })

      render(
        <EnhancedFileUpload
          label="Test File Upload"
          data-testid="test-file-upload"
          onFilesChange={(files) => {
            expect(files).toHaveLength(1)
            expect(files[0]).toBe(file)
          }}
        />
      )

      const input = screen.getByRole('button').querySelector('input[type="file"]')
      if (input) {
        await userEvent.upload(input, file)
      }
    })

    it('validates file size', async () => {
      const largeFile = new File(['x'.repeat(11 * 1024 * 1024)], 'large.txt', { type: 'text/plain' })

      render(
        <EnhancedFileUpload
          label="Test File Upload"
          maxSize={10 * 1024 * 1024} // 10MB
          data-testid="test-file-upload"
        />
      )

      const input = screen.getByRole('button').querySelector('input[type="file"]')
      if (input) {
        await userEvent.upload(input, largeFile)
      }

      // Should show error for oversized file
      expect(screen.getByText(/exceeds maximum size/)).toBeInTheDocument()
    })
  })

  describe('EnhancedRangeSlider', () => {
    it('renders correctly with basic props', () => {
      render(
        <EnhancedRangeSlider
          label="Test Range Slider"
          min={0}
          max={100}
          value={50}
          data-testid="test-range-slider"
        />
      )

      expect(screen.getByText('Test Range Slider')).toBeInTheDocument()
    })

    it('updates value when moved', async () => {
      let newValue = 50

      render(
        <EnhancedRangeSlider
          label="Test Range Slider"
          min={0}
          max={100}
          value={50}
          onChange={(value) => newValue = value}
          data-testid="test-range-slider"
        />
      )

      const slider = screen.getByRole('slider')
      if (slider) {
        fireEvent.change(slider, { target: { value: '75' } })
        expect(newValue).toBe(75)
      }
    })

    it('shows marks when provided', () => {
      render(
        <EnhancedRangeSlider
          label="Test Range Slider"
          min={0}
          max={100}
          marks={[{ value: 25, label: 'Low' }, { value: 75, label: 'High' }]}
          data-testid="test-range-slider"
        />
      )

      expect(screen.getByText('Low')).toBeInTheDocument()
      expect(screen.getByText('High')).toBeInTheDocument()
    })
  })

  describe('PasswordStrengthIndicator', () => {
    it('renders correctly with basic props', () => {
      render(
        <PasswordStrengthIndicator
          password="test123"
          data-testid="password-strength"
        />
      )

      expect(screen.getByText('Password Strength')).toBeInTheDocument()
    })

    it('calculates strength correctly', () => {
      const { rerender } = render(
        <PasswordStrengthIndicator
          password=""
          data-testid="password-strength"
        />
      )

      // Weak password
      rerender(
        <PasswordStrengthIndicator
          password="123"
          data-testid="password-strength"
        />
      )
      expect(screen.getByText('Weak password')).toBeInTheDocument()

      // Strong password
      rerender(
        <PasswordStrengthIndicator
          password="Str0ngP@ssw0rd!"
          data-testid="password-strength"
        />
      )
      expect(screen.getByText('Strong password')).toBeInTheDocument()
    })

    it('shows requirements when enabled', () => {
      render(
        <PasswordStrengthIndicator
          password="test"
          showRequirements
          data-testid="password-strength"
        />
      )

      expect(screen.getByText('Password must contain:')).toBeInTheDocument()
      expect(screen.getByText('At least 8 characters')).toBeInTheDocument()
    })
  })

  describe('FormProgress', () => {
    it('renders correctly with basic props', () => {
      const steps = [
        { id: 'step1', title: 'Step 1' },
        { id: 'step2', title: 'Step 2' },
        { id: 'step3', title: 'Step 3' }
      ]

      render(
        <FormProgress
          steps={steps}
          currentStep={1}
          data-testid="form-progress"
        />
      )

      expect(screen.getByText('Step 1')).toBeInTheDocument()
      expect(screen.getByText('Step 2')).toBeInTheDocument()
      expect(screen.getByText('Step 3')).toBeInTheDocument()
    })

    it('highlights current step', () => {
      const steps = [
        { id: 'step1', title: 'Step 1' },
        { id: 'step2', title: 'Step 2' }
      ]

      render(
        <FormProgress
          steps={steps}
          currentStep={1}
          data-testid="form-progress"
        />
      )

      const step1 = screen.getByText('Step 1')
      const step2 = screen.getByText('Step 2')

      // Current step should be highlighted
      expect(step2.closest('[data-status="active"]')).toBeInTheDocument()
    })
  })

  describe('Accessibility Tests', () => {
    it('supports keyboard navigation', async () => {
      render(
        <EnhancedInput
          label="Test Input"
          data-testid="accessible-input"
        />
      )

      const input = screen.getByTestId('accessible-input')
      input.focus()

      expect(input).toHaveFocus()

      // Test tab navigation
      await userEvent.tab()
      expect(document.activeElement).toBe(input)
    })

    it('provides proper ARIA labels', () => {
      render(
        <EnhancedCheckbox
          label="Accessible Checkbox"
          required
          data-testid="accessible-checkbox"
        />
      )

      const checkbox = screen.getByRole('checkbox')
      expect(checkbox).toHaveAttribute('aria-label', 'Accessible Checkbox')
      expect(checkbox).toHaveAttribute('aria-required', 'true')
    })

    it('announces validation errors to screen readers', async () => {
      // Create live region for announcements
      const liveRegion = document.createElement('div')
      liveRegion.id = 'validation-announcements'
      liveRegion.setAttribute('aria-live', 'polite')
      liveRegion.setAttribute('aria-atomic', 'true')
      liveRegion.className = 'sr-only'
      document.body.appendChild(liveRegion)

      render(
        <EnhancedInput
          label="Test Input"
          required
          validateOnChange
          validator={(value) => value.length < 5 ? 'Too short' : null}
          data-testid="validation-input"
        />
      )

      const input = screen.getByTestId('validation-input')
      await userEvent.type(input, '123')

      // Wait for announcement
      await waitFor(() => {
        expect(liveRegion.textContent).toContain('error')
        expect(liveRegion.textContent).toContain('Too short')
      })
    })
  })
})