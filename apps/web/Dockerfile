# Build context is the monorepo root: docker build -f apps/web/Dockerfile .
FROM node:23-alpine AS base

FROM base AS deps
RUN apk add --no-cache libc6-compat curl bash
WORKDIR /app

# Every workspace manifest is needed for a frozen workspace install
COPY package.json bun.lock* ./
COPY apps/web/package.json ./apps/web/
COPY apps/gbx-service/package.json ./apps/gbx-service/
COPY packages/db/package.json ./packages/db/
COPY packages/shared/package.json ./packages/shared/
RUN curl -fsSL https://bun.sh/install | bash \
  && /root/.bun/bin/bun install --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /root/.bun /root/.bun
ENV PATH="/root/.bun/bin:$PATH"

COPY . .

ARG DB_TYPE
ENV DB=$DB_TYPE

RUN bun run generate
RUN bun run --filter @gcp/web build

FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Standalone output mirrors the monorepo layout; server.js lives in apps/web
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/hetzner ./apps/web/hetzner
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules

COPY --from=builder --chown=nextjs:nodejs /app/packages/db/prisma ./prisma

COPY apps/web/start.sh ./
RUN chmod +x start.sh

USER nextjs

EXPOSE 3000

ENV PORT=3000

ARG DB_TYPE
ENV DB=$DB_TYPE

ENV HOSTNAME="0.0.0.0"
ENTRYPOINT [ "./start.sh" ]
