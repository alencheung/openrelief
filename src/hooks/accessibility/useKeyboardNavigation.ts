'use client'

import { useEffect, useCallback, useRef } from 'react'

export interface KeyboardShortcut {
  /**
   * Key or key combination (e.g., 'Enter', 'Ctrl+K', 'Shift+Tab')
   */
  key: string
  /**
   * Function to execute when shortcut is triggered
   */
  action: (event: KeyboardEvent) => void
  /**
   * Description of the shortcut for help/documentation
   */
  description?: string
  /**
   * Whether the shortcut is currently enabled
   */
  enabled?: boolean
  /**
   * Element selector to scope the shortcut to specific elements
   */
  scope?: string
  /**
   * Whether to prevent default behavior
   */
  preventDefault?: boolean
  /**
   * Whether to stop event propagation
   */
  stopPropagation?: boolean
}

export interface KeyboardNavigationOptions {
  /**
   * Whether keyboard navigation is enabled
   */
  enabled?: boolean
  /**
   * Whether to show help dialog when '?' is pressed
   */
  enableHelp?: boolean
  /**
   * Global keyboard shortcuts
   */
  shortcuts?: KeyboardShortcut[]
  /**
   * Callback when any key is pressed
   */
  onKeyDown?: (event: KeyboardEvent) => void
  /**
   * Callback when any key is released
   */
  onKeyUp?: (event: KeyboardEvent) => void
}

export interface KeyboardNavigationState {
  /**
   * Whether keyboard navigation is currently active
   */
  isActive: boolean
  /**
   * Currently pressed modifier keys
   */
  modifiers: {
    ctrl: boolean
    shift: boolean
    alt: boolean
    meta: boolean
  }
  /**
   * Last pressed key
   */
  lastKey: string | null
  /**
   * Registered shortcuts
   */
  shortcuts: KeyboardShortcut[]
}

/**
 * Hook for comprehensive keyboard navigation and shortcuts
 */
export function useKeyboardNavigation(options: KeyboardNavigationOptions = {}) {
  const {
    enabled = true,
    enableHelp = true,
    shortcuts = [],
    onKeyDown,
    onKeyUp,
  } = options

  const stateRef = useRef<KeyboardNavigationState>({
    isActive: false,
    modifiers: {
      ctrl: false,
      shift: false,
      alt: false,
      meta: false,
    },
    lastKey: null,
    shortcuts: [],
  })

  const helpDialogRef = useRef<HTMLDivElement | null>(null)

  /**
   * Parse key combination string into key and modifiers
   */
  const parseKeyCombo = useCallback((combo: string): {
    key: string
    ctrl: boolean
    shift: boolean
    alt: boolean
    meta: boolean
  } => {
    const parts = combo.toLowerCase().split('+').map(part => part.trim())
    
    return {
      key: parts.find(part => !['ctrl', 'shift', 'alt', 'meta'].includes(part)) || '',
      ctrl: parts.includes('ctrl'),
      shift: parts.includes('shift'),
      alt: parts.includes('alt'),
      meta: parts.includes('meta'),
    }
  }, [])

  /**
   * Check if keyboard event matches a key combination
   */
  const matchesKeyCombo = useCallback((
    event: KeyboardEvent,
    combo: string
  ): boolean => {
    const { key, ctrl, shift, alt, meta } = parseKeyCombo(combo)
    
    // Normalize event key
    const eventKey = event.key.toLowerCase()
    const comboKey = key.toLowerCase()
    
    // Check main key
    if (eventKey !== comboKey) return false
    
    // Check modifiers
    if (ctrl !== event.ctrlKey) return false
    if (shift !== event.shiftKey) return false
    if (alt !== event.altKey) return false
    if (meta !== event.metaKey) return false
    
    return true
  }, [parseKeyCombo])

  /**
   * Register a new keyboard shortcut
   */
  const registerShortcut = useCallback((shortcut: KeyboardShortcut) => {
    stateRef.current.shortcuts.push(shortcut)
  }, [])

  /**
   * Unregister a keyboard shortcut
   */
  const unregisterShortcut = useCallback((key: string) => {
    stateRef.current.shortcuts = stateRef.current.shortcuts.filter(
      shortcut => shortcut.key !== key
    )
  }, [])

  /**
   * Execute a shortcut action
   */
  const executeShortcut = useCallback((
    shortcut: KeyboardShortcut,
    event: KeyboardEvent
  ) => {
    if (shortcut.enabled === false) return

    // Check scope if specified
    if (shortcut.scope) {
      const target = event.target as HTMLElement
      if (!target.closest(shortcut.scope)) return
    }

    // Prevent default and stop propagation if requested
    if (shortcut.preventDefault) {
      event.preventDefault()
    }
    if (shortcut.stopPropagation) {
      event.stopPropagation()
    }

    // Execute action
    shortcut.action(event)
  }, [])

  /**
   * Show keyboard shortcuts help dialog
   */
  const showHelpDialog = useCallback(() => {
    if (!enableHelp) return

    // Create help dialog if it doesn't exist
    if (!helpDialogRef.current) {
      const dialog = document.createElement('div')
      dialog.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black/50'
      dialog.setAttribute('role', 'dialog')
      dialog.setAttribute('aria-modal', 'true')
      dialog.setAttribute('aria-label', 'Keyboard Shortcuts Help')
      
      dialog.innerHTML = `
        <div class="bg-background rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[80vh] overflow-auto p-6">
          <h2 class="text-lg font-semibold mb-4">Keyboard Shortcuts</h2>
          <div class="space-y-2">
            ${stateRef.current.shortcuts
              .filter(shortcut => shortcut.enabled !== false && shortcut.description)
              .map(shortcut => `
                <div class="flex justify-between items-center py-2 border-b">
                  <span class="text-sm text-muted-foreground">${shortcut.description}</span>
                  <kbd class="px-2 py-1 text-xs bg-muted rounded">${shortcut.key}</kbd>
                </div>
              `).join('')}
          </div>
          <button 
            class="mt-4 w-full px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
            onclick="this.closest('[role=dialog]').remove()"
          >
            Close (Escape)
          </button>
        </div>
      `
      
      document.body.appendChild(dialog)
      helpDialogRef.current = dialog
      
      // Focus first button
      const firstButton = dialog.querySelector('button') as HTMLButtonElement
      firstButton?.focus()
      
      // Handle escape key to close
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          dialog.remove()
          helpDialogRef.current = null
          document.removeEventListener('keydown', handleEscape)
        }
      }
      
      document.addEventListener('keydown', handleEscape)
      
      // Remove dialog when clicking outside
      dialog.addEventListener('click', (e) => {
        if (e.target === dialog) {
          dialog.remove()
          helpDialogRef.current = null
          document.removeEventListener('keydown', handleEscape)
        }
      })
    }
  }, [enableHelp])

  /**
   * Handle key down events
   */
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return

    // Update state
    stateRef.current.isActive = true
    stateRef.current.modifiers = {
      ctrl: event.ctrlKey,
      shift: event.shiftKey,
      alt: event.altKey,
      meta: event.metaKey,
    }
    stateRef.current.lastKey = event.key

    // Call custom key down handler
    onKeyDown?.(event)

    // Check for matching shortcuts
    for (const shortcut of stateRef.current.shortcuts) {
      if (matchesKeyCombo(event, shortcut.key)) {
        executeShortcut(shortcut, event)
        break // Stop after first match
      }
    }

    // Show help dialog for '?' key
    if (enableHelp && event.key === '?' && !event.ctrlKey && !event.shiftKey && !event.altKey && !event.metaKey) {
      event.preventDefault()
      showHelpDialog()
    }
  }, [enabled, onKeyDown, matchesKeyCombo, executeShortcut, enableHelp, showHelpDialog])

  /**
   * Handle key up events
   */
  const handleKeyUp = useCallback((event: KeyboardEvent) => {
    if (!enabled) return

    // Update state
    stateRef.current.modifiers = {
      ctrl: event.ctrlKey,
      shift: event.shiftKey,
      alt: event.altKey,
      meta: event.metaKey,
    }

    // Call custom key up handler
    onKeyUp?.(event)
  }, [enabled, onKeyUp])

  /**
   * Set up global keyboard event listeners
   */
  useEffect(() => {
    if (!enabled) return

    // Register initial shortcuts
    stateRef.current.shortcuts = [...shortcuts]

    // Add event listeners
    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('keyup', handleKeyUp)

    return () => {
      // Clean up event listeners
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('keyup', handleKeyUp)
      
      // Remove help dialog if it exists
      if (helpDialogRef.current) {
        helpDialogRef.current.remove()
        helpDialogRef.current = null
      }
    }
  }, [enabled, shortcuts, handleKeyDown, handleKeyUp])

  /**
   * Update shortcuts when they change
   */
  useEffect(() => {
    stateRef.current.shortcuts = [...shortcuts]
  }, [shortcuts])

  return {
    // State
    isActive: stateRef.current.isActive,
    modifiers: stateRef.current.modifiers,
    lastKey: stateRef.current.lastKey,
    shortcuts: stateRef.current.shortcuts,
    
    // Methods
    registerShortcut,
    unregisterShortcut,
    showHelpDialog,
    
    // Utility
    matchesKeyCombo,
    parseKeyCombo,
  }
}

/**
 * Hook for arrow key navigation in lists and grids
 */
export function useArrowNavigation(options: {
  items: HTMLElement[]
  orientation?: 'horizontal' | 'vertical' | 'both'
  loop?: boolean
  onNavigate?: (index: number, element: HTMLElement) => void
}) {
  const { items, orientation = 'vertical', loop = true, onNavigate } = options
  const currentIndexRef = useRef(-1)

  const navigate = useCallback((direction: 'up' | 'down' | 'left' | 'right') => {
    if (items.length === 0) return

    let newIndex = currentIndexRef.current

    switch (direction) {
      case 'up':
        if (orientation === 'vertical' || orientation === 'both') {
          newIndex = newIndex > 0 ? newIndex - 1 : (loop ? items.length - 1 : 0)
        }
        break
      case 'down':
        if (orientation === 'vertical' || orientation === 'both') {
          newIndex = newIndex < items.length - 1 ? newIndex + 1 : (loop ? 0 : items.length - 1)
        }
        break
      case 'left':
        if (orientation === 'horizontal' || orientation === 'both') {
          newIndex = newIndex > 0 ? newIndex - 1 : (loop ? items.length - 1 : 0)
        }
        break
      case 'right':
        if (orientation === 'horizontal' || orientation === 'both') {
          newIndex = newIndex < items.length - 1 ? newIndex + 1 : (loop ? 0 : items.length - 1)
        }
        break
    }

    if (newIndex !== currentIndexRef.current && newIndex >= 0 && newIndex < items.length) {
      currentIndexRef.current = newIndex
      items[newIndex]?.focus()
      onNavigate?.(newIndex, items[newIndex])
    }
  }, [items, orientation, loop, onNavigate])

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    switch (event.key) {
      case 'ArrowUp':
        event.preventDefault()
        navigate('up')
        break
      case 'ArrowDown':
        event.preventDefault()
        navigate('down')
        break
      case 'ArrowLeft':
        event.preventDefault()
        navigate('left')
        break
      case 'ArrowRight':
        event.preventDefault()
        navigate('right')
        break
      case 'Home':
        event.preventDefault()
        if (items.length > 0) {
          currentIndexRef.current = 0
          items[0]?.focus()
          onNavigate?.(0, items[0])
        }
        break
      case 'End':
        event.preventDefault()
        if (items.length > 0) {
          currentIndexRef.current = items.length - 1
          items[items.length - 1]?.focus()
          onNavigate?.(items.length - 1, items[items.length - 1])
        }
        break
    }
  }, [navigate, items, onNavigate])

  return {
    currentIndex: currentIndexRef.current,
    navigate,
    handleKeyDown,
  }
}

/**
 * Hook for roving tabindex management
 */
export function useRovingTabIndex(items: HTMLElement[], options: {
  orientation?: 'horizontal' | 'vertical'
  loop?: boolean
  onActivate?: (index: number, element: HTMLElement) => void
} = {}) {
  const { orientation = 'vertical', loop = true, onActivate } = options
  const activeIndexRef = useRef(-1)

  const setActiveIndex = useCallback((index: number) => {
    if (index < 0 || index >= items.length) return

    // Update tabindexes
    items.forEach((item, i) => {
      item.tabIndex = i === index ? 0 : -1
    })

    activeIndexRef.current = index
    onActivate?.(index, items[index])
  }, [items, onActivate])

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    switch (event.key) {
      case 'ArrowUp':
      case 'ArrowLeft':
        event.preventDefault()
        const prevIndex = activeIndexRef.current > 0 
          ? activeIndexRef.current - 1 
          : (loop ? items.length - 1 : activeIndexRef.current)
        setActiveIndex(prevIndex)
        break
      case 'ArrowDown':
      case 'ArrowRight':
        event.preventDefault()
        const nextIndex = activeIndexRef.current < items.length - 1 
          ? activeIndexRef.current + 1 
          : (loop ? 0 : activeIndexRef.current)
        setActiveIndex(nextIndex)
        break
      case 'Home':
        event.preventDefault()
        setActiveIndex(0)
        break
      case 'End':
        event.preventDefault()
        setActiveIndex(items.length - 1)
        break
    }
  }, [items, loop, setActiveIndex])

  // Initialize tabindexes
  useEffect(() => {
    items.forEach((item, index) => {
      item.tabIndex = index === 0 ? 0 : -1
    })
    activeIndexRef.current = 0
  }, [items])

  return {
    activeIndex: activeIndexRef.current,
    setActiveIndex,
    handleKeyDown,
  }
}