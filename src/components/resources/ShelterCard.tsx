import React from 'react'
import { motion } from 'framer-motion'
import {
  Home,
  MapPin,
  Users,
  Wifi,
  Utensils,
  Heart,
  Zap,
  Accessibility,
  Phone,
  Clock,
  Dog
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Progress } from '@/components/ui/Progress'
import { cn } from '@/lib/utils'
import { formatDistance } from '@/lib/utils'
import type { Shelter, ShelterStatus, ShelterType, ShelterAmenities } from '@/types/resource'

const shelterTypeLabels: Record<ShelterType, string> = {
  emergency: 'Emergency Shelter',
  temporary: 'Temporary Housing',
  transitional: 'Transitional Housing',
  long_term: 'Long-term Housing'
}

const statusVariants: Record<ShelterStatus, 'success' | 'warning' | 'error' | 'info'> = {
  open: 'success',
  full: 'warning',
  closed: 'error',
  evacuating: 'error'
}

interface ShelterCardProps {
  shelter: Shelter
  onCheckIn?: (shelter: Shelter) => void
  className?: string
}

const AmenityIcon = ({
  amenity,
  available
}: {
  amenity: keyof ShelterAmenities
  available: boolean
}) => {
  const icons: Record<keyof ShelterAmenities, React.ElementType> = {
    beds: Home,
    food: Utensils,
    water: Utensils,
    medical: Heart,
    sanitation: Home,
    electricity: Zap,
    heating: Zap,
    cooling: Zap,
    internet: Wifi,
    phoneCharging: Phone
  }

  const Icon = icons[amenity]
  return (
    <div
      className={cn(
        'p-1.5 rounded',
        available
          ? 'text-green-600 bg-green-50 dark:bg-green-950'
          : 'text-gray-400 bg-gray-100 dark:bg-gray-800'
      )}
      title={`${amenity}: ${available ? 'Available' : 'Not available'}`}
    >
      <Icon className="w-3.5 h-3.5" />
    </div>
  )
}

const ShelterCard = React.forwardRef<HTMLDivElement, ShelterCardProps>(
  ({ shelter, onCheckIn, className }, ref) => {
    const occupancyPercentage = (shelter.currentOccupancy / shelter.capacity) * 100
    const hasSpace = shelter.availableBeds > 0
    const canCheckIn = shelter.status === 'open' && hasSpace

    const handleCheckIn = () => {
      onCheckIn?.(shelter)
    }

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        <Card ref={ref} className={cn('hover:shadow-lg transition-shadow', className)}>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-lg">{shelter.name}</CardTitle>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-xs">
                    {shelterTypeLabels[shelter.type]}
                  </Badge>
                  <Badge variant={statusVariants[shelter.status]}>{shelter.status}</Badge>
                </div>
              </div>
              {shelter.petsAllowed && (
                <div className="p-1.5 rounded bg-purple-50 dark:bg-purple-950" title="Pets allowed">
                  <Dog className="w-4 h-4 text-purple-600" />
                </div>
              )}
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">
                    {shelter.currentOccupancy} / {shelter.capacity}
                  </span>
                </div>
                <span className="text-muted-foreground">
                  {shelter.availableBeds} beds available
                </span>
              </div>
              <Progress
                value={shelter.currentOccupancy}
                max={shelter.capacity}
                variant={
                  occupancyPercentage >= 90
                    ? 'danger'
                    : occupancyPercentage >= 70
                      ? 'warning'
                      : 'default'
                }
              />
              {occupancyPercentage >= 90 && (
                <p className="text-xs text-red-600 font-medium">⚠️ Near capacity</p>
              )}
            </div>

            <div className="flex items-start gap-2 text-sm text-muted-foreground">
              <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p>{shelter.address}</p>
                {shelter.distance !== undefined && (
                  <p className="text-xs">{formatDistance(shelter.distance)} away</p>
                )}
              </div>
            </div>

            {shelter.operatingHours.open24Hours ? (
              <div className="flex items-center gap-2 text-sm text-green-600">
                <Clock className="w-4 h-4" />
                <span className="font-medium">Open 24/7</span>
              </div>
            ) : (
              shelter.operatingHours.openTime &&
              shelter.operatingHours.closeTime && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span>
                    {shelter.operatingHours.openTime} - {shelter.operatingHours.closeTime}
                  </span>
                </div>
              )
            )}

            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase">Amenities</p>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(shelter.amenities).map(([key, value]) => (
                  <AmenityIcon
                    key={key}
                    amenity={key as keyof ShelterAmenities}
                    available={value}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase">Accessibility</p>
              <div className="flex flex-wrap gap-1.5">
                {shelter.accessibility.wheelchairAccessible && (
                  <div
                    className="p-1.5 rounded bg-blue-50 dark:bg-blue-950"
                    title="Wheelchair accessible"
                  >
                    <Accessibility className="w-3.5 h-3.5 text-blue-600" />
                  </div>
                )}
              </div>
            </div>

            {shelter.contactInfo.name && (
              <div className="text-sm text-muted-foreground">
                <span className="font-medium">Contact:</span> {shelter.contactInfo.name}
                {shelter.contactInfo.phone && (
                  <span className="ml-2">• {shelter.contactInfo.phone}</span>
                )}
              </div>
            )}

            {canCheckIn && onCheckIn && (
              <Button onClick={handleCheckIn} className="w-full mt-2" disabled={!canCheckIn}>
                Check In
              </Button>
            )}

            {!hasSpace && shelter.status === 'open' && (
              <div className="text-center text-sm text-muted-foreground mt-2 p-2 bg-yellow-50 dark:bg-yellow-950 rounded">
                No beds currently available
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    )
  }
)

ShelterCard.displayName = 'ShelterCard'

export { ShelterCard }
