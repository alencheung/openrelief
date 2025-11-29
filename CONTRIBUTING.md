# Contributing to OpenRelief

Thank you for your interest in contributing to OpenRelief! This guide will help you get started with contributing to this open-source emergency coordination platform.

## Table of Contents

- [Development Setup](#development-setup)
- [Contribution Guidelines](#contribution-guidelines)
- [Code Standards](#code-standards)
- [Testing Requirements](#testing-requirements)
- [Pull Request Process](#pull-request-process)
- [Issue Reporting](#issue-reporting)
- [Community Guidelines](#community-guidelines)

## Development Setup

### Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js 18+** - [Download here](https://nodejs.org/)
- **Git** - [Download here](https://git-scm.com/)
- **Supabase CLI** - Install with `npm install -g supabase`

### Initial Setup

1. **Fork the Repository**
   ```bash
   # Fork on GitHub, then clone your fork
   git clone https://github.com/your-username/openrelief.git
   cd openrelief
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Set Up Local Database**
   ```bash
   # Start local Supabase instance
   supabase start
   
   # Apply database migrations
   supabase db push
   ```

4. **Environment Configuration**
   ```bash
   # Copy environment template
   cp .env.example .env.local
   
   # Configure your local environment variables
   # See .env.example for required variables
   ```

5. **Start Development Server**
   ```bash
   npm run dev
   ```

### Development Commands

```bash
# Development
npm run dev              # Start development server
npm run build            # Build for production
npm run start            # Start production server

# Testing
npm run test             # Run all tests
npm run test:watch       # Run tests in watch mode
npm run test:coverage    # Generate coverage report
npm run test:e2e         # Run end-to-end tests
npm run test:performance # Run performance tests

# Database
npm run db:reset         # Reset local database
npm run db:migrate       # Run database migrations
npm run db:seed          # Seed database with sample data

# Code Quality
npm run lint             # Run linter
npm run lint:fix         # Fix linting issues
npm run type-check       # Run TypeScript type checking
npm run format           # Format code with Prettier

# Deployment
npm run deploy:staging   # Deploy to staging
npm run deploy:prod      # Deploy to production
```

## Contribution Guidelines

### Types of Contributions

We welcome the following types of contributions:

1. **Code Contributions**
   - Bug fixes
   - New features
   - Performance improvements
   - Refactoring

2. **Documentation**
   - API documentation
   - Tutorials and guides
   - Code comments
   - README improvements

3. **Testing**
   - Unit tests
   - Integration tests
   - End-to-end tests
   - Performance tests

4. **Design**
   - UI/UX improvements
   - Accessibility enhancements
   - Mobile responsiveness

5. **Community**
   - Issue triage
   - User support
   - Community management

### Getting Started

1. **Choose an Issue**
   - Browse [open issues](https://github.com/openrelief/openrelief/issues)
   - Look for `good first issue` label for beginners
   - Comment on the issue you want to work on

2. **Create a Branch**
   ```bash
   # From develop branch
   git checkout develop
   git pull origin develop
   git checkout -b feature/your-feature-name
   
   # For bug fixes
   git checkout -b fix/issue-number-description
   
   # For hotfixes
   git checkout -b hotfix/issue-number-description
   ```

3. **Make Changes**
   - Follow our [code standards](#code-standards)
   - Write tests for your changes
   - Update documentation if needed

4. **Test Your Changes**
   ```bash
   # Run all tests
   npm run test
   
   # Check code quality
   npm run lint
   npm run type-check
   
   # Test manually in browser
   npm run dev
   ```

## Code Standards

### TypeScript/JavaScript

- Use **TypeScript** for all new code
- Follow **ESLint** configuration
- Use **Prettier** for code formatting
- Prefer **functional components** with React hooks
- Use **descriptive variable and function names**

```typescript
// Good example
interface EmergencyEvent {
  id: string;
  type: EmergencyType;
  location: Geolocation;
  severity: number;
}

const EmergencyAlert: React.FC<{ event: EmergencyEvent }> = ({ event }) => {
  const { data, isLoading } = useQuery({
    queryKey: ['emergency', event.id],
    queryFn: () => fetchEmergencyDetails(event.id),
  });

  if (isLoading) return <LoadingSpinner />;
  
  return <AlertComponent event={event} details={data} />;
};
```

### CSS/Styling

- Use **CSS Modules** or **styled-components**
- Follow **BEM** methodology for class names
- Ensure **mobile-first** responsive design
- Follow **WCAG 2.1 AA** accessibility guidelines

```css
/* CSS Modules example */
.container {
  display: flex;
  flex-direction: column;
  padding: 1rem;
}

.alert {
  background-color: var(--color-alert);
  border-radius: 0.5rem;
  padding: 1rem;
}

.alert--critical {
  background-color: var(--color-critical);
  border: 2px solid var(--color-critical-border);
}
```

### Database

- Use **Supabase migrations** for schema changes
- Follow **PostgreSQL best practices**
- Use **PostGIS** for spatial queries
- Implement **Row Level Security (RLS)**

```sql
-- Example migration
CREATE TABLE emergency_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type_id INTEGER REFERENCES emergency_types(id),
  location GEOGRAPHY(POINT, 4326),
  severity INTEGER CHECK (severity BETWEEN 1 AND 5),
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create spatial index
CREATE INDEX idx_emergency_events_location 
ON emergency_events USING GIST (location);

-- Enable RLS
ALTER TABLE emergency_events ENABLE ROW LEVEL SECURITY;
```

## Testing Requirements

### Test Coverage

- **Unit Tests**: Cover all utility functions and business logic
- **Integration Tests**: Cover API endpoints and database operations
- **E2E Tests**: Cover critical user journeys
- **Performance Tests**: Cover database queries and API response times

### Test Structure

```typescript
// Example test file
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { EmergencyMap } from '../EmergencyMap';

describe('EmergencyMap', () => {
  const queryClient = new QueryClient();

  const renderWithQuery = (component: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        {component}
      </QueryClientProvider>
    );
  };

  it('should display emergency alerts on map', async () => {
    renderWithQuery(<EmergencyMap />);
    
    await waitFor(() => {
      expect(screen.getByTestId('emergency-marker')).toBeInTheDocument();
    });
  });

  it('should handle location permissions', async () => {
    // Mock geolocation
    const mockGeolocation = {
      getCurrentPosition: jest.fn(),
    };
    Object.defineProperty(global.navigator, 'geolocation', {
      value: mockGeolocation,
    });

    renderWithQuery(<EmergencyMap />);
    
    expect(mockGeolocation.getCurrentPosition).toHaveBeenCalled();
  });
});
```

### Running Tests

```bash
# Unit and integration tests
npm run test

# Watch mode for development
npm run test:watch

# Coverage report
npm run test:coverage

# E2E tests
npm run test:e2e

# Performance tests
npm run test:performance
```

## Pull Request Process

### Before Submitting

1. **Ensure Tests Pass**
   ```bash
   npm run test
   npm run lint
   npm run type-check
   ```

2. **Update Documentation**
   - Update README if needed
   - Add inline comments for complex logic
   - Update API documentation

3. **Commit Message Format**
   ```
   type(scope): description
   
   feat(alert): add silent push notifications
   fix(database): resolve spatial query performance issue
   docs(readme): update installation instructions
   ```

### Submitting PR

1. **Create Pull Request**
   - Target: `develop` branch
   - Title: Clear and descriptive
   - Description: Detailed explanation of changes

2. **PR Template**
   ```markdown
   ## Description
   Brief description of changes
   
   ## Type of Change
   - [ ] Bug fix
   - [ ] New feature
   - [ ] Breaking change
   - [ ] Documentation update
   
   ## Testing
   - [ ] Unit tests pass
   - [ ] Integration tests pass
   - [ ] E2E tests pass
   - [ ] Manual testing completed
   
   ## Checklist
   - [ ] Code follows project standards
   - [ ] Self-review completed
   - [ ] Documentation updated
   - [ ] Tests added/updated
   ```

3. **Code Review**
   - Address reviewer feedback promptly
   - Be open to suggestions
   - Keep discussions constructive

## Issue Reporting

### Bug Reports

Use the following template for bug reports:

```markdown
**Bug Description**
Clear description of the issue

**Steps to Reproduce**
1. Go to...
2. Click on...
3. See error

**Expected Behavior**
What should happen

**Actual Behavior**
What actually happens

**Environment**
- OS: [e.g. iOS 15, Android 12, Windows 11]
- Browser: [e.g. Chrome 96, Safari 15]
- App Version: [e.g. v2.0.1]

**Additional Context**
Screenshots, logs, or other relevant information
```

### Feature Requests

```markdown
**Feature Description**
Clear description of the proposed feature

**Problem Statement**
What problem does this solve?

**Proposed Solution**
How should this work?

**Alternatives Considered**
Other approaches you've thought about

**Additional Context**
Any other relevant information
```

## Community Guidelines

### Code of Conduct

We are committed to providing a welcoming and inclusive environment. Please:

- Be respectful and considerate
- Use inclusive language
- Focus on constructive feedback
- Welcome newcomers and help them learn
- Respect different viewpoints and experiences

### Getting Help

- **Discord**: [Join our community](https://discord.gg/openrelief)
- **GitHub Discussions**: [Ask questions](https://github.com/openrelief/openrelief/discussions)
- **Issues**: [Report problems](https://github.com/openrelief/openrelief/issues)

### Recognition

Contributors are recognized through:

- Contributor list in README
- Feature credits in release notes
- Community spotlight in blog posts
- Merit-based maintainer roles

## Development Resources

### Documentation

- [Project Documentation](docs/)
- [API Reference](docs/api/)
- [Database Schema](docs/database/)
- [Deployment Guide](docs/deployment/)

### External Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [MapLibre GL JS](https://maplibre.org/maplibre-gl-js-docs/)
- [PostGIS Documentation](https://postgis.net/docs/)

## Thank You!

Your contributions help make OpenRelief better and can save lives during emergencies. Every contribution, no matter how small, is valuable and appreciated.

---

*If you have any questions about contributing, please don't hesitate to ask in our Discord community or GitHub Discussions.*