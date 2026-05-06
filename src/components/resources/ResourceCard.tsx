import React from 'react'
import { motion } from 'framer-motion'
import {
  Droplets,
  Utensils,
  Heart,
  Home,
  Shirt,
  Wrench,
  Phone,
  Battery,
  Car,
  MapPin,
  Clock,
  Package
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/utils'
import { formatDistance } from '@/lib/utils'
import type { Resource, ResourceType, ResourceStatus, ResourceUrgency } from '@/types/resource'

const resourceTypeIcons: Record<ResourceType, React.ElementType> = {
  water: Droplets,
  food: Utensils,
  medical: Heart,
  shelter: Home,
  clothing: Shirt,
  tools: Wrench,
  communication: Phone,
  power: Battery,
  transportation: Car
}

const resourceTypeColors: Record<ResourceType, string> = {
  water: 'text-blue-600 bg-blue-50 dark:bg-blue-950',
  food: 'text-orange-600 bg-orange-50 dark:bg-orange-950',
  medical: 'text-red-600 bg-red-50 dark:bg-red-950',
  shelter: 'text-purple-600 bg-purple-50 dark:bg-purple-950',
  clothing: 'text-pink-600 bg-pink-50 dark:bg-pink-950',
  tools: 'text-gray-600 bg-gray-50 dark:bg-gray-950',
  communication: 'text-cyan-600 bg-cyan-50 dark:bg-cyan-950',
  power: 'text-yellow-600 bg-yellow-50 dark:bg-yellow-950',
  transportation: 'text-green-600 bg-green-50 dark:bg-green-950'
}

const statusVariants: Record<ResourceStatus, 'success' | 'warning' | 'error' | 'info'> = {
  available: 'success',
  limited: 'warning',
  depleted: 'error',
  incoming: 'info'
}

const urgencyColors: Record<ResourceUrgency, string> = {
  low: 'text-gray-600 bg-gray-100 dark:bg-gray-800',
  medium: 'text-blue-600 bg-blue-100 dark:bg-blue-900',
  high: 'text-orange-600 bg-orange-100 dark:bg-orange-900',
  critical: 'text-red-600 bg-red-100 dark:bg-red-900 animate-pulse'
}

interface ResourceCardProps {
  resource: Resource
  onRequest?: (resource: Resource) => void
  className?: string
}

const ResourceCard = React.forwardRef<HTMLDivElement, ResourceCardProps>(
  ({ resource, onRequest, className }, ref) => {
    const IconComponent = resourceTypeIcons[resource.type]
    const typeColor = resourceTypeColors[resource.type]

    const handleRequest = () => {
      onRequest?.(resource)
    }

    const isExpired = resource.expirationDate && new Date(resource.expirationDate) < new Date()

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        <Card ref={ref} className={cn('hover:shadow-lg transition-shadow', className)}>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className={cn('p-2 rounded-lg', typeColor)}>
                  <IconComponent className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle className="text-lg">{resource.name}</CardTitle>
                  <p className="text-sm text-muted-foreground capitalize">{resource.type}</p>
                </div>
              </div>
              <Badge variant={statusVariants[resource.status]}>{resource.status}</Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground line-clamp-2">{resource.description}</p>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">
                  {resource.quantity} {resource.unit}
                </span>
              </div>
              <div
                className={cn(
                  'px-2 py-1 rounded text-xs font-semibold',
                  urgencyColors[resource.urgency]
                )}
              >
                {resource.urgency.toUpperCase()}
              </div>
            </div>

            <div className="flex items-start gap-2 text-sm text-muted-foreground">
              <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p>{resource.location.address}</p>
                {resource.distance !== undefined && (
                  <p className="text-xs">{formatDistance(resource.distance)} away</p>
                )}
              </div>
            </div>

            {resource.expirationDate && (
              <div
                className={cn(
                  'flex items-center gap-2 text-sm',
                  isExpired ? 'text-red-600' : 'text-muted-foreground'
                )}
              >
                <Clock className="w-4 h-4" />
                <span>
                  {isExpired ? 'Expired: ' : 'Expires: '}
                  {new Date(resource.expirationDate).toLocaleDateString()}
                </span>
              </div>
            )}

            {resource.contactInfo.name && (
              <div className="text-sm text-muted-foreground">
                <span className="font-medium">Contact:</span> {resource.contactInfo.name}
                {resource.contactInfo.phone && (
                  <span className="ml-2">• {resource.contactInfo.phone}</span>
                )}
              </div>
            )}

            {resource.status !== 'depleted' && onRequest && (
              <Button onClick={handleRequest} className="w-full mt-2">
                Request Resource
              </Button>
            )}
          </CardContent>
        </Card>
      </motion.div>
    )
  }
)

ResourceCard.displayName = 'ResourceCard'

export { ResourceCard }
