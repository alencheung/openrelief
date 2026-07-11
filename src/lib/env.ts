/**
 * Environment Variable Validation
 *
 * Provides centralized environment variable validation and access.
 * Validates required variables on startup and provides type-safe access.
 */

interface EnvConfig {
  name: string
  required: boolean
  sensitive?: boolean
  defaultValue?: string
  validate?: (value: string) => boolean
}

const ENV_CONFIG: EnvConfig[] = [
  // Required - Supabase
  {
    name: 'NEXT_PUBLIC_SUPABASE_URL',
    required: true,
    validate: value => value.startsWith('http')
  },
  {
    name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    required: true
  },
  {
    name: 'SUPABASE_SERVICE_ROLE_KEY',
    required: true,
    sensitive: true
  },

  // Optional - Redis
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

  // Optional - Web Push (RFC 8291/8292). Required for server-side push
  // delivery. The public key is also exposed to the browser for subscription.
  {
    name: 'NEXT_PUBLIC_VAPID_PUBLIC_KEY',
    required: false
  },
  {
    name: 'VAPID_PRIVATE_KEY',
    required: false,
    sensitive: true
  },
  {
    name: 'VAPID_SUBJECT',
    required: false,
    defaultValue: 'mailto:noreply@openrelief.org'
  },

  // Optional - Map tiles (MapTiler). Without a key the map falls back to a
  // placeholder that will 403; set this for production.
  {
    name: 'NEXT_PUBLIC_MAPTILER_API_KEY',
    required: false
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
    validate: value => ['development', 'test', 'production'].includes(value)
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

  // Production-specific warnings
  if (process.env.NODE_ENV === 'production') {
    if (!process.env.AUTH_PEPPER) {
      warnings.push('AUTH_PEPPER is not set in production - sessions may not work correctly')
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

// Singleton validation result
let validationResult: EnvValidationResult | null = null

/**
 * Get or perform validation
 */
export function getValidationResult(): EnvValidationResult {
  if (!validationResult) {
    validationResult = validateEnv()
  }
  return validationResult
}

/**
 * Log validation results (call on startup)
 */
export function logValidationResults(): void {
  const result = getValidationResult()

  if (result.errors.length > 0) {
    console.error('Environment validation failed:')
    result.errors.forEach(err => console.error(`  - ${err}`))
  }

  if (result.warnings.length > 0) {
    console.warn('Environment validation warnings:')
    result.warnings.forEach(warn => console.warn(`  - ${warn}`))
  }

  if (result.valid) {
    console.log('Environment validation passed')
  }
}

// Auto-validate in non-test environments
if (process.env.NODE_ENV !== 'test') {
  const result = getValidationResult()
  if (!result.valid) {
    console.error('Environment validation failed on startup')
  }
}
