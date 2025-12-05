import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'
import { ChevronDown, Check, Search, X, AlertCircle } from 'lucide-react'

const enhancedSelectVariants = cva(
  'flex h-10 w-full rounded-md border bg-background text-sm ring-offset-background transition-all duration-normal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'border-input',
        error: 'border-destructive focus-visible:ring-destructive',
        success: 'border-success focus-visible:ring-success',
        warning: 'border-warning focus-visible:ring-warning',
      },
      size: {
        sm: 'h-9 px-3 text-xs',
        default: 'h-10 px-3 py-2',
        lg: 'h-11 px-4 py-3 text-base',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface SelectOption {
  value: string
  label: string
  disabled?: boolean
  group?: string
  icon?: React.ReactNode
  description?: string
}

export interface EnhancedSelectProps
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange'>,
    VariantProps<typeof enhancedSelectVariants> {
  options: SelectOption[]
  label?: string
  helperText?: string
  errorText?: string
  successText?: string
  warningText?: string
  placeholder?: string
  searchable?: boolean
  clearable?: boolean
  multi?: boolean
  floatingLabel?: boolean
  required?: boolean
  value?: string | string[]
  onChange?: (value: string | string[]) => void
  onSearch?: (query: string) => void
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  maxVisibleOptions?: number
  groupBy?: (option: SelectOption) => string
  renderOption?: (option: SelectOption, isSelected: boolean) => React.ReactNode
  renderValue?: (selectedOptions: SelectOption[]) => React.ReactNode
}

const EnhancedSelect = React.forwardRef<HTMLDivElement, EnhancedSelectProps>(
  ({ 
    className, 
    variant, 
    size,
    options,
    label,
    helperText,
    errorText,
    successText,
    warningText,
    placeholder = 'Select an option',
    searchable = false,
    clearable = false,
    multi = false,
    floatingLabel = false,
    required = false,
    value,
    onChange,
    onSearch,
    leftIcon,
    rightIcon,
    maxVisibleOptions = 8,
    groupBy,
    renderOption,
    renderValue,
    disabled,
    ...props 
  }, ref) => {
    const [isOpen, setIsOpen] = React.useState(false)
    const [searchQuery, setSearchQuery] = React.useState('')
    const [highlightedIndex, setHighlightedIndex] = React.useState(-1)
    
    const selectRef = React.useRef<HTMLDivElement>(null)
    const inputRef = React.useRef<HTMLInputElement>(null)
    const dropdownRef = React.useRef<HTMLDivElement>(null)
    const inputId = `select-${React.useId()}`
    
    const hasValue = value !== undefined && value !== '' && (Array.isArray(value) ? value.length > 0 : true)
    const isFloating = floatingLabel && (isOpen || hasValue)
    
    // Filter options based on search query
    const filteredOptions = React.useMemo(() => {
      if (!searchQuery) return options
      
      return options.filter(option => 
        option.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        option.value.toLowerCase().includes(searchQuery.toLowerCase()) ||
        option.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }, [options, searchQuery])
    
    // Group options if groupBy is provided
    const groupedOptions = React.useMemo(() => {
      if (!groupBy) return { '': filteredOptions }
      
      return filteredOptions.reduce((groups, option) => {
        const group = groupBy(option) || ''
        if (!groups[group]) groups[group] = []
        groups[group].push(option)
        return groups
      }, {} as Record<string, SelectOption[]>)
    }, [filteredOptions, groupBy])
    
    // Get selected options
    const selectedOptions = React.useMemo(() => {
      if (!value) return []
      const values = Array.isArray(value) ? value : [value]
      return options.filter(option => values.includes(option.value))
    }, [value, options])
    
    // Determine final variant
    const getVariant = () => {
      if (errorText) return 'error'
      if (successText) return 'success'
      if (warningText) return 'warning'
      return variant
    }
    
    // Handle option selection
    const handleOptionSelect = (option: SelectOption) => {
      if (option.disabled) return
      
      if (multi) {
        const currentValues = Array.isArray(value) ? value : []
        const newValues = currentValues.includes(option.value)
          ? currentValues.filter(v => v !== option.value)
          : [...currentValues, option.value]
        onChange?.(newValues)
      } else {
        onChange?.(option.value)
        setIsOpen(false)
        setSearchQuery('')
      }
    }
    
    // Handle clear
    const handleClear = () => {
      onChange?.(multi ? [] : '')
      setSearchQuery('')
      setHighlightedIndex(-1)
    }
    
    // Handle keyboard navigation
    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (!isOpen && e.key === 'Enter') {
        e.preventDefault()
        setIsOpen(true)
        return
      }
      
      if (!isOpen) return
      
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setHighlightedIndex(prev => 
            prev < filteredOptions.length - 1 ? prev + 1 : prev
          )
          break
        case 'ArrowUp':
          e.preventDefault()
          setHighlightedIndex(prev => prev > 0 ? prev - 1 : prev)
          break
        case 'Enter':
          e.preventDefault()
          if (highlightedIndex >= 0 && filteredOptions[highlightedIndex]) {
            handleOptionSelect(filteredOptions[highlightedIndex])
          }
          break
        case 'Escape':
          e.preventDefault()
          setIsOpen(false)
          break
      }
    }
    
    // Close dropdown when clicking outside
    React.useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
          setIsOpen(false)
        }
      }
      
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])
    
    // Scroll highlighted option into view
    React.useEffect(() => {
      if (highlightedIndex >= 0 && dropdownRef.current) {
        const highlightedElement = dropdownRef.current.querySelector(`[data-option-index="${highlightedIndex}"]`)
        if (highlightedElement) {
          highlightedElement.scrollIntoView({ block: 'nearest' })
        }
      }
    }, [highlightedIndex])
    
    const currentVariant = getVariant()
    
    return (
      <div ref={selectRef} className="relative w-full">
        {/* Floating Label */}
        {label && floatingLabel && (
          <label
            htmlFor={inputId}
            className={cn(
              'absolute left-3 transition-all duration-normal pointer-events-none z-10',
              'bg-background px-1',
              isFloating 
                ? 'text-xs text-muted-foreground -top-2 left-2' 
                : 'text-sm text-muted-foreground top-1/2 -translate-y-1/2',
              currentVariant === 'error' && 'text-destructive',
              currentVariant === 'success' && 'text-success',
              currentVariant === 'warning' && 'text-warning',
              leftIcon && (isFloating ? 'left-8' : 'left-10')
            )}
          >
            {label}
            {required && <span className="text-destructive ml-1">*</span>}
          </label>
        )}
        
        {/* Standard Label */}
        {label && !floatingLabel && (
          <label 
            htmlFor={inputId}
            className={cn(
              'block text-sm font-medium mb-2 text-foreground',
              currentVariant === 'error' && 'text-destructive',
              currentVariant === 'success' && 'text-success',
              currentVariant === 'warning' && 'text-warning'
            )}
          >
            {label}
            {required && <span className="text-destructive ml-1">*</span>}
          </label>
        )}
        
        {/* Select Trigger */}
        <div
          id={inputId}
          className={cn(
            enhancedSelectVariants({ variant: currentVariant, size }),
            'flex items-center justify-between cursor-pointer',
            leftIcon && 'pl-10',
            className
          )}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          onKeyDown={handleKeyDown}
          tabIndex={disabled ? -1 : 0}
          role="combobox"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
        >
          {/* Left Icon */}
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              {leftIcon}
            </div>
          )}
          
          {/* Selected Value */}
          <div className="flex-1 truncate">
            {renderValue ? (
              renderValue(selectedOptions)
            ) : multi ? (
              <div className="flex flex-wrap gap-1">
                {selectedOptions.map(option => (
                  <span
                    key={option.value}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-muted text-xs"
                  >
                    {option.icon}
                    {option.label}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleOptionSelect(option)
                      }}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            ) : selectedOptions.length > 0 ? (
              <div className="flex items-center gap-2">
                {selectedOptions[0].icon}
                {selectedOptions[0].label}
              </div>
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
          </div>
          
          {/* Right Side Icons */}
          <div className="flex items-center gap-1">
            {errorText && <AlertCircle className="h-4 w-4 text-destructive" />}
            {clearable && hasValue && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleClear()
                }}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
            {rightIcon || <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', isOpen && 'rotate-180')} />}
          </div>
        </div>
        
        {/* Dropdown */}
        {isOpen && (
          <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-60 overflow-auto">
            {/* Search Input */}
            {searchable && (
              <div className="p-2 border-b">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    ref={inputRef}
                    type="text"
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value)
                      onSearch?.(e.target.value)
                      setHighlightedIndex(-1)
                    }}
                    className="w-full pl-8 pr-2 py-1 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-ring"
                    autoFocus
                  />
                </div>
              </div>
            )}
            
            {/* Options */}
            <div ref={dropdownRef} className="py-1" role="listbox">
              {Object.entries(groupedOptions).map(([group, groupOptions]) => (
                <div key={group}>
                  {group && (
                    <div className="px-2 py-1 text-xs font-semibold text-muted-foreground bg-muted/50">
                      {group}
                    </div>
                  )}
                  {groupOptions.map((option, index) => {
                    const isSelected = selectedOptions.some(selected => selected.value === option.value)
                    const globalIndex = filteredOptions.indexOf(option)
                    
                    return (
                      <div
                        key={option.value}
                        data-option-index={globalIndex}
                        className={cn(
                          'flex items-center gap-2 px-2 py-2 text-sm cursor-pointer transition-colors',
                          'hover:bg-accent hover:text-accent-foreground',
                          isSelected && 'bg-accent/50',
                          option.disabled && 'opacity-50 cursor-not-allowed',
                          highlightedIndex === globalIndex && 'bg-accent'
                        )}
                        onClick={() => handleOptionSelect(option)}
                        role="option"
                        aria-selected={isSelected}
                      >
                        {renderOption ? (
                          renderOption(option, isSelected)
                        ) : (
                          <>
                            {option.icon && <span className="flex-shrink-0">{option.icon}</span>}
                            <div className="flex-1 min-w-0">
                              <div className="truncate">{option.label}</div>
                              {option.description && (
                                <div className="text-xs text-muted-foreground truncate">
                                  {option.description}
                                </div>
                              )}
                            </div>
                            {isSelected && <Check className="h-4 w-4 text-primary flex-shrink-0" />}
                          </>
                        )}
                      </div>
                    )
                  })}
                </div>
              ))}
              
              {filteredOptions.length === 0 && (
                <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                  No options found
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Helper Text */}
        {(helperText || errorText || successText || warningText) && (
          <div className={cn(
            'mt-2 text-xs',
            errorText 
              ? 'text-destructive' 
              : successText 
                ? 'text-success' 
                : warningText 
                  ? 'text-warning' 
                  : 'text-muted-foreground'
          )}>
            {errorText || successText || warningText || helperText}
          </div>
        )}
      </div>
    )
  }
)
EnhancedSelect.displayName = 'EnhancedSelect'

export { EnhancedSelect, enhancedSelectVariants }