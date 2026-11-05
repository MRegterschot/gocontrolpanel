# TMControlPanel contributor guide

TMControlPanel manages dedicated Trackmania servers: server and game settings, maps, players, live matches, recorded results, plugins, and related Nadeo, Trackmania Exchange, file manager, and Hetzner integrations.

## Workspace and runtime

This is a Bun workspace with TypeScript throughout. Run workspace commands from the repository root. Keep web-specific conventions in `apps/web/AGENTS.md`.

- `apps/web` (`@tmcontrolpanel/web`): Next.js App Router and React web panel, authentication, database access, HTTP APIs, Server Actions, and external integrations. Default port 3000.
- `apps/gbx-service` (`@tmcontrolpanel/gbx-service`): dedicated-server connections, game callbacks, live WebSockets, match recording, and sandboxed plugin execution. Default port 3100. Changes to game connection or callback behavior belong here.
- `packages/db` (`@tmcontrolpanel/db`): shared Prisma client, schemas, and migrations for MySQL/MariaDB and PostgreSQL.
- `packages/shared` (`@tmcontrolpanel/shared`): shared transport contracts, plugin manifest/config validation, and utilities used across processes.
- `packages/plugin-sdk` (`@tmcontrolpanel/plugin-sdk`): public plugin API. First-party plugin implementations live in the separate `tmcontrolpanel-plugins` registry repository; see `docs/first-party-plugins.md`.

The web panel and GBX service share the database and Redis. Server-side panel requests reach the service through `GBX_SERVICE_URL`; browsers use `GBX_SERVICE_WS_URL` for live updates. Keep the split intact: the web process must not open its own dedicated-server connection. Internal service calls use `GBX_SERVICE_TOKEN`, and browser WebSocket tickets use `WS_TICKET_SECRET`. Consult `README.md` for deployment, `docs/backup-host.md` and `docs/database-host.md` for multi-host setups, and `docs/migrating-beta-to-release.md` for upgrades.

## Feature areas

- **GBX worker cluster:** `apps/gbx-service/src/core/cluster`. Workers (`GBX_WORKERS`) and nodes (`GBX_NODE_ID`) claim servers through Redis leases, so only one process ever holds a server's connection. Keep that guarantee when touching connection or ownership code.
- **Plugins:** the sandbox (QuickJS) is in `apps/gbx-service/src/core/plugins/sandbox`, capabilities and manifests in `packages/shared/src/plugins`, and the marketplace client in `apps/web/src/lib/marketplace.ts`. See `docs/plugin-sdk.md` and `docs/plugin-marketplace.md`.
- **Public API:** `/api/v1` routes use `publicApiRoute` from `apps/web/src/lib/public-api`, with endpoints in `packages/shared/src/public-api` and scopes in `packages/shared/src/api-keys.ts`. Not `apiRoute`. See `docs/public-api.md`.
- **Codriver:** the experimental AI assistant. Logic lives in `apps/web/src/lib/codriver`; the in-game `/co` command and window are in `apps/gbx-service/src/core/chat`. Keep it labelled experimental in the UI.

## Web development conventions

Use the app's shared shadcn/ui components, Tailwind styling, TanStack Table, and TanStack Query. Fetch browser data through GET API routes and typed API clients; submit forms and other writes through Server Actions. The detailed directory map, request flow, and examples are in `apps/web/AGENTS.md`.

## Database and authorization

Use `@tmcontrolpanel/db` and the existing client helpers. Database provider selection uses `DB=mysql` or `DB=postgres`; database scripts read `.env` through the root scripts. Keep changes to schema and migrations compatible with both supported providers. Generate the client after schema changes. Do not reset or migrate a database merely to verify a UI change.

Authorization must be enforced at server entry points, not just by hiding UI controls. Scope database reads and writes to the requested server and check that referenced records belong to it. Preserve existing soft deletion behavior (`deletedAt`) and audit conventions. ECM result selection, key retrieval, and submission are admin-only; the send dialog shows the current plugin API key as an editable default.

## Commands and validation

- `bun install`: install workspace dependencies.
- `bun run dev`: start the web panel.
- `bun run dev:gbx`: start the GBX service.
- `bun run infra:up` / `bun run infra:up:postgres`: start development database and Redis dependencies.
- `bun run --filter @tmcontrolpanel/web typecheck` and `bun run --filter @tmcontrolpanel/web test`: web TypeScript and Vitest checks.
- `bun run --filter @tmcontrolpanel/gbx-service typecheck` and `bun run --filter @tmcontrolpanel/gbx-service test`: GBX service checks.
- `bun run typecheck`, `bun run test`, and `bun run build`: broader workspace validation; the root scripts load `.env`.
- `bun run generate`: regenerate the Prisma client for the configured provider.

Run checks appropriate to the changed workspace and use focused tests for behavior that can fail in meaningful ways. Integration tests and the real-server stack (`e2e:*` and `ws:watch` scripts in `apps/gbx-service`, using `apps/gbx-service/e2e`) need Docker and a dedicated server login. Format changed files with the installed Prettier executable; avoid running the root `pretty` script for a small change because it rewrites the entire repository. Report which checks ran and any verification limits.
