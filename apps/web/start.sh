#!/bin/sh
set -ex

if [ -z "$DB" ]; then
  echo "❌ Error: DB environment variable is not set (use DB=mysql, DB=postgres etc.)"
  exit 1
fi

# Replicas on other hosts may migrate at the same time. Prisma serialises them with a database
# lock but gives up waiting after 10s, so a long migration elsewhere gets a few retries.
attempt=1
until npx prisma migrate deploy --schema ./prisma/$DB/schema.prisma; do
  if [ "$attempt" -ge 5 ]; then
    echo "❌ Error: migrations failed after $attempt attempts"
    exit 1
  fi
  attempt=$((attempt + 1))
  sleep 10
done

exec node apps/web/server.js
