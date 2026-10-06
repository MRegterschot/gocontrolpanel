<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Web app conventions

## Stack and directory map

The panel uses Next.js App Router, React, and strict TypeScript. The `@/` alias resolves to `apps/web/src`. Follow the repository guide in `../../AGENTS.md` for workspace commands and the web/GBX service split.

- `src/app`: route layouts, pages, GET API routes, and global Tailwind styles. Authenticated panel pages live under `(gocontroller)`; per-server pages use `server/[id]`.
- `src/components/ui`: the shared shadcn/ui primitives, built on Radix. Reuse these buttons, inputs, dialogs, selects, checkboxes, cards, and tables.
- `src/components`: reusable domain UI, table wrappers, and modal components.
- `src/forms`: React Hook Form components and Zod schemas, grouped by feature.
- `src/hooks`: reusable TanStack Query hooks, pagination, search, and WebSocket hooks.
- `src/lib/api-client`: typed browser GET clients and shared query keys/response unwrapping.
- `src/services`: server-only read logic, including database and external service reads.
- `src/actions`: Server Actions for form submissions and other mutations; server-only action helpers are also grouped here.
- `src/providers`: session, theme, TanStack Query, notifications, and live server state providers.
- `src/routes`: page routes, connection routes, and UI permission definitions.
- `src/types`: API payloads, auth types, and the shared response envelope.
- `test`: Vitest tests; `vitest.config.ts` configures the `@/` alias.

## Styling and components

Use Tailwind utility classes and the theme tokens in `src/app/globals.css`. Follow existing light/dark theme conventions and responsive layouts. Prefer existing shadcn primitives from `@/components/ui` over custom versions or a second UI library. `components.json` documents the shadcn setup.

Use the shared `Modal`/`ModalContent` wrapper and accessible dialog titles. Give inputs and selection controls meaningful labels. Use the existing `Form`, `FormElement`, and Sonner toast patterns for forms and feedback.

Tables use TanStack Table column definitions and the shared components in `src/components/table`. Use `DataTable` for local data and the existing server pagination components/hooks for API-backed lists. Preserve selection across pagination when the feature requires it. Avoid mutating fetched arrays when sorting or preparing rows.

Trackmania names can contain formatting tags; use the existing `tmtags` rendering pattern and time display/formatting helpers. Trackmania logins are slug IDs, while external services may require decoded Ubisoft UUIDs. Times are in milliseconds and a DNF is represented by `-1`.

## Reads: GET APIs and TanStack Query

For browser data fetching, use this flow:

`component -> query hook -> typed API client -> GET route -> authorized server-only service`

1. Put read logic in an appropriate `src/services` module and enforce its permissions there. Mark server-only modules with `import "server-only"`; use type-only imports when referring to service return types from browser code.
2. Expose it through a GET route under `src/app/api`, using `apiRoute` or `paginatedRoute` from `@/lib/api-route`. These wrappers require a session and return the `ServerResponse` envelope. Validate query/path input when needed; sorting fields need explicit constraints.
3. Add a typed client in `src/lib/api-client`, using `apiGet`. Encode path segments. Pass the query's `AbortSignal` where supported. Database payloads that need `Date` objects use the `dates: true` option.
4. Add a reusable `useQuery` hook in `src/hooks`, with a key in `queryKeys` from `@/lib/api-client/query`. Include the server ID and all relevant parameters in the key. Use `unwrap` because API clients return `{ data, error, code? }` and TanStack Query needs thrown errors to mark a request as failed.
5. Render the query's loading and error state. Choose `enabled`, freshness, and cache lifetime deliberately. The shared `QueryProvider` disables retries and window-focus refetching by default. Use `usePaginationAPI` for existing paginated GET endpoints.

Do not introduce manual `useEffect` fetch/loading/error state for reads or use Server Actions as the browser's read transport. Effects can synchronize fetched defaults into forms, but should preserve fields the user has already edited. For an example, see `use-ecm-api-key.ts`, the ECM GET route, and `send-ecm.tsx`.

Live server data uses the existing WebSocket hooks/providers and contracts from `@gcp/shared`, rather than replacing live streams with polling. Route dedicated-server operations through the web's GBX service client helpers.

## Writes: forms and Server Actions

Submit forms and other mutations through Server Actions in `src/actions`, using `"use server"`. Use React Hook Form with a Zod resolver, and validate untrusted inputs again on the server. Reads and writes commonly use `doServerActionWithAuth` and return `ServerResponse<T>`; callers must check `error`.

Enforce the feature's roles on the server and match those roles in the UI. Use `hasPermissionSync` for UI visibility and the existing route permission patterns. For ECM sends, both direct server admins and group server admins are allowed; moderators are not.

Keep database writes scoped to the server and validate ownership of related IDs. Follow the existing audit logging pattern. Show pending submission state, prevent repeated submits, display useful errors, and close dialogs only after success. After a write changes cached data, invalidate affected query keys or use the existing refetch callback. Do not add POST routes for routine form submissions when a Server Action fits the established app pattern.

## Checks

From the repository root, run `bun run --filter @gcp/web typecheck` and `bun run --filter @gcp/web test` for web behavior changes. Format only changed files with Prettier and run `git diff --check`. Existing tests cover API transport, query validation, service requests, plugin configuration, and ECM submission. Add meaningful regression coverage when changing these behaviors. Browser checks need an authenticated panel and any infrastructure used by the page; report when they were unavailable.
