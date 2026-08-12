#!/bin/bash
#
# Vercel Build Script — runs database migration only when DATABASE_URL
# points to a real database (not local dev).
#
# This allows:
#  - Local dev build: skips migration (no database needed)
#  - Vercel production build: runs migration (creates/updates tables in Neon)
#

if [ -z "$DATABASE_URL" ]; then
  echo "⏭️  DATABASE_URL not set — skipping database migration"
  exit 0
fi

if [[ "$DATABASE_URL" == *"localhost"* ]]; then
  echo "⏭️  Local database detected — skipping migration (use bun run db:push manually)"
  exit 0
fi

echo "🔄 Running database migration (prisma db push)..."
echo "   Database: ${DATABASE_URL:0:50}..."

npx prisma db push --accept-data-loss

if [ $? -eq 0 ]; then
  echo "✅ Database migration completed"
else
  echo "⚠️  Database migration failed — continuing build anyway"
  echo "   Tables may already exist or DATABASE_URL may be misconfigured"
fi

exit 0
