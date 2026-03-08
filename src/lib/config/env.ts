/**
 * Environment Variable Validation
 *
 * Validates required environment variables at startup
 * to fail fast if configuration is missing.
 */

type EnvVarConfig = {
  name: string
  required: boolean
  defaultValue?: string
  validate?: (value: string) => boolean
  sensitive?: boolean
}

const ENV_CONFIG: EnvVarConfig[] = [
  // Required - Supabase
  {
    name: 'NEXT_PUBLIC_SUPABASE_URL',
    required: true,
    validate: v => v.startsWith('https://') || v.startsWith('http://')
  },
  {
    name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    required: true,
    sensitive: true
  },
  {
    name: 'SUPABASE_SERVICE_ROLE_KEY',
    required: true,
    sensitive: true
  },

  // Optional - Redis/Upstash
  {
    name: 'REDIS_URL',
    required: false
  },
  {
    name: 'UPSTASH_REDIS_REST_URL',
    required: false
  },
  {
    name: 'UPSTASH_REDIS_REST_TOKEN',
    required: false,
    sensitive: true
  },

  // Optional - Security
  {
    name: 'AUTH_PEPPER',
    required: false,
    sensitive: true
  },
  {
    name: 'JWT_SECRET',
    required: false,
    sensitive: true
  },

  // Optional - Monitoring
  {
    name: 'NEXT_PUBLIC_SENTRY_DSN',
    required: false
  },
  {
    name: 'SENTRY_AUTH_TOKEN',
    required: false,
    sensitive: true
  },

  // Optional - App Config
  {
    name: 'NEXT_PUBLIC_APP_URL',
    required: false,
    defaultValue: 'http://localhost:3000'
  },
  {
    name: 'NODE_ENV',
    required: false,
    defaultValue: 'development',
    validate: v => ['development', 'test', 'production'].includes(v)
  }
]

export interface EnvValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
  env: Record<string, string | undefined>
}

/**
 * Validate environment variables
 */
export function validateEnv(): EnvValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  const env: Record<string, string | undefined> = {}

  for (const config of ENV_CONFIG) {
    const value = process.env[config.name]

    if (!value) {
      if (config.required) {
        errors.push(`Missing required environment variable: ${config.name}`)
      } else if (config.defaultValue) {
        env[config.name] = config.defaultValue
      }
      continue
    }

    if (config.validate && !config.validate(value)) {
      errors.push(`Invalid value for environment variable: ${config.name}`)
      continue
    }

    env[config.name] = value
  }

  // Additional validation for production
  if (process.env.NODE_ENV === 'production') {
    if (!process.env.AUTH_PEPPER) {
      warnings.push('AUTH_PEPPER is not set in production - using default (not recommended)')
    }
    if (!process.env.JWT_SECRET) {
      warnings.push('JWT_SECRET is not set in production - sessions may not work correctly')
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    env
  }
}

/**
 * Get validated environment variable
 */
export function getEnvVar(name: string, defaultValue?: string): string | undefined {
  return process.env[name] ?? defaultValue
}

/**
 * Require an environment variable (throws if missing)
 */
export function requireEnvVar(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

// Validate on import in non-test environments
let validationPerformed = false
let validationResult: EnvValidationResult | null = null

export function getValidationResult(): EnvValidationResult | null {
  return validationResult
}

export function ensureEnvValid(): void {
  if (validationPerformed) {
    return
  }

  validationPerformed = true
  validationResult = validateEnv()

  if (!validationResult.valid) {
    console.error('Environment validation failed:')
    for (const error of validationResult.errors) {
      console.error(`  - ${error}`)
    }

    // In development/test, warn but don't exit
    if (process.env.NODE_ENV === 'production') {
      console.error('Exiting due to invalid configuration')
      process.exit(1)
    }
  }

  if (validationResult.warnings.length > 0) {
    console.warn('Environment warnings:')
    for (const warning of validationResult.warnings) {
      console.warn(`  - ${warning}`)
    }
  }
}

// Auto-validate in server environment
if (typeof window === 'undefined' && process.env.NODE_ENV !== 'test') {
  // Defer validation to allow for mocks in tests
  if (process.env.NEXT_RUNTIME === 'nodejs' || !process.env.NEXT_RUNTIME) {
    ensureEnvValid()
  }
}

export default {
  validateEnv,
  getEnvVar,
  requireEnvVar,
  ensureEnvValid,
  getValidationResult
}
