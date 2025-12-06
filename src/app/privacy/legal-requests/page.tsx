/**
 * Legal Requests Page for OpenRelief
 * 
 * This page allows users to exercise their GDPR rights including
 * data access, rectification, erasure, portability, and objection
 */

'use client'

import React, { useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { 
  FileText, 
  Download, 
  Trash2, 
  Edit, 
  AlertCircle,
  CheckCircle,
  Clock,
  Eye,
  Plus,
  Search,
  Filter,
  Calendar,
  User
} from 'lucide-react'
import { usePrivacy } from '@/hooks/usePrivacy'
import { useToast } from '@/hooks/use-toast'
import { LegalRequest } from '@/hooks/usePrivacy'

type RequestType = 'data_access' | 'deletion' | 'correction' | 'portability' | 'objection'
type RequestStatus = 'pending' | 'processing' | 'completed' | 'rejected' | 'appealed'

const LegalRequestsPage: React.FC = () => {
  const { toast } = useToast()
  const { privacyContext, createLegalRequest, updateLegalRequest } = usePrivacy()
  const [activeTab, setActiveTab] = useState<'requests' | 'new'>('requests')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<RequestStatus | 'all'>('all')
  const [typeFilter, setTypeFilter] = useState<RequestType | 'all'>('all')
  const [showNewRequestForm, setShowNewRequestForm] = useState(false)
  const [newRequestType, setNewRequestType] = useState<RequestType>('data_access')
  const [newRequestDescription, setNewRequestDescription] = useState('')

  const requestTypes = [
    {
      type: 'data_access' as RequestType,
      title: 'Data Access',
      description: 'Request a copy of all personal data we hold about you',
      icon: Eye,
      color: 'blue'
    },
    {
      type: 'rectification' as RequestType,
      title: 'Data Correction',
      description: 'Request correction of inaccurate personal data',
      icon: Edit,
      color: 'yellow'
    },
    {
      type: 'deletion' as RequestType,
      title: 'Right to Erasure',
      description: 'Request deletion of your personal data',
      icon: Trash2,
      color: 'red'
    },
    {
      type: 'portability' as RequestType,
      title: 'Data Portability',
      description: 'Request your data in a machine-readable format',
      icon: Download,
      color: 'green'
    },
    {
      type: 'objection' as RequestType,
      title: 'Object to Processing',
      description: 'Object to processing of your personal data',
      icon: AlertCircle,
      color: 'purple'
    }
  ]

  const getStatusColor = (status: RequestStatus) => {
    switch (status) {
      case 'pending': return 'bg-gray-100 text-gray-800'
      case 'processing': return 'bg-blue-100 text-blue-800'
      case 'completed': return 'bg-green-100 text-green-800'
      case 'rejected': return 'bg-red-100 text-red-800'
      case 'appealed': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getTypeColor = (type: RequestType) => {
    switch (type) {
      case 'data_access': return 'bg-blue-100 text-blue-800'
      case 'correction': return 'bg-yellow-100 text-yellow-800'
      case 'deletion': return 'bg-red-100 text-red-800'
      case 'portability': return 'bg-green-100 text-green-800'
      case 'objection': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: RequestStatus) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4" />
      case 'processing': return <AlertCircle className="h-4 w-4" />
      case 'completed': return <CheckCircle className="h-4 w-4" />
      case 'rejected': return <AlertCircle className="h-4 w-4" />
      case 'appealed': return <AlertCircle className="h-4 w-4" />
      default: return <Clock className="h-4 w-4" />
    }
  }

  const filteredRequests = privacyContext.legalRequests.filter(request => {
    const matchesSearch = request.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        request.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || request.status === statusFilter
    const matchesType = typeFilter === 'all' || request.type === typeFilter
    
    return matchesSearch && matchesStatus && matchesType
  })

  const handleCreateRequest = () => {
    if (!newRequestDescription.trim()) {
      toast({
        title: "Description Required",
        description: "Please provide a description for your request.",
        variant: "destructive"
      })
      return
    }

    const requestId = createLegalRequest({
      type: newRequestType,
      title: requestTypes.find(rt => rt.type === newRequestType)?.title || 'Legal Request',
      description: newRequestDescription,
      canUserContact: true
    })

    toast({
      title: "Request Submitted",
      description: `Your ${requestTypes.find(rt => rt.type === newRequestType)?.title} request has been submitted successfully.`
    })

    // Reset form
    setNewRequestDescription('')
    setShowNewRequestForm(false)
    setActiveTab('requests')
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date)
  }

  const getDaysRemaining = (deadline?: Date) => {
    if (!deadline) return null
    
    const now = new Date()
    const diffTime = deadline.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    return diffDays
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-3">
              <FileText className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Legal Requests</h1>
                <p className="text-sm text-gray-600">Exercise your GDPR rights</p>
              </div>
            </div>
            <Button 
              onClick={() => setActiveTab('new')}
              disabled={activeTab === 'new'}
            >
              <Plus className="h-4 w-4 mr-2" />
              New Request
            </Button>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            <button
              onClick={() => setActiveTab('requests')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'requests'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              My Requests ({privacyContext.legalRequests.length})
            </button>
            <button
              onClick={() => setActiveTab('new')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'new'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              New Request
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'requests' && (
          <div className="space-y-6">
            {/* Filters */}
            <Card className="p-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search requests..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as RequestStatus | 'all')}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">All Statuses</option>
                    <option value="pending">Pending</option>
                    <option value="processing">Processing</option>
                    <option value="completed">Completed</option>
                    <option value="rejected">Rejected</option>
                    <option value="appealed">Appealed</option>
                  </select>
                  
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value as RequestType | 'all')}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">All Types</option>
                    <option value="data_access">Data Access</option>
                    <option value="correction">Data Correction</option>
                    <option value="deletion">Right to Erasure</option>
                    <option value="portability">Data Portability</option>
                    <option value="objection">Object to Processing</option>
                  </select>
                </div>
              </div>
            </Card>

            {/* Requests List */}
            {filteredRequests.length === 0 ? (
              <Card className="p-12 text-center">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No requests found</h3>
                <p className="text-gray-600 mb-6">
                  {privacyContext.legalRequests.length === 0 
                    ? "You haven't made any legal requests yet."
                    : "No requests match your current filters."}
                </p>
                {privacyContext.legalRequests.length === 0 && (
                  <Button onClick={() => setActiveTab('new')}>
                    Create Your First Request
                  </Button>
                )}
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredRequests.map((request) => (
                  <Card key={request.id} className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-medium text-gray-900">{request.title}</h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(request.type)}`}>
                            {request.type.replace('_', ' ')}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center space-x-1 ${getStatusColor(request.status)}`}>
                            {getStatusIcon(request.status)}
                            <span>{request.status}</span>
                          </span>
                        </div>
                        
                        <p className="text-gray-600 mb-4">{request.description}</p>
                        
                        <div className="flex items-center space-x-6 text-sm text-gray-500">
                          <div className="flex items-center space-x-1">
                            <Calendar className="h-4 w-4" />
                            <span>Created: {formatDate(request.createdAt)}</span>
                          </div>
                          
                          {request.updatedAt.getTime() !== request.createdAt.getTime() && (
                            <div className="flex items-center space-x-1">
                              <Clock className="h-4 w-4" />
                              <span>Updated: {formatDate(request.updatedAt)}</span>
                            </div>
                          )}
                          
                          {request.responseDeadline && (
                            <div className="flex items-center space-x-1">
                              <AlertCircle className="h-4 w-4" />
                              <span>
                                Deadline: {formatDate(request.responseDeadline)}
                                {getDaysRemaining(request.responseDeadline) !== null && (
                                  <span className={`ml-1 font-medium ${
                                    getDaysRemaining(request.responseDeadline)! < 7 ? 'text-red-600' : 'text-gray-600'
                                  }`}>
                                    ({getDaysRemaining(request.responseDeadline)} days left)
                                  </span>
                                )}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="ml-4">
                        <Button variant="outline" size="sm">
                          View Details
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'new' && (
          <div className="max-w-3xl mx-auto">
            {!showNewRequestForm ? (
              <div className="space-y-6">
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">Choose a Request Type</h2>
                  <p className="text-gray-600 mb-8">
                    Select the type of legal request you would like to submit
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {requestTypes.map((requestType) => (
                    <Card 
                      key={requestType.type} 
                      className="p-6 cursor-pointer hover:shadow-md transition-shadow border-2 hover:border-blue-300"
                      onClick={() => {
                        setNewRequestType(requestType.type)
                        setShowNewRequestForm(true)
                      }}
                    >
                      <div className="flex items-start space-x-4">
                        <div className={`p-3 rounded-lg bg-${requestType.color}-100`}>
                          <requestType.icon className={`h-6 w-6 text-${requestType.color}-600`} />
                        </div>
                        <div>
                          <h3 className="text-lg font-medium text-gray-900 mb-2">
                            {requestType.title}
                          </h3>
                          <p className="text-sm text-gray-600">
                            {requestType.description}
                          </p>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            ) : (
              <Card className="p-6">
                <div className="mb-6">
                  <Button 
                    variant="ghost" 
                    onClick={() => setShowNewRequestForm(false)}
                    className="mb-4"
                  >
                    ← Back to request types
                  </Button>
                  
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    {requestTypes.find(rt => rt.type === newRequestType)?.title}
                  </h2>
                  <p className="text-gray-600">
                    {requestTypes.find(rt => rt.type === newRequestType)?.description}
                  </p>
                </div>
                
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Request Description
                    </label>
                    <textarea
                      rows={6}
                      value={newRequestDescription}
                      onChange={(e) => setNewRequestDescription(e.target.value)}
                      placeholder="Please provide details about your request..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start space-x-2">
                      <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-blue-900 mb-1">Important Information</h4>
                        <ul className="text-sm text-blue-800 space-y-1">
                          <li>• We will respond to your request within 30 days</li>
                          <li>• You will receive updates as your request is processed</li>
                          <li>• Additional verification may be required for certain requests</li>
                          <li>• You have the right to appeal if your request is denied</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-end space-x-4">
                    <Button 
                      variant="outline"
                      onClick={() => setShowNewRequestForm(false)}
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleCreateRequest}>
                      Submit Request
                    </Button>
                  </div>
                </div>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default LegalRequestsPage