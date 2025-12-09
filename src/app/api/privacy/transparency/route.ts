/**
 * Transparency Report API Endpoint
 *
 * This endpoint handles requests for transparency reports,
 * allowing users to access detailed information about data processing
 * and system-wide transparency metrics.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { generateTransparencyReport } from '@/lib/privacy/transparency'
import {
  PrivacyAuditLog,
  LegalRequest,
  DataProcessingPurpose,
  GranularDataPermissions,
  PrivacyZone
} from '@/hooks/usePrivacy'

// Mock databases for demonstration
// In a real implementation, these would be replaced with actual database calls
const auditLogsDB = new Map<string, PrivacyAuditLog[]>()
const legalRequestsDB = new Map<string, LegalRequest[]>()
const dataProcessingPurposesDB = new Map<string, DataProcessingPurpose[]>()
const granularPermissionsDB = new Map<string, GranularDataPermissions[]>()
const privacyZonesDB = new Map<string, PrivacyZone[]>()

// GET handler - generate transparency report
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
    const format = searchParams.get('format') || 'json'
    const period = searchParams.get('period') || '30' // Default to 30 days
    const anonymize = searchParams.get('anonymize') !== 'false' // Default to true
    const includePersonal = searchParams.get('includePersonal') === 'true' // Default to false

    // Validate format
    if (!['json', 'csv', 'pdf'].includes(format)) {
      return NextResponse.json(
        { error: 'Invalid format. Supported formats: json, csv, pdf' },
        { status: 400 }
      )
    }

    // Validate period
    const periodDays = parseInt(period)
    if (isNaN(periodDays) || periodDays < 1 || periodDays > 365) {
      return NextResponse.json(
        { error: 'Invalid period. Must be between 1 and 365 days' },
        { status: 400 }
      )
    }

    // Get user's data from databases
    const auditLogs = auditLogsDB.get(session.user.id) || []
    const legalRequests = legalRequestsDB.get(session.user.id) || []
    const dataProcessingPurposes = dataProcessingPurposesDB.get(session.user.id) || []
    const granularPermissions = granularPermissionsDB.get(session.user.id) || []
    const privacyZones = privacyZonesDB.get(session.user.id) || []

    // Calculate report period
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(endDate.getDate() - periodDays)

    // Generate transparency report
    const report = generateTransparencyReport(
      auditLogs,
      legalRequests,
      dataProcessingPurposes,
      granularPermissions,
      privacyZones,
      {
        reportPeriod: {
          start: startDate,
          end: endDate
        },
        includePersonalData: includePersonal,
        anonymizeSensitiveInfo: anonymize,
        format: format as 'json' | 'csv' | 'pdf',
        language: 'en'
      }
    )

    // Log report generation for transparency
    await logTransparencyAccess(
      session.user.id,
      'report_generation',
      periodDays,
      format,
      anonymize
    )

    // Return appropriate response based on format
    if (format === 'json') {
      return NextResponse.json({
        success: true,
        data: report,
        generatedAt: new Date().toISOString()
      })
    } else if (format === 'csv') {
      // Convert to CSV and return as text
      const csvReport = convertToCSV(report)

      return new NextResponse(csvReport, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="transparency-report-${new Date().toISOString().split('T')[0]}.csv"`
        }
      })
    } else if (format === 'pdf') {
      // In a real implementation, you would generate a PDF
      // For now, return a placeholder
      return NextResponse.json(
        { error: 'PDF export not yet implemented' },
        { status: 501 }
      )
    }
  } catch (error) {
    console.error('Error generating transparency report:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST handler - create custom transparency report
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
    const {
      startDate,
      endDate,
      dataTypes,
      includePersonalData,
      anonymizeSensitiveInfo,
      format
    } = body

    // Validate required fields
    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'Start date and end date are required' },
        { status: 400 }
      )
    }

    // Validate dates
    const start = new Date(startDate)
    const end = new Date(endDate)

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format' },
        { status: 400 }
      )
    }

    if (start >= end) {
      return NextResponse.json(
        { error: 'Start date must be before end date' },
        { status: 400 }
      )
    }

    // Validate format
    if (format && !['json', 'csv', 'pdf'].includes(format)) {
      return NextResponse.json(
        { error: 'Invalid format. Supported formats: json, csv, pdf' },
        { status: 400 }
      )
    }

    // Get user's data from databases
    const auditLogs = auditLogsDB.get(session.user.id) || []
    const legalRequests = legalRequestsDB.get(session.user.id) || []
    const dataProcessingPurposes = dataProcessingPurposesDB.get(session.user.id) || []
    const granularPermissions = granularPermissionsDB.get(session.user.id) || []
    const privacyZones = privacyZonesDB.get(session.user.id) || []

    // Filter audit logs by date range and data types
    const filteredLogs = auditLogs.filter(log => {
      const logDate = new Date(log.timestamp)
      const inDateRange = logDate >= start && logDate <= end
      const inDataTypes = !dataTypes || dataTypes.length === 0
                          || dataTypes.includes(log.dataType)
      return inDateRange && inDataTypes
    })

    // Generate custom transparency report
    const report = generateTransparencyReport(
      filteredLogs,
      legalRequests,
      dataProcessingPurposes,
      granularPermissions,
      privacyZones,
      {
        reportPeriod: {
          start,
          end
        },
        includePersonalData: includePersonalData || false,
        anonymizeSensitiveInfo: anonymizeSensitiveInfo !== false,
        format: format as 'json' | 'csv' | 'pdf' || 'json',
        language: 'en'
      }
    )

    // Log custom report generation for transparency
    await logTransparencyAccess(
      session.user.id,
      'custom_report_generation',
      Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)),
      format || 'json',
      anonymizeSensitiveInfo !== false
    )

    return NextResponse.json({
      success: true,
      data: report,
      generatedAt: new Date().toISOString(),
      message: 'Custom transparency report generated successfully'
    })
  } catch (error) {
    console.error('Error generating custom transparency report:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Convert transparency report to CSV format
function convertToCSV(report: any): string {
  // Create CSV headers
  const headers = [
    'Date',
    'Action',
    'Data Type',
    'Purpose',
    'Legal Basis',
    'Automated Decision',
    'Privacy Impact'
  ]

  // Create CSV rows from data processing activities
  const rows = report.dataProcessingActivities.map((activity: any) => [
    activity.timestamp,
    activity.action,
    activity.dataType,
    activity.purpose,
    activity.legalBasis,
    activity.automatedDecision ? 'Yes' : 'No',
    activity.privacyImpact || 'N/A'
  ])

  // Combine headers and rows
  const csvContent = [headers, ...rows]
    .map(row => row.map(cell => `"${cell}"`).join(','))
    .join('\n')

  // Add summary section
  const summary = [
    '',
    'TRANSPARENCY REPORT SUMMARY',
    '',
    `Report Period: ${report.reportPeriod.start} to ${report.reportPeriod.end}`,
    `Total Data Processing Operations: ${report.summary.totalDataProcessingOperations}`,
    `Unique Data Subjects: ${report.summary.uniqueDataSubjects}`,
    `Third-Party Sharing Events: ${report.summary.thirdPartySharingEvents}`,
    `Legal Requests Received: ${report.summary.legalRequests.received}`,
    `Legal Requests Processed: ${report.summary.legalRequests.processed}`,
    '',
    'GDPR COMPLIANCE',
    '',
    `Overall Score: ${report.compliance.gdprCompliance.score}%`,
    `Legal Basis: ${report.compliance.gdprCompliance.hasLegalBasis ? 'Compliant' : 'Non-compliant'}`,
    `Purpose Limitation: ${report.compliance.gdprCompliance.hasPurposeLimitation ? 'Compliant' : 'Non-compliant'}`,
    `Data Minimization: ${report.compliance.gdprCompliance.hasDataMinimization ? 'Compliant' : 'Non-compliant'}`,
    `Security Measures: ${report.compliance.gdprCompliance.hasSecurityMeasures ? 'Compliant' : 'Non-compliant'}`,
    `User Rights: ${report.compliance.gdprCompliance.hasUserRights ? 'Compliant' : 'Non-compliant'}`
  ].join('\n')

  return csvContent + '\n' + summary
}

// Log transparency access for audit purposes
async function logTransparencyAccess(
  userId: string,
  action: string,
  periodDays: number,
  format: string,
  anonymized: boolean
): Promise<void> {
  // In a real implementation, this would log to a secure audit database
  const logEntry = {
    id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date(),
    userId,
    action,
    dataType: 'transparency_report',
    dataTypes: ['transparency_report'],
    privacyImpact: 'medium',
    legalBasis: 'user_request',
    retentionPeriod: 365,
    automatedDecision: false,
    dataSubjects: 1,
    ipAddress: 'server', // In real implementation, this would be actual IP
    userAgent: 'api_server',
    metadata: {
      periodDays,
      format,
      anonymized
    }
  }

  console.log('Transparency access logged:', logEntry)

  // In a real implementation, save to audit database
  // await saveToAuditDatabase(logEntry)
}