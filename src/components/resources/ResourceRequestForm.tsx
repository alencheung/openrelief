import React, { useState } from 'react'
import { MapPin, Phone, User, MessageSquare, Package, AlertTriangle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { EnhancedInput } from '@/components/ui/forms/EnhancedInput'
import { EnhancedTextarea } from '@/components/ui/forms/EnhancedTextarea'
import { EnhancedSelect } from '@/components/ui/forms/EnhancedSelect'
import { cn } from '@/lib/utils'
import type { ResourceType, ResourceUrgency, GeoLocation, ContactInfo } from '@/types/resource'

interface ResourceRequest {
  resourceType: ResourceType
  quantity: number
  unit: string
  urgency: ResourceUrgency
  deliveryLocation: GeoLocation
  contactInfo: ContactInfo
  specialInstructions?: string
}

interface ResourceRequestFormProps {
  resourceId?: string
  onRequest: (request: ResourceRequest) => void
  onCancel?: () => void
  className?: string
}

const resourceTypes: { value: ResourceType; label: string }[] = [
  { value: 'water', label: 'Water' },
  { value: 'food', label: 'Food' },
  { value: 'medical', label: 'Medical Supplies' },
  { value: 'shelter', label: 'Shelter' },
  { value: 'clothing', label: 'Clothing' },
  { value: 'tools', label: 'Tools' },
  { value: 'communication', label: 'Communication' },
  { value: 'power', label: 'Power' },
  { value: 'transportation', label: 'Transportation' }
]

const urgencyLevels: { value: ResourceUrgency; label: string; description: string }[] = [
  { value: 'low', label: 'Low', description: 'Within a week' },
  { value: 'medium', label: 'Medium', description: 'Within a few days' },
  { value: 'high', label: 'High', description: 'Within 24 hours' },
  { value: 'critical', label: 'Critical', description: 'Immediate need' }
]

const ResourceRequestForm = React.forwardRef<HTMLDivElement, ResourceRequestFormProps>(
  ({ resourceId, onRequest, onCancel, className }, ref) => {
    const [resourceType, setResourceType] = useState<ResourceType>('water')
    const [quantity, setQuantity] = useState('')
    const [unit, setUnit] = useState('')
    const [urgency, setUrgency] = useState<ResourceUrgency>('medium')
    const [address, setAddress] = useState('')
    const [contactName, setContactName] = useState('')
    const [contactPhone, setContactPhone] = useState('')
    const [contactEmail, setContactEmail] = useState('')
    const [specialInstructions, setSpecialInstructions] = useState('')
    const [errors, setErrors] = useState<Record<string, string>>({})

    const validate = (): boolean => {
      const newErrors: Record<string, string> = {}

      if (!quantity || parseInt(quantity) <= 0) {
        newErrors.quantity = 'Quantity must be greater than 0'
      }

      if (!unit.trim()) {
        newErrors.unit = 'Unit is required'
      }

      if (!address.trim()) {
        newErrors.address = 'Delivery location is required'
      }

      if (!contactName.trim()) {
        newErrors.contactName = 'Contact name is required'
      }

      if (!contactPhone.trim() && !contactEmail.trim()) {
        newErrors.contact = 'At least one contact method is required'
      }

      setErrors(newErrors)
      return Object.keys(newErrors).length === 0
    }

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault()

      if (!validate()) {
        return
      }

      const request: ResourceRequest = {
        resourceType,
        quantity: parseInt(quantity),
        unit,
        urgency,
        deliveryLocation: {
          lat: 0,
          lng: 0,
          address
        },
        contactInfo: {
          name: contactName,
          phone: contactPhone || undefined,
          email: contactEmail || undefined
        },
        specialInstructions: specialInstructions || undefined
      }

      onRequest(request)
    }

    return (
      <Card ref={ref} className={cn('max-w-2xl mx-auto', className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Request Resources
          </CardTitle>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Resource Type</label>
                <EnhancedSelect
                  value={resourceType}
                  onValueChange={value => setResourceType(value as ResourceType)}
                  options={resourceTypes}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Quantity Needed</label>
                  <EnhancedInput
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={e => setQuantity(e.target.value)}
                    errorText={errors.quantity}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Unit</label>
                  <EnhancedInput
                    type="text"
                    placeholder="e.g., liters, boxes, kits"
                    value={unit}
                    onChange={e => setUnit(e.target.value)}
                    errorText={errors.unit}
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Urgency Level</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {urgencyLevels.map(level => (
                    <button
                      key={level.value}
                      type="button"
                      onClick={() => setUrgency(level.value)}
                      className={cn(
                        'p-3 rounded-lg border-2 text-left transition-all',
                        urgency === level.value
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:border-primary/50'
                      )}
                    >
                      <div className="flex items-center gap-2">
                        {level.value === 'critical' && (
                          <AlertTriangle className="w-4 h-4 text-red-600" />
                        )}
                        <span className="font-medium text-sm">{level.label}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{level.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Delivery Location
                </label>
                <EnhancedInput
                  type="text"
                  placeholder="Enter delivery address"
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  errorText={errors.address}
                />
              </div>

              <div className="space-y-4">
                <label className="text-sm font-medium flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Contact Information
                </label>

                <EnhancedInput
                  type="text"
                  placeholder="Your name"
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

              <div>
                <label className="text-sm font-medium mb-2 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Special Instructions
                </label>
                <EnhancedTextarea
                  placeholder="Any specific requirements or instructions..."
                  value={specialInstructions}
                  onChange={e => setSpecialInstructions(e.target.value)}
                  rows={4}
                />
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex justify-end gap-2">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            )}
            <Button type="submit">Submit Request</Button>
          </CardFooter>
        </form>
      </Card>
    )
  }
)

ResourceRequestForm.displayName = 'ResourceRequestForm'

export { ResourceRequestForm }
export type { ResourceRequest }
