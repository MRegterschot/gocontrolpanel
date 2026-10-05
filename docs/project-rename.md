# Project rename to TMControlPanel

The display name is **TMControlPanel**, the full identifier is `tmcontrolpanel`,
and the abbreviation is `tmcp` / `TMCP`.

## Changes made in this repository

| Area | Changes |
| --- | --- |
| UI and metadata | Updated the landing page, sidebar, welcome page, messages, page titles, social metadata, canonical site URL, and GitHub links. The site URL is now `https://tmcontrolpanel.com`. |
| Workspaces | Renamed the root package to `tmcontrolpanel` and `@gcp/*` packages to `@tmcp/*`; updated imports, dependencies, script filters, Next transpilation, bundler rules, Dockerfiles, CI, and `bun.lock`. The existing `@tmcontrolpanel/plugin-sdk` name and `tmcp-plugin` CLI remain the same. |
| Web routes | Renamed `(gocontroller)` to `(tmcontrolpanel)`, its layout function, and all imports into that group. Route groups do not appear in URLs, so public application paths stay the same. |
| Runtime identifiers | Renamed the Redis lifecycle channel to `tmcp:server-events`, WebSocket ticket issuer/audience to `tmcp-web` / `tmcp-gbx-ws`, GBX response ID to `tmcontrolpanel`, manialink name prefix to `TMCP:`, sandbox globals, and temporary-file prefixes. Updated tests and snapshots accordingly. |
| Containers and databases | Updated image references to `marijnregterschot/tmcontrolpanel` and `marijnregterschot/tmcontrolpanel-gbx-service`, including PostgreSQL variants. Renamed the panel Compose service, dev/e2e project names, database/user defaults, test credentials, healthchecks, SQL initialization contents, and four SQL filenames. The ManiaControl example password containing the old abbreviation also changed. |
| Deployment | Updated production/staging deploy executable names and Hetzner archive/download/installation paths. Release publishing now defaults to the new web and GBX image names; repository variables can still override them. |
| Plugins | Updated first-party manifests, SDK scaffolding, example documentation, registry branding and workflows. Renamed `GOCONTROLPANEL_REF` to `TMCONTROLPANEL_REF` in registry templates. Repacked the example ZIP and updated its SHA-256. The new names remain reserved plugin slugs; the old names are no longer reserved. |
| Documentation | Updated README, contribution instructions, historical changelog links/text, architecture plans, migration instructions, and test guides. |

Database schemas and migration histories were not changed by the rename. Plugin
slugs, capabilities, the `tmcp-plugin.json` manifest filename, and SDK version are
unchanged. The existing image assets contain no project-name text.

Local ignored `.env`, `.env.e2e`, and `apps/gbx-service/e2e/.env` contact branding
and comments were also updated. Their active database connections and real
account logins were preserved. These local edits are not part of a Git commit.

## Changes you still need to make

These require changes to external accounts, existing installations, or local
configuration. They were not performed by editing the repository.

| Action | Impact / next step |
| --- | --- |
| Rename the GitHub repository | Rename `MRegterschot/gocontrolpanel` to `MRegterschot/tmcontrolpanel` before relying on the new checkout/download/documentation links. Update clones with `git remote set-url origin git@github.com:MRegterschot/tmcontrolpanel.git`. The current checkout's remote still uses the old name. Review webhooks, badges, branch rules, and other integrations that store the repository name. |
| Rename the local checkout folder | The folder is still `/home/marijn/trackmania/gocontrolpanel`. Close processes using it, move it to `/home/marijn/trackmania/tmcontrolpanel`, and reopen your editor. Update saved workspace paths, scripts, and task configuration. The directory is outside the writable scope of this checkout's parent. |
| Publish Docker images | Create/publish `tmcontrolpanel`, `tmcontrolpanel-postgres`, `tmcontrolpanel-gbx-service`, and `tmcontrolpanel-gbx-service-postgres` under the configured Docker Hub account, with the tags you deploy. Set `DOCKER_IMAGE_NAME=tmcontrolpanel` and `DOCKER_GBX_IMAGE_NAME=tmcontrolpanel-gbx-service`, or remove those variables to use the new defaults. Existing values override the defaults. Compose pulls fail until the new image/tag exists. Consider keeping old repositories available for existing installations. |
| Set up the domain | Obtain/configure `tmcontrolpanel.com`, DNS, TLS, reverse proxy, and redirects from the old domain. The code now uses the new domain for canonical and social URLs; it does not register or configure it. Update `NEXTAUTH_URL` and any OAuth/API callback allowlists if the deployed app's origin changes. Users may need to sign in again on the new origin. |
| Update deploy scripts on your servers | Rename or provide `/usr/local/bin/deploy-tmcontrolpanel` and `/usr/local/bin/deploy-tmcontrolpanel-staging`; update their contents, checkout paths, image names, service names, cron/systemd references, and sudo permissions. CI now invokes these names and will fail if only the old executables exist. |
| Update existing Hetzner installations | Move the existing `/root/gocontrolpanel-master` installation to `/root/tmcontrolpanel-master`, preserving stack directories, data, and the expected `hetzner` subdirectory. Update generated restart/down scripts that contain absolute paths. The updated panel uses the new paths for add/restart/delete operations. |
| Update active environment files | Review root `.env`, `.env.e2e`, and `apps/gbx-service/e2e/.env`, plus deployment secrets/configuration. Remaining old references are in database URLs and existing Nadeo/dedicated-server logins (`NADEO_SERVER_LOGIN`, `TM_MASTERSERVER_LOGIN`). Local `NADEO_CONTACT` branding is already updated; update the equivalent contact text in deployment configuration. Change database URLs only after preparing the target database. Login names refer to real accounts: keep them until you create/reconfigure replacements through Nadeo. No secret values were copied into this report. |
| Update plugin registry repositories | Apply the new workflow templates to independently hosted registries and rename the optional branch variable to `TMCONTROLPANEL_REF`. Rebuild packages whose author/repository metadata you want to update, and refresh checksums. Already distributed versions should receive a new version when republished with different bytes. The checked-in hello archive is a template fixture, not a published release. |
| Update stored plugin metadata | Existing databases retain previously stored author/manifests/package bytes. The first-party installer preserves versions already stored under the same version number. Publish new plugin versions and update installs to adopt the renamed metadata; do not overwrite immutable published versions. This source rename does not alter stored plugin rows. |
| Review monitoring and integrations | Update Sentry/Plausible project labels or domain settings, uptime checks, reverse-proxy upstreams, backups, external scripts, and manually configured API contact names that use the old name. Their external settings cannot be changed through repository files. |
| Refresh externally hosted screenshots | README screenshots are hosted on Imgur and were not edited here. Replace any screenshots that show the old branding and update their image links; check GitHub social/release assets and externally hosted documentation too. |

## Existing installation migration

1. Back up the database and identify the current Compose project and volumes
   before starting the renamed stack. Stop the old panel and GBX service so both
   versions do not control the same dedicated server simultaneously.
2. Preserve existing data volumes. Dev changes from `gcp-dev` to `tmcp-dev`; e2e
   changes from `gcp-e2e` to `tmcp-e2e`. Renaming the checkout can also change the
   default production Compose project name. Docker derives volume names from
   that project, so a new project can start with empty data or collide on ports.
   Use the existing project explicitly (`docker compose -p <existing-project>`),
   or attach the existing volumes by their explicit names. A full storage-name
   rename requires a separate planned copy/restore; do not delete old volumes.
   The root infrastructure scripts can retain the old dev project through
   `COMPOSE_PROJECT_NAME=gcp-dev` during migration.
3. Keep both applications pointed at the same existing database initially, or
   copy/restore it to `tmcontrolpanel` and create the matching user/grants before
   changing `DATABASE_URL`. PostgreSQL can rename a database/user during a
   maintenance window; MySQL/MariaDB generally needs a copy/restore for the
   database name. Container initialization variables and SQL init files apply
   to fresh data directories; they do not rename existing databases/users or
   change passwords. Test databases now use `tmcp_test` / `tmcp_e2e` and the
   throwaway `tmcp` credentials. Existing ManiaControl installations also need
   their database password/config synchronized if adopting the new example.
4. Update the Compose panel service from `gocontrolpanel` to `tmcontrolpanel`
   in proxy targets and operations scripts. Remove the stopped old service
   container after verifying the replacement; keep its data volumes.
5. Deploy the renamed web app and GBX service together. Old/new builds use
   different lifecycle channels and ticket claims; mixing versions breaks
   Redis event delivery and WebSocket authentication. Outstanding live tickets
   become invalid; refresh/reconnect browser sessions after deployment. Existing
   durable Redis keys such as the jukebox are unchanged. Restart the service to
   redraw game widgets under the new manialink prefix.
   The root Compose configuration waits for the web server to listen before
   starting GBX, because the web entrypoint applies migrations first. Custom
   deployment configurations must also complete migrations before starting GBX.
   A `P2022` error for `plugins.source` indicates that the marketplace schema
   is missing from the connected database. Apply the migrations from the matching
   web image to that database, then restart GBX to retry first-party installation.
6. Reinstall dependencies with `bun install --frozen-lockfile`, regenerate Prisma
   with `DB=mysql bun run generate` (or `DB=postgres`), and rebuild deployed apps
   and plugin bundles. Clear/rebuild ignored Next build caches if they reference
   the old route group. Verify login, live sockets, plugin loading, server
   actions, and Hetzner controls before resuming normal use.

## Deliberate remaining old-name references

The old identifiers in this migration report explain the transition. Existing
Git history/configuration, active environment connection/account identifiers, and
ignored build/cache artifacts were not rewritten. Incidental `gcp` text
inside dependency integrity hashes in `bun.lock` was left intact: changing it
would invalidate package verification. No external repository, registry, domain,
account, database, or running container was renamed by this change.

## Verification performed

- `bun install --frozen-lockfile --offline` refreshed the renamed workspace links.
- All workspace typechecks passed after regenerating the MySQL Prisma client.
- All 451 unit tests passed across the web app, GBX service, shared package, and SDK.
- Production builds passed for the web app, GBX service, SDK, and all ten first-party plugins.
- The example registry validated, including the rebuilt ZIP's SHA-256.
- All eight non-template Compose configurations passed `docker compose config -q`.
- A final scan found no old project identifiers in repository source or the example
  ZIP outside this report and incidental dependency integrity hashes.
- `git diff --check` passed.

The web build initially found cached development route types using the old group;
those generated types were moved to `/tmp` and the build then passed. It still
emits Handlebars `require.extensions` webpack warnings. Live server/database
integration tests, Docker image builds, and deployment were not performed.
