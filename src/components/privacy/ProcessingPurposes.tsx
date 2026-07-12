/**
 * Data Processing Purposes section for the Data Controls component.
 *
 * Extracted from DataControls.tsx. Renders the always-visible legal-basis
 * tracking card at the bottom of the page.
 */

'use client'

import React from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { StatusIndicator } from '@/components/ui/StatusIndicator'
import { Eye, Info, Shield } from 'lucide-react'
import type { DataProcessingPurpose } from './data-controls-types'

interface ProcessingPurposesProps {
  purposes: DataProcessingPurpose[]
}

const ProcessingPurposes: React.FC<ProcessingPurposesProps> = ({ purposes }) => {
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Data Processing Purposes</h2>
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <Info className="h-4 w-4" />
          <span>Legal basis tracking</span>
        </div>
      </div>

      <div className="space-y-4">
        {purposes.map(purpose => (
          <div key={purpose.id} className="border rounded-lg p-4">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <Shield className="h-5 w-5 text-blue-600" />
                <div>
                  <h3 className="font-medium">{purpose.name}</h3>
                  <p className="text-sm text-gray-600">{purpose.description}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <StatusIndicator
                  status={purpose.required ? 'active' : 'pending'}
                  label={purpose.required ? 'Required' : 'Optional'}
                />
                <span className="text-sm text-gray-600">Category: {purpose.category}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <span className="text-sm text-gray-600">Data Types:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {purpose.dataTypes.map(dataType => (
                    <span
                      key={dataType}
                      className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs"
                    >
                      {dataType.replace('_', ' ')}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <span className="text-sm text-gray-600">Retention:</span>
                <div className="font-medium">{purpose.retentionDays} days</div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <span className="text-sm text-gray-600">Processing Location:</span>
                <div className="font-medium capitalize">
                  {purpose.processingLocation.replace('_', ' ')}
                </div>
              </div>
              <div>
                <span className="text-sm text-gray-600">User Consent:</span>
                <div className="font-medium capitalize">
                  {purpose.userConsent.replace('_', ' ')}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t">
              <span className="text-sm text-gray-600">
                Last reviewed: {purpose.lastReviewed.toLocaleDateString()}
              </span>
              <Button variant="outline" size="sm">
                <Eye className="h-4 w-4 mr-2" />
                Review Details
              </Button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}

export default ProcessingPurposes
