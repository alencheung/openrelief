/**
 * GDPR Rights Management Tab Panels
 *
 * Consent, Activity, and Subjects tab content extracted from RightsManagement.
 * The Requests tab lives in rights-management-requests-tab.tsx and is
 * re-exported here for convenience.
 */

import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { StatusIndicator } from '@/components/ui/StatusIndicator'
import {
  Eye,
  Send,
  Users,
  Activity,
  Database,
  Globe,
  User
} from 'lucide-react'
import type {
  ConsentRecord,
  DataProcessingActivity,
  DataSubjectRequest
} from './rights-management-helpers'
import {
  formatTimeAgo,
  getStatusColor
} from './rights-management-helpers'

// Re-export RequestsTab for convenience
export { RequestsTab } from './rights-management-requests-tab'

interface ConsentTabProps {
  consentRecords: ConsentRecord[]
  isLoading: boolean
  onWithdrawConsent: (id: string) => void
}

export function ConsentTab({ consentRecords, isLoading, onWithdrawConsent }: ConsentTabProps) {
  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Consent Management</h2>
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <Users className="h-4 w-4" />
            <span>Active consents: {consentRecords.filter(c => c.consentGiven).length}</span>
          </div>
        </div>

        <div className="space-y-4">
          {consentRecords.map(consent => (
            <div key={consent.id} className="border rounded-lg p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <StatusIndicator
                    status={consent.consentGiven ? 'resolved' : 'critical'}
                    label=""
                  />
                  <div>
                    <h3 className="font-medium">{consent.purpose}</h3>
                    <p className="text-sm text-gray-600 mt-1">{consent.description}</p>
                  </div>
                </div>
                <div className="text-sm text-gray-600">
                  {consent.consentGiven
                    ? `Given: ${formatTimeAgo(consent.consentDate)}`
                    : 'Not given'}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-3">
                <div>
                  <span className="text-gray-600">Data Types:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {consent.dataTypes.map(type => (
                      <span
                        key={type}
                        className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs"
                      >
                        {type.replace('_', ' ')}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <span className="text-gray-600">Processing Location:</span>
                  <div className="font-medium capitalize">
                    {consent.processingLocation.replace('_', ' ')}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-3">
                <div>
                  <span className="text-gray-600">Legal Basis:</span>
                  <div className="font-medium">{consent.legalBasis}</div>
                </div>
                <div>
                  <span className="text-gray-600">Automated Decision:</span>
                  <div className="font-medium">{consent.automatedDecision ? 'Yes' : 'No'}</div>
                </div>
              </div>

              <div className="flex items-center justify-between mb-3">
                <div>
                  <span className="text-gray-600">Expiry Date:</span>
                  <div className="font-medium">
                    {consent.expiryDate ? consent.expiryDate.toLocaleDateString() : 'No expiry'}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">
                    {consent.withdrawnAt
                      ? `Withdrawn: ${formatTimeAgo(consent.withdrawnAt)}`
                      : 'Active'}
                  </span>
                  {consent.canWithdraw && consent.consentGiven && !consent.withdrawnAt && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onWithdrawConsent(consent.id)}
                      disabled={isLoading}
                    >
                      {isLoading ? 'Processing...' : 'Withdraw Consent'}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

export function ActivityTab({
  processingActivities
}: {
  processingActivities: DataProcessingActivity[]
}) {
  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Data Processing Activity</h2>
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <Activity className="h-4 w-4" />
            <span>Recent activities: {processingActivities.length}</span>
          </div>
        </div>

        <div className="space-y-4">
          {processingActivities.map(activity => (
            <div key={activity.id} className="border rounded-lg p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <Database className="h-5 w-5 text-blue-600" />
                  <div>
                    <h3 className="font-medium">{activity.operation}</h3>
                    <span className="text-sm text-gray-600">• {activity.dataType}</span>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <StatusIndicator status={getStatusColor('processing')} label="" />
                  <span className="text-sm text-gray-600">
                    {formatTimeAgo(activity.timestamp)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Purpose:</span>
                  <div className="font-medium">{activity.purpose}</div>
                </div>
                <div>
                  <span className="text-gray-600">Legal Basis:</span>
                  <div className="font-medium">{activity.legalBasis}</div>
                </div>
                <div>
                  <span className="text-gray-600">Data Subjects:</span>
                  <div className="font-medium">{activity.dataSubjects.toLocaleString()}</div>
                </div>
                <div>
                  <span className="text-gray-600">Retention Period:</span>
                  <div className="font-medium">{activity.retentionPeriod} days</div>
                </div>
              </div>

              <div className="mb-3">
                <h4 className="font-medium mb-2">Processing Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Automated Decision:</span>
                    <div className="font-medium">
                      {activity.automatedDecision ? 'Yes' : 'No'}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-600">Privacy Impact:</span>
                    <StatusIndicator
                      status={
                        activity.privacyImpact === 'high'
                          ? 'critical'
                          : activity.privacyImpact === 'medium'
                            ? 'pending'
                            : 'resolved'
                      }
                      label={activity.privacyImpact}
                    />
                  </div>
                </div>
              </div>

              {activity.location && (
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Globe className="h-4 w-4" />
                  <span>Location: {activity.location}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

export function SubjectsTab({
  subjectRequests
}: {
  subjectRequests: DataSubjectRequest[]
}) {
  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Data Subject Rights</h2>
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <User className="h-4 w-4" />
            <span>Active requests: {subjectRequests.length}</span>
          </div>
        </div>

        <div className="space-y-4">
          {subjectRequests.map(request => (
            <div key={request.id} className="border rounded-lg p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <StatusIndicator status={getStatusColor(request.status)} label="" />
                  <div>
                    <h3 className="font-medium">{request.title}</h3>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className="text-sm text-gray-600">Type: {request.type}</span>
                      <span className="text-sm text-gray-600">
                        Category: {request.category}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-sm text-gray-600">{formatTimeAgo(request.createdAt)}</div>
              </div>

              <p className="text-gray-800 mb-3">{request.description}</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Response Due:</span>
                  <div className="font-medium">{request.responseDue.toLocaleDateString()}</div>
                </div>
                <div>
                  <span className="text-gray-600">Appealable:</span>
                  <div className="font-medium">{request.appealable ? 'Yes' : 'No'}</div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t">
                <div className="text-sm text-gray-600">
                  {request.respondedAt && `Responded: ${formatTimeAgo(request.respondedAt)}`}
                  {request.status === 'pending' && 'Awaiting response...'}
                  {request.outcome && `Outcome: ${request.outcome}`}
                </div>
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm">
                    <Eye className="h-4 w-4 mr-2" />
                    View Details
                  </Button>
                  {request.appealable && request.status === 'completed' && (
                    <Button size="sm" variant="outline">
                      <Send className="h-4 w-4 mr-2" />
                      Submit Appeal
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
