'use client'

import React, { useState, useRef, useEffect } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'
import { 
  X, 
  Navigation, 
  Clock, 
  Share2, 
  ExternalLink, 
  Phone,
  MessageSquare,
  Route,
  Eye,
  Heart,
  AlertTriangle,
  Info,
  MapPin,
  Calendar,
  User,
  Shield,
  TrendingUp,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import { 
  EmergencyIndicator, 
  TrustBadge, 
  StatusIndicator, 
  Icon, 
  EnhancedCard, 
  EnhancedButton 
} from '@/components/ui'

const emergencyDetailsVariants = cva(
  'absolute bg-card rounded-xl shadow-xl border transition-all duration-normal z-20',
  {
    variants: {
      position: {
        'bottom': 'bottom-4 left-4 right-4',
        'top': 'top-4 left-4 right-4',
        'left': 'left-4 top-4 bottom-4',
        'right': 'right-4 top-4 bottom-4',
        'center': 'top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2',
      },
      size: {
        sm: 'max-w-sm',
        md: 'max-w-md',
        lg: 'max-w-lg',
        xl: 'max-w-xl',
        '2xl': 'max-w-2xl',
      },
      variant: {
        default: 'p-4',
        compact: 'p-3',
        minimal: 'p-2',
      }
    },
    defaultVariants: {
      position: 'bottom',
      size: 'md',
      variant: 'default',
    },
  }
)

export interface EmergencyDetails {
  id: string
  title: string
  description: string
  emergencyType: string
  severity: number
  status: string
  trustScore: number
  location: {
    address: string
    coordinates: [number, number]
    distance?: number
  }
  timestamp: string
  reporter?: {
    name: string
    verified: boolean
  }
  estimatedResolution?: string
  affectedArea?: number
  requiredAssistance?: string[]
  contactInfo?: {
    phone?: string
    email?: string
    website?: string
  }
  resources?: Array<{
    type: string
    quantity: number
    status: 'available' | 'deployed' | 'requested'
  }>
  updates?: Array<{
    id: string
    message: string
    timestamp: string
    author: string
  }>
  actions?: Array<{
    id: string
    label: string
    action: () => void
    variant?: 'default' | 'outline' | 'ghost' | 'destructive' | 'success'
    icon?: React.ReactNode
  }>
}

export interface EmergencyDetailsPopupProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof emergencyDetailsVariants> {
  emergency: EmergencyDetails
  onClose: () => void
  onShare?: () => void
  onNavigate?: () => void
  onContact?: () => void
  showActions?: boolean
  showUpdates?: boolean
  showResources?: boolean
  showContactInfo?: boolean
  autoClose?: boolean
  autoCloseDelay?: number
}

interface DetailSectionProps {
  title: string
  icon?: React.ReactNode
  collapsible?: boolean
  initiallyCollapsed?: boolean
  children: React.ReactNode
}

const DetailSection: React.FC<DetailSectionProps> = ({
  title,
  icon,
  collapsible = false,
  initiallyCollapsed = false,
  children
}) => {
  const [isCollapsed, setIsCollapsed] = useState(initiallyCollapsed)

  return (
    <div className="mb-4 last:mb-0">
      <div
        className={cn(
          'flex items-center justify-between mb-2 cursor-pointer select-none',
          !collapsible && 'cursor-default'
        )}
        onClick={() => collapsible && setIsCollapsed(!isCollapsed)}
        role={collapsible ? 'button' : undefined}
        tabIndex={collapsible ? 0 : undefined}
        onKeyDown={(e) => {
          if (collapsible && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault()
            setIsCollapsed(!isCollapsed)
          }
        }}
        aria-expanded={collapsible ? isCollapsed : undefined}
        aria-controls={collapsible ? `detail-section-${title.replace(/\s+/g, '-')}` : undefined}
      >
        <div className="flex items-center gap-2">
          {icon && <span className="text-muted-foreground">{icon}</span>}
          <h5 className="font-semibold text-sm text-foreground">{title}</h5>
        </div>
        {collapsible && (
          <Icon
            name={isCollapsed ? 'chevronDown' : 'chevronUp'}
            size="sm"
            variant="muted"
            className="transition-transform duration-normal"
          />
        )}
      </div>
      {!isCollapsed && (
        <div
          id={collapsible ? `detail-section-${title.replace(/\s+/g, '-')}` : undefined}
          className="space-y-2"
        >
          {children}
        </div>
      )}
    </div>
  )
}

const EmergencyDetailsPopup: React.FC<EmergencyDetailsPopupProps> = ({
  className,
  position,
  size,
  variant,
  emergency,
  onClose,
  onShare,
  onNavigate,
  onContact,
  showActions = true,
  showUpdates = true,
  showResources = true,
  showContactInfo = true,
  autoClose = false,
  autoCloseDelay = 30000,
  ...props
}) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const [activeTab, setActiveTab] = useState<'details' | 'updates' | 'resources'>('details')
  const popupRef = useRef<HTMLDivElement>(null)

  // Auto-close functionality
  useEffect(() => {
    if (!autoClose) return

    const timer = setTimeout(() => {
      onClose()
    }, autoCloseDelay)

    return () => clearTimeout(timer)
  }, [autoClose, autoCloseDelay, onClose])

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  // Focus management
  useEffect(() => {
    if (popupRef.current) {
      popupRef.current.focus()
    }
  }, [])

  const getStatusFromEventStatus = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
      case 'reported':
        return 'active'
      case 'resolved':
      case 'closed':
        return 'resolved'
      case 'pending':
      case 'investigating':
        return 'pending'
      case 'inactive':
      case 'archived':
        return 'inactive'
      default:
        return 'pending'
    }
  }

  const getTrustLevel = (trustScore: number) => {
    if (trustScore >= 0.9) return 'excellent'
    if (trustScore >= 0.7) return 'good'
    if (trustScore >= 0.5) return 'moderate'
    if (trustScore >= 0.3) return 'low'
    return 'critical'
  }

  const formatDistance = (distance?: number) => {
    if (!distance) return null
    if (distance < 1000) {
      return `${Math.round(distance)}m away`
    }
    return `${(distance / 1000).toFixed(1)}km away`
  }

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins} minutes ago`
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)} hours ago`
    return date.toLocaleDateString()
  }

  const getEmergencyIcon = (type: string) => {
    switch (type) {
      case 'fire': return 'flame'
      case 'medical': return 'heartPulse'
      case 'security': return 'shield'
      case 'natural': return 'cloudRain'
      case 'infrastructure': return 'wrench'
      default: return 'alertTriangle'
    }
  }

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: emergency.title,
        text: emergency.description,
        url: window.location.href
      }).catch(() => {
        // Fallback if share API fails
        onShare?.()
      })
    } else {
      onShare?.()
    }
  }

  return (
    <div
      ref={popupRef}
      className={cn(
        emergencyDetailsVariants({ position, size, variant, className }),
        'animate-slide-in-up'
      )}
      role="dialog"
      aria-modal="true"
      aria-labelledby="emergency-title"
      aria-describedby="emergency-description"
      tabIndex={-1}
      {...props}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <EmergencyIndicator
              type={emergency.emergencyType as any}
              size="sm"
              variant="subtle"
              showSeverity
              severity={emergency.severity}
              label=""
            />
            <TrustBadge
              level={getTrustLevel(emergency.trustScore)}
              score={Math.round(emergency.trustScore * 100)}
              showPercentage
              size="sm"
            />
            <StatusIndicator
              status={getStatusFromEventStatus(emergency.status)}
              size="sm"
              variant="subtle"
              label={emergency.status}
            />
          </div>
          <h3 id="emergency-title" className="font-semibold text-foreground text-lg">
            {emergency.title}
          </h3>
        </div>
        <div className="flex items-center gap-1 ml-4">
          <button
            onClick={handleShare}
            className="p-1.5 rounded-md hover:bg-muted transition-colors"
            aria-label="Share emergency details"
          >
            <Share2 className="w-4 h-4 text-muted-foreground" />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-muted transition-colors"
            aria-label="Close emergency details"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Description */}
      <p id="emergency-description" className="text-sm text-muted-foreground leading-relaxed mb-4">
        {emergency.description}
      </p>

      {/* Location and Time Info */}
      <div className="flex flex-wrap items-center gap-4 mb-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <MapPin className="w-3 h-3" />
          <span>{emergency.location.address}</span>
          {emergency.location.distance && (
            <span className="text-primary">({formatDistance(emergency.location.distance)})</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          <span>{formatTime(emergency.timestamp)}</span>
        </div>
        {emergency.reporter && (
          <div className="flex items-center gap-1">
            <User className="w-3 h-3" />
            <span>{emergency.reporter.name}</span>
            {emergency.reporter.verified && (
              <Shield className="w-3 h-3 text-success" />
            )}
          </div>
        )}
      </div>

      {/* Tabs */}
      {(showUpdates || showResources || showContactInfo) && (
        <div className="flex border-b border-border mb-4">
          <button
            onClick={() => setActiveTab('details')}
            className={cn(
              'px-3 py-2 text-xs font-medium transition-colors border-b-2',
              activeTab === 'details'
                ? 'text-primary border-primary'
                : 'text-muted-foreground border-transparent hover:text-foreground'
            )}
          >
            Details
          </button>
          {showUpdates && emergency.updates && emergency.updates.length > 0 && (
            <button
              onClick={() => setActiveTab('updates')}
              className={cn(
                'px-3 py-2 text-xs font-medium transition-colors border-b-2',
                activeTab === 'updates'
                  ? 'text-primary border-primary'
                  : 'text-muted-foreground border-transparent hover:text-foreground'
              )}
            >
              Updates ({emergency.updates.length})
            </button>
          )}
          {showResources && emergency.resources && emergency.resources.length > 0 && (
            <button
              onClick={() => setActiveTab('resources')}
              className={cn(
                'px-3 py-2 text-xs font-medium transition-colors border-b-2',
                activeTab === 'resources'
                  ? 'text-primary border-primary'
                  : 'text-muted-foreground border-transparent hover:text-foreground'
              )}
            >
              Resources
            </button>
          )}
        </div>
      )}

      {/* Tab Content */}
      <div className="mb-4 max-h-64 overflow-y-auto">
        {activeTab === 'details' && (
          <div className="space-y-3">
            {/* Additional Details */}
            {emergency.estimatedResolution && (
              <DetailSection
                title="Estimated Resolution"
                icon={<Clock className="w-4 h-4" />}
                collapsible
                initiallyCollapsed={true}
              >
                <p className="text-sm text-muted-foreground">
                  {emergency.estimatedResolution}
                </p>
              </DetailSection>
            )}

            {emergency.affectedArea && (
              <DetailSection
                title="Affected Area"
                icon={<MapPin className="w-4 h-4" />}
                collapsible
                initiallyCollapsed={true}
              >
                <p className="text-sm text-muted-foreground">
                  Approximately {emergency.affectedArea} square meters
                </p>
              </DetailSection>
            )}

            {emergency.requiredAssistance && emergency.requiredAssistance.length > 0 && (
              <DetailSection
                title="Required Assistance"
                icon={<Heart className="w-4 h-4" />}
                collapsible
                initiallyCollapsed={true}
              >
                <ul className="text-sm text-muted-foreground space-y-1">
                  {emergency.requiredAssistance.map((assistance, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                      {assistance}
                    </li>
                  ))}
                </ul>
              </DetailSection>
            )}

            {showContactInfo && emergency.contactInfo && (
              <DetailSection
                title="Contact Information"
                icon={<Phone className="w-4 h-4" />}
                collapsible
                initiallyCollapsed={true}
              >
                <div className="space-y-2">
                  {emergency.contactInfo.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3 h-3 text-muted-foreground" />
                      <a
                        href={`tel:${emergency.contactInfo.phone}`}
                        className="text-sm text-primary hover:underline"
                      >
                        {emergency.contactInfo.phone}
                      </a>
                    </div>
                  )}
                  {emergency.contactInfo.email && (
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-3 h-3 text-muted-foreground" />
                      <a
                        href={`mailto:${emergency.contactInfo.email}`}
                        className="text-sm text-primary hover:underline"
                      >
                        {emergency.contactInfo.email}
                      </a>
                    </div>
                  )}
                  {emergency.contactInfo.website && (
                    <div className="flex items-center gap-2">
                      <ExternalLink className="w-3 h-3 text-muted-foreground" />
                      <a
                        href={emergency.contactInfo.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline"
                      >
                        Visit Website
                      </a>
                    </div>
                  )}
                </div>
              </DetailSection>
            )}
          </div>
        )}

        {activeTab === 'updates' && emergency.updates && (
          <div className="space-y-3">
            {emergency.updates.map((update) => (
              <div key={update.id} className="border-l-2 border-border pl-3 py-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-foreground">{update.author}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatTime(update.timestamp)}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{update.message}</p>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'resources' && emergency.resources && (
          <div className="space-y-2">
            {emergency.resources.map((resource, index) => (
              <div key={index} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                <div className="flex items-center gap-2">
                  <Icon name="package" size="sm" variant="muted" />
                  <div>
                    <span className="text-sm font-medium text-foreground">{resource.type}</span>
                    <span className="text-xs text-muted-foreground ml-2">Qty: {resource.quantity}</span>
                  </div>
                </div>
                <StatusIndicator
                  status={resource.status === 'available' ? 'active' :
                          resource.status === 'deployed' ? 'pending' : 'inactive'}
                  size="sm"
                  variant="subtle"
                  label={resource.status}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      {showActions && emergency.actions && emergency.actions.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-3 border-t border-border">
          {onNavigate && (
            <EnhancedButton
              size="sm"
              variant="outline"
              onClick={onNavigate}
              leftIcon={<Navigation className="w-4 h-4" />}
            >
              Navigate
            </EnhancedButton>
          )}
          {onContact && (
            <EnhancedButton
              size="sm"
              variant="outline"
              onClick={onContact}
              leftIcon={<Phone className="w-4 h-4" />}
            >
              Contact
            </EnhancedButton>
          )}
          {emergency.actions.map((action) => (
            <EnhancedButton
              key={action.id}
              size="sm"
              variant={action.variant || 'default'}
              onClick={action.action}
              leftIcon={action.icon}
            >
              {action.label}
            </EnhancedButton>
          ))}
        </div>
      )}
    </div>
  )
}

EmergencyDetailsPopup.displayName = 'EmergencyDetailsPopup'

export { EmergencyDetailsPopup, emergencyDetailsVariants }