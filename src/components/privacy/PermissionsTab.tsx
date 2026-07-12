/**
 * Data Permissions tab for the Data Controls component.
 *
 * Extracted from DataControls.tsx. Renders the per-data-type permission
 * cards with sharing settings, encryption level, and retention controls.
 */

'use client'

import React from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { StatusIndicator } from '@/components/ui/StatusIndicator'
import { AlertTriangle, Database, Edit } from 'lucide-react'
import type {
  DataTypePermission,
  StatusIndicatorValue
} from './data-controls-types'

interface PermissionsTabProps {
  permissions: DataTypePermission[]
  onToggle: (id: string) => void
  onToggleSharing: (
    id: string,
    sharingType: keyof DataTypePermission['sharingSettings']
  ) => void
  onUpdateEncryption: (
    id: string,
    level: DataTypePermission['encryptionLevel']
  ) => void
  onChangeRetention: (id: string, retentionDays: number) => void
  getEncryptionColor: (
    level: DataTypePermission['encryptionLevel']
  ) => StatusIndicatorValue
}

const ENCRYPTION_LEVELS = [
  'none',
  'basic',
  'standard',
  'enhanced',
  'maximum'
] as const

const PermissionsTab: React.FC<PermissionsTabProps> = ({
  permissions,
  onToggle,
  onToggleSharing,
  onUpdateEncryption,
  onChangeRetention,
  getEncryptionColor
}) => {
  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Data Type Permissions</h2>
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <Database className="h-4 w-4" />
            <span>Fine-grained control</span>
          </div>
        </div>

        <div className="space-y-6">
          {permissions.map(permission => (
            <div key={permission.id} className="border rounded-lg p-4">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={permission.enabled}
                      onChange={() => onToggle(permission.id)}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                  <div>
                    <h3 className="font-medium">{permission.name}</h3>
                    <p className="text-sm text-gray-600">{permission.description}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <StatusIndicator
                    status={permission.enabled ? 'active' : 'inactive'}
                    label={permission.enabled ? 'Enabled' : 'Disabled'}
                  />
                  <span className="text-sm text-gray-600">Category: {permission.category}</span>
                </div>
              </div>

              {/* Purpose Limitations */}
              <div className="mb-4">
                <h4 className="font-medium mb-2">Purpose Limitations</h4>
                <div className="space-y-1">
                  {permission.purposeLimitation.map((limitation, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <AlertTriangle className="h-4 w-4 text-yellow-600" />
                      <span className="text-sm">{limitation}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sharing Settings */}
              <div className="mb-4">
                <h4 className="font-medium mb-2">Sharing Settings</h4>
                <div className="grid grid-cols-2 gap-4">
                  {(
                    Object.entries(permission.sharingSettings) as Array<
                      [keyof DataTypePermission['sharingSettings'], boolean]
                    >
                  ).map(([key, value]) => (
                    <div
                      key={key}
                      className="flex items-center justify-between p-2 bg-gray-50 rounded"
                    >
                      <span className="text-sm font-medium capitalize">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={value}
                          onChange={() => onToggleSharing(permission.id, key)}
                        />
                        <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[1px] after:left-[1px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Encryption Level */}
              <div className="mb-4">
                <h4 className="font-medium mb-2">Encryption Level</h4>
                <div className="flex items-center space-x-4">
                  {ENCRYPTION_LEVELS.map(level => (
                    <button
                      key={level}
                      onClick={() => onUpdateEncryption(permission.id, level)}
                      className={`px-3 py-1 rounded text-sm font-medium ${
                        permission.encryptionLevel === level
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      {level.replace('_', ' ')}
                    </button>
                  ))}
                  <div className="flex items-center space-x-2">
                    <StatusIndicator
                      status={getEncryptionColor(permission.encryptionLevel)}
                      label=""
                    />
                    <span className="text-sm text-gray-600">
                      Current: {permission.encryptionLevel.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Retention Period */}
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Retention Period</h4>
                  <p className="text-sm text-gray-600">Data retention in days</p>
                </div>
                <div className="flex items-center space-x-4">
                  <input
                    type="number"
                    min="1"
                    max="730"
                    value={permission.retentionDays}
                    onChange={e =>
                      onChangeRetention(
                        permission.id,
                        parseInt(e.target.value, 10)
                      )
                    }
                    className="w-20 border rounded px-2 py-1 text-sm"
                  />
                  <span className="text-sm text-gray-600">days</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t">
                <span className="text-sm text-gray-600">
                  Last modified: {permission.lastModified.toLocaleDateString()}
                </span>
                <Button variant="outline" size="sm">
                  <Edit className="h-4 w-4 mr-2" />
                  Advanced Settings
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

export default PermissionsTab
