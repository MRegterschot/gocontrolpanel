#!/bin/sh
set -ex

if [ -z "$DB" ]; then
  echo "❌ Error: DB environment variable is not set (use DB=mysql, DB=postgres etc.)"
  exit 1
fi

npx prisma migrate deploy --schema ./prisma/$DB/schema.prisma && exec node apps/web/server.js
