/**
 * Health check endpoint.
 *
 * INTENTIONALLY PUBLIC: Load balancers, uptime probes, and orchestrators
 * (Vercel/Kubernetes/etc.) call this without credentials to determine
 * service availability. It returns no sensitive data — only process
 * uptime, environment, and version. Authentication here would break
 * health probes and cause false-negative outages. Do not add auth.
 */

import { NextRequest, NextResponse } from 'next/server'

export async function GET(_request: NextRequest) {
  try {
    // Basic health check response
    const healthData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0'
    }

    return NextResponse.json(healthData, {
      status: 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
        Expires: '0'
      }
    })
  } catch (error) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Health check failed'
      },
      { status: 500 }
    )
  }
}
