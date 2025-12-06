/**
 * Legal Requests API Endpoint
 * 
 * This endpoint handles GET, POST, PUT, and DELETE requests for legal requests,
 * allowing users to exercise their GDPR rights including data access,
 * rectification, erasure, portability, and objection.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { LegalRequest } from '@/hooks/usePrivacy'

// Mock database for legal requests
// In a real implementation, this would be replaced with actual database calls
const legalRequestsDB = new Map<string, LegalRequest[]>()

// GET handler - retrieve legal requests
export async function GET(request: NextRequest) {
  try {
    // Get user session
    const session = await getServerSession()
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const type = searchParams.get('type')
    const limit = searchParams.get('limit')
    const offset = searchParams.get('offset')

    // Get user's legal requests from database
    let requests = legalRequestsDB.get(session.user.id) || []

    // Filter by status if provided
    if (status) {
      requests = requests.filter(req => req.status === status)
    }

    // Filter by type if provided
    if (type) {
      requests = requests.filter(req => req.type === type)
    }

    // Sort by creation date (newest first)
    requests.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

    // Apply pagination if provided
    const limitNum = limit ? parseInt(limit) : undefined
    const offsetNum = offset ? parseInt(offset) : 0

    if (limitNum) {
      requests = requests.slice(offsetNum, offsetNum + limitNum)
    }

    // Log access for transparency
    await logLegalRequestAccess(session.user.id, 'requests_retrieval', 'legal_requests', {
      filters: { status, type },
      pagination: { limit: limitNum, offset: offsetNum },
      resultCount: requests.length
    })

    return NextResponse.json({
      success: true,
      data: {
        requests,
        totalCount: legalRequestsDB.get(session.user.id)?.length || 0,
        filters: { status, type },
        pagination: { limit: limitNum, offset: offsetNum }
      }
    })
  } catch (error) {
    console.error('Error retrieving legal requests:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST handler - create new legal request
export async function POST(request: NextRequest) {
  try {
    // Get user session
    const session = await getServerSession()
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { type, title, description } = body

    // Validate required fields
    if (!type || !title || !description) {
      return NextResponse.json(
        { error: 'Missing required fields: type, title, description' },
        { status: 400 }
      )
    }

    // Validate request type
    const validTypes = ['data_access', 'deletion', 'correction', 'portability', 'objection']
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: `Invalid request type. Valid types: ${validTypes.join(', ')}` },
        { status: 400 }
      )
    }

    // Validate title and description length
    if (title.length < 3 || title.length > 200) {
      return NextResponse.json(
        { error: 'Title must be between 3 and 200 characters' },
        { status: 400 }
      )
    }

    if (description.length < 10 || description.length > 2000) {
      return NextResponse.json(
        { error: 'Description must be between 10 and 2000 characters' },
        { status: 400 }
      )
    }

    // Get existing requests for this user
    const userRequests = legalRequestsDB.get(session.user.id) || []

    // Check for duplicate requests
    const existingRequest = userRequests.find(req => 
      req.type === type && 
      req.status === 'pending' &&
      req.title.toLowerCase() === title.toLowerCase()
    )

    if (existingRequest) {
      return NextResponse.json(
        { error: 'A similar request is already being processed' },
        { status: 409 }
      )
    }

    // Create new legal request
    const newRequest: LegalRequest = {
      id: `request_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: type as any,
      status: 'pending',
      title,
      description,
      createdAt: new Date(),
      updatedAt: new Date(),
      responseDeadline: calculateResponseDeadline(type),
      estimatedCompletion: calculateEstimatedCompletion(type),
      canUserContact: true
    }

    // Save to database
    userRequests.push(newRequest)
    legalRequestsDB.set(session.user.id, userRequests)

    // Log request creation for transparency
    await logLegalRequestAccess(session.user.id, 'request_creation', 'legal_request', {
      requestId: newRequest.id,
      type,
      title
    })

    // Trigger notification to privacy team
    await notifyPrivacyTeam(newRequest, session.user.id)

    return NextResponse.json({
      success: true,
      data: {
        request: newRequest,
        message: 'Legal request submitted successfully'
      }
    })
  } catch (error) {
    console.error('Error creating legal request:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT handler - update legal request (for appeals, etc.)
export async function PUT(request: NextRequest) {
  try {
    // Get user session
    const session = await getServerSession()
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { requestId, status, description } = body

    // Validate required fields
    if (!requestId) {
      return NextResponse.json(
        { error: 'Missing required field: requestId' },
        { status: 400 }
      )
    }

    // Get user's legal requests
    const userRequests = legalRequestsDB.get(session.user.id) || []
    
    // Find the request to update
    const requestIndex = userRequests.findIndex(req => req.id === requestId)
    
    if (requestIndex === -1) {
      return NextResponse.json(
        { error: 'Legal request not found' },
        { status: 404 }
      )
    }

    const existingRequest = userRequests[requestIndex]

    // Validate status transition
    if (!isValidStatusTransition(existingRequest.status, status)) {
      return NextResponse.json(
        { error: `Invalid status transition from ${existingRequest.status} to ${status}` },
        { status: 400 }
      )
    }

    // Update the request
    const updatedRequest: LegalRequest = {
      ...existingRequest,
      status: status as any,
      updatedAt: new Date(),
      // Update response deadline if status changes to processing
      responseDeadline: status === 'processing' ? calculateResponseDeadline(existingRequest.type) : existingRequest.responseDeadline
    }

    // Add description if provided (for appeals)
    if (description) {
      updatedRequest.description = description
    }

    // Save to database
    userRequests[requestIndex] = updatedRequest
    legalRequestsDB.set(session.user.id, userRequests)

    // Log update for transparency
    await logLegalRequestAccess(session.user.id, 'request_update', 'legal_request', {
      requestId,
      previousStatus: existingRequest.status,
      newStatus: status,
      description
    })

    return NextResponse.json({
      success: true,
      data: {
        request: updatedRequest,
        message: 'Legal request updated successfully'
      }
    })
  } catch (error) {
    console.error('Error updating legal request:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Calculate response deadline based on request type
function calculateResponseDeadline(type: string): Date {
  const deadline = new Date()
  
  // GDPR requires response within 30 days, but we set earlier deadlines for better service
  switch (type) {
    case 'data_access':
      deadline.setDate(deadline.getDate() + 15) // 15 days for data access
      break
    case 'deletion':
      deadline.setDate(deadline.getDate() + 10) // 10 days for deletion
      break
    case 'correction':
      deadline.setDate(deadline.getDate() + 10) // 10 days for correction
      break
    case 'portability':
      deadline.setDate(deadline.getDate() + 20) // 20 days for portability
      break
    case 'objection':
      deadline.setDate(deadline.getDate() + 14) // 14 days for objection
      break
    default:
      deadline.setDate(deadline.getDate() + 30) // 30 days default
  }
  
  return deadline
}

// Calculate estimated completion time
function calculateEstimatedCompletion(type: string): Date {
  const estimated = new Date()
  
  switch (type) {
    case 'data_access':
      estimated.setDate(estimated.getDate() + 12)
      break
    case 'deletion':
      estimated.setDate(estimated.getDate() + 7)
      break
    case 'correction':
      estimated.setDate(estimated.getDate() + 7)
      break
    case 'portability':
      estimated.setDate(estimated.getDate() + 15)
      break
    case 'objection':
      estimated.setDate(estimated.getDate() + 10)
      break
    default:
      estimated.setDate(estimated.getDate() + 25)
  }
  
  return estimated
}

// Validate if status transition is allowed
function isValidStatusTransition(currentStatus: string, newStatus: string): boolean {
  const validTransitions: Record<string, string[]> = {
    'pending': ['processing', 'completed', 'rejected'],
    'processing': ['completed', 'rejected', 'appealed'],
    'completed': ['appealed'],
    'rejected': ['appealed'],
    'appealed': ['processing', 'completed', 'rejected']
  }
  
  return validTransitions[currentStatus]?.includes(newStatus) || false
}

// Log legal request access for transparency
async function logLegalRequestAccess(
  userId: string, 
  action: string, 
  dataType: string, 
  metadata?: any
): Promise<void> {
  // In a real implementation, this would log to a secure audit database
  const logEntry = {
    id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date(),
    userId,
    action,
    dataType,
    dataTypes: [dataType],
    privacyImpact: 'high',
    legalBasis: 'user_rights',
    retentionPeriod: 2555, // 7 years for legal requests
    automatedDecision: false,
    dataSubjects: 1,
    ipAddress: 'server', // In real implementation, this would be actual IP
    userAgent: 'api_server',
    metadata
  }

  console.log('Legal request access logged:', logEntry)
  
  // In a real implementation, save to audit database
  // await saveToAuditDatabase(logEntry)
}

// Notify privacy team of new request
async function notifyPrivacyTeam(request: LegalRequest, userId: string): Promise<void> {
  // In a real implementation, this would send notifications to the privacy team
  console.log('Privacy team notified of new request:', {
    requestId: request.id,
    userId,
    type: request.type,
    title: request.title,
    deadline: request.responseDeadline
  })
  
  // In a real implementation:
  // await sendEmailToPrivacyTeam(request)
  // await createTaskInPrivacySystem(request)
}