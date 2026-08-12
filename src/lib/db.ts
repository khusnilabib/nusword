import { PrismaClient } from '@prisma/client'

/**
 * Prisma client — configured for Neon PostgreSQL serverless + Vercel.
 *
 * Neon uses PgBouncer for connection pooling (mandatory for serverless).
 * Key settings:
 *  - connection_limit=1 (prevents connection exhaustion on serverless)
 *  - sslmode=require (Neon requires SSL)
 *  - pgbouncer=true (tells Prisma to use prepared statements compatible mode)
 *
 * These are set in the DATABASE_URL query string, not here.
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
