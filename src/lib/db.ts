import { PrismaClient } from '@prisma/client'

/**
 * Prisma client — configured for production (Supabase PostgreSQL + Vercel).
 *
 * Key production settings:
 *  - Connection pooling via pgBouncer (Supabase pooler on port 6543)
 *  - connection_limit=1 for serverless (prevents connection exhaustion)
 *  - Reduced logging in production
 *
 * For local dev:
 *  - Set DATABASE_URL + DIRECT_URL to your local PostgreSQL or Supabase project
 *  - See .env.example for setup instructions
 *
 * The global singleton prevents connection exhaustion during hot reloads
 * in development.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

const isProduction = process.env.NODE_ENV === 'production'

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: isProduction ? ['error', 'warn'] : ['query', 'error', 'warn'],
  })

if (!isProduction) globalForPrisma.prisma = db
