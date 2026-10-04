# Build context is the monorepo root: docker build -f apps/gbx-service/Dockerfile --build-arg DB_TYPE=postgres .
FROM node:23-alpine AS base

FROM base AS deps
RUN apk add --no-cache libc6-compat curl bash
WORKDIR /app
COPY package.json bun.lock* ./
COPY apps/web/package.json ./apps/web/
COPY apps/gbx-service/package.json ./apps/gbx-service/
COPY packages/db/package.json ./packages/db/
COPY packages/shared/package.json ./packages/shared/
COPY packages/plugin-sdk/package.json ./packages/plugin-sdk/
COPY plugins/package.json ./plugins/
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
RUN bun run --filter @gcp/gbx-service build

# Runtime dependencies only; workspace packages are bundled into dist
FROM base AS prod-deps
WORKDIR /prod
COPY apps/gbx-service/package.json ./package.json
RUN node -e 'const fs=require("fs");const p=JSON.parse(fs.readFileSync("package.json"));for(const k of Object.keys(p.dependencies))if(String(p.dependencies[k]).startsWith("workspace:"))delete p.dependencies[k];delete p.devDependencies;delete p.scripts;fs.writeFileSync("package.json",JSON.stringify(p));' \
  && npm install --omit=dev --ignore-scripts --no-audit --no-fund

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 gbx

COPY --from=prod-deps /prod/node_modules ./node_modules
# Prisma client generated for the selected database
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/apps/gbx-service/dist ./dist
COPY --from=builder /app/apps/gbx-service/templates ./templates
# First-party plugin packages (plugins/), installed on start
COPY --from=builder /app/apps/gbx-service/first-party ./first-party

USER gbx
ENV PORT=3100
EXPOSE 3100

CMD ["node", "--enable-source-maps", "dist/main.js"]
