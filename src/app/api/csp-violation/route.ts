/**
 * CSP violation report endpoint.
 *
 * Browsers POST violation reports here when the `report-uri` (or
 * `report-to`) CSP directive fires. Two body shapes are in the wild:
 *
 *   1. CSP Level 2/3 (`report-uri`): Content-Type `application/csp-report`,
 *      body `{ "csp-report": { ... } }`.
 *   2. Reporting API (`report-to`): Content-Type `application/reports+json`,
 *      body is an array of `{ type: 'csp-violation', body: { ... }, ... }`.
 *
 * INTENTIONALLY PUBLIC: the browser sends these reports automatically
 * without credentials, and rejecting them would surface as 4xx errors
 * in users' consoles. We accept any body shape defensively, log a
 * redacted summary for security monitoring, and return 204 No Content
 * (the canonical response for a reporting endpoint).
 */

import { NextRequest, NextResponse } from 'next/server'

interface CSPReportBody {
  'csp-report'?: {
    'document-uri'?: string
    'violated-directive'?: string
    'blocked-uri'?: string
    'source-file'?: string
    'line-number'?: number
    'column-number'?: number
    'script-sample'?: string
  }
}

interface ReportingAPIEntry {
  type?: string
  url?: string
  body?: {
    'document-uri'?: string
    'violated-directive'?: string
    'blocked-uri'?: string
    'source-file'?: string
    'line-number'?: number
    'column-number'?: number
    'script-sample'?: string
  }
}

function redactQuery(uri: string | undefined): string | undefined {
  return uri?.split('?')[0]
}

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || ''
    const raw = await request.text()

    if (!raw) {
      return new NextResponse(null, { status: 204 })
    }

    // Browsers may send `application/csp-report`, `application/reports+json`,
    // or (legacy) `application/json`. Parse defensively; if it isn't valid
    // JSON we still respond 204 so the browser doesn't retry.
    let parsed: unknown
    try {
      parsed = JSON.parse(raw)
    } catch {
      return new NextResponse(null, { status: 204 })
    }

    if (contentType.includes('application/reports+json') && Array.isArray(parsed)) {
      // Reporting-API format: array of report entries.
      for (const entry of parsed as ReportingAPIEntry[]) {
        if (entry?.type !== 'csp-violation') continue
        const report = entry.body ?? {}
        console.warn('[csp]', {
          directive: report['violated-directive'],
          blockedUri: report['blocked-uri'],
          documentUri: redactQuery(report['document-uri']),
          sourceFile: report['source-file'],
          line: report['line-number'],
          sample: report['script-sample']?.slice(0, 100)
        })
      }
    } else {
      // Legacy `report-uri` format: { "csp-report": { ... } }
      const body = parsed as CSPReportBody
      const report = body['csp-report'] ?? {}
      console.warn('[csp]', {
        directive: report['violated-directive'],
        blockedUri: report['blocked-uri'],
        documentUri: redactQuery(report['document-uri']),
        sourceFile: report['source-file'],
        line: report['line-number'],
        sample: report['script-sample']?.slice(0, 100)
      })
    }
  } catch {
    // Malformed body — still respond 204 so the browser doesn't retry.
  }

  return new NextResponse(null, { status: 204 })
}
