# Enhanced UI Components for OpenRelief

This directory contains a comprehensive set of enhanced UI components designed to improve readability, visual communication, and accessibility for the OpenRelief application.

## Design System Overview

The enhanced design system includes:

- **WCAG AA Compliant Colors**: Improved contrast ratios for better accessibility
- **Semantic Color Naming**: Meaningful color names for emergency types, trust levels, and status indicators
- **Enhanced Typography**: Better hierarchy and readability
- **Comprehensive Icon System**: Semantic icons with consistent styling
- **Micro-interactions**: Subtle animations and visual feedback
- **Responsive Design**: Mobile-first approach with proper scaling

## Color System

### Primary Colors
- `primary`: Main action color (blue)
- `secondary`: Secondary actions (gray)
- `accent`: Highlight elements (indigo)
- `destructive`: Danger/delete actions (red)
- `success`: Positive feedback (green)
- `warning`: Caution states (amber)
- `info`: Informational content (blue)

### Emergency Type Colors
- `fire`: Red - for fire emergencies
- `medical`: Pink - for medical emergencies
- `security`: Yellow - for security threats
- `natural`: Blue - for natural disasters
- `infrastructure`: Orange - for infrastructure failures

### Trust Score Colors
- `excellent`: Green - 90-100% trust
- `good`: Green - 70-89% trust
- `moderate`: Amber - 50-69% trust
- `low`: Red - 30-49% trust
- `critical`: Red - 0-29% trust

### Status Colors
- `active`: Green - active/resolved states
- `inactive`: Gray - inactive/archived states
- `pending`: Amber - pending/investigating states
- `resolved`: Blue - resolved/closed states
- `critical`: Red - critical/urgent states

## Components

### EmergencyIndicator

Displays emergency type with appropriate colors and icons.

```tsx
<EmergencyIndicator
  type="fire"
  severity={3}
  showSeverity
  label="Fire Emergency"
  size="md"
  variant="default"
/>
```

**Props:**
- `type`: Emergency type ('fire', 'medical', 'security', 'natural', 'infrastructure')
- `severity`: Severity level (1-5)
- `showSeverity`: Show severity number
- `label`: Display text
- `size`: Component size ('sm', 'md', 'lg')
- `variant`: Visual style ('default', 'outline', 'subtle')

### TrustBadge

Displays trust score with visual indicators and appropriate colors.

```tsx
<TrustBadge
  level="excellent"
  score={85}
  showPercentage
  showTrend
  trend="up"
  size="md"
  variant="default"
/>
```

**Props:**
- `level`: Trust level ('excellent', 'good', 'moderate', 'low', 'critical')
- `score`: Numeric score value
- `maxScore`: Maximum possible score (default: 100)
- `showPercentage`: Show percentage instead of ratio
- `showIcon`: Display trust level icon
- `showTrend`: Show trend indicator
- `trend`: Trend direction ('up', 'down', 'stable')
- `label`: Custom label text
- `size`: Component size ('sm', 'md', 'lg')
- `variant`: Visual style ('default', 'outline', 'subtle', 'indicator')

### StatusIndicator

Displays status with appropriate colors and animations.

```tsx
<StatusIndicator
  status="active"
  label="Active"
  showIcon
  pulse
  animated
  size="md"
  variant="default"
/>
```

**Props:**
- `status`: Status type ('active', 'inactive', 'pending', 'resolved', 'critical')
- `label`: Display text
- `showIcon`: Display status icon
- `pulse`: Add pulsing animation
- `loading`: Show loading state
- `animated`: Enable status-specific animations
- `size`: Component size ('sm', 'md', 'lg')
- `variant`: Visual style ('default', 'outline', 'subtle', 'pill')

### FormFeedback

Displays form validation messages with appropriate styling.

```tsx
<FormFeedback
  type="error"
  message="This field is required"
  title="Validation Error"
  showIcon
  dismissible
  onDismiss={() => {}}
  size="md"
  variant="default"
/>
```

**Props:**
- `type`: Feedback type ('success', 'error', 'warning', 'info')
- `message`: Feedback message
- `title`: Optional title text
- `showIcon`: Display feedback icon
- `dismissible`: Allow dismissal
- `onDismiss`: Dismiss callback
- `size`: Component size ('sm', 'md', 'lg')
- `variant`: Visual style ('default', 'outline', 'solid', 'subtle')

### Icon System

Comprehensive icon system with semantic meaning and consistent styling.

```tsx
<Icon
  name="fire"
  size="md"
  variant="primary"
  weight="regular"
  animated
  interactive
  onClick={() => {}}
/>
```

**Semantic Icons:**
```tsx
<EmergencyIcon type="fire" size="lg" />
<TrustIcon level="excellent" size="md" />
<StatusIcon status="active" size="sm" />
```

**Props:**
- `name`: Icon name (see icon map below)
- `size`: Icon size ('xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl')
- `variant`: Color variant ('default', 'primary', 'secondary', 'success', 'warning', 'error', 'info', 'muted')
- `weight`: Stroke weight ('regular', 'thin', 'light', 'bold')
- `animated`: Enable animations
- `interactive`: Add hover effects
- `onClick`: Click handler
- `label`: Accessibility label

### EnhancedButton

Enhanced button with micro-interactions and loading states.

```tsx
<EnhancedButton
  variant="primary"
  size="md"
  loading={false}
  leftIcon={<Icon name="add" />}
  rightIcon={<Icon name="arrowRight" />}
  ripple
  fullWidth
>
  Click me
</EnhancedButton>
```

**Props:**
- `variant`: Button style ('default', 'destructive', 'outline', 'secondary', 'ghost', 'link', 'success', 'warning', 'info', 'gradient')
- `size`: Button size ('default', 'sm', 'lg', 'xl', 'icon', 'icon-sm', 'icon-lg')
- `loading`: Show loading state
- `leftIcon`: Icon to display on left
- `rightIcon`: Icon to display on right
- `ripple`: Enable ripple effect
- `fullWidth`: Full width button
- `asChild`: Render as child element
- `disabled`: Disable button

### EnhancedCard

Enhanced card with interactive effects and specialized variants.

```tsx
<EnhancedCard
  variant="elevated"
  size="md"
  interactive
  animated
>
  Card content
</EnhancedCard>

<EmergencyCard
  emergencyType="fire"
  severity={3}
>
  Emergency content
</EmergencyCard>

<TrustCard
  trustLevel="excellent"
  score={85}
  maxScore={100}
>
  Trust content
</TrustCard>
```

**Props:**
- `variant`: Card style ('default', 'elevated', 'outlined', 'ghost', 'glass', 'gradient')
- `size`: Card size ('sm', 'md', 'lg', 'xl')
- `interactive`: Add hover effects
- `animated`: Enable entrance animation
- `asChild`: Render as child element

**Specialized Cards:**
- `EmergencyCard`: For emergency content with type and severity
- `TrustCard`: For trust information with level and score

## Usage Guidelines

### Accessibility
- All components support proper ARIA attributes
- Color contrast meets WCAG AA standards
- Keyboard navigation supported
- Screen reader friendly with proper labels

### Responsive Design
- Components are mobile-first
- Proper scaling across devices
- Touch-friendly interaction areas
- Consistent spacing using design tokens

### Performance
- CSS variables for theme switching
- Optimized animations using transform/opacity
- Efficient re-renders with proper memoization
- Minimal layout shifts

## Customization

### Theme Customization
Colors and spacing are defined in CSS variables in `globals.css`:

```css
:root {
  --color-primary: 59 130 246;
  --color-primary-foreground: 255 255 255;
  --spacing-md: 1rem;
  --radius-lg: 0.5rem;
}
```

### Component Variants
All components use `class-variance-authority` for consistent variant management. Extend variants by modifying the component files.

## Migration Guide

### From Basic Components
Replace existing components with enhanced versions:

```tsx
// Old
<div className="bg-red-500 text-white p-2 rounded">Fire</div>

// New
<EmergencyIndicator type="fire" label="Fire" />
```

### Updating Existing Components
1. Import enhanced components: `import { EmergencyIndicator } from '@/components/ui'`
2. Replace basic styling with semantic components
3. Add appropriate props for accessibility
4. Test with different screen sizes and themes

## Best Practices

1. **Use Semantic Components**: Prefer `EmergencyIndicator` over manual styling
2. **Maintain Contrast**: Always use provided color variants
3. **Provide Context**: Include labels and descriptions for screen readers
4. **Test Responsively**: Verify components work on all device sizes
5. **Animation Performance**: Use built-in animations for consistency
6. **Accessibility First**: Always include proper ARIA attributes

## Troubleshooting

### Common Issues

**Icons not displaying**: Ensure icon name exists in the icon map
**Colors not applying**: Check CSS variables are properly defined
**Animations not working**: Verify transition classes are applied
**Accessibility warnings**: Ensure proper ARIA labels are provided

### Getting Help

- Check component props in the source files
- Review the examples in this documentation
- Test components in isolation
- Verify Tailwind CSS is properly configured