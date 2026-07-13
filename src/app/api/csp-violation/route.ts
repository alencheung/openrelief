/**
 * CSP violation report endpoint.
 *
 * Browsers POST violation reports here when the `report-uri` (or
 * `report-to`) CSP directive fires. The report body is JSON per the
 * CSP Level 2+ spec (https://www.w3.org/TR/CSP3/#violation-reports).
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

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CSPReportBody
    const report = body['csp-report'] ?? {}

    // Redact the query string from document-uri so PII / tokens in the URL
    // don't land in logs.
    const documentUri = report['document-uri']?.split('?')[0]

    console.warn('[csp]', {
      directive: report['violated-directive'],
      blockedUri: report['blocked-uri'],
      documentUri,
      sourceFile: report['source-file'],
      line: report['line-number'],
      sample: report['script-sample']?.slice(0, 100)
    })
  } catch {
    // Malformed body — still respond 204 so the browser doesn't retry.
  }

  return new NextResponse(null, { status: 204 })
}
