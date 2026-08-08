import React, { useState } from 'react'
import { MapPin, Phone, User, MessageSquare, Package, AlertTriangle, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { EnhancedInput } from '@/components/ui/forms/EnhancedInput'
import { EnhancedTextarea } from '@/components/ui/forms/EnhancedTextarea'
import { EnhancedSelect } from '@/components/ui/forms/EnhancedSelect'
import { cn } from '@/lib/utils'
import type { ResourceType, ResourceUrgency, GeoLocation, ContactInfo } from '@/types/resource'

// Shape accepted by POST /api/resources. The 'requested' status marks the row
// as a community need rather than an available supply.
interface ResourceCreatePayload {
  name: string
  type: ResourceType
  status: 'requested'
  quantity: number
  unit: string
  urgency: ResourceUrgency
  location: { lat: number; lng: number; address?: string }
  address?: string
  contact_info: ContactInfo
  notes?: string
}

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
  // Optional callback invoked after a successful POST. If omitted the form
  // still persists the request via /api/resources on its own.
  onRequest?: (request: ResourceRequest) => void
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
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [submitMessage, setSubmitMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(
      null
    )

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

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault()
      setSubmitMessage(null)

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

      // Persist the request as a 'requested' resource via POST /api/resources.
      // `resourceId` (when provided) is forwarded so the backend can attribute
      // the request to a specific supply listing if desired.
      const payload: ResourceCreatePayload = {
        name: `${resourceType} request`,
        type: resourceType,
        status: 'requested',
        quantity: request.quantity,
        unit,
        urgency,
        location: { lat: 0, lng: 0, address },
        address,
        contact_info: {
          name: contactName,
          phone: contactPhone || undefined,
          email: contactEmail || undefined
        },
        notes:
          [specialInstructions || null, resourceId ? `Refers to ${resourceId}` : null]
            .filter(Boolean)
            .join('\n') || undefined
      }

      setIsSubmitting(true)
      try {
        const res = await fetch('/api/resources', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })

        if (res.status === 401) {
          setSubmitMessage({
            type: 'error',
            text: 'You must be signed in to submit a resource request.'
          })
          return
        }
        if (!res.ok) {
          let detail = `Request failed (status ${res.status})`
          try {
            const body = (await res.json()) as { error?: string }
            if (body.error) detail = body.error
          } catch {
            // ignore JSON parse errors
          }
          setSubmitMessage({ type: 'error', text: detail })
          return
        }

        setSubmitMessage({
          type: 'success',
          text: 'Your resource request has been submitted.'
        })
        onRequest?.(request)
      } catch {
        setSubmitMessage({
          type: 'error',
          text: 'Network error. Please check your connection and try again.'
        })
      } finally {
        setIsSubmitting(false)
      }
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
                  onChange={value => setResourceType(value as ResourceType)}
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

          <CardFooter className="flex flex-col items-stretch gap-3">
            {submitMessage && (
              <div
                role={submitMessage.type === 'error' ? 'alert' : 'status'}
                className={cn(
                  'text-sm px-3 py-2 rounded-md',
                  submitMessage.type === 'error'
                    ? 'bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300'
                    : 'bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300'
                )}
              >
                {submitMessage.text}
              </div>
            )}
            <div className="flex justify-end gap-2">
              {onCancel && (
                <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
                  Cancel
                </Button>
              )}
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Request'
                )}
              </Button>
            </div>
          </CardFooter>
        </form>
      </Card>
    )
  }
)

ResourceRequestForm.displayName = 'ResourceRequestForm'

export { ResourceRequestForm }
export type { ResourceRequest }
