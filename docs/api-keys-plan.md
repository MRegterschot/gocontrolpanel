# Public API with API keys: plan

Status: implemented on stacked branches (section 10); user documentation is in [public-api.md](public-api.md). Browser checks of the key management pages need the migrations applied.

Server admins and group admins create API keys that let external tools call a versioned HTTP API (`/api/v1`) for the servers the key targets. Panel admins can create keys for any server or group.

## 1. Decision: new endpoints, shared logic

The existing `/api` routes and Server Actions are not reused as the public API:

- Writes have no HTTP endpoints. They are Server Actions, whose IDs change per build and which depend on a session.
- `apiRoute` and the services behind it call `auth()` (`doServerActionWithAuth` → `withAuth`). Accepting a Bearer token there means touching every service anyway.
- Their payloads follow the panel UI. A public contract would freeze them.
- Mixing cookie and Bearer authentication on one route invites mistakes about which one was checked.

The logic is shared instead. `Actor`, `requirePermission` and `doActionAs` (`apps/web/src/lib/actor.ts`) already run operations for someone other than the session user, and `actions/*/server-only/*As(actor, ...)` cover most writes Codriver needs. An API request authenticates the key, builds an `Actor` with narrowed claims, calls the same `*As` function and maps the result to a stable DTO. Reads are split the same way when an endpoint needs them: `fooAs(actor, ...)` holds the logic and the existing session service calls it with `actorFromSession`.

## 2. Goals and non-goals

Goals:

- Keys target exactly one server or one group. A group key reaches every server currently in the group.
- A key never grants more than its creator holds, and stops working when the creator loses admin on the target.
- Scopes limit a key to specific operations.
- Every write is audited with the key it came through.
- Stable, versioned request and response shapes with an OpenAPI description.

Non-goals for v1:

- Global keys (no target). The schema leaves room to add them later without a migration.
- Hetzner, ECM key retrieval or submission, users, roles, groups, server creation or deletion, the file manager and plugin installation.
- OAuth or per-user personal access tokens unrelated to a server or group.

## 3. Data model (`packages/db`, MySQL and PostgreSQL)

```prisma
model ApiKeys {
  id          String    @id @default(uuid())
  name        String
  // First characters of the token, shown in the UI to recognise a key
  prefix      String
  // sha256 of the full token; the token itself is never stored
  hash        String    @unique
  scopes      Json      @default("[]")
  serverId    String?
  groupId     String?
  createdById String
  expiresAt   DateTime?
  lastUsedAt  DateTime?
  revokedAt   DateTime?

  server    Servers? @relation(fields: [serverId], references: [id], onDelete: Cascade)
  group     Groups?  @relation(fields: [groupId], references: [id], onDelete: Cascade)
  createdBy Users    @relation(fields: [createdById], references: [id], onDelete: Cascade)

  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  deletedAt DateTime?

  @@index([serverId])
  @@index([groupId])
  @@index([createdById])
  @@map("api_keys")
}
```

- Exactly one of `serverId` and `groupId` is set. Prisma cannot express that check portably, so the create action validates it with a discriminated union (`{ target: "server", serverId } | { target: "group", groupId }`) and authentication rejects any row with neither or both.
- Token format: `gcp_` followed by 32 random bytes in base64url. The token has enough entropy for a plain sha256 hash; bcrypt or argon2 add nothing. `encryptSecret` is not used because the token is never decrypted.
- The token is shown once, at creation.

## 4. Scopes

| Scope           | Allows                            |
| --------------- | --------------------------------- |
| `server:read`   | Server info                       |
| `players:read`  | Connected players                 |
| `players:write` | Kick players                      |
| `maps:read`     | Map list                          |
| `maps:write`    | Add maps from Trackmania Exchange |
| `jukebox:read`  | Jukebox contents                  |
| `jukebox:write` | Queue maps and clear the jukebox  |
| `matches:read`  | Recorded matches                  |

Scopes live in `@tmcontrolpanel/shared` so the web UI and the route wrapper use the same list. A key needs at least one scope.

## 5. Authentication and permissions (`apps/web/src/lib/api-key.ts`)

For every request:

1. Parse `Authorization: Bearer gcp_…`, hash the token and look up the key. Reject it when revoked, expired or soft-deleted.
2. Reject rows with neither or both targets.
3. Load the target and reject it when soft-deleted (cascades only cover hard deletes).
4. Load the creator with `actorForLogin`. **The creator must still be admin of the target**: `serverPermissions.admin` for a server key, `groups:id:admin` for a group key. Panel admins pass. A demoted or removed creator's keys stop working; they are not downgraded to the creator's new role.
5. For a group key, load the group's current servers (excluding soft-deleted ones), so servers added later are reachable and removed ones are not.
6. Build narrowed claims and an `Actor` with `apiKeyId` set:

   ```ts
   // admin: false keeps a panel admin's key inside its target
   const base = {
     ...creator.claims,
     admin: false,
     permissions: [],
     servers: [],
     groups: [],
     projects: [],
   };
   // server key: servers: [{ id: serverId, name, role: "Admin" }]
   // group key:  groups: [{ id: groupId, name, role: "Admin", servers: groupServers }]
   ```

   `hasPermission` returns early for `claims.admin`, so dropping it is what confines a panel admin's key to its target. The role is Admin because step 4 guarantees the creator holds it; scopes do the narrowing.

7. Update `lastUsedAt` at most once a minute.
8. Rate limit per key with `redisRateLimit`; respond 429 with `Retry-After`.

The narrowed group claims also expand to `groups:<id>:admin`, the permission for managing the group itself. No `/v1` endpoint exposes group management; a test keeps it that way.

Audit entries get a nullable `apiKeyId` column. `publicApiRoute` runs the handler in an `AsyncLocalStorage` context (`lib/api-keys/context.ts`) and `auditLogData` reads it, so the existing `*As` functions record the key without passing it along.

## 6. Contract first (`packages/shared/src/public-api`)

The API is defined as Zod schemas before any route exists; the OpenAPI document and the route handlers are both derived from it.

- Schemas use `zod/v4` (bundled with the installed `zod` 3.25), so `.meta()` and JSON Schema output are available without migrating the rest of the codebase off Zod 3.
- Each endpoint is one `defineEndpoint({ method, path, scope, summary, params, query, body, response })` entry. DTOs are named with `.meta({ id })` so they become reusable OpenAPI components.
- The contract lives in `@tmcontrolpanel/shared` with no OpenAPI dependency, so a future client SDK or the GBX service can import it.
- `apps/web/src/lib/public-api/openapi.ts` builds the OpenAPI 3.1 document from the endpoint list with `zod-openapi`, including the Bearer security scheme, the scope per operation and the shared error responses.
- Tests check that the document builds, every endpoint has a scope, paths are unique and every path parameter has a schema.

## 7. Route wrapper (`apps/web/src/lib/public-api/route.ts`)

`publicApiRoute(endpoint, handler)` takes an endpoint from the contract:

- Accepts Bearer authentication only; cookies are ignored.
- Authenticates the key (section 5) and checks the endpoint's scope.
- Parses path params, query and body with the endpoint's schemas and returns 400 with the issues on failure. The handler's argument and return types are inferred from the contract.
- Parses the handler's result with the response schema, so fields the contract does not declare are stripped instead of leaking.
- Permission checks happen in the `*As` functions with `requirePermission`, so server and group keys go through the same path. A key for server A gets 403 on server B.
- Responds with `Cache-Control: private, no-store` and a stable error body `{ error: { code, message } }`, using the status mapping from `api-route.ts`.
- A test asserts every contract endpoint has a route file and every `/api/v1` route uses a contract endpoint.

## 8. Endpoints (`apps/web/src/app/api/v1`)

| Endpoint                                   | Scope           | Backed by                       |
| ------------------------------------------ | --------------- | ------------------------------- |
| `GET /v1/openapi.json`                     | none            | the generated document          |
| `GET /v1/servers`                          | any             | key's server or group's servers |
| `GET /v1/servers/:id`                      | `server:read`   | new read                        |
| `GET /v1/servers/:id/players`              | `players:read`  | player service, split to actor  |
| `POST /v1/servers/:id/players/:login/kick` | `players:write` | player `*As`                    |
| `GET /v1/servers/:id/maps`                 | `maps:read`     | `getMapList`, split to actor    |
| `POST /v1/servers/:id/maps/tmx`            | `maps:write`    | TMX `*As`                       |
| `GET /v1/servers/:id/jukebox`              | `jukebox:read`  | jukebox read, split to actor    |
| `POST /v1/servers/:id/jukebox`             | `jukebox:write` | `addMapToJukeboxAs`             |
| `DELETE /v1/servers/:id/jukebox`           | `jukebox:write` | `clearJukeboxAs`                |
| `GET /v1/servers/:id/matches`              | `matches:read`  | match service, split to actor   |

Responses are the contract's DTOs, never Prisma rows or raw GBX structs.

## 9. Key management UI

- **Server page** (`server/[id]/api-keys`): the server's own keys, with create, rename and revoke for server admins. A read-only list shows group keys that can reach this server, linking to the group.
- **Groups table** (Admin → Groups): an **API keys** row action opens the group's keys for its admins (`groups:id:admin`; `groups:edit` alone is not enough). Every admin of the group can see and revoke all of its keys, not only their own.
- **Admin page** (`admin/api-keys`): every key. It needs the new `api-keys:view` permission and revoking needs `api-keys:revoke`, like the other admin pages' role permissions. No create button; keys are created from their target.
- **API reference** (`/api-docs`): a panel page generated from the contract, linked from the key pages.
- Writes are Server Actions with Zod validation, `logAudit` and transactions like the existing admin actions. Reads use GET routes, typed clients and query hooks.
- Creation shows the token once in a modal with a copy button. The form offers scopes and an optional expiry.
- Permissions are enforced on the server (`serverPermissions.admin`, `groups:id:admin`) and mirrored in the UI with `hasPermissionSync`. Group moderators cannot create group keys.

## 10. Phases and branches

Branches stack on `release`, each on the previous phase:

| Phase | Branch                      | Contents                                                           |
| ----- | --------------------------- | ------------------------------------------------------------------ |
| 1     | `feat/api-keys-1-schema`    | `ApiKeys` model, migrations for both providers, shared scopes      |
| 2     | `feat/api-keys-2-contract`  | Zod contract for every v1 endpoint, OpenAPI document generation    |
| 3     | `feat/api-keys-3-auth`      | Token generation and hashing, key authentication, narrowed actor   |
| 4     | `feat/api-keys-4-route`     | Contract-driven `publicApiRoute`, error format, rate limiting      |
| 5     | `feat/api-keys-5-endpoints` | `/api/v1` endpoints, `openapi.json` and the actor splits they need |
| 6     | `feat/api-keys-6-ui`        | Key management actions, routes and pages                           |
| 7     | `feat/api-keys-7-docs`      | User documentation, API reference page, remaining tests            |

## 11. Tests

- Token generation, prefix and hashing; unknown, revoked, expired and soft-deleted keys are rejected.
- Rows with neither or both targets are rejected, also for a panel admin creator.
- A server key gets 403 on another server.
- A group key reaches every server in its group and gets 403 outside it; a server added to the group is reachable without editing the key, a removed one is not.
- A soft-deleted target or creator disables the key.
- A creator demoted from admin on the target disables the key.
- A panel admin's group key cannot reach servers outside the group.
- Missing scopes give 403; a cookie session without a Bearer token gives 401 on `/v1`.
- Rate limiting returns 429 with `Retry-After`.
- Group moderators cannot create group keys; server moderators cannot create server keys.
- No `/v1` route checks group management permissions.
