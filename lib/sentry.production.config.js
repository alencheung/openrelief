// Production Sentry Configuration
// This file contains production-specific Sentry configuration for OpenRelief

import * as Sentry from '@sentry/nextjs';
import { ProfilingIntegration } from '@sentry/profiling-node';

// Production DSN - should be set via environment variables
const SENTRY_DSN = process.env.SENTRY_DSN;
const PUBLIC_SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

// Initialize Sentry for production
if (process.env.NODE_ENV === 'production' && SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: 'production',
    
    // Release and version information
    release: `openrelief@${process.env.npm_package_version || '2.0.0'}`,
    dist: process.env.VERCEL_GIT_COMMIT_SHA || process.env.COMMIT_SHA || 'unknown',
    
    // Sample rates for production
    tracesSampleRate: 0.1, // 10% of transactions for performance monitoring
    profilesSampleRate: 0.1, // 10% of transactions for profiling
    
    // Error reporting
    beforeSend(event) {
      // Filter out sensitive information
      if (event.exception) {
        event.exception.values?.forEach(exception => {
          // Remove sensitive data from stack traces
          if (exception.stacktrace) {
            exception.stacktrace.frames?.forEach(frame => {
              // Remove potential secrets from function names
              if (frame.function) {
                frame.function = frame.function.replace(/password|secret|token|key/gi, '***');
              }
              // Remove sensitive data from filenames
              if (frame.filename) {
                frame.filename = frame.filename.replace(/password|secret|token|key/gi, '***');
              }
            });
          }
        });
      }
      
      // Add custom tags for better filtering
      event.tags = {
        ...event.tags,
        environment: 'production',
        service: 'openrelief-web',
        version: process.env.npm_package_version || '2.0.0',
        deployment: process.env.VERCEL_ENV || 'production'
      };
      
      // Add user context if available
      if (event.user && !event.user.id) {
        event.user.ip_address = '{{auto}}'; // Anonymize IP
      }
      
      return event;
    },
    
    // Integrations
    integrations: [
      new ProfilingIntegration({
        // Profile slow transactions
        profilesSampleRate: 0.1,
      }),
      new Sentry.Integrations.Http({ tracing: true }),
      new Sentry.Integrations.Express({ app: require('next') }),
      new Sentry.Integrations.Dedupe(),
      new Sentry.Integrations.ExtraErrorData(),
      new Sentry.Integrations.CaptureConsole({
        levels: ['error', 'warn']
      }),
      new Sentry.Integrations.LinkedErrors(),
      new Sentry.Integrations.RequestData(),
      new Sentry.Integrations.FunctionToString(),
      new Sentry.Integrations.InboundFilters(),
      new Sentry.Integrations.LocalVariables(),
      new Sentry.Integrations.Modules(),
      new Sentry.Integrations.Transaction(),
      new Sentry.Integrations.Redis({
        redis: require('redis'),
        cachePrefixes: ['cache:', 'session:'],
      }),
    ],
    
    // Performance monitoring
    enableTracing: true,
    
    // Custom tags and context
    initialScope: {
      tags: {
        environment: 'production',
        service: 'openrelief-web',
        version: process.env.npm_package_version || '2.0.0',
      },
      user: {
        id: 'anonymous',
      },
      extra: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
      },
    },
    
    // Ignore specific errors
    ignoreErrors: [
      // Network errors that are expected
      'Network request failed',
      'Failed to fetch',
      'AbortError: The operation was aborted',
      
      // Browser extensions
      'Non-Error promise rejection captured',
      'ResizeObserver loop limit exceeded',
      
      // Third-party script errors
      'Script error',
      'Non-Error exception captured',
      
      // Expected application errors
      'Emergency validation failed',
      'User authentication required',
    ],
    
    // Ignore specific URLs
    denyUrls: [
      // Chrome extensions
      /extensions\//i,
      /^chrome:\/\//i,
      /^chrome-extension:\/\//i,
      
      // Third-party scripts
      /googletagmanager\.com/i,
      /google-analytics\.com/i,
      /facebook\.com/i,
      /twitter\.com/i,
      
      // Development tools
      /localhost/i,
      /127\.0\.0\.1/i,
    ],
    
    // Debug mode (disabled in production)
    debug: false,
    
    // Server configuration
    serverName: 'openrelief-web-prod',
    
    // Maximum breadcrumbs
    maxBreadcrumbs: 100,
    
    // Attach stack traces
    attachStacktrace: true,
    
    // Environment-specific settings
    environment: 'production',
    
    // Before send transaction
    beforeTransaction(transaction) {
      // Add custom data to transactions
      transaction.tags = {
        ...transaction.tags,
        route: transaction.name || 'unknown',
        method: transaction.data?.method || 'GET',
      };
      
      return transaction;
    },
  });
}

// Client-side Sentry configuration
if (typeof window !== 'undefined' && PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: PUBLIC_SENTRY_DSN,
    environment: 'production',
    
    // Release information
    release: `openrelief@${process.env.npm_package_version || '2.0.0'}`,
    dist: process.env.VERCEL_GIT_COMMIT_SHA || process.env.COMMIT_SHA || 'unknown',
    
    // Sample rates
    tracesSampleRate: 0.1, // 10% for client-side performance monitoring
    
    // Error filtering
    beforeSend(event) {
      // Filter out PII
      if (event.exception) {
        event.exception.values?.forEach(exception => {
          if (exception.stacktrace) {
            exception.stacktrace.frames?.forEach(frame => {
              // Remove potential PII from URLs
              if (frame.filename && frame.filename.includes('?')) {
                frame.filename = frame.filename.split('?')[0];
              }
            });
          }
        });
      }
      
      // Add client context
      event.tags = {
        ...event.tags,
        environment: 'production',
        service: 'openrelief-web-client',
        userAgent: navigator.userAgent,
        viewport: `${window.innerWidth}x${window.innerHeight}`,
      };
      
      return event;
    },
    
    // Client-side integrations
    integrations: [
      new Sentry.Integrations.BrowserTracing({
        // Custom tracing configuration
        tracingOrigins: [
          'https://openrelief.org',
          'https://www.openrelief.org',
          'https://app.openrelief.org',
          /^https:\/\/api\.openrelief\.org/,
        ],
      }),
      new Sentry.Integrations.GlobalHandlers({
        onerror: true,
        onunhandledrejection: true,
      }),
      new Sentry.Integrations.TryCatch(),
      new Sentry.Integrations.Breadcrumbs({
        console: true,
        dom: true,
        fetch: true,
        history: true,
        sentry: true,
        xhr: true,
      }),
    ],
    
    // Performance monitoring
    enableTracing: true,
    
    // User feedback
    userFeedback: {
      showButton: true,
      eventId: undefined,
      useSentryUser: true,
    },
    
    // Session replay (sampled)
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    
    // Debug mode (disabled in production)
    debug: false,
    
    // Initial scope
    initialScope: {
      tags: {
        environment: 'production',
        service: 'openrelief-web-client',
      },
    },
  });
}

// Custom error reporting functions
export const reportEmergencyError = (error, context = {}) => {
  if (process.env.NODE_ENV === 'production') {
    Sentry.withScope((scope) => {
      scope.setTag('error_type', 'emergency_system');
      scope.setContext('emergency_context', context);
      scope.setLevel('error');
      Sentry.captureException(error);
    });
  }
};

export const reportPerformanceIssue = (transactionName, metrics) => {
  if (process.env.NODE_ENV === 'production') {
    Sentry.withScope((scope) => {
      scope.setTag('performance_type', 'slow_transaction');
      scope.setContext('performance_metrics', metrics);
      scope.setLevel('warning');
      Sentry.captureMessage(`Slow transaction: ${transactionName}`);
    });
  }
};

export const reportSecurityIssue = (issue, context = {}) => {
  if (process.env.NODE_ENV === 'production') {
    Sentry.withScope((scope) => {
      scope.setTag('security_type', 'potential_threat');
      scope.setContext('security_context', context);
      scope.setLevel('error');
      Sentry.captureMessage(`Security issue detected: ${issue}`);
    });
  }
};

export const setUserContext = (user) => {
  if (process.env.NODE_ENV === 'production' && user) {
    Sentry.setUser({
      id: user.id,
      email: user.email ? user.email.replace(/(.{2}).*(@.*)/, '$1***$2') : undefined, // Partially mask email
      username: user.username,
      trust_score: user.trust_score,
    });
  }
};

export const clearUserContext = () => {
  if (process.env.NODE_ENV === 'production') {
    Sentry.setUser(null);
  }
};

export const addBreadcrumb = (message, category = 'default', level = 'info', data = {}) => {
  if (process.env.NODE_ENV === 'production') {
    Sentry.addBreadcrumb({
      message,
      category,
      level,
      data,
      timestamp: new Date().getTime() / 1000,
    });
  }
};

// Custom performance monitoring
export const startTransaction = (name, operation = 'custom') => {
  if (process.env.NODE_ENV === 'production') {
    return Sentry.startTransaction({
      name,
      op: operation,
    });
  }
  return null;
};

export const finishTransaction = (transaction, status = 'ok') => {
  if (process.env.NODE_ENV === 'production' && transaction) {
    transaction.setStatus(status);
    transaction.finish();
  }
};

// Health check for Sentry
export const checkSentryHealth = () => {
  if (process.env.NODE_ENV === 'production') {
    try {
      const client = Sentry.getCurrentHub().getClient();
      return client && client.getDsn() === SENTRY_DSN;
    } catch (error) {
      console.error('Sentry health check failed:', error);
      return false;
    }
  }
  return true;
};

// Export Sentry for manual usage
export { Sentry };

export default Sentry;