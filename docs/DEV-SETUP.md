# Local Development Setup

## Prerequisites
- Node.js >= 20
- pnpm >= 9
- Docker Desktop (for PostgreSQL)

## First-time setup

1. Install dependencies:
   ```bash
   pnpm install
   ```

2. Create environment files:
   ```bash
   cp .env.example .env
   cp apps/api/.env.example apps/api/.env
   cp apps/web/.env.example apps/web/.env.local
   ```
   Fill in real secrets in each `.env` file.

3. Start the database:
   ```bash
   docker compose -f docker/docker-compose.yml up -d postgres
   ```

4. Run migrations and seed:
   ```bash
   pnpm db:migrate
   pnpm db:seed
   ```

5. Start the apps:
   ```bash
   # In one terminal:
   pnpm --filter @mirai/api dev
   
   # In another terminal:
   pnpm --filter @mirai/web dev
   ```

6. Open http://localhost:3000

## Default credentials (after seed)
- Email: admin@neuropsia.cl
- Password: ChangeMeNow2024!
- **Change immediately after first login.**
