import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const formLayoutVariants = cva(
  'space-y-6',
  {
    variants: {
      spacing: {
        tight: 'space-y-3',
        normal: 'space-y-6',
        relaxed: 'space-y-8',
        custom: '',
      },
      columns: {
        1: 'grid-cols-1',
        2: 'grid-cols-1 sm:grid-cols-2',
        3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
        4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
        auto: 'grid-cols-1 auto-rows-auto',
      },
      gap: {
        tight: 'gap-3',
        normal: 'gap-6',
        relaxed: 'gap-8',
        custom: '',
      },
    },
    defaultVariants: {
      spacing: 'normal',
      columns: 1,
      gap: 'normal',
    },
  }
)

const formSectionVariants = cva(
  'space-y-4',
  {
    variants: {
      variant: {
        default: '',
        card: 'bg-card border rounded-lg p-6 shadow-sm',
        outlined: 'border-2 border-border rounded-lg p-6',
        ghost: '',
      },
      spacing: {
        tight: 'space-y-2',
        normal: 'space-y-4',
        relaxed: 'space-y-6',
        custom: '',
      },
    },
    defaultVariants: {
      variant: 'default',
      spacing: 'normal',
    },
  }
)

const formFieldVariants = cva(
  '',
  {
    variants: {
      layout: {
        default: 'space-y-2',
        horizontal: 'flex items-center gap-4',
        inline: 'flex items-center gap-2',
      },
      width: {
        auto: 'w-auto',
        full: 'w-full',
        half: 'w-1/2',
        third: 'w-1/3',
        quarter: 'w-1/4',
        custom: '',
      },
    },
    defaultVariants: {
      layout: 'default',
      width: 'full',
    },
  }
)

export interface FormLayoutProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof formLayoutVariants> {
  children: React.ReactNode
  customSpacing?: string
  customGap?: string
}

export interface FormSectionProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof formSectionVariants> {
  title?: string
  description?: string
  children: React.ReactNode
  customSpacing?: string
}

export interface FormFieldProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof formFieldVariants> {
  label?: string
  helperText?: string
  errorText?: string
  successText?: string
  warningText?: string
  required?: boolean
  children: React.ReactNode
  customWidth?: string
}

export interface FormRowProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  gap?: 'tight' | 'normal' | 'relaxed' | 'none'
  align?: 'start' | 'center' | 'end' | 'stretch'
  justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly'
  wrap?: boolean
}

export interface FormActionsProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  align?: 'left' | 'center' | 'right' | 'between' | 'around' | 'evenly'
  direction?: 'row' | 'column'
  gap?: 'tight' | 'normal' | 'relaxed' | 'none'
  sticky?: boolean
}

const FormLayout = React.forwardRef<HTMLDivElement, FormLayoutProps>(
  ({ 
    className, 
    spacing, 
    columns, 
    gap,
    customSpacing,
    customGap,
    children,
    ...props 
  }, ref) => {
    const isGrid = columns !== 1
    const spacingClass = spacing === 'custom' ? customSpacing : undefined
    const gapClass = gap === 'custom' ? customGap : undefined
    
    return (
      <div
        ref={ref}
        className={cn(
          isGrid ? 'grid' : '',
          formLayoutVariants({ 
            spacing: spacing === 'custom' ? 'normal' : spacing, 
            columns, 
            gap: gap === 'custom' ? 'normal' : gap 
          }),
          spacingClass,
          gapClass,
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)
FormLayout.displayName = 'FormLayout'

const FormSection = React.forwardRef<HTMLDivElement, FormSectionProps>(
  ({ 
    className, 
    variant, 
    spacing,
    title,
    description,
    customSpacing,
    children,
    ...props 
  }, ref) => {
    const spacingClass = spacing === 'custom' ? customSpacing : undefined
    
    return (
      <div
        ref={ref}
        className={cn(
          formSectionVariants({ variant, spacing: spacing === 'custom' ? 'normal' : spacing }),
          spacingClass,
          className
        )}
        {...props}
      >
        {title && (
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-foreground">{title}</h3>
            {description && (
              <p className="text-sm text-muted-foreground mt-1">{description}</p>
            )}
          </div>
        )}
        
        <div className={cn(
          formSectionVariants({ variant: 'default', spacing: spacing === 'custom' ? 'normal' : spacing })
        )}>
          {children}
        </div>
      </div>
    )
  }
)
FormSection.displayName = 'FormSection'

const FormField = React.forwardRef<HTMLDivElement, FormFieldProps>(
  ({ 
    className, 
    layout, 
    width,
    label,
    helperText,
    errorText,
    successText,
    warningText,
    required = false,
    customWidth,
    children,
    ...props 
  }, ref) => {
    const widthClass = width === 'custom' ? customWidth : undefined
    
    return (
      <div
        ref={ref}
        className={cn(
          formFieldVariants({ layout, width: width === 'custom' ? 'full' : width }),
          widthClass,
          className
        )}
        {...props}
      >
        {label && (
          <label className={cn(
            'text-sm font-medium text-foreground',
            layout === 'horizontal' && 'min-w-[120px]',
            layout === 'inline' && 'min-w-[80px]',
            errorText && 'text-destructive',
            successText && 'text-success',
            warningText && 'text-warning'
          )}>
            {label}
            {required && <span className="text-destructive ml-1">*</span>}
          </label>
        )}
        
        <div className={cn(
          'flex-1',
          layout === 'horizontal' && 'min-w-0',
          layout === 'inline' && 'min-w-0'
        )}>
          {children}
        </div>
        
        {(helperText || errorText || successText || warningText) && (
          <div className={cn(
            'text-xs',
            errorText 
              ? 'text-destructive' 
              : successText 
                ? 'text-success' 
                : warningText 
                  ? 'text-warning' 
                  : 'text-muted-foreground',
            layout === 'horizontal' && 'min-w-[120px]',
            layout === 'inline' && 'min-w-[80px]'
          )}>
            {errorText || successText || warningText || helperText}
          </div>
        )}
      </div>
    )
  }
)
FormField.displayName = 'FormField'

const FormRow = React.forwardRef<HTMLDivElement, FormRowProps>(
  ({ 
    className, 
    gap = 'normal',
    align = 'start',
    justify = 'start',
    wrap = true,
    children,
    ...props 
  }, ref) => {
    const gapClass = gap === 'none' ? 'gap-0' : `gap-${gap === 'tight' ? '3' : gap === 'relaxed' ? '8' : '6'}`
    const alignClass = `items-${align}`
    const justifyClass = `justify-${justify}`
    
    return (
      <div
        ref={ref}
        className={cn(
          'flex',
          gapClass,
          alignClass,
          justifyClass,
          wrap && 'flex-wrap',
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)
FormRow.displayName = 'FormRow'

const FormActions = React.forwardRef<HTMLDivElement, FormActionsProps>(
  ({ 
    className, 
    align = 'right',
    direction = 'row',
    gap = 'normal',
    sticky = false,
    children,
    ...props 
  }, ref) => {
    const gapClass = gap === 'none' ? 'gap-0' : `gap-${gap === 'tight' ? '3' : gap === 'relaxed' ? '8' : '6'}`
    const alignClass = direction === 'row' ? `justify-${align}` : `items-${align}`
    
    return (
      <div
        ref={ref}
        className={cn(
          'flex',
          direction,
          gapClass,
          alignClass,
          sticky && 'sticky bottom-0 bg-background/95 backdrop-blur-sm border-t p-4 -mx-4',
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)
FormActions.displayName = 'FormActions'

// Specialized form layouts for emergency reporting
export const EmergencyFormLayout = React.forwardRef<HTMLDivElement, FormLayoutProps>(
  ({ className, children, ...props }, ref) => (
    <FormLayout
      ref={ref}
      className={cn('max-w-4xl mx-auto', className)}
      spacing="relaxed"
      {...props}
    >
      {children}
    </FormLayout>
  )
)
EmergencyFormLayout.displayName = 'EmergencyFormLayout'

export const EmergencyFormSection = React.forwardRef<HTMLDivElement, FormSectionProps>(
  ({ className, title, children, ...props }, ref) => (
    <FormSection
      ref={ref}
      className={cn('emergency-section', className)}
      variant="card"
      title={title}
      {...props}
    >
      {children}
    </FormSection>
  )
)
EmergencyFormSection.displayName = 'EmergencyFormSection'

export const EmergencyFormActions = React.forwardRef<HTMLDivElement, FormActionsProps>(
  ({ className, children, ...props }, ref) => (
    <FormActions
      ref={ref}
      className={cn('emergency-actions', className)}
      align="between"
      gap="relaxed"
      sticky
      {...props}
    >
      {children}
    </FormActions>
  )
)
EmergencyFormActions.displayName = 'EmergencyFormActions'

export {
  FormLayout,
  FormSection,
  FormField,
  FormRow,
  FormActions,
  formLayoutVariants,
  formSectionVariants,
  formFieldVariants,
}