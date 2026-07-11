/**
 * Transparency Report API Endpoint
 *
 * Returns aggregated, anonymized transparency metrics about data processing
 * on the platform (counts of access/export/deletion/legal requests, audit
 * activity). No PII is exposed — only aggregate counts. Uses the service-role
 * client because the data is system-wide and anonymized.
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { withAPISecurity, API_SECURITY_CONFIGS } from '@/lib/security/api-security'

interface TransparencyReport {
  reportPeriod: { start: string; end: string; days: number }
  generatedAt: string
  dataExports: { total: number; byStatus: Record<string, number> }
  dataDeletions: { total: number; byStatus: Record<string, number> }
  legalRequests: { total: number; byStatus: Record<string, number>; byType: Record<string, number> }
  privacyAuditEvents: { total: number; byAction: Record<string, number> }
  notes: string[]
}

function parsePeriodDays(value: string | null): number | null {
  const days = parseInt(value ?? '30', 10)
  if (Number.isNaN(days) || days < 1 || days > 365) {
    return null
  }
  return days
}

async function countByStatus(
  table: 'data_export_requests' | 'data_deletion_requests' | 'user_legal_requests',
  start: Date,
  end: Date
): Promise<{ total: number; byStatus: Record<string, number> }> {
  const { data, error } = await supabaseAdmin
    .from(table)
    .select('status, created_at')
    .gte('created_at', start.toISOString())
    .lte('created_at', end.toISOString())

  if (error) {
    console.error(`transparency: failed to query ${table}:`, error)
    return { total: 0, byStatus: {} }
  }

  const byStatus: Record<string, number> = {}
  for (const row of data ?? []) {
    const status = (row as { status: string }).status
    byStatus[status] = (byStatus[status] ?? 0) + 1
  }
  return { total: (data ?? []).length, byStatus }
}

async function countLegalByType(start: Date, end: Date): Promise<Record<string, number>> {
  const { data, error } = await supabaseAdmin
    .from('user_legal_requests')
    .select('type, created_at')
    .gte('created_at', start.toISOString())
    .lte('created_at', end.toISOString())

  if (error) {
    console.error('transparency: failed to query user_legal_requests:', error)
    return {}
  }

  const byType: Record<string, number> = {}
  for (const row of data ?? []) {
    const type = (row as { type: string }).type
    byType[type] = (byType[type] ?? 0) + 1
  }
  return byType
}

async function countAuditByAction(
  start: Date,
  end: Date
): Promise<{ total: number; byAction: Record<string, number> }> {
  const { data, error } = await supabaseAdmin
    .from('privacy_audit_log')
    .select('action, created_at')
    .gte('created_at', start.toISOString())
    .lte('created_at', end.toISOString())

  if (error) {
    console.error('transparency: failed to query privacy_audit_log:', error)
    return { total: 0, byAction: {} }
  }

  const byAction: Record<string, number> = {}
  for (const row of data ?? []) {
    const action = (row as { action: string }).action
    byAction[action] = (byAction[action] ?? 0) + 1
  }
  return { total: (data ?? []).length, byAction }
}

async function buildReport(start: Date, end: Date, days: number): Promise<TransparencyReport> {
  const [exports, deletions, legalByStatus, legalByType, audit] = await Promise.all([
    countByStatus('data_export_requests', start, end),
    countByStatus('data_deletion_requests', start, end),
    countByStatus('user_legal_requests', start, end),
    countLegalByType(start, end),
    countAuditByAction(start, end)
  ])

  return {
    reportPeriod: { start: start.toISOString(), end: end.toISOString(), days },
    generatedAt: new Date().toISOString(),
    dataExports: exports,
    dataDeletions: deletions,
    legalRequests: {
      total: legalByStatus.total,
      byStatus: legalByStatus.byStatus,
      byType: legalByType
    },
    privacyAuditEvents: audit,
    notes: [
      'All counts are aggregate and anonymized; no personal data is included.',
      'PDF export is not yet implemented; use format=json or format=csv.'
    ]
  }
}

function reportToCsv(report: TransparencyReport): string {
  const rows: string[] = ['section,key,value']
  rows.push(`reportPeriod,days,${report.reportPeriod.days}`)
  rows.push(`dataExports,total,${report.dataExports.total}`)
  for (const [k, v] of Object.entries(report.dataExports.byStatus)) {
    rows.push(`dataExports,status:${k},${v}`)
  }
  rows.push(`dataDeletions,total,${report.dataDeletions.total}`)
  for (const [k, v] of Object.entries(report.dataDeletions.byStatus)) {
    rows.push(`dataDeletions,status:${k},${v}`)
  }
  rows.push(`legalRequests,total,${report.legalRequests.total}`)
  for (const [k, v] of Object.entries(report.legalRequests.byStatus)) {
    rows.push(`legalRequests,status:${k},${v}`)
  }
  for (const [k, v] of Object.entries(report.legalRequests.byType)) {
    rows.push(`legalRequests,type:${k},${v}`)
  }
  rows.push(`privacyAuditEvents,total,${report.privacyAuditEvents.total}`)
  for (const [k, v] of Object.entries(report.privacyAuditEvents.byAction)) {
    rows.push(`privacyAuditEvents,action:${k},${v}`)
  }
  return rows.join('\n')
}

function respond(
  report: TransparencyReport,
  format: string
): NextResponse | Response {
  if (format === 'pdf') {
    return NextResponse.json(
      { error: 'PDF export not yet implemented; use format=json or format=csv' },
      { status: 501 }
    )
  }
  if (format === 'csv') {
    return new NextResponse(reportToCsv(report), {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="transparency-report-${new Date().toISOString().split('T')[0]}.csv"`
      }
    })
  }
  return NextResponse.json({ success: true, data: report, generatedAt: new Date().toISOString() })
}

// GET handler - transparency report for the last N days (default 30)
export const GET = withAPISecurity(API_SECURITY_CONFIGS.user)(
  async (request: NextRequest, _context) => {
    try {
      const { searchParams } = new URL(request.url)
      const format = searchParams.get('format') ?? 'json'

      if (!['json', 'csv', 'pdf'].includes(format)) {
        return NextResponse.json(
          { error: 'Invalid format. Supported formats: json, csv, pdf' },
          { status: 400 }
        )
      }

      const days = parsePeriodDays(searchParams.get('period'))
      if (days === null) {
        return NextResponse.json(
          { error: 'Invalid period. Must be between 1 and 365 days' },
          { status: 400 }
        )
      }

      const end = new Date()
      const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000)
      const report = await buildReport(start, end, days)

      return respond(report, format) as NextResponse
    } catch (error) {
      console.error('Error generating transparency report:', error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  }
)

// POST handler - custom-date-range transparency report
export const POST = withAPISecurity(API_SECURITY_CONFIGS.user)(
  async (request: NextRequest, _context) => {
    try {
      const body = await request.json()
      const { startDate, endDate, format } = body as {
        startDate?: string
        endDate?: string
        format?: string
      }

      if (!startDate || !endDate) {
        return NextResponse.json(
          { error: 'Start date and end date are required' },
          { status: 400 }
        )
      }

      const start = new Date(startDate)
      const end = new Date(endDate)
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        return NextResponse.json({ error: 'Invalid date format' }, { status: 400 })
      }
      if (start >= end) {
        return NextResponse.json({ error: 'Start date must be before end date' }, { status: 400 })
      }

      const fmt = format ?? 'json'
      if (!['json', 'csv', 'pdf'].includes(fmt)) {
        return NextResponse.json(
          { error: 'Invalid format. Supported formats: json, csv, pdf' },
          { status: 400 }
        )
      }

      const days = Math.max(
        1,
        Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
      )
      const report = await buildReport(start, end, days)

      return respond(report, fmt) as NextResponse
    } catch (error) {
      console.error('Error generating custom transparency report:', error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  }
)
