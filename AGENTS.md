# AGENTS.md - Coding Agent Guidelines for OpenRelief

## Build/Lint/Test Commands

### Development

```bash
npm run dev          # Start Next.js dev server
npm run build        # Production build
npm run start        # Start production server
npm run lint         # Run ESLint
npm run lint:fix     # Fix linting issues
npm run type-check   # TypeScript type check (tsc --noEmit)
```

### Testing

```bash
npm run test                          # Run all Jest tests
npm run test:watch                    # Watch mode
npm run test:coverage                 # Coverage report

# Single test file
npx jest path/to/file.test.ts

# Single test with pattern
npx jest --testNamePattern="should add event"

# Specific test categories
npm run test:emergency                # Emergency-related tests
npm run test:trust                    # Trust system tests
npm run test:consensus                # Consensus engine tests
npm run test:integration              # Integration tests
npm run test:spatial                  # Spatial query tests

# E2E Tests
npm run test:e2e                      # Cypress tests
npm run test:e2e:playwright           # Playwright tests
npm run test:e2e:playwright:open      # Playwright UI mode
```

### Database (Supabase)

```bash
npm run db:generate   # Generate TypeScript types from schema
npm run db:migrate    # Push migrations
npm run db:reset      # Reset local database
supabase start        # Start local Supabase
supabase stop         # Stop local Supabase
```

### Formatting

```bash
npm run format        # Format with Prettier
npm run format:check  # Check formatting
```

## Code Style Guidelines

### Imports

- Use path aliases: `@/components/*`, `@/lib/*`, `@/hooks/*`, `@/store/*`,
  `@/types`, `@/utils/*`
- Group imports: React/Next first, external libraries second, internal aliases
  third

```typescript
import { useState, useEffect } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Database } from '@/types/database'
```

### Formatting (Prettier + ESLint)

- No semicolons
- Single quotes for strings
- 2-space indentation
- No trailing commas
- Max line length: 100 chars (Prettier), 120 chars (ESLint warning)
- Curly braces required for all control structures
- Arrow functions: avoid parens for single param `x => x`

### TypeScript

- Strict mode enabled with all strict checks
- `noUncheckedIndexedAccess: true` - always check for undefined on array access
- Use Database types from `@/types/database` for Supabase tables
- Prefer explicit types for function parameters
- Avoid `any` - use `unknown` when type is truly unknown
- Unused vars prefixed with underscore: `_unused`

### Naming Conventions

- Components: PascalCase (`TrustBadge.tsx`, `EmergencyMap.tsx`)
- Hooks: camelCase with `use` prefix (`useEmergencyEvents.ts`)
- Stores: camelCase with `Store` suffix (`emergencyStore.ts`)
- Utilities: camelCase (`utils.ts`, `map-utils.ts`)
- Types/Interfaces: PascalCase (`EmergencyEvent`, `EmergencyFilter`)
- Files: kebab-case for utilities, PascalCase for components

### React Components

- Use function components with arrow functions
- Forward refs pattern for UI components:

```typescript
const MyComponent = React.forwardRef<HTMLDivElement, Props>(
  ({ prop1, prop2 }, ref) => {
    return <div ref={ref}>...</div>
  }
)
MyComponent.displayName = 'MyComponent'
```

- Use class-variance-authority (CVA) for component variants
- Extract complex logic to custom hooks

### State Management (Zustand)

- Use `create` from zustand with middleware pattern:

```typescript
export const useStore = create<StoreType>()(
  subscribeWithSelector(
    persist(
      (set, get) => ({ ...state, ...actions }),
      { name: 'store-name', partialize: (state) => ({...}) }
    )
  )
)
```

- Define State and Actions interfaces separately
- Export selectors for common use cases:
  `export const useEvents = () => useStore(state => state.events)`

### Data Fetching (TanStack Query)

- Use query hooks for reads, mutation hooks for writes
- Query keys as arrays: `['emergency-events', filters]`
- Invalidate related queries on mutations:
  `queryClient.invalidateQueries({ queryKey: ['emergency-events'] })`

### Error Handling

- Use structured error classification from `@/lib/errorHandling`
- Handle errors with `classifyError()` for consistent error types
- Use circuit breaker pattern for external services
- Always provide user-friendly error messages
- Log errors with context, never expose secrets

### Testing

- Place tests in `__tests__` directories or `.test.ts` suffix
- Use describe/it blocks for organization
- Reset store state in beforeEach:

```typescript
beforeEach(() => {
  const { reset } = useStore.getState()
  reset()
})
```

- Use `act()` for state updates in tests
- Import fixtures from `@/test-utils/fixtures/`

### Security

- Never log or commit secrets, API keys, or credentials
- Validate all user input with Zod schemas
- Use Supabase RLS policies for data access control
- Sanitize HTML with `isomorphic-dompurify`

### File Organization

- One component per file
- Export from index files: `export * from './component'`
- Keep files under 500 lines - split larger files
- Co-locate tests with source files

## Pre-commit Hooks

- Husky + lint-staged runs on commit
- Auto-fixes ESLint issues and formats with Prettier
- Blocks commits with TypeScript errors
