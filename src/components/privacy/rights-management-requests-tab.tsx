/**
 * GDPR Rights Management - Requests Tab
 *
 * The Data Subject Rights Requests tab panel, extracted from the main tabs
 * file to keep each module under 500 lines.
 */

import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { StatusIndicator } from '@/components/ui/StatusIndicator'
import {
  FileText,
  Download,
  Eye,
  Edit,
  Trash2,
  Send,
  FileDown,
  Filter,
  Search
} from 'lucide-react'
import type { DataRequest } from './rights-management-helpers'
import {
  formatTimeAgo,
  getStatusColor,
  getPriorityColor
} from './rights-management-helpers'

interface RequestsTabProps {
  dataRequests: DataRequest[]
  filterStatus: string
  searchQuery: string
  isLoading: boolean
  onFilterStatusChange: (value: string) => void
  onSearchQueryChange: (value: string) => void
  onSubmitDataRequest: (type: DataRequest['type']) => void
  onSelectRequest: (id: string) => void
  onDownloadRequestData: (id: string) => void
}

export function RequestsTab({
  dataRequests,
  filterStatus,
  searchQuery,
  isLoading,
  onFilterStatusChange,
  onSearchQueryChange,
  onSubmitDataRequest,
  onSelectRequest,
  onDownloadRequestData
}: RequestsTabProps) {
  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Data Subject Rights Requests</h2>
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-gray-600" />
              <select
                value={filterStatus}
                onChange={e => onFilterStatusChange(e.target.value)}
                className="border rounded px-2 py-1 text-sm"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="completed">Completed</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            <div className="flex items-center space-x-2">
              <Search className="h-4 w-4 text-gray-600" />
              <input
                type="text"
                placeholder="Search requests..."
                value={searchQuery}
                onChange={e => onSearchQueryChange(e.target.value)}
                className="border rounded px-2 py-1 text-sm"
              />
            </div>
          </div>

          <div className="flex space-x-2">
            <Button onClick={() => onSubmitDataRequest('access')} size="sm">
              <FileText className="h-4 w-4 mr-2" />
              Access Request
            </Button>
            <Button
              onClick={() => onSubmitDataRequest('rectification')}
              size="sm"
              variant="outline"
            >
              <Edit className="h-4 w-4 mr-2" />
              Rectification
            </Button>
            <Button onClick={() => onSubmitDataRequest('erasure')} size="sm" variant="outline">
              <Trash2 className="h-4 w-4 mr-2" />
              Erasure
            </Button>
            <Button
              onClick={() => onSubmitDataRequest('portability')}
              size="sm"
              variant="outline"
            >
              <Download className="h-4 w-4 mr-2" />
              Portability
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          {dataRequests
            .filter(
              request =>
                (filterStatus === 'all' || request.status === filterStatus) &&
                (searchQuery === '' ||
                  request.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  request.description.toLowerCase().includes(searchQuery.toLowerCase()))
            )
            .map(request => (
              <div key={request.id} className="border rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <StatusIndicator status={getStatusColor(request.status)} label="" />
                    <div>
                      <h3 className="font-medium">{request.title}</h3>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="text-sm text-gray-600">Type: {request.type}</span>
                        <StatusIndicator
                          status={getPriorityColor(request.priority)}
                          label={request.priority}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="text-sm text-gray-600">
                    {formatTimeAgo(request.createdAt)}
                  </div>
                </div>

                <p className="text-gray-800 mb-3">{request.description}</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Reference:</span>
                    <div className="font-medium">{request.referenceNumber || 'N/A'}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Legal Basis:</span>
                    <div className="font-medium">{request.legalBasis}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Data Types:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {request.dataTypes.map(type => (
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
                    <span className="text-gray-600">Delivery Method:</span>
                    <div className="font-medium capitalize">
                      {request.deliveryMethod.replace('_', ' ')}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Submitted:</span>
                    <div>{request.submittedAt?.toLocaleDateString() || 'N/A'}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Deadline:</span>
                    <div>{request.responseDeadline?.toLocaleDateString() || 'N/A'}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Est. Completion:</span>
                    <div>{request.estimatedCompletion?.toLocaleDateString() || 'N/A'}</div>
                  </div>
                </div>

                {request.attachments.length > 0 && (
                  <div className="mb-3">
                    <h4 className="font-medium mb-2">Attachments</h4>
                    <div className="flex flex-wrap gap-2">
                      {request.attachments.map((attachment, index) => (
                        <button
                          key={index}
                          onClick={() => onDownloadRequestData(request.id)}
                          className="flex items-center space-x-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded text-sm"
                        >
                          <FileDown className="h-4 w-4" />
                          {attachment}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-3 border-t">
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onSelectRequest(request.id)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Details
                    </Button>
                    {request.status === 'completed' && (
                      <Button size="sm">
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                    )}
                    {['rejected', 'appealed'].includes(request.status) && (
                      <Button size="sm" variant="outline">
                        <Send className="h-4 w-4 mr-2" />
                        Appeal
                      </Button>
                    )}
                  </div>
                  <div className="text-sm text-gray-600">
                    {request.completedAt && `Completed: ${formatTimeAgo(request.completedAt)}`}
                    {request.status === 'processing' && 'Currently processing...'}
                  </div>
                </div>
              </div>
            ))}
        </div>
      </Card>
    </div>
  )
}
