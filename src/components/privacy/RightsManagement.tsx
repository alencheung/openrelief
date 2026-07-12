/**
 * GDPR Rights Management Component for OpenRelief
 *
 * This component provides users with interfaces to exercise their GDPR rights
 * including access, rectification, erasure, portability, and consent management.
 */

'use client'

import React, { useState } from 'react'
import { useToast } from '@/hooks/use-toast'
import { Shield, Calendar } from 'lucide-react'

// Re-export types and helpers for backward compatibility
export * from './rights-management-helpers'
import {
  createInitialDataRequests,
  createInitialConsentRecords,
  createInitialProcessingActivities,
  createInitialSubjectRequests,
  type RightsTabId
} from './rights-management-helpers'
import {
  RequestsTab,
  ConsentTab,
  ActivityTab,
  SubjectsTab
} from './rights-management-tabs'

const RightsManagement: React.FC = () => {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState<RightsTabId>('requests')
  const [isLoading, setIsLoading] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d')

  // Mock data for demonstration
  const [dataRequests, setDataRequests] = useState(createInitialDataRequests())
  const [consentRecords, setConsentRecords] = useState(createInitialConsentRecords())
  const [processingActivities] = useState(createInitialProcessingActivities())
  const [subjectRequests] = useState(createInitialSubjectRequests())

  // Submit new data request
  const submitDataRequest = async (type: typeof dataRequests[number]['type']) => {
    setIsLoading(true)
    try {
      // In a real implementation, submit to API
      await new Promise(resolve => setTimeout(resolve, 2000))

      toast({
        title: 'Request Submitted',
        description: `Your ${type} request has been submitted successfully.`
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to submit data request',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Withdraw consent
  const withdrawConsent = async (id: string) => {
    setIsLoading(true)
    try {
      // In a real implementation, update consent status
      await new Promise(resolve => setTimeout(resolve, 1500))

      setConsentRecords(prev =>
        prev.map(consent =>
          consent.id === id ? { ...consent, consentGiven: false, withdrawnAt: new Date() } : consent
        )
      )

      toast({
        title: 'Consent Withdrawn',
        description: 'Your consent has been successfully withdrawn.'
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to withdraw consent',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Download request data
  const downloadRequestData = async (id: string) => {
    try {
      // In a real implementation, initiate download
      await new Promise(resolve => setTimeout(resolve, 1000))

      toast({
        title: 'Download Started',
        description: 'Your requested data is being prepared for download.'
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to prepare data for download',
        variant: 'destructive'
      })
    }
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">GDPR Rights Management</h1>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Shield className="h-5 w-5 text-blue-600" />
            <span className="text-sm text-gray-600">Your Rights</span>
          </div>
          <div className="flex items-center space-x-2">
            <Calendar className="h-5 w-5 text-gray-600" />
            <select
              value={dateRange}
              onChange={e => setDateRange(e.target.value as typeof dateRange)}
              className="border rounded px-2 py-1 text-sm"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="1y">Last year</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 border-b overflow-x-auto">
        {(['requests', 'consent', 'activity', 'subjects'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 font-medium capitalize whitespace-nowrap ${
              activeTab === tab
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            {tab === 'requests'
              ? 'Data Requests'
              : tab === 'consent'
                ? 'Consent Management'
                : tab === 'activity'
                  ? 'Processing Activity'
                  : tab === 'subjects'
                    ? 'Subject Rights'
                    : tab}
          </button>
        ))}
      </div>

      {/* Data Requests Tab */}
      {activeTab === 'requests' && (
        <RequestsTab
          dataRequests={dataRequests}
          filterStatus={filterStatus}
          searchQuery={searchQuery}
          isLoading={isLoading}
          onFilterStatusChange={setFilterStatus}
          onSearchQueryChange={setSearchQuery}
          onSubmitDataRequest={submitDataRequest}
          onSelectRequest={setSelectedRequest}
          onDownloadRequestData={downloadRequestData}
        />
      )}

      {/* Consent Management Tab */}
      {activeTab === 'consent' && (
        <ConsentTab
          consentRecords={consentRecords}
          isLoading={isLoading}
          onWithdrawConsent={withdrawConsent}
        />
      )}

      {/* Processing Activity Tab */}
      {activeTab === 'activity' && <ActivityTab processingActivities={processingActivities} />}

      {/* Subject Rights Tab */}
      {activeTab === 'subjects' && <SubjectsTab subjectRequests={subjectRequests} />}
    </div>
  )
}

export default RightsManagement
