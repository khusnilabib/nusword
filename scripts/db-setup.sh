#!/bin/bash
#
# NUSWORD Database Setup Script
#
# Verifies database connectivity and creates tables via Prisma.
# Use this after setting DATABASE_URL + DIRECT_URL in .env
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
  echo "   Add your Neon PostgreSQL connection string to .env"
  exit 1
fi

# Check if it's PostgreSQL
if [[ "$DATABASE_URL" != postgresql://* ]]; then
  echo "⚠️  DATABASE_URL is not a PostgreSQL connection string."
  echo "   Current value: $DATABASE_URL"
  echo ""
  echo "   For Neon, use the Pooled connection string:"
  echo "   DATABASE_URL=postgresql://[user]:[pass]@ep-[id]-pooler.[region].aws.neon.tech/[db]?sslmode=require&pgbouncer=true&connection_limit=1"
  echo ""
  exit 1
fi

echo "📋 DATABASE_URL: ${DATABASE_URL:0:60}..."
echo ""

# Check DIRECT_URL (needed for migrations with Neon pooling)
if [ -z "$DIRECT_URL" ]; then
  echo "⚠️  DIRECT_URL is not set. Using DATABASE_URL for migrations."
  echo "   For Neon, set DIRECT_URL to the Direct connection (no -pooler in hostname):"
  echo "   DIRECT_URL=postgresql://[user]:[pass]@ep-[id].[region].aws.neon.tech/[db]?sslmode=require"
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
echo "║  Your Neon database is ready for production.         ║"
echo "║                                                      ║"
echo "║  Next steps for Vercel deployment:                   ║"
echo "║  1. Set DATABASE_URL, DIRECT_URL, JWT_SECRET in Vercel ║"
echo "║  2. Deploy (Vercel auto-runs prisma generate)        ║"
echo "╚══════════════════════════════════════════════════════╝"
