'use client'

import { useState, useEffect, useCallback } from 'react'
import { useKeyboardNavigation } from '@/hooks/accessibility'
import { cn } from '@/lib/utils'
import { X, Keyboard, ChevronDown, ChevronUp } from 'lucide-react'

export interface KeyboardShortcut {

  /**
   * Key combination (e.g., 'Ctrl+K', 'Enter', 'Space')
   */
  keys: string

  /**
   * Description of what the shortcut does
   */
  description: string

  /**
   * Category of shortcut
   */
  category?: string

  /**
   * Whether shortcut is currently enabled
   */
  enabled?: boolean

  /**
   * Additional context or notes
   */
  context?: string
}

export interface KeyboardHelpProps {

  /**
   * Array of keyboard shortcuts to display
   */
  shortcuts: KeyboardShortcut[]

  /**
   * Whether the help dialog is open
   */
  isOpen: boolean

  /**
   * Callback when help dialog is opened/closed
   */
  onOpenChange: (open: boolean) => void

  /**
   * CSS class name for the dialog
   */
  className?: string

  /**
   * Whether to show categories
   */
  showCategories?: boolean

  /**
   * Whether to show search functionality
   */
  showSearch?: boolean

  /**
   * Whether to group shortcuts by category
   */
  groupByCategory?: boolean
}

/**
 * KeyboardHelp component for displaying keyboard shortcuts
 *
 * Provides an accessible dialog that lists all available keyboard
 * shortcuts in the application, helping users discover and learn
 * navigation and interaction methods.
 */
export function KeyboardHelp({
  shortcuts,
  isOpen,
  onOpenChange,
  className,
  showCategories = true,
  showSearch = true,
  groupByCategory = true
}: KeyboardHelpProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())

  // Register keyboard shortcut to open help
  const { registerShortcut } = useKeyboardNavigation({
    enabled: true,
    enableHelp: false // We'll handle this ourselves
  })

  // Register '?' shortcut to open help
  useEffect(() => {
    registerShortcut({
      key: '?',
      action: () => onOpenChange(true),
      description: 'Open keyboard shortcuts help',
      preventDefault: true
    })

    registerShortcut({
      key: 'Escape',
      action: () => isOpen && onOpenChange(false),
      description: 'Close keyboard shortcuts help',
      preventDefault: true
    })
  }, [registerShortcut, isOpen, onOpenChange])

  /**
   * Filter shortcuts based on search query
   */
  const filteredShortcuts = useCallback(() => {
    if (!searchQuery.trim()) {
      return shortcuts
    }

    const query = searchQuery.toLowerCase()
    return shortcuts.filter(shortcut =>
      shortcut.keys.toLowerCase().includes(query)
      || shortcut.description.toLowerCase().includes(query)
      || shortcut.category?.toLowerCase().includes(query)
      || shortcut.context?.toLowerCase().includes(query)
    )
  }, [shortcuts, searchQuery])

  /**
   * Group shortcuts by category
   */
  const groupedShortcuts = useCallback(() => {
    const filtered = filteredShortcuts()

    if (!groupByCategory) {
      return { '': filtered }
    }

    return filtered.reduce((groups, shortcut) => {
      const category = shortcut.category || 'Other'
      if (!groups[category]) {
        groups[category] = []
      }
      groups[category].push(shortcut)
      return groups
    }, {} as Record<string, KeyboardShortcut[]>)
  }, [filteredShortcuts, groupByCategory])

  /**
   * Toggle category expansion
   */
  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories)
    if (newExpanded.has(category)) {
      newExpanded.delete(category)
    } else {
      newExpanded.add(category)
    }
    setExpandedCategories(newExpanded)
  }

  /**
   * Expand all categories
   */
  const expandAll = () => {
    const categories = Object.keys(groupedShortcuts())
    setExpandedCategories(new Set(categories))
  }

  /**
   * Collapse all categories
   */
  const collapseAll = () => {
    setExpandedCategories(new Set())
  }

  /**
   * Format key combination for display
   */
  const formatKeys = (keys: string): JSX.Element => {
    const parts = keys.split('+').map(part => part.trim())

    return (
      <span className="inline-flex items-center gap-1">
        {parts.map((part, index) => (
          <span key={index}>
            {index > 0 && <span className="text-muted-foreground mx-1">+</span>}
            <kbd className="px-2 py-1 text-xs font-mono bg-muted border border-border rounded">
              {part}
            </kbd>
          </span>
        ))}
      </span>
    )
  }

  /**
   * Handle keyboard navigation in the dialog
   */
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      onOpenChange(false)
    }
  }

  const groups = groupedShortcuts()
  const hasCategories = showCategories && Object.keys(groups).length > 1

  if (!isOpen) {
    return null
  }

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center bg-black/50',
        className
      )}
      role="dialog"
      aria-modal="true"
      aria-labelledby="keyboard-help-title"
      onKeyDown={handleKeyDown}
    >
      <div className="bg-background border border-border rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 id="keyboard-help-title" className="text-lg font-semibold flex items-center gap-2">
            <Keyboard className="w-5 h-5" />
            Keyboard Shortcuts
          </h2>
          <button
            onClick={() => onOpenChange(false)}
            className="p-2 hover:bg-accent rounded-md transition-colors"
            aria-label="Close keyboard shortcuts help"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search */}
        {showSearch && (
          <div className="p-4 border-b border-border">
            <input
              type="text"
              placeholder="Search shortcuts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
              autoFocus
            />
          </div>
        )}

        {/* Category controls */}
        {hasCategories && (
          <div className="p-4 border-b border-border flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {Object.keys(groups).length} categories, {filteredShortcuts().length} shortcuts
            </div>
            <div className="flex gap-2">
              <button
                onClick={expandAll}
                className="text-sm px-3 py-1 border border-border rounded hover:bg-accent transition-colors"
              >
                Expand All
              </button>
              <button
                onClick={collapseAll}
                className="text-sm px-3 py-1 border border-border rounded hover:bg-accent transition-colors"
              >
                Collapse All
              </button>
            </div>
          </div>
        )}

        {/* Shortcuts list */}
        <div className="flex-1 overflow-auto p-4">
          {Object.entries(groups).map(([category, categoryShortcuts]) => (
            <div key={category} className="mb-6">
              {/* Category header */}
              {hasCategories && (
                <button
                  onClick={() => toggleCategory(category)}
                  className="w-full flex items-center justify-between p-3 bg-muted/50 rounded-md hover:bg-muted transition-colors mb-3"
                  aria-expanded={expandedCategories.has(category)}
                  aria-controls={`category-${category.replace(/\s+/g, '-')}`}
                >
                  <h3 className="font-medium text-left">
                    {category || 'Other'}
                  </h3>
                  {expandedCategories.has(category) ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>
              )}

              {/* Shortcuts */}
              <div
                id={hasCategories ? `category-${category.replace(/\s+/g, '-')}` : undefined}
                className={cn(
                  'space-y-2',
                  hasCategories && !expandedCategories.has(category) && 'hidden'
                )}
              >
                {categoryShortcuts.map((shortcut, index) => (
                  <div
                    key={index}
                    className={cn(
                      'flex items-center justify-between p-3 rounded-md border border-border',
                      'hover:bg-accent transition-colors',
                      shortcut.enabled === false && 'opacity-50'
                    )}
                  >
                    <div className="flex-1">
                      <div className="font-medium">{shortcut.description}</div>
                      {shortcut.context && (
                        <div className="text-sm text-muted-foreground">
                          {shortcut.context}
                        </div>
                      )}
                    </div>
                    <div className="flex-shrink-0 ml-4">
                      {formatKeys(shortcut.keys)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* No results */}
          {filteredShortcuts().length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No keyboard shortcuts found matching "{searchQuery}"
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-muted/30">
          <div className="text-sm text-muted-foreground text-center">
            Press <kbd className="px-2 py-1 text-xs bg-muted border border-border rounded">Escape</kbd> to close this dialog
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Default keyboard shortcuts for OpenRelief
 */
export const defaultShortcuts: KeyboardShortcut[] = [
  // Navigation
  {
    keys: 'Tab',
    description: 'Navigate to next focusable element',
    category: 'Navigation',
    enabled: true
  },
  {
    keys: 'Shift+Tab',
    description: 'Navigate to previous focusable element',
    category: 'Navigation',
    enabled: true
  },
  {
    keys: 'Arrow Keys',
    description: 'Navigate within lists, menus, and grids',
    category: 'Navigation',
    enabled: true
  },
  {
    keys: 'Home/End',
    description: 'Jump to first/last item in list',
    category: 'Navigation',
    enabled: true
  },

  // Map controls
  {
    keys: '+/=',
    description: 'Zoom in on map',
    category: 'Map Controls',
    enabled: true
  },
  {
    keys: '-/_',
    description: 'Zoom out on map',
    category: 'Map Controls',
    enabled: true
  },
  {
    keys: 'Arrow Keys',
    description: 'Pan map',
    category: 'Map Controls',
    enabled: true,
    context: 'When map is focused'
  },
  {
    keys: 'C',
    description: 'Center map on user location',
    category: 'Map Controls',
    enabled: true,
    context: 'When map is focused'
  },

  // Emergency reporting
  {
    keys: 'Ctrl+E',
    description: 'Open emergency report form',
    category: 'Emergency Reporting',
    enabled: true
  },
  {
    keys: 'Ctrl+S',
    description: 'Submit emergency report',
    category: 'Emergency Reporting',
    enabled: true,
    context: 'When in emergency form'
  },

  // General
  {
    keys: 'Escape',
    description: 'Close dialogs, cancel actions',
    category: 'General',
    enabled: true
  },
  {
    keys: 'Enter/Space',
    description: 'Activate buttons, links, and controls',
    category: 'General',
    enabled: true
  },
  {
    keys: '?',
    description: 'Show keyboard shortcuts help',
    category: 'General',
    enabled: true
  }
]

/**
 * Convenience component with default shortcuts
 */
export function DefaultKeyboardHelp(props: Omit<KeyboardHelpProps, 'shortcuts'>) {
  return <KeyboardHelp shortcuts={defaultShortcuts} {...props} />
}

/**
 * Hook for managing keyboard help dialog
 */
export function useKeyboardHelp(shortcuts: KeyboardShortcut[] = defaultShortcuts) {
  const [isOpen, setIsOpen] = useState(false)

  const open = useCallback(() => {
    setIsOpen(true)
  }, [])

  const close = useCallback(() => {
    setIsOpen(false)
  }, [])

  const toggle = useCallback(() => {
    setIsOpen(prev => !prev)
  }, [])

  return {
    isOpen,
    open,
    close,
    toggle,
    shortcuts
  }
}