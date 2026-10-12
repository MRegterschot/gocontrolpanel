# Security upgrade — account revocation and server credentials

This change introduces a user revocation column and encrypted dedicated-server/file-manager credentials. **Do not roll out only one process.** Web and GBX must run matching versions and use the same stable `SECRETS_KEY` (at least 32 characters). Retain an existing key if Codriver already uses it; changing it makes existing encrypted data unreadable.

## Existing installations

1. Take a database backup and securely preserve the existing encryption key. Stop the web and GBX processes so writes and connections cannot race the migration.
2. Configure the same `SECRETS_KEY` for both processes and for the migration command. Generate a cryptographically random value if none exists, for example `openssl rand -hex 32`. Do not copy the development example key into production.
3. From a checkout of this release with its dependencies installed, set `DB=mysql` or `DB=postgres` and `DATABASE_URL` for the intended database. Run `bun run deploy` to generate the client and apply the schema migrations, including `20261011140000_user_revocation_and_credentials`.
4. Run `bun run encrypt:server-credentials`. It handles both active and soft-deleted servers, encrypts the two credential columns in batches, verifies already-encrypted values with the supplied key, and does not print secrets. It is safe to rerun after interruption with the same key. An optimistic condition detects concurrent credential changes.
5. Restart both processes with the matching key. Verify a server connection and file-manager operation. A plaintext credential or wrong key now fails closed; there is no automatic plaintext fallback.

The audit-fix task did **not** execute these database migration commands. Test this procedure against a restored backup before deployment. Schema generation and unit tests do not substitute for the database migration.

For rollback, stop both processes and restore the matching code, database backup and key together. Old code would treat ciphertext as a dedicated-server password. Existing backups and previously copied credentials remain sensitive even after migration; rotate credentials if their exposure is known.

New installations apply the schema through the normal deployment flow, set the shared key, and write encrypted credentials from the beginning. Development/e2e seed scripts must use the same encryption key as the service.

## Account and permission changes

Deleting a panel user now soft-deletes its identity and clears authentication/global privileges. Existing cookies cannot recreate it, fresh OAuth login is rejected, and in-game admin/Codriver actor queries exclude it. Audit history and result identity references remain intact. Automatic player synchronization does not clear the tombstone. React session caching is confined to a request; roles continue to refresh on later requests. Existing sockets retain the previously implemented bounded lifetime and are not synchronously revoked.

Audit deletion now requires global admin or explicit `audit-logs:delete`; administration of a server/group/project alone is insufficient. Deletion remains transactionally audited. Codriver mutations now require confirmation even when a tool supplies no custom prompt; explicitly read-only tools remain immediate. Dedicated list filenames must be relative `.txt`/`.xml` paths without dot segments; existing Moderator permissions for list management are preserved.

User-directory GET endpoints now only read existing active rows. The user picker’s explicit search invokes a bounded, rate-limited Server Action to resolve/import an external account. Unknown default logins are not silently imported by a GET request.

## Deployment configuration

The production Compose example now requires `MARIADB_PASSWORD`, `MARIADB_ROOT_PASSWORD`, `REDIS_PASSWORD`, and the shared `SECRETS_KEY`. Use independent URL-safe random values for the DB/Redis passwords because they are interpolated into connection URLs. Configure those same credentials on existing database/Redis installations; changing a Compose database variable alone does not rotate an existing database account’s password.

Redis requires authentication. GBX port 3100 binds to loopback; put browser WebSockets behind the deployment’s TLS reverse proxy and configure `GBX_SERVICE_WS_URL` / `WS_ALLOWED_ORIGINS` accordingly. The internal service still requires its bearer token. Development Compose remains separately configured with loopback-only dependencies.

The session/WS server summaries now expose `hasFileManager`, not management addresses. Deploy web and service together so the Files navigation flag remains consistent. Remote addresses remain available through explicitly authorized server administration views.

CI actions are pinned to the upstream commit IDs resolved for their selected tags, and CI uses Bun 1.3.5. Previously fixed SSH host-key verification remains in place. Pinning is not an audit of third-party action code; review pinned revisions when updating them.
