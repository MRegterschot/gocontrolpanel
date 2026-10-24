# Public API

GoControlPanel has a versioned HTTP API at `/api/v1` for tools outside the panel: scoreboards, Discord bots, tournament software and scripts. Requests authenticate with an API key that a server or group admin creates in the panel.

The OpenAPI 3.1 description is served at `/api/v1/openapi.json`; import it into Bruno, Postman, Insomnia or a client generator. Its server URL is the address you fetched it from, so imported requests work without editing. An interactive reference at `/api/v1/docs` is linked from every API Keys page.

## API keys

A key belongs to exactly one server or one group:

| Key        | Created by                                   | Reaches                             |
| ---------- | -------------------------------------------- | ----------------------------------- |
| Server key | Admins of the server (direct or via a group) | That server                         |
| Group key  | Admins of the group                          | Every server currently in the group |

Panel admins can create either kind for any server or group. Group moderators and server moderators cannot create keys, and neither can users who only have the `groups:edit` or `servers:edit` permissions.

Create keys here:

- **Server key:** the server's **API Keys** page in the sidebar.
- **Group key:** **Admin → Groups**, then **API keys** in the group's row menu.

The panel shows the key once, when it is created. Only a hash is stored, so a lost key cannot be shown again; revoke it and create a new one.

### When a key stops working

A key is checked on every request. It stops working when:

- it is revoked or expires;
- its server or group is deleted;
- its creator is no longer an admin of its server or group, or the creator's account is deleted. Keys are not downgraded to the creator's new role; they stop working completely.

A group key follows the group: a server added to the group is reachable right away, and a server removed from the group is not.

A key never grants more than its server or group. A key created by a panel admin is still confined to its target.

### Scopes

Every key has one or more scopes:

| Scope            | Allows                                                                                                                                               |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `server:read`    | Server info                                                                                                                                          |
| `players:read`   | Connected players, bans, blacklist and guestlist                                                                                                     |
| `players:write`  | Kicking, banning and forcing players to spectate; managing the blacklist and guestlist and their files                                               |
| `maps:read`      | The map list, the current and next map, and the map files on the server                                                                              |
| `maps:write`     | Adding, removing and reordering maps, also from Trackmania Exchange                                                                                  |
| `jukebox:read`   | Jukebox contents                                                                                                                                     |
| `jukebox:write`  | Queueing, removing and reordering maps, and clearing the jukebox                                                                                     |
| `game:read`      | The game mode script, its settings and opponent visibility                                                                                           |
| `game:write`     | Restarting, skipping, jumping and pausing; changing the game mode, its settings and opponent visibility; match settings files; points; script events |
| `chat:read`      | The chat history                                                                                                                                     |
| `chat:write`     | Sending chat messages, shown as `[Admin] <key name> (API key)`                                                                                       |
| `settings:read`  | Server settings and the join link, passwords included                                                                                                |
| `settings:write` | Changing server settings, passwords included                                                                                                         |
| `matches:read`   | Recorded matches and their records                                                                                                                   |

`GET /api/v1/servers` works with any key.

### Managing keys

- Every admin of a server or group can rename and revoke all of its keys, not only their own.
- A server's API Keys page also lists the group keys that can reach it, read-only.
- **Admin → API Keys** lists every key. It needs the `api-keys:view` permission; revoking from there needs `api-keys:revoke`.
- Creating, renaming and revoking keys is recorded in the audit log of the server or group. Changes made through the API are audited like panel changes, under the key's creator, with the key recorded on the entry.

## Requests

Send the key as a bearer token:

```sh
curl -H "Authorization: Bearer gcp_…" https://panel.example.com/api/v1/servers
```

The API never uses the panel's session cookie; a request without a valid key gets `401`.

Bodies are JSON. A body whose fields all have defaults, such as the kick reason, may be left out.

```sh
# Queue a map from the server's map list
curl -X POST -H "Authorization: Bearer gcp_…" -H "Content-Type: application/json" \
  -d '{"uid":"<map uid>"}' \
  https://panel.example.com/api/v1/servers/<server id>/jukebox

# Kick a player
curl -X POST -H "Authorization: Bearer gcp_…" \
  https://panel.example.com/api/v1/servers/<server id>/players/<login>/kick
```

Responses wrap their result in `data`. Lists of matches are paged with `page` (from 1) and `pageSize` (up to 100) and include `pagination`:

```json
{
  "data": [
    {
      "id": "…",
      "mode": "…",
      "map": { "uid": "…", "name": "…" },
      "recordCount": 12,
      "createdAt": "2026-10-20T10:00:00.000Z"
    }
  ],
  "pagination": { "page": 1, "pageSize": 20, "total": 41 }
}
```

Times are in milliseconds and `-1` is a DNF. Names can contain Trackmania formatting tags.

### Errors

Errors have one shape:

```json
{
  "error": {
    "code": "MissingScope",
    "message": "This key lacks the maps:read scope"
  }
}
```

| Status | Meaning                                                                      |
| ------ | ---------------------------------------------------------------------------- |
| 400    | Invalid path, query or body; `issues` lists each problem                     |
| 401    | Missing, unknown, revoked or expired key, or the key's creator lost access   |
| 403    | The key lacks the scope, or cannot reach this server                         |
| 404    | Not found, for example a match of another server or a map not on the server  |
| 409    | The request conflicts with the server's state, such as removing its last map |
| 413    | Body over 64 KB                                                              |
| 422    | The dedicated server refused the call; `message` has its reason              |
| 429    | Rate limited; wait for the number of seconds in `Retry-After`                |
| 503    | The dedicated server is not connected                                        |

A server the key cannot reach and a server that does not exist both answer `403`.

### Rate limits

Each key may make 120 requests a minute, with bursts of up to 30.

## Contributing an endpoint

The API is contract first. Every endpoint is a `defineEndpoint` entry in `packages/shared/src/public-api/endpoints.ts`, with zod schemas for its parameters, body and response. The OpenAPI document and the route handlers are built from it:

1. Add the endpoint to the contract, with a scope from `packages/shared/src/api-keys.ts`.
2. Add `apps/web/src/app/api/v1/<path>/route.ts` exporting the method as `publicApiRoute(endpoint, handler)`. The wrapper authenticates, checks the scope and server, validates input and strips any output the contract does not declare.
3. Call an actor-based function (`*As(actor, ...)`) so the permission check and audit log are the same as in the panel.

`apps/web/test/public-api-endpoints.test.ts` fails when a contract endpoint has no route or a v1 route bypasses the contract.
