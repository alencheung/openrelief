'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useMobileDetection } from '@/hooks/useMobileDetection'
import { useTouchGestures } from '@/hooks/useTouchGestures'
import { useAriaAnnouncer, useFocusManagement } from '@/hooks/accessibility'
import {
  Home,
  Map,
  AlertTriangle,
  Settings,
  Menu,
  X,
  Bell,
  User,
  Shield,
  Info
} from 'lucide-react'
import { Button } from '@/components/ui/Button'

export interface NavItem {
  id: string
  label: string
  icon: React.ReactNode
  href: string
  badge?: number
  active?: boolean
  disabled?: boolean
}

export interface MobileNavigationProps {
  items: NavItem[]
  menuItems?: NavItem[]
  className?: string
  showBadge?: boolean
  onMenuToggle?: (isOpen: boolean) => void
  onItemClick?: (item: NavItem) => void
}

export function MobileNavigation({
  items,
  menuItems = [],
  className,
  showBadge = true,
  onMenuToggle,
  onItemClick,
}: MobileNavigationProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [activeItem, setActiveItem] = useState<string>('')
  const { isMobile, isTouch } = useMobileDetection()
  const router = useRouter()
  const pathname = usePathname()
  
  // Accessibility hooks
  const { announcePolite } = useAriaAnnouncer()
  const { containerRef: menuRef } = useFocusManagement({
    trapFocus: true,
    autoFocus: false,
    restoreFocus: true,
  })

  // Update active item based on current path
  useEffect(() => {
    const currentPath = pathname || ''
    const activeNav = items.find(item => 
      item.href === currentPath || currentPath.startsWith(item.href)
    )
    setActiveItem(activeNav?.id || '')
  }, [pathname, items])

  // Handle navigation
  const handleNavigation = (item: NavItem) => {
    if (item.disabled) {
      announcePolite(`${item.label} is not available`)
      return
    }
    
    setActiveItem(item.id)
    onItemClick?.(item)
    router.push(item.href)
    announcePolite(`Navigated to ${item.label}`)
    
    // Close menu if it's open
    if (isMenuOpen) {
      setIsMenuOpen(false)
      onMenuToggle?.(false)
    }
  }

  // Handle menu toggle
  const toggleMenu = () => {
    const newState = !isMenuOpen
    setIsMenuOpen(newState)
    onMenuToggle?.(newState)
    announcePolite(newState ? 'Menu opened' : 'Menu closed')
  }

  // Close menu on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMenuOpen) {
        setIsMenuOpen(false)
        onMenuToggle?.(false)
        announcePolite('Menu closed')
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isMenuOpen, onMenuToggle])

  // Close menu on route change
  useEffect(() => {
    if (isMenuOpen) {
      setIsMenuOpen(false)
      onMenuToggle?.(false)
    }
  }, [pathname, isMenuOpen, onMenuToggle])

  // Handle swipe gestures for menu
  const menuSwipeRef = useTouchGestures({
    onSwipe: (direction) => {
      if (direction === 'right' && !isMenuOpen) {
        setIsMenuOpen(true)
        onMenuToggle?.(true)
      } else if (direction === 'left' && isMenuOpen) {
        setIsMenuOpen(false)
        onMenuToggle?.(false)
      }
    },
  })

  // Don't render on desktop
  if (!isMobile) return null

  return (
    <>
      {/* Mobile Bottom Navigation */}
      <nav
        className={cn(
          'mobile-nav safe-area-inset-bottom',
          className
        )}
        role="navigation"
        aria-label="Main navigation"
      >
        {items.map((item) => (
          <button
            key={item.id}
            className={cn(
              'mobile-nav-item',
              activeItem === item.id && 'active',
              item.disabled && 'opacity-50 cursor-not-allowed'
            )}
            onClick={() => handleNavigation(item)}
            disabled={item.disabled}
            aria-label={item.label}
            aria-current={activeItem === item.id ? 'page' : undefined}
            aria-disabled={item.disabled}
          >
            <div className="relative">
              <div className="mobile-nav-icon">
                {item.icon}
              </div>
              {showBadge && item.badge && item.badge > 0 && (
                <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                  {item.badge > 99 ? '99+' : item.badge}
                </span>
              )}
            </div>
            <span className="mobile-nav-label">
              {item.label}
            </span>
          </button>
        ))}
      </nav>

      {/* Menu Toggle Button */}
      {menuItems.length > 0 && (
        <button
          className={cn(
            'fixed top-4 left-4 z-40 mobile-btn mobile-btn-outline touch-target',
            'bg-background/80 backdrop-blur-sm'
          )}
          onClick={toggleMenu}
          aria-label="Toggle menu"
          aria-expanded={isMenuOpen}
          aria-controls="mobile-menu"
        >
          {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      )}

      {/* Slide-out Menu Overlay */}
      {menuItems.length > 0 && (
        <div
          ref={menuSwipeRef.ref}
          className={cn(
            'mobile-menu-overlay',
            isMenuOpen && 'open'
          )}
          onClick={() => {
            setIsMenuOpen(false)
            onMenuToggle?.(false)
          }}
        >
          {/* Menu Panel */}
          <div
            className={cn(
              'mobile-menu-panel',
              isMenuOpen && 'open'
            )}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Menu Header */}
            <div className="mobile-menu-header">
              <h2 id="mobile-menu-title" className="text-lg font-semibold">Menu</h2>
              <button
                className="touch-target"
                onClick={() => {
                  setIsMenuOpen(false)
                  onMenuToggle?.(false)
                }}
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Menu Content */}
            <div className="mobile-menu-content">
              <div className="space-y-1" role="menu">
                {menuItems.map((item) => (
                  <button
                    key={item.id}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left transition-colors',
                      'hover:bg-accent hover:text-accent-foreground',
                      'focus:bg-accent focus:text-accent-foreground',
                      item.disabled && 'opacity-50 cursor-not-allowed'
                    )}
                    onClick={() => handleNavigation(item)}
                    disabled={item.disabled}
                    role="menuitem"
                    aria-disabled={item.disabled}
                  >
                    <div className="w-5 h-5 flex-shrink-0">
                      {item.icon}
                    </div>
                    <span className="flex-1 font-medium">
                      {item.label}
                    </span>
                    {showBadge && item.badge && item.badge > 0 && (
                      <span className="bg-destructive text-destructive-foreground text-xs font-bold rounded-full px-2 py-1">
                        {item.badge > 99 ? '99+' : item.badge}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* User Section */}
              <div className="mt-8 pt-8 border-t border-border">
                <div className="flex items-center gap-3 px-3 py-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">Guest User</div>
                    <div className="text-sm text-muted-foreground">Not signed in</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// Default navigation items for OpenRelief
export const defaultNavItems: NavItem[] = [
  {
    id: 'home',
    label: 'Home',
    icon: <Home className="w-5 h-5" />,
    href: '/',
  },
  {
    id: 'map',
    label: 'Map',
    icon: <Map className="w-5 h-5" />,
    href: '/map',
  },
  {
    id: 'report',
    label: 'Report',
    icon: <AlertTriangle className="w-5 h-5" />,
    href: '/report',
  },
  {
    id: 'alerts',
    label: 'Alerts',
    icon: <Bell className="w-5 h-5" />,
    href: '/alerts',
    badge: 0, // This would be updated dynamically
  },
  {
    id: 'profile',
    label: 'Profile',
    icon: <User className="w-5 h-5" />,
    href: '/profile',
  },
]

// Default menu items for OpenRelief
export const defaultMenuItems: NavItem[] = [
  {
    id: 'settings',
    label: 'Settings',
    icon: <Settings className="w-5 h-5" />,
    href: '/settings',
  },
  {
    id: 'safety',
    label: 'Safety Info',
    icon: <Shield className="w-5 h-5" />,
    href: '/safety',
  },
  {
    id: 'about',
    label: 'About',
    icon: <Info className="w-5 h-5" />,
    href: '/about',
  },
]

// Convenience component with default items
export function DefaultMobileNavigation(props: Omit<MobileNavigationProps, 'items' | 'menuItems'>) {
  return (
    <MobileNavigation
      items={defaultNavItems}
      menuItems={defaultMenuItems}
      {...props}
    />
  )
}