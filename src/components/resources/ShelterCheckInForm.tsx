import React, { useState } from 'react'
import { Users, Phone, User, Car, Dog, Heart, Accessibility, Clock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { EnhancedInput } from '@/components/ui/forms/EnhancedInput'
import { EnhancedTextarea } from '@/components/ui/forms/EnhancedTextarea'
import { EnhancedCheckbox } from '@/components/ui/forms/EnhancedCheckbox'
import { cn } from '@/lib/utils'
import { useShelterActions } from '@/store/shelterStore'
import type { ContactInfo } from '@/types/resource'

interface ShelterCheckIn {
  shelterId: string
  numberOfPeople: number
  specialNeeds: {
    medical: boolean
    accessibility: boolean
    other?: string
  }
  contactInfo: ContactInfo
  estimatedStayDuration?: number
  vehicleInfo?: {
    make?: string
    model?: string
    licensePlate?: string
    color?: string
  }
  petInfo?: {
    type: string
    count: number
    additionalInfo?: string
  }
}

interface ShelterCheckInFormProps {
  shelterId: string
  shelterName?: string
  petsAllowed?: boolean
  onCheckIn: (checkIn: ShelterCheckIn) => void
  onCancel?: () => void
  className?: string
}

const durationOptions = [
  { value: 1, label: '1 night' },
  { value: 3, label: '3 nights' },
  { value: 7, label: '1 week' },
  { value: 14, label: '2 weeks' },
  { value: 30, label: '1 month' },
  { value: 0, label: 'Unknown/Long-term' }
]

const ShelterCheckInForm = React.forwardRef<HTMLDivElement, ShelterCheckInFormProps>(
  ({ shelterId, shelterName, petsAllowed = false, onCheckIn, onCancel, className }, ref) => {
    const { incrementOccupancy } = useShelterActions()
    const [numberOfPeople, setNumberOfPeople] = useState('1')
    const [medicalNeeds, setMedicalNeeds] = useState(false)
    const [accessibilityNeeds, setAccessibilityNeeds] = useState(false)
    const [otherNeeds, setOtherNeeds] = useState('')
    const [contactName, setContactName] = useState('')
    const [contactPhone, setContactPhone] = useState('')
    const [contactEmail, setContactEmail] = useState('')
    const [estimatedDuration, setEstimatedDuration] = useState<number>(1)
    const [hasVehicle, setHasVehicle] = useState(false)
    const [vehicleMake, setVehicleMake] = useState('')
    const [vehicleModel, setVehicleModel] = useState('')
    const [vehiclePlate, setVehiclePlate] = useState('')
    const [vehicleColor, setVehicleColor] = useState('')
    const [hasPets, setHasPets] = useState(false)
    const [petType, setPetType] = useState('')
    const [petCount, setPetCount] = useState('1')
    const [petInfo, setPetInfo] = useState('')
    const [errors, setErrors] = useState<Record<string, string>>({})

    const validate = (): boolean => {
      const newErrors: Record<string, string> = {}

      if (!numberOfPeople || parseInt(numberOfPeople) <= 0) {
        newErrors.numberOfPeople = 'Number of people must be at least 1'
      }

      if (!contactName.trim()) {
        newErrors.contactName = 'Contact name is required'
      }

      if (!contactPhone.trim() && !contactEmail.trim()) {
        newErrors.contact = 'At least one contact method is required'
      }

      if (hasVehicle && (!vehicleMake.trim() || !vehicleModel.trim() || !vehiclePlate.trim())) {
        newErrors.vehicle = 'Please provide complete vehicle information'
      }

      if (hasPets && petsAllowed && (!petType.trim() || parseInt(petCount) <= 0)) {
        newErrors.pets = 'Please provide pet information'
      }

      setErrors(newErrors)
      return Object.keys(newErrors).length === 0
    }

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault()

      if (!validate()) {
        return
      }

      const checkIn: ShelterCheckIn = {
        shelterId,
        numberOfPeople: parseInt(numberOfPeople),
        specialNeeds: {
          medical: medicalNeeds,
          accessibility: accessibilityNeeds,
          other: otherNeeds || undefined
        },
        contactInfo: {
          name: contactName,
          phone: contactPhone || undefined,
          email: contactEmail || undefined
        },
        estimatedStayDuration: estimatedDuration === 0 ? undefined : estimatedDuration,
        vehicleInfo: hasVehicle
          ? {
              make: vehicleMake || undefined,
              model: vehicleModel || undefined,
              licensePlate: vehiclePlate || undefined,
              color: vehicleColor || undefined
            }
          : undefined,
        petInfo:
          hasPets && petsAllowed
            ? {
                type: petType,
                count: parseInt(petCount),
                additionalInfo: petInfo || undefined
              }
            : undefined
      }

      // Update shelter occupancy so the shelter actually fills. Previously the
      // form emitted the check-in object to the parent but never called
      // incrementOccupancy, so currentOccupancy / availableBeds / status never
      // changed and shelters could never become "full" through check-ins.
      incrementOccupancy(shelterId, checkIn.numberOfPeople)
      onCheckIn(checkIn)
    }

    return (
      <Card ref={ref} className={cn('max-w-2xl mx-auto', className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Shelter Check-In
          </CardTitle>
          {shelterName && <p className="text-sm text-muted-foreground">{shelterName}</p>}
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Number of People
                </label>
                <EnhancedInput
                  type="number"
                  min="1"
                  max="20"
                  value={numberOfPeople}
                  onChange={e => setNumberOfPeople(e.target.value)}
                  errorText={errors.numberOfPeople}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Total number of people in your group
                </p>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-medium">Special Needs</label>

                <div className="space-y-2">
                  <div className="flex items-center gap-3 p-3 border rounded-lg">
                    <EnhancedCheckbox
                      checked={medicalNeeds}
                      onChange={e => setMedicalNeeds(e.target.checked)}
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Heart className="w-4 h-4 text-red-600" />
                        <span className="font-medium text-sm">Medical needs</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Requires medical attention or medication storage
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 border rounded-lg">
                    <EnhancedCheckbox
                      checked={accessibilityNeeds}
                      onChange={e => setAccessibilityNeeds(e.target.checked)}
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Accessibility className="w-4 h-4 text-blue-600" />
                        <span className="font-medium text-sm">Accessibility needs</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Wheelchair accessible or mobility assistance
                      </p>
                    </div>
                  </div>
                </div>

                <EnhancedTextarea
                  placeholder="Any other special needs or requirements..."
                  value={otherNeeds}
                  onChange={e => setOtherNeeds(e.target.value)}
                  rows={2}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Estimated Stay Duration
                </label>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                  {durationOptions.map(option => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setEstimatedDuration(option.value)}
                      className={cn(
                        'p-2 rounded-lg border-2 text-sm transition-all',
                        estimatedDuration === option.value
                          ? 'border-primary bg-primary/10 font-semibold'
                          : 'border-border hover:border-primary/50'
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-sm font-medium flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Contact Information
                </label>

                <EnhancedInput
                  type="text"
                  placeholder="Primary contact name"
                  value={contactName}
                  onChange={e => setContactName(e.target.value)}
                  errorText={errors.contactName}
                />

                <div className="grid grid-cols-2 gap-4">
                  <EnhancedInput
                    type="tel"
                    placeholder="Phone number"
                    value={contactPhone}
                    onChange={e => setContactPhone(e.target.value)}
                    leftIcon={<Phone className="w-4 h-4" />}
                  />

                  <EnhancedInput
                    type="email"
                    placeholder="Email address"
                    value={contactEmail}
                    onChange={e => setContactEmail(e.target.value)}
                  />
                </div>

                {errors.contact && <p className="text-sm text-red-600">{errors.contact}</p>}
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Car className="w-4 h-4" />
                    Vehicle Information
                  </label>
                  <EnhancedCheckbox
                    checked={hasVehicle}
                    onChange={e => setHasVehicle(e.target.checked)}
                    label="I have a vehicle"
                  />
                </div>

                {hasVehicle && (
                  <div className="space-y-3 p-4 border rounded-lg bg-gray-50 dark:bg-gray-900">
                    <div className="grid grid-cols-2 gap-3">
                      <EnhancedInput
                        type="text"
                        placeholder="Make (e.g., Toyota)"
                        value={vehicleMake}
                        onChange={e => setVehicleMake(e.target.value)}
                      />
                      <EnhancedInput
                        type="text"
                        placeholder="Model (e.g., Camry)"
                        value={vehicleModel}
                        onChange={e => setVehicleModel(e.target.value)}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <EnhancedInput
                        type="text"
                        placeholder="License plate"
                        value={vehiclePlate}
                        onChange={e => setVehiclePlate(e.target.value)}
                      />
                      <EnhancedInput
                        type="text"
                        placeholder="Color"
                        value={vehicleColor}
                        onChange={e => setVehicleColor(e.target.value)}
                      />
                    </div>
                    {errors.vehicle && <p className="text-sm text-red-600">{errors.vehicle}</p>}
                  </div>
                )}
              </div>

              {petsAllowed && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <Dog className="w-4 h-4" />
                      Pet Information
                    </label>
                    <div className="flex items-center gap-2">
                      <Badge variant="success" className="text-xs">
                        Pets Allowed
                      </Badge>
                      <EnhancedCheckbox
                        checked={hasPets}
                        onChange={e => setHasPets(e.target.checked)}
                        label="I have pets"
                      />
                    </div>
                  </div>

                  {hasPets && (
                    <div className="space-y-3 p-4 border rounded-lg bg-purple-50 dark:bg-purple-950">
                      <div className="grid grid-cols-2 gap-3">
                        <EnhancedInput
                          type="text"
                          placeholder="Pet type (e.g., Dog, Cat)"
                          value={petType}
                          onChange={e => setPetType(e.target.value)}
                        />
                        <EnhancedInput
                          type="number"
                          min="1"
                          max="10"
                          placeholder="Number of pets"
                          value={petCount}
                          onChange={e => setPetCount(e.target.value)}
                        />
                      </div>
                      <EnhancedTextarea
                        placeholder="Additional pet information (vaccination status, special needs, etc.)"
                        value={petInfo}
                        onChange={e => setPetInfo(e.target.value)}
                        rows={2}
                      />
                      {errors.pets && <p className="text-sm text-red-600">{errors.pets}</p>}
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>

          <CardFooter className="flex justify-end gap-2">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            )}
            <Button type="submit">Complete Check-In</Button>
          </CardFooter>
        </form>
      </Card>
    )
  }
)

ShelterCheckInForm.displayName = 'ShelterCheckInForm'

export { ShelterCheckInForm }
export type { ShelterCheckIn }
