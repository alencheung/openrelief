# Enhanced Form Components

This directory contains a comprehensive set of enhanced form components built for the OpenRelief application. These components provide improved user experience, accessibility, and visual feedback compared to standard HTML form elements.

## Components Overview

### Input Components

#### EnhancedInput
A versatile input component with floating labels, validation states, and various input types.

**Features:**
- Floating labels with smooth animations
- Real-time validation with custom validators
- Password toggle functionality
- Left and right icon support
- Multiple sizes and variants
- Accessibility compliant with ARIA attributes

**Usage:**
```tsx
<EnhancedInput
  label="Email Address"
  type="email"
  placeholder="Enter your email"
  floatingLabel
  required
  validateOnChange
  validator={(value) => {
    if (!value.includes('@')) return 'Invalid email'
    return null
  }}
  onValidationChange={(isValid, message) => {
    console.log('Valid:', isValid, 'Message:', message)
  }}
/>
```

#### EnhancedTextarea
An enhanced textarea component with character counting and expand functionality.

**Features:**
- Character counting with customizable limits
- Expand/collapse functionality
- Auto-resize option
- Floating labels support
- Real-time validation

**Usage:**
```tsx
<EnhancedTextarea
  label="Description"
  placeholder="Enter description"
  maxLength={500}
  showCharacterCount
  showExpandButton
  floatingLabel
/>
```

#### EnhancedSelect
A powerful select component with search, multi-select, and grouping capabilities.

**Features:**
- Search functionality with highlighting
- Single and multi-select modes
- Option grouping
- Custom option rendering
- Keyboard navigation
- Clearable functionality

**Usage:**
```tsx
<EnhancedSelect
  options={[
    { value: 'option1', label: 'Option 1', icon: <Icon /> },
    { value: 'option2', label: 'Option 2', description: 'Description' }
  ]}
  searchable
  multi
  placeholder="Select options"
/>
```

#### EnhancedCheckbox
A customizable checkbox component with validation states and flexible layouts.

**Features:**
- Multiple size options
- Validation states with visual feedback
- Indeterminate state support
- Label positioning options
- Custom rendering support

**Usage:**
```tsx
<EnhancedCheckbox
  label="I agree to terms"
  required
  validateOnChange
  validator={(checked) => {
    if (!checked) return 'You must agree to terms'
    return null
  }}
/>
```

#### EnhancedRadioGroup
A radio button group component with flexible layouts and descriptions.

**Features:**
- Horizontal and vertical orientations
- Option descriptions and icons
- Custom rendering support
- Keyboard navigation
- Validation integration

**Usage:**
```tsx
<EnhancedRadioGroup
  options={[
    { value: 'option1', label: 'Option 1', description: 'First option' },
    { value: 'option2', label: 'Option 2', description: 'Second option' }
  ]}
  orientation="horizontal"
/>
```

#### EnhancedFileUpload
A comprehensive file upload component with drag-and-drop, previews, and validation.

**Features:**
- Drag-and-drop functionality
- File previews with lightbox
- Multiple file support
- File size and type validation
- Progress indicators
- Custom rendering support

**Usage:**
```tsx
<EnhancedFileUpload
  label="Upload Files"
  multiple
  maxFiles={5}
  maxSize={10 * 1024 * 1024} // 10MB
  accept="image/*,.pdf"
  showPreviews
  onFilesChange={(files, previews) => {
    console.log('Files:', files, 'Previews:', previews)
  }}
/>
```

#### EnhancedRangeSlider
A visual range slider with marks, value formatting, and validation.

**Features:**
- Custom marks and labels
- Value formatting
- Visual feedback
- Multiple size options
- Step control
- Min/max value display

**Usage:**
```tsx
<EnhancedRangeSlider
  label="Severity"
  min={1}
  max={5}
  value={3}
  marks={[
    { value: 1, label: 'Low' },
    { value: 3, label: 'Medium' },
    { value: 5, label: 'High' }
  ]}
  showValue
/>
```

### Specialized Components

#### PasswordStrengthIndicator
A comprehensive password strength indicator with visual feedback and requirements list.

**Features:**
- Real-time strength calculation
- Visual strength bar
- Requirements checklist
- Password toggle
- Security tips
- Custom requirements support

**Usage:**
```tsx
<PasswordStrengthIndicator
  password="userPassword"
  showRequirements
  showPassword={showPassword}
  onTogglePassword={() => setShowPassword(!showPassword)}
  customRequirements={[
    { regex: /.{8,}/, text: 'At least 8 characters' },
    { regex: /[A-Z]/, text: 'One uppercase letter' }
  ]}
/>
```

#### FormProgress
A multi-step form progress indicator with various display modes.

**Features:**
- Multiple display variants (steps, dots, bar)
- Clickable steps for navigation
- Progress summary component
- Custom rendering support
- Responsive design

**Usage:**
```tsx
<FormProgress
  steps={[
    { id: 'step1', title: 'Personal Info' },
    { id: 'step2', title: 'Emergency Details' },
    { id: 'step3', title: 'Review' }
  ]}
  currentStep={currentStep}
  onStepClick={(index) => setCurrentStep(index)}
  variant="steps"
  showDescriptions
/>
```

#### AudioRecorder
An audio recording component with visual feedback and playback controls.

**Features:**
- Real-time audio level visualization
- Recording controls (record, pause, stop)
- Audio playback
- Duration display
- Permission handling
- Multiple quality options

**Usage:**
```tsx
<AudioRecorder
  label="Audio Recording"
  maxDuration={60}
  showLevels
  showPlayback
  onRecordingStop={(recording) => {
    console.log('Recording:', recording)
  }}
/>
```

#### ImagePreview
An image preview component with lightbox, reordering, and management features.

**Features:**
- Grid layout with responsive design
- Lightbox viewer
- Drag-and-drop reordering
- Image information display
- Custom rendering support
- Multiple size options

**Usage:**
```tsx
<ImagePreview
  images={images}
  showRemove
  showReorder
  onImageClick={(image, index) => {
    console.log('Image clicked:', image, 'Index:', index)
  }}
  onRemove={(id, image) => {
    console.log('Image removed:', id, image)
  }}
/>
```

### Layout Components

#### FormLayout, FormSection, FormField, FormRow, FormActions
A set of layout utilities for creating consistent and responsive form layouts.

**Features:**
- Responsive grid systems
- Consistent spacing utilities
- Specialized emergency form layouts
- Sticky action bars
- Mobile-first design

**Usage:**
```tsx
<EmergencyFormLayout>
  <EmergencyFormSection title="Personal Information">
    <FormField label="Name" required>
      <EnhancedInput placeholder="Enter your name" />
    </FormField>
  </EmergencyFormSection>
  
  <EmergencyFormActions>
    <EnhancedButton>Cancel</EnhancedButton>
    <EnhancedButton variant="primary">Submit</EnhancedButton>
  </EmergencyFormActions>
</EmergencyFormLayout>
```

## Validation System

The components integrate with a comprehensive validation system located in `src/lib/validation.ts`:

### Features
- Real-time validation with custom rules
- Multiple built-in validators
- Form-wide validation
- Accessibility announcements
- Error message management

### Common Validators
- `required` - Field must not be empty
- `email` - Valid email format
- `minLength/maxLength` - String length validation
- `min/max` - Numeric range validation
- `pattern` - Regex pattern validation
- `phone` - Phone number format
- `url` - URL format validation
- `passwordStrength` - Password complexity validation

### Usage
```tsx
import { validators, useValidation, validationSchemas } from '@/lib/validation'

const MyForm = () => {
  const [formData, setFormData] = useState({})
  const { errors, validate } = useValidation(formData, validationSchemas.registration)
  
  return (
    <form>
      <EnhancedInput
        label="Email"
        errorText={errors.email}
        validateOnChange
        validator={validators.email()}
      />
      <EnhancedButton onClick={validate}>Submit</EnhancedButton>
    </form>
  )
}
```

## Accessibility

All components are built with accessibility in mind:

### Features
- Proper ARIA attributes
- Keyboard navigation support
- Screen reader announcements
- Focus management
- High contrast support
- Touch-friendly targets

### Testing
Comprehensive accessibility tests are included in `__tests__/form-components.test.tsx` covering:
- Keyboard navigation
- Screen reader announcements
- ARIA attribute verification
- Focus management

## Styling

Components use the existing design system with:

### Features
- CSS custom properties for theming
- Consistent spacing and typography
- Smooth transitions and animations
- Responsive breakpoints
- Dark mode support

### Customization
Components support various customization options:
- Size variants (sm, default, lg)
- Color variants (default, error, success, warning)
- Layout options (horizontal, vertical)
- Custom rendering functions

## Integration with OpenRelief

These components are specifically designed for the OpenRelief application:

### Emergency Reporting
- Multi-step emergency report form
- Location selection with map integration
- Media upload for evidence
- Audio recording capabilities
- Real-time validation

### User Authentication
- Enhanced signup form with password strength
- Profile management forms
- Settings and preferences forms

### Mobile Optimization
- Touch-friendly interaction areas
- Responsive layouts
- Progressive enhancement
- Offline functionality

## Best Practices

When using these components:

1. **Always provide labels** for accessibility
2. **Use appropriate validation** for better UX
3. **Provide clear error messages** to guide users
4. **Test with keyboard** and screen readers
5. **Consider mobile users** with touch targets
6. **Use consistent spacing** from layout utilities
7. **Leverage the validation system** for form-wide validation
8. **Provide helpful feedback** for all user actions

## Migration Guide

To migrate existing forms:

1. Replace standard inputs with `EnhancedInput`
2. Add floating labels where appropriate
3. Implement real-time validation
4. Use form layout utilities for consistency
5. Add progress indicators for multi-step forms
6. Test accessibility thoroughly

## Performance Considerations

- Components use React.memo for optimization
- Event handlers are debounced where appropriate
- Lazy loading for large option lists
- Efficient re-rendering with proper dependencies