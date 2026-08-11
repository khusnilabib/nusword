#!/bin/bash
#
# NUSWORD Database Setup Script
#
# Verifies database connectivity and creates tables via Prisma.
# Use this after setting DATABASE_URL in .env
#
# Usage:
#   bun run db:setup
#

set -e

echo "╔══════════════════════════════════════════════════════╗"
echo "║        NUSWORD Database Setup                        ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
  echo "❌ .env file not found!"
  echo "   Copy .env.example to .env and fill in your database URL:"
  echo "   cp .env.example .env"
  exit 1
fi

# Load .env
export $(grep -v '^#' .env | xargs)

# Check DATABASE_URL
if [ -z "$DATABASE_URL" ]; then
  echo "❌ DATABASE_URL is not set in .env"
  echo "   Add your Supabase PostgreSQL connection string to .env"
  exit 1
fi

# Check if it's PostgreSQL
if [[ "$DATABASE_URL" != postgresql://* ]]; then
  echo "⚠️  DATABASE_URL is not a PostgreSQL connection string."
  echo "   Current value: $DATABASE_URL"
  echo ""
  echo "   For production, use Supabase PostgreSQL:"
  echo "   DATABASE_URL=postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
  echo ""
  echo "   Continuing with current URL anyway..."
  echo ""
fi

echo "📋 Database URL: ${DATABASE_URL:0:50}..."
echo ""

# Check DIRECT_URL (needed for migrations)
if [ -z "$DIRECT_URL" ]; then
  echo "⚠️  DIRECT_URL is not set. Using DATABASE_URL for migrations."
  echo "   For Supabase, set DIRECT_URL to the direct connection (port 5432):"
  echo "   DIRECT_URL=postgresql://postgres.[ref]:[password]@aws-0-[region].supabase.com:5432/postgres"
  echo ""
  export DIRECT_URL="$DATABASE_URL"
fi

echo "🔄 Generating Prisma client..."
bun run db:generate
echo "✅ Prisma client generated"
echo ""

echo "🔄 Pushing schema to database (creating tables)..."
bun run db:push
echo "✅ Database schema created"
echo ""

echo "╔══════════════════════════════════════════════════════╗"
echo "║  ✅ Database setup complete!                         ║"
echo "║                                                      ║"
echo "║  Your database is ready for production.              ║"
echo "║                                                      ║"
echo "║  Next steps:                                         ║"
echo "║  1. Deploy to Vercel                                 ║"
echo "║  2. Set DATABASE_URL + DIRECT_URL in Vercel env      ║"
echo "║  3. Run this script on Vercel build (automatic)     ║"
echo "╚══════════════════════════════════════════════════════╝"
