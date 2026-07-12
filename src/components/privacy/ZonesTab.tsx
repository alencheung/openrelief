/**
 * Location Privacy Zones tab for the Data Controls component.
 *
 * Extracted from DataControls.tsx. Renders privacy-zone cards with active
 * hours and per-exception toggles.
 */

'use client'

import React from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { StatusIndicator } from '@/components/ui/StatusIndicator'
import { Clock, Edit, MapPin, Plus, Trash2 } from 'lucide-react'
import type {
  LocationPrivacyZone,
  StatusIndicatorValue
} from './data-controls-types'

interface ZonesTabProps {
  zones: LocationPrivacyZone[]
  onAdd: () => void
  onUpdate: (id: string, updates: Partial<LocationPrivacyZone>) => void
  onDelete: (id: string) => void
  getPrivacyColor: (level: LocationPrivacyZone['privacyLevel']) => StatusIndicatorValue
}

const ZonesTab: React.FC<ZonesTabProps> = ({
  zones,
  onAdd,
  onUpdate,
  onDelete,
  getPrivacyColor
}) => {
  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Location Privacy Zones</h2>
          <Button onClick={onAdd} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Zone
          </Button>
        </div>

        <div className="space-y-4">
          {zones.map(zone => (
            <div key={zone.id} className="border rounded-lg p-4">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <MapPin className="h-5 w-5 text-blue-600" />
                  <div>
                    <h3 className="font-medium">{zone.name}</h3>
                    <p className="text-sm text-gray-600">
                      {zone.latitude.toFixed(4)}, {zone.longitude.toFixed(4)} • {zone.radius}m
                      radius
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <StatusIndicator
                    status={getPrivacyColor(zone.privacyLevel)}
                    label={zone.privacyLevel}
                  />
                  <Button variant="outline" size="sm">
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onDelete(zone.id)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </div>

              {/* Active Hours */}
              <div className="mb-4">
                <h4 className="font-medium mb-2">Active Hours</h4>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-gray-600" />
                    <span className="text-sm">From: {zone.activeHours.start}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-gray-600" />
                    <span className="text-sm">To: {zone.activeHours.end}</span>
                  </div>
                </div>
              </div>

              {/* Exceptions */}
              <div className="mb-4">
                <h4 className="font-medium mb-2">Exceptions</h4>
                <div className="space-y-2">
                  {(
                    Object.entries(zone.exceptions) as Array<
                      [keyof LocationPrivacyZone['exceptions'], boolean]
                    >
                  ).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between">
                      <span className="text-sm font-medium capitalize">
                        {key.replace(/([A-Z])/g, ' $1').trim()}:
                      </span>
                      <div className="flex items-center space-x-2">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={value}
                            onChange={() =>
                              onUpdate(zone.id, {
                                exceptions: {
                                  ...zone.exceptions,
                                  [key]: !value
                                }
                              })
                            }
                          />
                          <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[1px] after:left-[1px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                        <span className="text-sm text-gray-600">
                          {value ? 'Allowed' : 'Blocked'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t">
                <span className="text-sm text-gray-600">
                  Created: {zone.createdAt.toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

export default ZonesTab
