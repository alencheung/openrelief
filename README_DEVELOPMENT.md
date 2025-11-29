# OpenRelief Development Guide

## Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Supabase CLI (for local development)
- Git

### Local Development Setup

1. **Clone and Install**
   ```bash
   git clone https://github.com/openrelief/openrelief.git
   cd openrelief
   npm install
   ```

2. **Environment Configuration**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your configuration
   ```

3. **Start Supabase (Local)**
   ```bash
   # Start local Supabase stack
   supabase start
   
   # Apply database migrations
   supabase db push
   
   # Seed with sample data
   supabase db seed
   ```

4. **Start Development Server**
   ```bash
   npm run dev
   ```
   Visit http://localhost:3000

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues
- `npm run type-check` - TypeScript type checking
- `npm run test` - Run unit tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage
- `npm run test:e2e` - Run E2E tests
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting
- `npm run analyze` - Analyze bundle size

### Database Management

```bash
# Generate TypeScript types from database
npm run db:generate

# Push schema changes
npm run db:migrate

# Reset local database
npm run db:reset

# Seed database
npm run db:seed
```

### Testing

```bash
# Run all tests
npm run test

# Run with coverage
npm run test:coverage

# Run E2E tests
npm run test:e2e

# Run specific test file
npm test -- EmergencyMap.test.tsx
```

### Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Home page
│   └── globals.css        # Global styles
├── components/              # Reusable components
│   ├── ui/               # Basic UI components
│   ├── sections/          # Page sections
│   ├── map/              # Map components
│   └── auth/             # Auth components
├── hooks/                  # Custom React hooks
├── lib/                    # Utility functions
├── store/                  # Zustand stores
├── types/                  # TypeScript definitions
└── utils/                  # Helper functions
```

### Development Workflow

1. **Feature Development**
   - Create feature branch from `develop`
   - Implement changes with tests
   - Ensure all tests pass
   - Submit PR with detailed description

2. **Code Quality**
   - Follow ESLint and Prettier rules
   - Maintain test coverage > 80%
   - Use TypeScript strictly

3. **Database Changes**
   - Update schema in `supabase/migrations/`
   - Generate new types with `npm run db:generate`
   - Test migrations locally

### Environment Variables

Key variables for development:
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-local-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-local-service-key

# Maps
NEXT_PUBLIC_MAPTILER_API_KEY=your-maptiler-key

# Features
NEXT_PUBLIC_ENABLE_ANALYTICS=false
NEXT_PUBLIC_ENABLE_OFFLINE_SYNC=true
NEXT_PUBLIC_ENABLE_PUSH_NOTIFICATIONS=true
```

### Debugging

- React DevTools for component inspection
- Redux DevTools for state management
- Supabase Dashboard for database inspection
- Network tab for API calls

### Performance Monitoring

```bash
# Analyze bundle size
npm run analyze

# Run performance tests
npm run test:performance
```

### Common Issues

1. **Supabase Connection Issues**
   ```bash
   # Restart Supabase
   supabase stop
   supabase start
   ```

2. **TypeScript Errors**
   ```bash
   # Regenerate types
   npm run db:generate
   ```

3. **Build Issues**
   ```bash
   # Clear Next.js cache
   rm -rf .next
   npm run build
   ```

### Contributing Guidelines

1. Follow the existing code style
2. Write tests for new features
3. Update documentation
4. Keep PRs focused and atomic
5. Ensure CI/CD passes

### Getting Help

- Check existing issues on GitHub
- Join our Discord community
- Review technical documentation in `docs/`
- Contact maintainers for critical issues