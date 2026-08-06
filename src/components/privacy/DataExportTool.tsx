/**
 * Data Export and Deletion Tool for OpenRelief
 *
 * This component allows users to export their data in various formats
 * and request deletion of their personal information in compliance with
 * data protection regulations like GDPR.
 */

'use client'

import React, { useState, useEffect } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { StatusIndicator } from '@/components/ui/StatusIndicator'
import { useToast } from '@/hooks/use-toast'

// Types for data export and deletion
interface DataExportRequest {
  id: string
  dataType: string
  format: 'json' | 'csv' | 'pdf'
  status: 'pending' | 'processing' | 'completed' | 'failed'
  createdAt: Date
  completedAt?: Date
  downloadUrl?: string
}

interface DataDeletionRequest {
  id: string
  dataType: string
  reason: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  createdAt: Date
  completedAt?: Date
  confirmationCode?: string
}

interface DataSummary {
  totalRecords: number
  dataSize: string
  lastUpdated: Date
  dataTypes: Array<{
    name: string
    count: number
    size: string
  }>
}

const DataExportTool: React.FC = () => {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState<'export' | 'delete' | 'requests'>('export')
  const [isLoading, setIsLoading] = useState(false)

  // Data export state
  const [selectedDataTypes, setSelectedDataTypes] = useState<string[]>([])
  const [exportFormat, setExportFormat] = useState<'json' | 'csv' | 'pdf'>('json')
  const [exportRequests, setExportRequests] = useState<DataExportRequest[]>([])

  // Data deletion state
  const [deletionReason, setDeletionReason] = useState('')
  const [deletionRequests, setDeletionRequests] = useState<DataDeletionRequest[]>([])
  const [_confirmationCode, _setConfirmationCode] = useState('')

  // Data summary
  const [dataSummary, setDataSummary] = useState<DataSummary>({
    totalRecords: 0,
    dataSize: '0 MB',
    lastUpdated: new Date(),
    dataTypes: [
      { name: 'Location Data', count: 0, size: '0 MB' },
      { name: 'Emergency Reports', count: 0, size: '0 MB' },
      { name: 'Trust Score History', count: 0, size: '0 MB' },
      { name: 'User Profile', count: 0, size: '0 MB' }
    ]
  })

  // Available data types for export/deletion
  const availableDataTypes = [
    { id: 'location', name: 'Location Data', description: 'Your location history and coordinates' },
    {
      id: 'emergency',
      name: 'Emergency Reports',
      description: 'Emergency reports you have submitted'
    },
    { id: 'trust', name: 'Trust Score History', description: 'Historical trust score data' },
    { id: 'profile', name: 'User Profile', description: 'Your profile information and preferences' }
  ]

  // Load data summary and requests
  useEffect(() => {
    const loadDataSummary = async () => {
      setIsLoading(true)
      try {
        // In a real implementation, fetch from API
        // const response = await fetch('/api/privacy/data-summary');
        // const summary = await response.json();
        // setDataSummary(summary);

        // Mock data for demonstration
        setDataSummary({
          totalRecords: 156,
          dataSize: '2.4 MB',
          lastUpdated: new Date(),
          dataTypes: [
            { name: 'Location Data', count: 89, size: '1.2 MB' },
            { name: 'Emergency Reports', count: 12, size: '0.8 MB' },
            { name: 'Trust Score History', count: 45, size: '0.3 MB' },
            { name: 'User Profile', count: 10, size: '0.1 MB' }
          ]
        })
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to load data summary',
          variant: 'destructive'
        })
      } finally {
        setIsLoading(false)
      }
    }

    const loadRequests = async () => {
      try {
        // Load the user's export requests from the real API. Deletion requests
        // have no list endpoint, so they start empty and are tracked locally.
        const response = await fetch('/api/privacy/export', {
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin'
        })

        if (response.ok) {
          const json = (await response.json()) as {
            data?: Array<Record<string, unknown>>
          }
          const rows = json.data ?? []
          setExportRequests(
            rows.map(row => ({
              id: row.id as string,
              dataType: (row.data_types as string[])?.join(', ') ?? '',
              format: (row.format as 'json' | 'csv' | 'pdf') ?? 'json',
              status: row.status as DataExportRequest['status'],
              createdAt: new Date(row.created_at as string),
              completedAt: row.completed_at
                ? new Date(row.completed_at as string)
                : undefined,
              downloadUrl: (row.download_url as string) || undefined
            }))
          )
        } else if (!response.ok && response.status !== 401) {
          throw new Error(`Failed to load export requests (${response.status})`)
        }

        setDeletionRequests([])
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to load requests',
          variant: 'destructive'
        })
      }
    }

    loadDataSummary()
    loadRequests()
  }, [toast])

  // Handle data type selection
  const handleDataTypeToggle = (typeId: string) => {
    setSelectedDataTypes(prev =>
      prev.includes(typeId) ? prev.filter(id => id !== typeId) : [...prev, typeId]
    )
  }

  // Submit data export request
  const submitExportRequest = async () => {
    if (selectedDataTypes.length === 0) {
      toast({
        title: 'Error',
        description: 'Please select at least one data type to export',
        variant: 'destructive'
      })
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/privacy/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          dataTypes: selectedDataTypes,
          format: exportFormat
        })
      })

      const json = (await response.json()) as {
        requestId?: string
        downloadUrl?: string
        status?: DataExportRequest['status']
        error?: string
      }

      if (!response.ok || !json.requestId) {
        throw new Error(json.error || `Request failed (${response.status})`)
      }

      // Use the real id + download URL returned by the API.
      const request: DataExportRequest = {
        id: json.requestId,
        dataType: selectedDataTypes.join(', '),
        format: exportFormat,
        status: json.status || 'pending',
        createdAt: new Date(),
        downloadUrl: json.downloadUrl || `/api/privacy/download/${json.requestId}`
      }

      setExportRequests(prev => [request, ...prev])
      setSelectedDataTypes([])

      toast({
        title: 'Export Requested',
        description:
          "Your data export request has been submitted. You will be notified when it's ready for download."
      })
    } catch (error) {
      toast({
        title: 'Error',
        description:
          error instanceof Error ? error.message : 'Failed to submit export request',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Submit data deletion request
  const submitDeletionRequest = async () => {
    if (selectedDataTypes.length === 0) {
      toast({
        title: 'Error',
        description: 'Please select at least one data type to delete',
        variant: 'destructive'
      })
      return
    }

    if (!deletionReason.trim()) {
      toast({
        title: 'Error',
        description: 'Please provide a reason for deletion',
        variant: 'destructive'
      })
      return
    }

    setIsLoading(true)
    try {
      // Submit the right-to-erasure request to the real API. The endpoint
      // logs a deletion request; actual hard-delete happens on the retention
      // schedule, so we surface the returned requestId as the confirmation.
      const response = await fetch('/api/privacy/export', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ reason: deletionReason })
      })

      const json = (await response.json()) as {
        requestId?: string
        message?: string
        error?: string
      }

      if (!response.ok || !json.requestId) {
        throw new Error(json.error || `Request failed (${response.status})`)
      }

      const request: DataDeletionRequest = {
        id: json.requestId,
        dataType: selectedDataTypes.join(', '),
        reason: deletionReason,
        status: 'pending',
        createdAt: new Date(),
        confirmationCode: json.requestId
      }

      setDeletionRequests(prev => [request, ...prev])
      setSelectedDataTypes([])
      setDeletionReason('')

      toast({
        title: 'Deletion Requested',
        description: `Your deletion request has been submitted. Confirmation code: ${request.confirmationCode}`
      })
    } catch (error) {
      toast({
        title: 'Error',
        description:
          error instanceof Error ? error.message : 'Failed to submit deletion request',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Download exported data
  const downloadExport = (request: DataExportRequest) => {
    if (request.downloadUrl) {
      // In a real implementation, initiate download
      window.open(request.downloadUrl, '_blank')
    }
  }

  // Get status color for requests
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'resolved'
      case 'processing':
        return 'active'
      case 'pending':
        return 'pending'
      case 'failed':
        return 'critical'
      default:
        return 'inactive'
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Data Export & Deletion</h1>
      </div>

      {/* Data Summary */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Your Data Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold">{dataSummary.totalRecords}</div>
            <div className="text-gray-600">Total Records</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{dataSummary.dataSize}</div>
            <div className="text-gray-600">Total Size</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{dataSummary.lastUpdated.toLocaleDateString()}</div>
            <div className="text-gray-600">Last Updated</div>
          </div>
        </div>

        <div className="mt-4">
          <h3 className="font-medium mb-2">Data Types</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {dataSummary.dataTypes.map((type, index) => (
              <div key={index} className="flex justify-between p-2 border rounded">
                <span>{type.name}</span>
                <span className="text-gray-600">
                  {type.count} records ({type.size})
                </span>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Tab Navigation */}
      <div className="flex space-x-1 border-b">
        {(['export', 'delete', 'requests'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 font-medium capitalize ${
              activeTab === tab
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Export Tab */}
      {activeTab === 'export' && (
        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Export Your Data</h2>

            <div className="space-y-4">
              <div>
                <h3 className="font-medium mb-2">Select Data Types</h3>
                <div className="space-y-2">
                  {availableDataTypes.map(type => (
                    <label key={type.id} className="flex items-start space-x-3">
                      <input
                        type="checkbox"
                        className="mt-1"
                        checked={selectedDataTypes.includes(type.id)}
                        onChange={() => handleDataTypeToggle(type.id)}
                      />
                      <div>
                        <div className="font-medium">{type.name}</div>
                        <div className="text-sm text-gray-600">{type.description}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-medium mb-2">Export Format</h3>
                <div className="flex space-x-4">
                  {(['json', 'csv', 'pdf'] as const).map(format => (
                    <label key={format} className="flex items-center space-x-2">
                      <input
                        type="radio"
                        name="format"
                        value={format}
                        checked={exportFormat === format}
                        onChange={() => setExportFormat(format)}
                      />
                      <span className="uppercase">{format}</span>
                    </label>
                  ))}
                </div>
              </div>

              <Button
                onClick={submitExportRequest}
                disabled={isLoading || selectedDataTypes.length === 0}
              >
                {isLoading ? 'Submitting...' : 'Request Export'}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Delete Tab */}
      {activeTab === 'delete' && (
        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Delete Your Data</h2>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
              <h3 className="font-medium text-yellow-800">Warning</h3>
              <p className="text-yellow-700">
                Data deletion is permanent and cannot be undone. Please be certain before
                proceeding.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="font-medium mb-2">Select Data Types to Delete</h3>
                <div className="space-y-2">
                  {availableDataTypes.map(type => (
                    <label key={type.id} className="flex items-start space-x-3">
                      <input
                        type="checkbox"
                        className="mt-1"
                        checked={selectedDataTypes.includes(type.id)}
                        onChange={() => handleDataTypeToggle(type.id)}
                      />
                      <div>
                        <div className="font-medium">{type.name}</div>
                        <div className="text-sm text-gray-600">{type.description}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-medium mb-2">Reason for Deletion</h3>
                <textarea
                  className="w-full p-2 border rounded"
                  rows={4}
                  placeholder="Please provide a reason for your data deletion request..."
                  value={deletionReason}
                  onChange={e => setDeletionReason(e.target.value)}
                />
              </div>

              <Button
                variant="destructive"
                onClick={submitDeletionRequest}
                disabled={isLoading || selectedDataTypes.length === 0 || !deletionReason.trim()}
              >
                {isLoading ? 'Submitting...' : 'Request Deletion'}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Requests Tab */}
      {activeTab === 'requests' && (
        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Your Requests</h2>

            <div className="space-y-6">
              <div>
                <h3 className="font-medium mb-2">Export Requests</h3>
                {exportRequests.length === 0 ? (
                  <p className="text-gray-600">No export requests found</p>
                ) : (
                  <div className="space-y-2">
                    {exportRequests.map(request => (
                      <div
                        key={request.id}
                        className="flex items-center justify-between p-3 border rounded"
                      >
                        <div>
                          <div className="font-medium">{request.dataType}</div>
                          <div className="text-sm text-gray-600">
                            Format: {request.format.toUpperCase()} | Created:{' '}
                            {request.createdAt.toLocaleDateString()}
                          </div>
                          {request.completedAt && (
                            <div className="text-sm text-gray-600">
                              Completed: {request.completedAt.toLocaleDateString()}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          <StatusIndicator
                            status={getStatusColor(request.status)}
                            label={request.status}
                          />
                          {request.status === 'completed' && request.downloadUrl && (
                            <Button size="sm" onClick={() => downloadExport(request)}>
                              Download
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h3 className="font-medium mb-2">Deletion Requests</h3>
                {deletionRequests.length === 0 ? (
                  <p className="text-gray-600">No deletion requests found</p>
                ) : (
                  <div className="space-y-2">
                    {deletionRequests.map(request => (
                      <div
                        key={request.id}
                        className="flex items-center justify-between p-3 border rounded"
                      >
                        <div>
                          <div className="font-medium">{request.dataType}</div>
                          <div className="text-sm text-gray-600">
                            Created: {request.createdAt.toLocaleDateString()}
                          </div>
                          {request.confirmationCode && (
                            <div className="text-sm text-gray-600">
                              Confirmation Code: {request.confirmationCode}
                            </div>
                          )}
                          {request.completedAt && (
                            <div className="text-sm text-gray-600">
                              Completed: {request.completedAt.toLocaleDateString()}
                            </div>
                          )}
                        </div>
                        <StatusIndicator
                          status={getStatusColor(request.status)}
                          label={request.status}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}

export default DataExportTool
