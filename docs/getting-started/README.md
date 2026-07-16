# Getting Started

This guide will help you set up OpenRelief for local development.

## Prerequisites

- **Node.js** 20+ (CI pins Node 20; see [deployment overview](../deployment/overview.md))
- **npm** 8+ (the project is npm-based; pnpm/yarn are not tested)
- **Supabase CLI** (`npm install -g supabase`)
- **Git**
- **Docker** (for local Supabase)

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/openrelief/openrelief.git
cd openrelief
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Start Local Supabase

```bash
supabase start
```

This will start:

- PostgreSQL database with PostGIS
- Supabase Auth service
- Supabase Storage
- Supabase Realtime

### 4. Configure Environment

Copy the example environment file:

```bash
cp .env.example .env.local
```

Update with your local Supabase credentials (shown after `supabase start`):

```env
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-local-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-local-service-role-key
```

### 5. Run Database Migrations

```bash
supabase db push
```

### 6. Seed the Database (Optional)

```bash
npm run db:seed
```

### 7. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Development Workflow

### Running Tests

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e:playwright

# Type checking
npm run type-check

# Linting
npm run lint
```

### Building for Production

```bash
npm run build
```

### Database Management

```bash
# Generate TypeScript types from schema
npm run db:generate

# Create a new migration
supabase migration new your_migration_name

# Reset local database
npm run db:reset
```

## Next Steps

- Read the [Architecture Overview](../architecture/)
- Explore the [API Reference](../api/)
- Learn about [Deployment](../deployment/)

## Troubleshooting

### Common Issues

**Supabase won't start**

- Ensure Docker is running
- Check port availability (54321, 54322, 54323)

**Database connection errors**

- Verify your `.env.local` configuration
- Check if Supabase is running: `supabase status`

**Build errors**

- Clear Next.js cache: `rm -rf .next`
- Reinstall dependencies: `rm -rf node_modules && npm install`

## Getting Help

- [GitHub Issues](https://github.com/openrelief/openrelief/issues)
- [GitHub Discussions](https://github.com/openrelief/openrelief/discussions)
