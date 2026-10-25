# TMControlPanel rename inventory

Snapshot: 2026-10-24, before applying the rename. This is an inventory and migration checklist; creating it does not rename repositories, domains, packages, deployments, credentials, or data.

## Naming decisions

Use **TMControlPanel** as the display name, **tmcontrolpanel** as the repository/package/directory spelling, **TMCP** as the short display name, and **tmcp** for short internal identifiers. Use the existing **@tmcontrolpanel** npm scope consistently instead of introducing a second public scope.

| Current name                                      | Proposed name                                                 | Treatment                                                                                                               |
| ------------------------------------------------- | ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| GoControlPanel                                    | TMControlPanel                                                | Rename visible product branding and current documentation.                                                              |
| gocontrolpanel                                    | tmcontrolpanel                                                | Rename project/repository/package/service identifiers where applicable. Existing installations need migration handling. |
| GCP / gcp                                         | TMCP / tmcp                                                   | Review every match; this includes persistent protocols and unrelated checksum text.                                     |
| @gcp/web                                          | @tmcontrolpanel/web                                           | Rename private workspace and every import, script filter, and build reference.                                          |
| @gcp/gbx-service                                  | @tmcontrolpanel/gbx-service                                   | Same; GBX remains the protocol/service name.                                                                            |
| @gcp/db                                           | @tmcontrolpanel/db                                            | Rename workspace imports and dependency declarations.                                                                   |
| @gcp/shared                                       | @tmcontrolpanel/shared                                        | Rename workspace imports and bundler patterns.                                                                          |
| @tmcontrolpanel/plugin-sdk                        | Keep                                                          | Already uses the target name. Its description and links still contain the old name.                                     |
| tmcp-plugin / tmcp-plugin.json / \_\_tmcpRegister | Keep                                                          | Already match TMControlPanel. These are public plugin/CLI contracts.                                                    |
| GoControllerLayout / (gocontroller)               | TMControlPanelLayout / (panel)                                | Internal function and App Router route group. The group rename should preserve public URLs.                             |
| TM_ReverseCupGCP.Script.txt                       | TM_ReverseCupTMCP.Script.txt, if the script itself is renamed | Preserve support for deployed scripts and inherited filenames. Do not change only the lookup string.                    |

The target GitHub repository/domain/image names below are proposals unless explicitly described as existing. A GitHub lookup did not resolve `MRegterschot/tmcontrolpanel` during this inventory; this is not a reservation. Domain ownership and Docker/npm name availability were not checked.

## Changes inside this repository

### Product, website, and API branding

- [ ] `package.json`: change root `name: gocontrolpanel`; `/version` derives its product name from this manifest through `apps/gbx-service/src/core/chat/command-router.ts`.
- [ ] `apps/web/src/lib/site.ts`: change `SITE_NAME`, `SITE_TITLE`, `SITE_URL` (`https://gocontrolpanel.com`), and `GITHUB_URL`.
- [ ] `apps/web/src/app/layout.tsx`: metadata and the literal `GoControlPanel` SEO keyword. Metadata consumers include `app/login/page.tsx`, `app/robots.ts`, `app/sitemap.ts`, and landing-page structured data, even where those files contain no old-name literal.
- [ ] `apps/web/src/components/landing/landing-page.tsx`, `components/shell/app-sidebar.tsx`, and `app/(gocontroller)/page.tsx`: header, footer, accessibility labels, introduction, and welcome text.
- [ ] `apps/web/src/components/shell/site-header.tsx` and `components/plugins/uploaded-plugins.tsx`: GitHub, wiki, and SDK documentation links.
- [ ] `apps/web/src/lib/public-api/openapi.ts` and `app/api/v1/docs/route.ts`: OpenAPI title and API reference page title.
- [ ] `apps/web/src/forms/server/advanced/script-generator-form.tsx`, `actions/plugins.ts`, `actions/server-only/plugins.ts`, `lib/codriver/tools/scripts.ts`, and the Hetzner admin page: user-facing help, validation, and notices.
- [ ] `apps/gbx-service/src/config.ts`, example environment files, Compose examples, and seed scripts: Nadeo contact/application names and test-server names.
- [ ] `apps/gbx-service/src/infra/http/plugin-http-client.ts`: outbound `GoControlPanel-Plugin` User-Agent. Review any remote allowlists or dashboards that recognize it.
- [ ] Review `apps/web/public/logo.svg`, `apps/web/src/app/{favicon.ico,icon.ico,apple-icon.png,opengraph-image.png,twitter-image.png}` and screenshots/marketing art. Images cannot be cleared by text search. The Open Graph image was visually checked and is a controller icon without an old-name wordmark; the Twitter image preview has no readable wordmark. A visual redesign is a separate decision.

### Workspaces, imports, build tooling, and developer paths

- [ ] Rename the four private `@gcp/*` workspace names in `apps/*/package.json` and `packages/{db,shared}/package.json`.
- [ ] Update dependency keys in every workspace, including `packages/plugin-sdk/package.json`, and all TypeScript imports, re-exports, test imports, and type-only imports. The exhaustive file list is in Appendix A.
- [ ] Update root script `--filter @gcp/...` arguments and workflow/README/contributor-guide commands.
- [ ] In `packages/plugin-sdk/registry-template/.github/workflows/{check,publish}.yml`, update the main-repository checkout, `.gocontrolpanel` checkout/working-directory paths, and `GOCONTROLPANEL_REF` configuration name. If introducing `TMCONTROLPANEL_REF`, retain a fallback for registries still configuring the old variable. Apply the matching checkout change in the live plugin repository as well.
- [ ] Update `/^@gcp\//` bundling patterns in `apps/gbx-service/tsup.config.ts` and `packages/plugin-sdk/tsup.config.ts`. Check that the published SDK still bundles private shared code rather than depending on a private workspace.
- [ ] Regenerate `bun.lock` through Bun after manifest changes. Its workspace names/dependency keys change; unrelated dependency integrity hashes do not.
- [ ] Rename the `(gocontroller)` route-group directory and update literal imports in tests, plus `GoControllerLayout`. All 63 paths in that group are listed in Appendix B. Keep routes such as `/server/[id]` and `/admin` stable.
- [ ] Rename the local checkout/workspace file if desired, then update editor workspace folders, worktree metadata, scripts, shell aliases, run configurations, and any absolute filesystem references. Do not edit Git's worktree metadata with a text replacement; use Git worktree operations.
- [ ] Review `.claude/settings.local.json` and locally ignored environment files. Appendix E lists matches without copying their values.

### Docker, deployment, databases, and backups

- [ ] `docker-compose.yml`: Compose service `gocontrolpanel`, `depends_on`, internal `http://gocontrolpanel:3000` host, database/user defaults, and Docker Hub image names.
- [ ] `docker/{pyplanet,evosc,minicontrol,maniacontrol}/docker-compose.yml`: same changes for each integration example.
- [ ] Rename the four `docker/*/init/01-create-gocontrolpanel.sql` files and update SQL defaults for new installations. Database names/users are operational data, not Prisma model/table renames. Existing databases should remain usable through `DATABASE_URL` or be migrated explicitly.
- [ ] `dev/docker-compose.yml`: Compose project `gcp-dev`, MariaDB/Postgres database names and health checks. Changing a Compose project name changes generated container/network/volume names: preserve or explicitly migrate existing volumes.
- [ ] `apps/gbx-service/e2e/docker-compose.yml`, `e2e/.env.example`, `docker-compose.test.yml`, seed/watch scripts, and CI integration settings: `gcp-e2e`, `GCP e2e`, `gcp_e2e`, `gcp_test`, and test database usernames/password placeholders.
- [ ] `.github/workflows/docker-publish-on-release.yml`: `DOCKER_IMAGE_NAME` repository variable and the `gocontrolpanel-gbx-service` fallback for `DOCKER_GBX_IMAGE_NAME`. The GitHub variable-name inventory currently exposes `DOCKER_IMAGE_NAME`; values were not copied into this file.
- [ ] `.github/workflows/deploy-{production,staging}.yml`: remote `/usr/local/bin/deploy-gocontrolpanel` and `deploy-gocontrolpanel-staging` entry points. Update the actual host scripts, sudoers entries, service names, working directories, and deployment configuration together.
- [ ] `apps/web/hetzner/{server-init.sh.hbs,add-server.sh.hbs,update-containers.sh}` and `actions/hetzner/{server-setup,server-actions}.ts`: `gcp.zip`, GitHub archive URL, extracted `gocontrolpanel-master` directory, and every `/root/gocontrolpanel-master/hetzner` path. Existing provisioned machines still have the old directory; support both paths or migrate them before changing lifecycle actions.
- [ ] `scripts/backup-db.sh`, `scripts/backup.env.example`, and `docs/backups.md`: backup directory, log name, `gcp-` archive prefix, and local/SSH/rclone retention patterns. Keep retention/restore support for existing backup names; changing only the creation prefix breaks retention consistency.

### Compatibility-sensitive runtime identifiers

| Current identifier                                                      | Evidence                                                                                               | Required handling                                                                                                                                                                                                                                              |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `gcp_` API-key prefix                                                   | `packages/shared/src/api-keys.ts`, `apps/web/src/lib/api-keys/token.ts`, authentication tests and docs | Prefer `tmcp_` for newly issued keys, while accepting existing keys during transition. The prefix is part of the hashed token, so changing a stored display prefix alone does not rename an issued token. Reissue/rotate keys if legacy support is removed.    |
| `gcp-server:v1:` encrypted-credential marker                            | `packages/shared/src/crypto/server-credentials.ts`, credential tests, migration scripts/docs           | The current reader rejects a different marker. Introduce a reader that accepts both formats before changing writers, or migrate stored encrypted values explicitly. Preserve the encryption key and verify both dedicated-server and file-manager credentials. |
| `gcp:server-events` Redis Pub/Sub channel                               | `packages/shared/src/server-events.ts`, web publishers, GBX lifecycle subscriber                       | Coordinate publisher/subscriber deployment or temporarily bridge old/new channels. Avoid processing the same lifecycle update twice.                                                                                                                           |
| `gcp-web` / `gcp-gbx-ws` JWT issuer/audience                            | `packages/shared/src/ws/ticket.ts` and ticket tests                                                    | Coordinate signer/verifier changes or accept both pairs temporarily. Existing tickets have a 60-second default lifetime.                                                                                                                                       |
| `gocontrolpanel` script response ID                                     | `apps/gbx-service/src/core/server/live-sync.ts`, `game-event-handler.ts`, live-state tests             | Change request and callback response-ID matching together. In-flight replies carrying the old ID may need to drain.                                                                                                                                            |
| `GCP:` manialink name                                                   | `apps/gbx-service/templates/manialink.hbs`, snapshot tests                                             | Review name/ID behavior, displayed widgets, and unload cleanup; update snapshots after intentional output changes.                                                                                                                                             |
| `__gcp`, `__gcpLayouts`, `gcp-runtime.js`                               | sandbox `guest-runtime.ts`, `quickjs-vm.ts`, `sandboxed-plugin.ts`, and sandbox/guest tests            | Internal guest/host bridge: rename producer and consumer together. Keep public `__tmcpRegister` intact.                                                                                                                                                        |
| `TM_ReverseCupGCP.Script.txt` and inherited variants                    | `apps/web/src/lib/codriver/tools/scripts.ts`, `test/codriver-scripts.test.ts`                          | These are installed game-script filenames. Support old deployments and inheritance references when introducing a new filename.                                                                                                                                 |
| Reserved plugin slugs `gcp`, `gocontrolpanel`, `tmcp`, `tmcontrolpanel` | `packages/shared/src/plugins/manifest.ts`, manifest tests                                              | Keep legacy reservations to prevent identity spoofing or ambiguity; the new names are already reserved.                                                                                                                                                        |

Do not introduce a generic replacement for every Redis key, auth cookie, environment variable, GBX setting, or database column. Many use feature/protocol names with no old product brand. Review domain-bound settings when moving hosts, even where their variable names stay unchanged.

### Documentation, examples, tests, and immutable history

- [ ] Current `README.md`, `CONTRIBUTING.md`, root/web `AGENTS.md`, `apps/web/CLAUDE.md`, GBX README, backup/setup/SDK/marketplace/API docs, generated scaffolding copy, example plugin author/repository, and registry-template display name.
- [ ] Update GitHub badge links, percent-encoded Docker Hub links, release/compare links, source links, archive links, wiki links, clone/install paths, and SDK guide URLs.
- [ ] Update fixtures and expected output in web, shared, GBX, and SDK tests. Regenerate intentional manialink/brand snapshots. Do not change opaque test input or dependency bytes merely because a substring matches.
- [ ] Review `CHANGELOG.md` and historical audit/refactor reports separately. Update navigation links where useful; preserve historical descriptions and raw security evidence unless deliberately annotating the rename. Old Git commits/tags/releases and vulnerability IDs are not a source-code rename target.
- [ ] Rebuild generated docs, plugin registry `_site` output, application bundles, Docker images, and any published SDK/CLI artifacts from renamed source. Do not hand-edit generated dependency code or immutable release archives.

## Other repositories and published artifacts

The first column below was confirmed from local remotes and/or read-only GitHub metadata. No repositories or packages were renamed.

| Existing resource                                             | Plan / proposed name                                    | Notes                                                                                                                                                                                                                                                                                          |
| ------------------------------------------------------------- | ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `MRegterschot/gocontrolpanel`                                 | `MRegterschot/tmcontrolpanel`                           | Main repository. Current GitHub metadata uses `master` as default branch and `https://gocontrolpanel.com` as homepage. Review About text, topics, social preview, releases, Actions settings, webhooks, integrations, branch rules, and README badges. A branch rename is a separate decision. |
| `kistz/gocontrolpanel`                                        | Coordinate separately                                   | A configured local remote; ownership is independent. Update local remote URLs and notify fork/integration maintainers when appropriate.                                                                                                                                                        |
| `MRegterschot/tmcontrolpanel-plugins`                         | Keep repository name                                    | Already correct. Rename display metadata/description from GoControlPanel, first-party plugin `author` fields, plugin READMEs, SDK clone links, and both Actions checkout references. Appendix C inventories all 63 matching files.                                                             |
| `MRegterschot/tmcontrolpanel-plugins.wiki.git`                | Keep repository name; update contents                   | `scripts/publish-wiki.ts` publishes the local `wiki/` directory. Re-publish current docs after changing old main-repository links.                                                                                                                                                             |
| `MRegterschot/gocontrolpanel.wiki.git` / main-repo wiki links | Review renamed main-repo wiki and links                 | Main header links to the wiki; its separate Git content was not cloned for this inventory. Check it during cutover.                                                                                                                                                                            |
| `MRegterschot/GoController`                                   | Review as a separate legacy project                     | GitHub describes it as a Trackmania server controller written in Go; it is not archived. Decide whether its README should point to TMControlPanel. Do not assume it is this TypeScript project's old checkout.                                                                                 |
| `MRegterschot/trackmania-server-fm`                           | Keep, or optionally `tmcontrolpanel-filemanager`        | Shared file-manager project with its own consumers and Docker image. No product-name text matches were found in its tracked local text files. Renaming is optional; coordinate image/module/import consumers if chosen.                                                                        |
| `MRegterschot/GbxRemoteGo`, `Nixotica/GbxRemoteGo-1`          | Keep                                                    | Independent Go protocol library/fork names. No matching product-brand text found in local tracked text files. Do not change the word Go solely because this panel is being renamed.                                                                                                            |
| `MRegterschot/GbxRemote.Net`, `MRegterschot/GbxConnector`     | Keep; review only cross-links/integration metadata      | Discovered in GitHub repository metadata. Their contents were not cloned/scanned.                                                                                                                                                                                                              |
| `MRegterschot/tm-tourney-manager`                             | Keep                                                    | Local tracked text scan found no matches. It may still be an API consumer whose configuration needs a new website URL.                                                                                                                                                                         |
| `MRegterschot/docker-trackmania-plus`                         | Keep; review integration links/images                   | Discovered in GitHub metadata; contents were not cloned/scanned.                                                                                                                                                                                                                               |
| `marijnregterschot/gocontrolpanel`                            | `marijnregterschot/tmcontrolpanel`                      | Web image. Keep old tags/images available during migration and update Docker Hub description, source link, and badges.                                                                                                                                                                         |
| `marijnregterschot/gocontrolpanel-postgres`                   | `marijnregterschot/tmcontrolpanel-postgres`             | PostgreSQL web-image variant.                                                                                                                                                                                                                                                                  |
| `marijnregterschot/gocontrolpanel-gbx-service`                | `marijnregterschot/tmcontrolpanel-gbx-service`          | GBX image, including configured CI fallback.                                                                                                                                                                                                                                                   |
| `marijnregterschot/gocontrolpanel-gbx-service-postgres`       | `marijnregterschot/tmcontrolpanel-gbx-service-postgres` | PostgreSQL GBX-image variant.                                                                                                                                                                                                                                                                  |
| `marijnregterschot/trackmania-server-fm`                      | Keep unless its separate repository is renamed          | Used by development, production examples, and Hetzner provisioning.                                                                                                                                                                                                                            |
| `@tmcontrolpanel/plugin-sdk`, `tmcp-plugin` CLI               | Keep                                                    | Confirm npm organization/package permissions and future publication metadata. The SDK guide currently says it is not on npm yet; publication/availability was not independently checked.                                                                                                       |

Published plugin ZIPs, version metadata and registry hashes must remain immutable. Updating a first-party plugin manifest's author/repository changes package bytes: publish a new version with a new hash rather than rewriting an existing release ZIP. Existing `tmcp-plugin.json` filenames and SDK imports already use the intended branding.

## Websites, domains, and external configuration

| Resource                                         | Current evidence                                                                                                                                      | Cutover checklist                                                                                                                                                                                                                                                                                                                                                    |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Product homepage                                 | `https://gocontrolpanel.com` in `site.ts` and main GitHub homepage metadata                                                                           | Proposed canonical `https://tmcontrolpanel.com`, subject to ownership/availability. Configure DNS/TLS, canonical URLs, www/apex redirects, old-domain redirects, and the GitHub homepage field. Preserve old links, query strings, and useful paths.                                                                                                                 |
| Marketplace                                      | `https://mregterschot.github.io/tmcontrolpanel-plugins/` confirmed by GitHub Pages metadata; default index `/index.json`; no custom domain configured | Already matches the target. Keep it, or intentionally choose `plugins.tmcontrolpanel.com`; update `DEFAULT_MARKETPLACE_URL` in `packages/shared/src/plugins/marketplace-index.ts`, panel overrides, docs, registry links, and CORS/cache behavior together.                                                                                                          |
| Main repository Pages                            | Read-only API lookup returned 404                                                                                                                     | Main GitHub Pages hosting was not confirmed. Do not assume the production homepage is hosted by GitHub Pages.                                                                                                                                                                                                                                                        |
| API, WebSocket, docs, staging and demo hostnames | No complete production hostname inventory is stored in this checkout                                                                                  | Check whether current deployment uses old-name subdomains. Decided new names: `tmcontrolpanel.com`, `staging.tmcontrolpanel.com`, `gbx.tmcontrolpanel.com`, `gbx-staging.tmcontrolpanel.com` (see Step 0).                                                                                                                                                           |
| Nadeo OAuth application                          | `NEXTAUTH_URL`, `NADEO_REDIRECT_URI`, contact strings in environment examples                                                                         | Update app display name, allowed redirects, production/staging callback URLs, and contact identity in the Nadeo manager. Coordinate cookie/session behavior and re-login after a domain change.                                                                                                                                                                      |
| Browser and service connectivity                 | `GBX_SERVICE_URL`, `GBX_SERVICE_WS_URL`, `WS_ALLOWED_ORIGINS`, `PANEL_INTERNAL_URL`                                                                   | Update configured hostnames, reverse proxy routing, TLS, allowed origins, Codriver callbacks, and external API client base URLs. Keep variable names unless there is a separate reason to change them.                                                                                                                                                               |
| Analytics and error monitoring                   | `PlausibleProvider` and Sentry integrations                                                                                                           | Check Plausible site/domain settings, Sentry project/display names, allowed URLs, release labels and source-map upload settings. External dashboard state was not inspected.                                                                                                                                                                                         |
| Deployment and communication                     | Workflow Docker/SSH configuration and Discord release-notes workflow                                                                                  | Review GitHub environment/repository variables, deploy-host script names and sudoers, cron/systemd/container dashboards, uptime checks, backup destinations, Discord webhook display name/avatar/channel text, email sender/support addresses, public announcements, and external bookmarks/integration docs. Actual secret values were not read for this checklist. |

## Local sibling folders and operational data

- `/home/marijn/gotrackmania/gocontrolpanel`: rename checkout directory if desired, after updating running commands and tooling references.
- `/home/marijn/gotrackmania/gocontrolpanel-tmservers`: a linked worktree of the same repository on branch `tmservers`, not an additional GitHub repository. Its branch also contains old names; Appendix D lists its matching files and lines. Coordinate changes across branches and use `git worktree move` if renaming the folder.
- `/home/marijn/gotrackmania/gocontrolpanel.code-workspace`: rename the workspace file and its `gocontrolpanel`/`gcp-services` folder entries; keep the already-correct plugin folder entry.
- `/home/marijn/gotrackmania/gcp-services`: local operational directory, not a Git checkout. Consider `tmcp-services`. Its Compose/tutorial references are listed in Appendix E. Database dumps, game binaries, downloaded maps, logs, dedicated-server credentials and player data were deliberately excluded from content scanning.
- `/home/marijn/gotrackmania/{backups,db-backups}`: directory names are generic; review archive names, remote backup targets and restore scripts for old prefixes. Backup contents were not scanned or changed.
- Local running containers, volumes, networks, systemd/cron configuration, deployment hosts, managed database names, DNS registrations and vendor dashboards need a separate operational inventory. This source inventory does not establish their complete live state.

## Suggested implementation order and verification

Steps run from least to highest impact. Nothing is deployed from the `release` branch: deployments and Docker images come from the latest GitHub release. Merged changes therefore only reach running installs when a release is published, so the release boundaries below are the real rollout points. Steps 1-5 and 11 can each be a separate branch or PR; Steps 8-10 touch resources outside this repository.

Release boundaries:

- Release A: Steps 1-6 (branding, workspace rename, compatibility readers). Writers are unchanged, so it is safe to roll back to the previous release.
- Release B: Step 7 (writers), published only after Release A is deployed on every instance, since older releases cannot read the new formats.
- Steps 9-10 changes (image names, deploy scripts, domain) must be prepared before the release that depends on them, because the release workflow publishes the images and the deploy workflows run from the released version.

### Step 0: Decisions (blocks everything)

Decided 2026-10-25:

- [x] GitHub repository: `MRegterschot/tmcontrolpanel`.
- [x] Domain: `tmcontrolpanel.com` (owned).
- [x] Docker Hub: `marijnregterschot/tmcontrolpanel` and `marijnregterschot/tmcontrolpanel-gbx-service` exist.
- [x] npm: the `tmcontrolpanel` organization is owned, so the `@tmcontrolpanel` scope is available.
- [x] Databases are backed up before any migration. Do not reset or migrate a database to verify changes.
- [x] `trackmania-server-fm` keeps its name (default).
- [x] `kistz/gocontrolpanel` is coordinated separately; update local remote URLs only after the GitHub rename.
- [x] Docker Hub Postgres variants exist: `marijnregterschot/tmcontrolpanel-postgres` and `marijnregterschot/tmcontrolpanel-gbx-service-postgres`.
- [x] Hostnames: `tmcontrolpanel.com` (production web), `staging.tmcontrolpanel.com` (staging web), `gbx.tmcontrolpanel.com` (production GBX service), `gbx-staging.tmcontrolpanel.com` (staging GBX service). No `api`, `docs`, `plugins`, `demo`, or `status` subdomains; the earlier candidate list is dropped.

### Step 1: Documentation and history (no runtime risk)

- [x] Current docs: `README.md`, `CONTRIBUTING.md`, root/web `AGENTS.md`, `apps/web/CLAUDE.md`, GBX README, backup/setup/SDK/marketplace/API docs.
- [x] Badges, wiki links, clone/install paths. Keep Docker Hub links on the old names until Step 9.
- [x] `CHANGELOG.md` and audit reports: update navigation links only, preserve history.
- [x] Leave the false positives untouched (`bun.lock` hashes, `GHSA-xjpj-3mr7-gcpf`).

Done in the Step 1 PR. Left for later steps: `@gcp/*` filters in docs (Step 4), `(gocontroller)` and `gcp_`/`gcp-` identifiers in docs (Steps 5-7), `GOCONTROLPANEL_REF` (Step 8), and image, container, database and backup names in README, migration and backup docs (Step 9). Historical plans and audits were not edited.

### Step 2: Visible branding strings

- [x] `site.ts`, `layout.tsx` (including the SEO keyword), landing page, sidebar, site header, uploaded plugins, welcome page, OpenAPI and API docs titles.
- [x] Form/action help text, Codriver script text, Hetzner admin page.
- [x] Root `package.json` `name`; verify the `/version` chat command output.
- [x] Env examples, Nadeo contact/application names, seed scripts, test-server names.
- [x] Keep `SITE_URL` on the old domain until Step 10 unless the new domain is live.

Done in the Step 2 PR. Left for later steps: `SITE_URL` (Step 10), the `GoControlPanel-Plugin` User-Agent and the `gocontrolpanel` script response ID (Step 7), `gcp`/`GCP` test-server and seed names (Step 3), database names and Docker image names in the env examples and compose files (Step 9), and fixture authors in tests.

### Step 3: Dev and test-only identifiers

- [x] `gcp-e2e`, `gcp_e2e`, `gcp_test` in the e2e/test compose files, env examples, and seed/watch scripts.
- [x] `gcp-dev` Compose project: keep the project name pinned or migrate volumes.
- [x] Test fixtures that hardcode brand strings.

Done in the Step 3 PR: e2e and test stacks now use `tmcp-e2e`, `tmcp_e2e`, `tmcp_test`, `tmcp-gbx-test`, `TMCP e2e` and the `tmcp` test user. The `gcp-dev` Compose project name and the `gocontrolpanel` development database name were kept on purpose, because renaming the project orphans the `gcp-dev_*` volumes; migrate them separately if wanted (Step 9 covers database names). Existing local `.env.e2e` files and e2e volumes still use the old names and need updating or `down -v`. The `gcp:server-events` channel in the real-server test doc waits for Step 7.

### Step 4: Workspace rename `@gcp/*` to `@tmcontrolpanel/*`

- [x] Rename the four private workspace names and every dependency key (including `packages/plugin-sdk`).
- [x] Update all imports, re-exports, test imports, and type-only imports (Appendix A).
- [x] Update root `--filter` arguments, workflows, Dockerfiles, and contributor commands.
- [x] Update the `/^@gcp\//` patterns in `apps/gbx-service/tsup.config.ts` and `packages/plugin-sdk/tsup.config.ts`; confirm the SDK still bundles shared code.
- [x] Regenerate `bun.lock` with `bun install`.
- [x] Gate: typecheck, test, and build for the workspace with both `DB=mysql` and `DB=postgres`.

Done in the Step 4 PR. The tsup patterns became `/^@tmcontrolpanel\/(?!plugin-sdk)/`: the public `@tmcontrolpanel/plugin-sdk` must stay external, and a plain scope match would bundle it. `bun.lock` was edited for the renamed workspace entries only (no dependency changes) and accepted by `bun install --frozen-lockfile`. Historical plans and audits still mention `@gcp/*`.

### Step 5: Route group and internal symbols

- [x] `git mv` `(gocontroller)` to `(panel)` (63 paths, Appendix B) and fix literal imports in tests.
- [x] Rename `GoControllerLayout` to `TMControlPanelLayout`.
- [x] Gate: public URLs (`/server/[id]`, `/admin`, ...) are unchanged.

Done in the Step 5 PR. Route manifests before and after list the same 164 app routes once the group segment is ignored. If a dev server was running, delete `apps/web/.next/dev/types` once: stale generated types still point at the old path and break `typecheck`.

### Step 6: Compatibility readers (additive, writers unchanged)

- [x] API keys: verify both `gcp_` and `tmcp_`.
- [x] Credentials: read both `gcp-server:v1:` and the new marker for dedicated-server and file-manager credentials, same encryption key.
- [x] JWT tickets: verifier accepts both `gcp-web`/`gcp-gbx-ws` and the new issuer/audience pair.
- [x] Redis: GBX subscribes to both `gcp:server-events` and the new channel, with dedupe so a lifecycle event is not processed twice.
- [x] Script response ID: callback matching accepts the old `gocontrolpanel` ID and the new one.
- [x] Keep the legacy reserved plugin slugs.
- [x] Add tests for old and new formats.
- [ ] Publish as a GitHub release and deploy to every instance before Step 7 is released.

Done in the Step 6 PR; writers are unchanged. New values readers accept: `tmcp_` keys, `tmcp-server:v1:` credentials, `tmcp-web`/`tmcp-gbx-ws` JWT claims, `tmcp:server-events` channel, `tmcp` script response ID. GBX drops an identical message arriving on both Redis channels within 1s; repeats on one channel are not collapsed.

### Step 7: Switch the writers

Merge to `release` freely, but only cut the release after Release A is running everywhere.

- [ ] Issue `tmcp_` API keys, write the new credential marker, sign the new JWT claims, publish on the new Redis channel, use the new script response ID.
- [ ] Rename the sandbox bridge (`__gcp`, `__gcpLayouts`, `gcp-runtime.js`) in producer and consumer together; keep `__tmcpRegister`.
- [ ] Change the `GCP:` manialink name and update snapshots intentionally.
- [ ] Change the `GoControlPanel-Plugin` User-Agent after checking remote allowlists.
- [ ] Codriver: add `TM_ReverseCupTMCP.Script.txt` while still supporting the old filename and inheritance references.

### Step 8: Plugin registry repository (immutable artifacts)

- [ ] Registry-template workflows: checkout path, `.gocontrolpanel` directory, `TMCONTROLPANEL_REF` with a fallback to `GOCONTROLPANEL_REF`. Apply the same change to the live plugin repository.
- [ ] Update the 63 plugin-repository files (Appendix C): authors, READMEs, SDK links.
- [ ] Publish new plugin versions with new hashes; never rewrite an existing ZIP.
- [ ] Rebuild `_site` output and re-publish the wiki with `scripts/publish-wiki.ts`.

### Step 9: Docker, deployment, and operations

- [ ] `docker-compose.yml` service and image names, plus the four `docker/*/docker-compose.yml` examples.
- [ ] Rename the four `01-create-gocontrolpanel.sql` files; existing databases stay reachable through `DATABASE_URL`.
- [ ] `docker-publish-on-release.yml`: `DOCKER_IMAGE_NAME` variable and GBX fallback. Publish new image names and keep old tags available.
- [ ] Hetzner scripts and actions: `gcp.zip`, archive URL, `/root/gocontrolpanel-master/hetzner`. Support both paths or migrate existing machines first.
- [ ] Backups: new `tmcp-` creation prefix, with retention and restore still matching old `gcp-` archives.
- [ ] Deploy workflows and host scripts (`deploy-gocontrolpanel`, staging variant): update host scripts, sudoers, service names, and working directories together.

### Step 10: Domain and external cutover

- [ ] GitHub repository rename: homepage, About text, topics, webhooks, Actions settings, branch rules, badges.
- [ ] Domain: DNS, TLS, canonical URLs, apex/www and old-domain redirects preserving paths and query strings; then update `SITE_URL`.
- [ ] Nadeo OAuth application: name, redirect URIs for production/staging, contact. Users must log in again.
- [ ] Update `NEXTAUTH_URL`, `NADEO_REDIRECT_URI`, `GBX_SERVICE_URL`, `GBX_SERVICE_WS_URL`, `WS_ALLOWED_ORIGINS`, `PANEL_INTERNAL_URL`, reverse proxy, and CORS.
- [ ] Plausible, Sentry, uptime checks, Discord webhook, email sender, Docker Hub descriptions, external bookmarks.
- [x] Image assets: the Chicane logo set from `feat/rename-to-tmcp` (commit `c2696bb1`) is applied in the branding PR: favicon, icons, Open Graph and Twitter images, `logo.svg`, and `BrandMark` in the landing page, sign-in screen and sidebar. Source files are in `apps/web/branding` and `docs/branding`.

### Step 11: Local environment (any time after Step 4)

- [ ] Rename the checkout directory, `gocontrolpanel.code-workspace`, and `gcp-services` (for example `tmcp-services`).
- [ ] Use `git worktree move` for `gocontrolpanel-tmservers`; rebase the `tmservers` branch after Step 4 (Appendix D).
- [ ] Review `.claude/settings.local.json` and ignored env files (Appendix E).

### Step 12: Final sweep and verification

- [ ] Run workspace typecheck and tests for both database providers, the plugin registry validator, and the plugin consumer build.
- [ ] Manually test old and new API keys, stored credential decryption, ticket verification, server lifecycle Pub/Sub, game widgets/callbacks, Hetzner lifecycle actions, backup restore/retention, and old-domain links.
- [ ] Repeat the source/path searches. Classify remaining matches as deliberate compatibility, immutable history, an independent project, an existing target name, or a false positive.
- [ ] Remove compatibility support only as an explicit later change.

## Scan scope, counts, and false positives

The appendices below were generated from the tracked working-tree contents, including hidden tracked files and the lockfile, before adding this document. The case-insensitive content expression was:

```text
gocontrolpanel|go[ _-]*control[ _-]*panel|go[ _-]*controller|gcp|tmcontrolpanel|tmcp|gotrackmania
```

The short forms were intentionally matched as substrings to catch `__gcp`, `GCP:`, `gcp_`, and `TM_ReverseCupGCP`. Each matching file and each matching line are listed, not just representative examples. Match labels show spellings rather than source excerpts so credentials are not reproduced. Line numbers refer to this snapshot and will move after edits.

- Main repository: **1,282 tracked paths; 407 matching text files; 934 matching lines**.
- Plugin repository: **63 matching text files; 146 matching lines**.
- Linked `tmservers` worktree: **316 matching text files; 819 matching lines**. Text files over 5 MB were excluded in this supplementary worktree scan.
- Main-repository path search: **63 paths under `(gocontroller)`**, **four old-name SQL filenames**, and the already-correct `tmcp-plugin.json` example filename.
- Tracked text scans of local `trackmania-server-fm`, `GbxRemoteGo`, `GbxRemoteGo-1`, and `tm-tourney-manager` checkouts found **zero matches**. This does not inventory their remote branches or runtime configuration.
- Binary contents, Git object/history contents, dependency directories, generated ignored build output, databases/dumps, and remote vendor-dashboard settings were not exhaustively scanned. Ignored local environment files were checked only for matching tokens and line numbers.

**Do not replace these false positives:** `bun.lock` lines **834, 1248, 2582** match inside dependency integrity hashes. `docs/audits/2026-10-11-dependencies.json` line **953** contains the advisory identifier `GHSA-xjpj-3mr7-gcpf`. These are unrelated to the product name. Independent third-party domains such as `cloudfunctions.net`, Nadeo APIs, Bun/Next.js package names, and the words Go/GBX/Trackmania do not become rename targets just because this project changes its name.

No application tests were needed for this inventory-only change. Verification checks cover appendix completeness, referenced line existence, Markdown formatting, and `git diff --check`.

## Appendix A — every main-repository text match

407 files; 934 matching lines. Each entry lists every matched line in that file.

- [.env.example](../.env.example#L6) — lines 6, 9, 31; spellings: `gocontrolpanel`, `GoControlPanel`.
- [.github/workflows/deploy-production.yml](../.github/workflows/deploy-production.yml#L38) — lines 38; spellings: `gocontrolpanel`.
- [.github/workflows/deploy-staging.yml](../.github/workflows/deploy-staging.yml#L39) — lines 39; spellings: `gocontrolpanel`.
- [.github/workflows/docker-publish-on-release.yml](../.github/workflows/docker-publish-on-release.yml#L36) — lines 36; spellings: `gocontrolpanel`.
- [.github/workflows/nextjs-build-check.yml](../.github/workflows/nextjs-build-check.yml#L48) — lines 48; spellings: `gcp`.
- [.github/workflows/workspace-check.yml](../.github/workflows/workspace-check.yml#L36) — lines 36, 37, 38, 42, 43, 44, 45, 49, 50, 63, 64, 65, 68, 76, 77, 94; spellings: `gcp`, `tmcontrolpanel`.
- [AGENTS.md](../AGENTS.md#L1) — lines 1, 3, 9, 10, 11, 12, 13, 23, 33, 34; spellings: `gcp`, `GoControlPanel`, `tmcontrolpanel`.
- [CHANGELOG.md](../CHANGELOG.md#L3) — lines 3, 25, 74, 328, 523, 524, 525, 526, 527, 528, 529, 530, 531, 532, 533, 534, 535, 536, 537, 538, 539, 540, 541, 542, 543, 544, 545, 546, 547, 548, 549, 550, 551, 552, 553, 554, 555, 556, 557, 558, 559, 560; spellings: `gocontrolpanel`, `GoControlPanel`, `tmcp`.
- [README.md](../README.md#L1) — lines 1, 2, 3, 5, 7, 47, 170, 174, 175, 185, 194, 212, 221, 223, 242, 243, 245, 247, 252, 253, 263, 265, 271, 282, 283, 297, 299, 311, 316, 323, 330, 358, 372, 378, 379, 387, 395, 397, 415, 427, 429, 435, 480, 492, 495; spellings: `gocontrolpanel`, `GoControlPanel`.
- [apps/gbx-service/.env.example](../apps/gbx-service/.env.example#L5) — lines 5, 7, 33; spellings: `gocontrolpanel`, `GoControlPanel`.
- [apps/gbx-service/Dockerfile](../apps/gbx-service/Dockerfile#L26) — lines 26; spellings: `gcp`.
- [apps/gbx-service/README.md](../apps/gbx-service/README.md#L12) — lines 12, 19, 20, 23, 24, 25, 27, 28, 58; spellings: `gcp`, `tmcontrolpanel`.
- [apps/gbx-service/docker-compose.test.yml](../apps/gbx-service/docker-compose.test.yml#L6) — lines 6, 7, 8; spellings: `gcp`.
- [apps/gbx-service/e2e/.env.example](../apps/gbx-service/e2e/.env.example#L14) — lines 14, 25; spellings: `gcp`, `GoControlPanel`.
- [apps/gbx-service/e2e/docker-compose.yml](../apps/gbx-service/e2e/docker-compose.yml#L2) — lines 2, 3, 18, 26, 27, 28, 29; spellings: `GCP`, `gcp`, `GoControlPanel`.
- [apps/gbx-service/package.json](../apps/gbx-service/package.json#L2) — lines 2, 25, 26, 42; spellings: `gcp`, `tmcontrolpanel`.
- [apps/gbx-service/scripts/seed-e2e.ts](../apps/gbx-service/scripts/seed-e2e.ts#L1) — lines 1, 3, 4, 27, 60; spellings: `GCP`, `gcp`.
- [apps/gbx-service/scripts/ws-watch.ts](../apps/gbx-service/scripts/ws-watch.ts#L3) — lines 3, 29, 30; spellings: `GCP`, `gcp`.
- [apps/gbx-service/src/config.ts](../apps/gbx-service/src/config.ts#L1) — lines 1, 33; spellings: `gcp`, `GoControlPanel`.
- [apps/gbx-service/src/container.ts](../apps/gbx-service/src/container.ts#L1) — lines 1; spellings: `gcp`.
- [apps/gbx-service/src/core/chat/chat-service.ts](../apps/gbx-service/src/core/chat/chat-service.ts#L1) — lines 1; spellings: `gcp`.
- [apps/gbx-service/src/core/chat/codriver-window.ts](../apps/gbx-service/src/core/chat/codriver-window.ts#L1) — lines 1; spellings: `gcp`.
- [apps/gbx-service/src/core/chat/command-router.ts](../apps/gbx-service/src/core/chat/command-router.ts#L1) — lines 1; spellings: `gcp`.
- [apps/gbx-service/src/core/errors.ts](../apps/gbx-service/src/core/errors.ts#L1) — lines 1; spellings: `gcp`.
- [apps/gbx-service/src/core/gbx/callbacks.ts](../apps/gbx-service/src/core/gbx/callbacks.ts#L15) — lines 15, 17; spellings: `gcp`, `GoControlPanel`.
- [apps/gbx-service/src/core/live/live-state.ts](../apps/gbx-service/src/core/live/live-state.ts#L13) — lines 13; spellings: `gcp`.
- [apps/gbx-service/src/core/live/modes.ts](../apps/gbx-service/src/core/live/modes.ts#L1) — lines 1; spellings: `gcp`.
- [apps/gbx-service/src/core/live/points.ts](../apps/gbx-service/src/core/live/points.ts#L1) — lines 1; spellings: `gcp`.
- [apps/gbx-service/src/core/manialink/action-router.ts](../apps/gbx-service/src/core/manialink/action-router.ts#L1) — lines 1; spellings: `gcp`.
- [apps/gbx-service/src/core/manialink/components/manialink.ts](../apps/gbx-service/src/core/manialink/components/manialink.ts#L1) — lines 1; spellings: `gcp`.
- [apps/gbx-service/src/core/manialink/template-renderer.ts](../apps/gbx-service/src/core/manialink/template-renderer.ts#L1) — lines 1; spellings: `gcp`.
- [apps/gbx-service/src/core/plugins/first-party.ts](../apps/gbx-service/src/core/plugins/first-party.ts#L1) — lines 1; spellings: `gcp`.
- [apps/gbx-service/src/core/plugins/marketplace-watcher.ts](../apps/gbx-service/src/core/plugins/marketplace-watcher.ts#L1) — lines 1; spellings: `gcp`.
- [apps/gbx-service/src/core/plugins/plugin-context.ts](../apps/gbx-service/src/core/plugins/plugin-context.ts#L5) — lines 5; spellings: `gcp`.
- [apps/gbx-service/src/core/plugins/plugin-host.ts](../apps/gbx-service/src/core/plugins/plugin-host.ts#L1) — lines 1; spellings: `gcp`.
- [apps/gbx-service/src/core/plugins/sandbox/guest-runtime.ts](../apps/gbx-service/src/core/plugins/sandbox/guest-runtime.ts#L10) — lines 10, 21, 25, 141, 369; spellings: `gcp`, `tmcontrolpanel`, `tmcp`.
- [apps/gbx-service/src/core/plugins/sandbox/package-loader.ts](../apps/gbx-service/src/core/plugins/sandbox/package-loader.ts#L1) — lines 1, 2; spellings: `gcp`.
- [apps/gbx-service/src/core/plugins/sandbox/quickjs-vm.ts](../apps/gbx-service/src/core/plugins/sandbox/quickjs-vm.ts#L87) — lines 87, 166; spellings: `gcp`.
- [apps/gbx-service/src/core/plugins/sandbox/sandboxed-plugin.ts](../apps/gbx-service/src/core/plugins/sandbox/sandboxed-plugin.ts#L12) — lines 12, 13, 191, 195; spellings: `gcp`.
- [apps/gbx-service/src/core/plugins/sdk.ts](../apps/gbx-service/src/core/plugins/sdk.ts#L1) — lines 1; spellings: `gcp`.
- [apps/gbx-service/src/core/ports.ts](../apps/gbx-service/src/core/ports.ts#L8) — lines 8; spellings: `gcp`.
- [apps/gbx-service/src/core/server/game-event-handler.ts](../apps/gbx-service/src/core/server/game-event-handler.ts#L17) — lines 17; spellings: `gcp`.
- [apps/gbx-service/src/core/server/live-sync.ts](../apps/gbx-service/src/core/server/live-sync.ts#L1) — lines 1, 17; spellings: `gcp`, `gocontrolpanel`.
- [apps/gbx-service/src/core/server/map-catalog.ts](../apps/gbx-service/src/core/server/map-catalog.ts#L1) — lines 1; spellings: `gcp`.
- [apps/gbx-service/src/core/server/map-list.ts](../apps/gbx-service/src/core/server/map-list.ts#L1) — lines 1; spellings: `gcp`.
- [apps/gbx-service/src/core/server/match-recorder.ts](../apps/gbx-service/src/core/server/match-recorder.ts#L1) — lines 1; spellings: `gcp`.
- [apps/gbx-service/src/core/server/players.ts](../apps/gbx-service/src/core/server/players.ts#L1) — lines 1; spellings: `gcp`.
- [apps/gbx-service/src/core/server/server-commands.ts](../apps/gbx-service/src/core/server/server-commands.ts#L1) — lines 1; spellings: `gcp`.
- [apps/gbx-service/src/core/server/server-events.ts](../apps/gbx-service/src/core/server/server-events.ts#L14) — lines 14; spellings: `gcp`.
- [apps/gbx-service/src/core/server/server-registry.ts](../apps/gbx-service/src/core/server/server-registry.ts#L1) — lines 1; spellings: `gcp`.
- [apps/gbx-service/src/core/server/server-runtime.ts](../apps/gbx-service/src/core/server/server-runtime.ts#L7) — lines 7, 109; spellings: `gcp`, `GoControlPanel`.
- [apps/gbx-service/src/http/errors.ts](../apps/gbx-service/src/http/errors.ts#L1) — lines 1; spellings: `gcp`.
- [apps/gbx-service/src/http/routes/internal.ts](../apps/gbx-service/src/http/routes/internal.ts#L17) — lines 17; spellings: `gcp`.
- [apps/gbx-service/src/http/ws/channels.ts](../apps/gbx-service/src/http/ws/channels.ts#L9) — lines 9; spellings: `gcp`.
- [apps/gbx-service/src/http/ws/ticket-verifier.ts](../apps/gbx-service/src/http/ws/ticket-verifier.ts#L1) — lines 1; spellings: `gcp`.
- [apps/gbx-service/src/infra/db/prisma-repositories.ts](../apps/gbx-service/src/infra/db/prisma-repositories.ts#L1) — lines 1, 7, 8; spellings: `gcp`.
- [apps/gbx-service/src/infra/db/system-command-services.ts](../apps/gbx-service/src/infra/db/system-command-services.ts#L1) — lines 1; spellings: `gcp`.
- [apps/gbx-service/src/infra/first-party-packages.ts](../apps/gbx-service/src/infra/first-party-packages.ts#L1) — lines 1, 2; spellings: `gcp`.
- [apps/gbx-service/src/infra/http/codriver-client.ts](../apps/gbx-service/src/infra/http/codriver-client.ts#L1) — lines 1; spellings: `gcp`.
- [apps/gbx-service/src/infra/http/plugin-http-client.ts](../apps/gbx-service/src/infra/http/plugin-http-client.ts#L1) — lines 1, 10, 11, 25; spellings: `gcp`, `GoControlPanel`.
- [apps/gbx-service/src/infra/marketplace/index-source.ts](../apps/gbx-service/src/infra/marketplace/index-source.ts#L5) — lines 5; spellings: `gcp`.
- [apps/gbx-service/src/infra/redis/jukebox-store.ts](../apps/gbx-service/src/infra/redis/jukebox-store.ts#L1) — lines 1; spellings: `gcp`.
- [apps/gbx-service/src/infra/redis/lifecycle-subscriber.ts](../apps/gbx-service/src/infra/redis/lifecycle-subscriber.ts#L5) — lines 5; spellings: `gcp`.
- [apps/gbx-service/src/infra/sandbox-assets.ts](../apps/gbx-service/src/infra/sandbox-assets.ts#L4) — lines 4; spellings: `gcp`.
- [apps/gbx-service/templates/manialink.hbs](../apps/gbx-service/templates/manialink.hbs#L3) — lines 3; spellings: `GCP`.
- [apps/gbx-service/test/core/**snapshots**/manialink.test.ts.snap](../apps/gbx-service/test/core/__snapshots__/manialink.test.ts.snap#L6) — lines 6, 142, 359, 396, 460, 566; spellings: `GCP`.
- [apps/gbx-service/test/core/command-output.test.ts](../apps/gbx-service/test/core/command-output.test.ts#L1) — lines 1, 18, 28; spellings: `gcp`, `tmcp`.
- [apps/gbx-service/test/core/game-events.test.ts](../apps/gbx-service/test/core/game-events.test.ts#L1) — lines 1, 229, 238; spellings: `gcp`, `gocontrolpanel`.
- [apps/gbx-service/test/core/manialink.test.ts](../apps/gbx-service/test/core/manialink.test.ts#L1) — lines 1; spellings: `gcp`.
- [apps/gbx-service/test/core/points.test.ts](../apps/gbx-service/test/core/points.test.ts#L1) — lines 1; spellings: `gcp`.
- [apps/gbx-service/test/fakes/harness.ts](../apps/gbx-service/test/fakes/harness.ts#L1) — lines 1, 2; spellings: `gcp`.
- [apps/gbx-service/test/fakes/repositories.ts](../apps/gbx-service/test/fakes/repositories.ts#L1) — lines 1; spellings: `gcp`.
- [apps/gbx-service/test/http/app-fixture.ts](../apps/gbx-service/test/http/app-fixture.ts#L1) — lines 1; spellings: `gcp`.
- [apps/gbx-service/test/http/internal-routes.test.ts](../apps/gbx-service/test/http/internal-routes.test.ts#L1) — lines 1; spellings: `gcp`.
- [apps/gbx-service/test/infra/env-examples.test.ts](../apps/gbx-service/test/infra/env-examples.test.ts#L55) — lines 55; spellings: `gocontrolpanel`.
- [apps/gbx-service/test/infra/first-party-packages.test.ts](../apps/gbx-service/test/infra/first-party-packages.test.ts#L4) — lines 4, 11, 21; spellings: `gcp`, `tmcp`.
- [apps/gbx-service/test/infra/server-credentials.test.ts](../apps/gbx-service/test/infra/server-credentials.test.ts#L1) — lines 1; spellings: `gcp`.
- [apps/gbx-service/test/infra/system-command-services.test.ts](../apps/gbx-service/test/infra/system-command-services.test.ts#L1) — lines 1; spellings: `gcp`.
- [apps/gbx-service/test/integration/prisma-repositories.test.ts](../apps/gbx-service/test/integration/prisma-repositories.test.ts#L1) — lines 1, 5, 6, 480, 486, 489, 533, 542; spellings: `gcp`, `GoControlPanel`, `tmcp`.
- [apps/gbx-service/test/integration/redis.test.ts](../apps/gbx-service/test/integration/redis.test.ts#L1) — lines 1; spellings: `gcp`.
- [apps/gbx-service/test/integration/system-command-services.test.ts](../apps/gbx-service/test/integration/system-command-services.test.ts#L1) — lines 1; spellings: `gcp`.
- [apps/gbx-service/test/plugins/guest-runtime.test.ts](../apps/gbx-service/test/plugins/guest-runtime.test.ts#L32) — lines 32, 36; spellings: `gcp`.
- [apps/gbx-service/test/plugins/marketplace-watcher.test.ts](../apps/gbx-service/test/plugins/marketplace-watcher.test.ts#L1) — lines 1; spellings: `gcp`.
- [apps/gbx-service/test/plugins/sandbox.test.ts](../apps/gbx-service/test/plugins/sandbox.test.ts#L1) — lines 1, 2, 8, 27, 40, 50; spellings: `gcp`, `tmcontrolpanel`, `tmcp`.
- [apps/gbx-service/test/plugins/sdk-types.test.ts](../apps/gbx-service/test/plugins/sdk-types.test.ts#L1) — lines 1, 2, 3; spellings: `gcp`, `tmcontrolpanel`.
- [apps/gbx-service/tsup.config.ts](../apps/gbx-service/tsup.config.ts#L12) — lines 12; spellings: `gcp`.
- [apps/web/.env.example](../apps/web/.env.example#L6) — lines 6, 9, 37; spellings: `gocontrolpanel`, `GoControlPanel`.
- [apps/web/AGENTS.md](../apps/web/AGENTS.md#L17) — lines 17, 54, 66; spellings: `gcp`, `gocontroller`.
- [apps/web/Dockerfile](../apps/web/Dockerfile#L30) — lines 30; spellings: `gcp`.
- [apps/web/hetzner/add-server.sh.hbs](../apps/web/hetzner/add-server.sh.hbs#L5) — lines 5, 8, 12; spellings: `gocontrolpanel`.
- [apps/web/hetzner/server-init.sh.hbs](../apps/web/hetzner/server-init.sh.hbs#L9) — lines 9, 10, 11, 12, 13, 15, 18, 23, 66; spellings: `gcp`, `gocontrolpanel`.
- [apps/web/hetzner/update-containers.sh](../apps/web/hetzner/update-containers.sh#L11) — lines 11; spellings: `gocontrolpanel`.
- [apps/web/next.config.ts](../apps/web/next.config.ts#L16) — lines 16; spellings: `gcp`.
- [apps/web/package.json](../apps/web/package.json#L2) — lines 2, 23, 24; spellings: `gcp`.
- [apps/web/src/actions/database/api-keys.ts](../apps/web/src/actions/database/api-keys.ts#L19) — lines 19; spellings: `gcp`.
- [apps/web/src/actions/database/audit-logs.ts](../apps/web/src/actions/database/audit-logs.ts#L7) — lines 7; spellings: `gcp`.
- [apps/web/src/actions/database/groups.ts](../apps/web/src/actions/database/groups.ts#L20) — lines 20; spellings: `gcp`.
- [apps/web/src/actions/database/notifications.ts](../apps/web/src/actions/database/notifications.ts#L5) — lines 5; spellings: `gcp`.
- [apps/web/src/actions/database/roles.ts](../apps/web/src/actions/database/roles.ts#L6) — lines 6; spellings: `gcp`.
- [apps/web/src/actions/database/server-only/audit-logs.ts](../apps/web/src/actions/database/server-only/audit-logs.ts#L3) — lines 3; spellings: `gcp`.
- [apps/web/src/actions/database/server-only/audit-scope.ts](../apps/web/src/actions/database/server-only/audit-scope.ts#L1) — lines 1; spellings: `gcp`.
- [apps/web/src/actions/database/server-only/auth.ts](../apps/web/src/actions/database/server-only/auth.ts#L4) — lines 4; spellings: `gcp`.
- [apps/web/src/actions/database/server-only/gbx.ts](../apps/web/src/actions/database/server-only/gbx.ts#L3) — lines 3; spellings: `gcp`.
- [apps/web/src/actions/database/server-only/hetzner-servers.ts](../apps/web/src/actions/database/server-only/hetzner-servers.ts#L3) — lines 3; spellings: `gcp`.
- [apps/web/src/actions/database/server-only/maps.ts](../apps/web/src/actions/database/server-only/maps.ts#L6) — lines 6, 7; spellings: `gcp`.
- [apps/web/src/actions/database/server-plugins.ts](../apps/web/src/actions/database/server-plugins.ts#L10) — lines 10, 11; spellings: `gcp`.
- [apps/web/src/actions/database/servers.ts](../apps/web/src/actions/database/servers.ts#L28) — lines 28; spellings: `gcp`.
- [apps/web/src/actions/database/themes.ts](../apps/web/src/actions/database/themes.ts#L8) — lines 8, 9; spellings: `gcp`.
- [apps/web/src/actions/database/users.ts](../apps/web/src/actions/database/users.ts#L13) — lines 13; spellings: `gcp`.
- [apps/web/src/actions/filemanager/server-only/files.ts](../apps/web/src/actions/filemanager/server-only/files.ts#L16) — lines 16; spellings: `gcp`.
- [apps/web/src/actions/gbx/map.ts](../apps/web/src/actions/gbx/map.ts#L9) — lines 9; spellings: `gcp`.
- [apps/web/src/actions/gbx/server-only/advanced.ts](../apps/web/src/actions/gbx/server-only/advanced.ts#L3) — lines 3; spellings: `gcp`.
- [apps/web/src/actions/gbx/server-only/bulk-maps.ts](../apps/web/src/actions/gbx/server-only/bulk-maps.ts#L7) — lines 7, 8; spellings: `gcp`.
- [apps/web/src/actions/gbx/server-only/commands.ts](../apps/web/src/actions/gbx/server-only/commands.ts#L7) — lines 7; spellings: `gcp`.
- [apps/web/src/actions/gbx/server-only/game.ts](../apps/web/src/actions/gbx/server-only/game.ts#L7) — lines 7; spellings: `gcp`.
- [apps/web/src/actions/gbx/server-only/map.ts](../apps/web/src/actions/gbx/server-only/map.ts#L7) — lines 7, 8; spellings: `gcp`.
- [apps/web/src/actions/gbx/server-only/player.ts](../apps/web/src/actions/gbx/server-only/player.ts#L4) — lines 4; spellings: `gcp`.
- [apps/web/src/actions/gbx/server-only/server-plugin.ts](../apps/web/src/actions/gbx/server-only/server-plugin.ts#L4) — lines 4; spellings: `gcp`.
- [apps/web/src/actions/gbx/server-only/server.ts](../apps/web/src/actions/gbx/server-only/server.ts#L8) — lines 8; spellings: `gcp`.
- [apps/web/src/actions/hetzner/server-actions.ts](../apps/web/src/actions/hetzner/server-actions.ts#L75) — lines 75, 163; spellings: `gocontrolpanel`.
- [apps/web/src/actions/hetzner/server-setup.ts](../apps/web/src/actions/hetzner/server-setup.ts#L1037) — lines 1037; spellings: `gocontrolpanel`.
- [apps/web/src/actions/plugins.ts](../apps/web/src/actions/plugins.ts#L13) — lines 13, 18, 23, 315, 353; spellings: `gcp`, `GoControlPanel`, `tmcp`.
- [apps/web/src/actions/server-only/plugins.ts](../apps/web/src/actions/server-only/plugins.ts#L12) — lines 12, 21, 222; spellings: `gcp`, `GoControlPanel`.
- [apps/web/src/actions/tmx/server-only/maps.ts](../apps/web/src/actions/tmx/server-only/maps.ts#L9) — lines 9; spellings: `gcp`.
- [apps/web/src/app/(gocontroller)/admin/hetzner/[id]/page.tsx](../apps/web/src/app/%28gocontroller%29/admin/hetzner/%5Bid%5D/page.tsx#L131) — lines 131, 143; spellings: `GoControlPanel`.
- [apps/web/src/app/(gocontroller)/admin/roles/columns.tsx](../apps/web/src/app/%28gocontroller%29/admin/roles/columns.tsx#L17) — lines 17; spellings: `gcp`.
- [apps/web/src/app/(gocontroller)/admin/servers/clients.tsx](../apps/web/src/app/%28gocontroller%29/admin/servers/clients.tsx#L5) — lines 5; spellings: `gcp`.
- [apps/web/src/app/(gocontroller)/admin/users/columns.tsx](../apps/web/src/app/%28gocontroller%29/admin/users/columns.tsx#L22) — lines 22; spellings: `gcp`.
- [apps/web/src/app/(gocontroller)/layout.tsx](../apps/web/src/app/%28gocontroller%29/layout.tsx#L16) — lines 16; spellings: `GoController`.
- [apps/web/src/app/(gocontroller)/page.tsx](../apps/web/src/app/%28gocontroller%29/page.tsx#L6) — lines 6; spellings: `GoControlPanel`.
- [apps/web/src/app/(gocontroller)/server/[id]/maps/map-order-columns.tsx](../apps/web/src/app/%28gocontroller%29/server/%5Bid%5D/maps/map-order-columns.tsx#L16) — lines 16; spellings: `gcp`.
- [apps/web/src/app/(gocontroller)/server/[id]/maps/server-maps-columns.tsx](../apps/web/src/app/%28gocontroller%29/server/%5Bid%5D/maps/server-maps-columns.tsx#L13) — lines 13; spellings: `gcp`.
- [apps/web/src/app/(gocontroller)/server/[id]/players/banlist-columns.tsx](../apps/web/src/app/%28gocontroller%29/server/%5Bid%5D/players/banlist-columns.tsx#L17) — lines 17; spellings: `gcp`.
- [apps/web/src/app/(gocontroller)/server/[id]/players/blacklist-columns.tsx](../apps/web/src/app/%28gocontroller%29/server/%5Bid%5D/players/blacklist-columns.tsx#L17) — lines 17; spellings: `gcp`.
- [apps/web/src/app/(gocontroller)/server/[id]/players/guestlist-columns.tsx](../apps/web/src/app/%28gocontroller%29/server/%5Bid%5D/players/guestlist-columns.tsx#L17) — lines 17; spellings: `gcp`.
- [apps/web/src/app/(gocontroller)/server/[id]/players/players-columns.tsx](../apps/web/src/app/%28gocontroller%29/server/%5Bid%5D/players/players-columns.tsx#L26) — lines 26; spellings: `gcp`.
- [apps/web/src/app/api/internal/codriver/route.ts](../apps/web/src/app/api/internal/codriver/route.ts#L8) — lines 8; spellings: `gcp`.
- [apps/web/src/app/api/servers/[serverId]/files/download/route.ts](../apps/web/src/app/api/servers/%5BserverId%5D/files/download/route.ts#L5) — lines 5; spellings: `gcp`.
- [apps/web/src/app/api/servers/[serverId]/files/upload/route.ts](../apps/web/src/app/api/servers/%5BserverId%5D/files/upload/route.ts#L6) — lines 6; spellings: `gcp`.
- [apps/web/src/app/api/v1/docs/route.ts](../apps/web/src/app/api/v1/docs/route.ts#L13) — lines 13; spellings: `GoControlPanel`.
- [apps/web/src/app/api/v1/servers/[serverId]/bans/[login]/route.ts](../apps/web/src/app/api/v1/servers/%5BserverId%5D/bans/%5Blogin%5D/route.ts#L3) — lines 3; spellings: `gcp`.
- [apps/web/src/app/api/v1/servers/[serverId]/bans/route.ts](../apps/web/src/app/api/v1/servers/%5BserverId%5D/bans/route.ts#L5) — lines 5; spellings: `gcp`.
- [apps/web/src/app/api/v1/servers/[serverId]/blacklist/[login]/route.ts](../apps/web/src/app/api/v1/servers/%5BserverId%5D/blacklist/%5Blogin%5D/route.ts#L6) — lines 6; spellings: `gcp`.
- [apps/web/src/app/api/v1/servers/[serverId]/blacklist/load/route.ts](../apps/web/src/app/api/v1/servers/%5BserverId%5D/blacklist/load/route.ts#L3) — lines 3; spellings: `gcp`.
- [apps/web/src/app/api/v1/servers/[serverId]/blacklist/route.ts](../apps/web/src/app/api/v1/servers/%5BserverId%5D/blacklist/route.ts#L5) — lines 5; spellings: `gcp`.
- [apps/web/src/app/api/v1/servers/[serverId]/blacklist/save/route.ts](../apps/web/src/app/api/v1/servers/%5BserverId%5D/blacklist/save/route.ts#L3) — lines 3; spellings: `gcp`.
- [apps/web/src/app/api/v1/servers/[serverId]/chat/route.ts](../apps/web/src/app/api/v1/servers/%5BserverId%5D/chat/route.ts#L4) — lines 4; spellings: `gcp`.
- [apps/web/src/app/api/v1/servers/[serverId]/commands/route.ts](../apps/web/src/app/api/v1/servers/%5BserverId%5D/commands/route.ts#L3) — lines 3; spellings: `gcp`.
- [apps/web/src/app/api/v1/servers/[serverId]/fake-players/[login]/route.ts](../apps/web/src/app/api/v1/servers/%5BserverId%5D/fake-players/%5Blogin%5D/route.ts#L3) — lines 3; spellings: `gcp`.
- [apps/web/src/app/api/v1/servers/[serverId]/fake-players/route.ts](../apps/web/src/app/api/v1/servers/%5BserverId%5D/fake-players/route.ts#L3) — lines 3; spellings: `gcp`.
- [apps/web/src/app/api/v1/servers/[serverId]/files/content/route.ts](../apps/web/src/app/api/v1/servers/%5BserverId%5D/files/content/route.ts#L8) — lines 8; spellings: `gcp`.
- [apps/web/src/app/api/v1/servers/[serverId]/files/delete/route.ts](../apps/web/src/app/api/v1/servers/%5BserverId%5D/files/delete/route.ts#L4) — lines 4; spellings: `gcp`.
- [apps/web/src/app/api/v1/servers/[serverId]/files/folders/route.ts](../apps/web/src/app/api/v1/servers/%5BserverId%5D/files/folders/route.ts#L4) — lines 4; spellings: `gcp`.
- [apps/web/src/app/api/v1/servers/[serverId]/files/move/route.ts](../apps/web/src/app/api/v1/servers/%5BserverId%5D/files/move/route.ts#L4) — lines 4; spellings: `gcp`.
- [apps/web/src/app/api/v1/servers/[serverId]/files/route.ts](../apps/web/src/app/api/v1/servers/%5BserverId%5D/files/route.ts#L4) — lines 4; spellings: `gcp`.
- [apps/web/src/app/api/v1/servers/[serverId]/game/jump/route.ts](../apps/web/src/app/api/v1/servers/%5BserverId%5D/game/jump/route.ts#L4) — lines 4; spellings: `gcp`.
- [apps/web/src/app/api/v1/servers/[serverId]/game/match-settings/append/route.ts](../apps/web/src/app/api/v1/servers/%5BserverId%5D/game/match-settings/append/route.ts#L3) — lines 3; spellings: `gcp`.
- [apps/web/src/app/api/v1/servers/[serverId]/game/match-settings/insert/route.ts](../apps/web/src/app/api/v1/servers/%5BserverId%5D/game/match-settings/insert/route.ts#L3) — lines 3; spellings: `gcp`.
- [apps/web/src/app/api/v1/servers/[serverId]/game/match-settings/load/route.ts](../apps/web/src/app/api/v1/servers/%5BserverId%5D/game/match-settings/load/route.ts#L3) — lines 3; spellings: `gcp`.
- [apps/web/src/app/api/v1/servers/[serverId]/game/match-settings/save/route.ts](../apps/web/src/app/api/v1/servers/%5BserverId%5D/game/match-settings/save/route.ts#L3) — lines 3; spellings: `gcp`.
- [apps/web/src/app/api/v1/servers/[serverId]/game/next/route.ts](../apps/web/src/app/api/v1/servers/%5BserverId%5D/game/next/route.ts#L3) — lines 3; spellings: `gcp`.
- [apps/web/src/app/api/v1/servers/[serverId]/game/pause/route.ts](../apps/web/src/app/api/v1/servers/%5BserverId%5D/game/pause/route.ts#L3) — lines 3; spellings: `gcp`.
- [apps/web/src/app/api/v1/servers/[serverId]/game/restart/route.ts](../apps/web/src/app/api/v1/servers/%5BserverId%5D/game/restart/route.ts#L3) — lines 3; spellings: `gcp`.
- [apps/web/src/app/api/v1/servers/[serverId]/game/route.ts](../apps/web/src/app/api/v1/servers/%5BserverId%5D/game/route.ts#L3) — lines 3; spellings: `gcp`.
- [apps/web/src/app/api/v1/servers/[serverId]/game/script-events/route.ts](../apps/web/src/app/api/v1/servers/%5BserverId%5D/game/script-events/route.ts#L3) — lines 3; spellings: `gcp`.
- [apps/web/src/app/api/v1/servers/[serverId]/game/script-settings/route.ts](../apps/web/src/app/api/v1/servers/%5BserverId%5D/game/script-settings/route.ts#L7) — lines 7; spellings: `gcp`.
- [apps/web/src/app/api/v1/servers/[serverId]/game/script/route.ts](../apps/web/src/app/api/v1/servers/%5BserverId%5D/game/script/route.ts#L5) — lines 5; spellings: `gcp`.
- [apps/web/src/app/api/v1/servers/[serverId]/game/show-opponents/route.ts](../apps/web/src/app/api/v1/servers/%5BserverId%5D/game/show-opponents/route.ts#L3) — lines 3; spellings: `gcp`.
- [apps/web/src/app/api/v1/servers/[serverId]/guestlist/[login]/route.ts](../apps/web/src/app/api/v1/servers/%5BserverId%5D/guestlist/%5Blogin%5D/route.ts#L3) — lines 3; spellings: `gcp`.
- [apps/web/src/app/api/v1/servers/[serverId]/guestlist/load/route.ts](../apps/web/src/app/api/v1/servers/%5BserverId%5D/guestlist/load/route.ts#L3) — lines 3; spellings: `gcp`.
- [apps/web/src/app/api/v1/servers/[serverId]/guestlist/route.ts](../apps/web/src/app/api/v1/servers/%5BserverId%5D/guestlist/route.ts#L5) — lines 5; spellings: `gcp`.
- [apps/web/src/app/api/v1/servers/[serverId]/guestlist/save/route.ts](../apps/web/src/app/api/v1/servers/%5BserverId%5D/guestlist/save/route.ts#L3) — lines 3; spellings: `gcp`.
- [apps/web/src/app/api/v1/servers/[serverId]/join-link/route.ts](../apps/web/src/app/api/v1/servers/%5BserverId%5D/join-link/route.ts#L3) — lines 3; spellings: `gcp`.
- [apps/web/src/app/api/v1/servers/[serverId]/jukebox/[uid]/route.ts](../apps/web/src/app/api/v1/servers/%5BserverId%5D/jukebox/%5Buid%5D/route.ts#L4) — lines 4; spellings: `gcp`.
- [apps/web/src/app/api/v1/servers/[serverId]/jukebox/order/route.ts](../apps/web/src/app/api/v1/servers/%5BserverId%5D/jukebox/order/route.ts#L5) — lines 5; spellings: `gcp`.
- [apps/web/src/app/api/v1/servers/[serverId]/jukebox/route.ts](../apps/web/src/app/api/v1/servers/%5BserverId%5D/jukebox/route.ts#L9) — lines 9; spellings: `gcp`.
- [apps/web/src/app/api/v1/servers/[serverId]/maps/current/route.ts](../apps/web/src/app/api/v1/servers/%5BserverId%5D/maps/current/route.ts#L4) — lines 4; spellings: `gcp`.
- [apps/web/src/app/api/v1/servers/[serverId]/maps/files/route.ts](../apps/web/src/app/api/v1/servers/%5BserverId%5D/maps/files/route.ts#L4) — lines 4; spellings: `gcp`.
- [apps/web/src/app/api/v1/servers/[serverId]/maps/order/route.ts](../apps/web/src/app/api/v1/servers/%5BserverId%5D/maps/order/route.ts#L4) — lines 4; spellings: `gcp`.
- [apps/web/src/app/api/v1/servers/[serverId]/maps/remove/route.ts](../apps/web/src/app/api/v1/servers/%5BserverId%5D/maps/remove/route.ts#L4) — lines 4; spellings: `gcp`.
- [apps/web/src/app/api/v1/servers/[serverId]/maps/route.ts](../apps/web/src/app/api/v1/servers/%5BserverId%5D/maps/route.ts#L6) — lines 6; spellings: `gcp`.
- [apps/web/src/app/api/v1/servers/[serverId]/maps/tmx/route.ts](../apps/web/src/app/api/v1/servers/%5BserverId%5D/maps/tmx/route.ts#L3) — lines 3; spellings: `gcp`.
- [apps/web/src/app/api/v1/servers/[serverId]/matches/[matchId]/route.ts](../apps/web/src/app/api/v1/servers/%5BserverId%5D/matches/%5BmatchId%5D/route.ts#L4) — lines 4; spellings: `gcp`.
- [apps/web/src/app/api/v1/servers/[serverId]/matches/route.ts](../apps/web/src/app/api/v1/servers/%5BserverId%5D/matches/route.ts#L4) — lines 4; spellings: `gcp`.
- [apps/web/src/app/api/v1/servers/[serverId]/players/[login]/ban/route.ts](../apps/web/src/app/api/v1/servers/%5BserverId%5D/players/%5Blogin%5D/ban/route.ts#L3) — lines 3; spellings: `gcp`.
- [apps/web/src/app/api/v1/servers/[serverId]/players/[login]/kick/route.ts](../apps/web/src/app/api/v1/servers/%5BserverId%5D/players/%5Blogin%5D/kick/route.ts#L3) — lines 3; spellings: `gcp`.
- [apps/web/src/app/api/v1/servers/[serverId]/players/[login]/points/route.ts](../apps/web/src/app/api/v1/servers/%5BserverId%5D/players/%5Blogin%5D/points/route.ts#L7) — lines 7; spellings: `gcp`.
- [apps/web/src/app/api/v1/servers/[serverId]/players/[login]/spectator/route.ts](../apps/web/src/app/api/v1/servers/%5BserverId%5D/players/%5Blogin%5D/spectator/route.ts#L3) — lines 3; spellings: `gcp`.
- [apps/web/src/app/api/v1/servers/[serverId]/players/route.ts](../apps/web/src/app/api/v1/servers/%5BserverId%5D/players/route.ts#L4) — lines 4; spellings: `gcp`.
- [apps/web/src/app/api/v1/servers/[serverId]/plugins/[pluginId]/config/route.ts](../apps/web/src/app/api/v1/servers/%5BserverId%5D/plugins/%5BpluginId%5D/config/route.ts#L3) — lines 3, 4; spellings: `gcp`.
- [apps/web/src/app/api/v1/servers/[serverId]/plugins/[pluginId]/enabled/route.ts](../apps/web/src/app/api/v1/servers/%5BserverId%5D/plugins/%5BpluginId%5D/enabled/route.ts#L3) — lines 3; spellings: `gcp`.
- [apps/web/src/app/api/v1/servers/[serverId]/plugins/[pluginId]/route.ts](../apps/web/src/app/api/v1/servers/%5BserverId%5D/plugins/%5BpluginId%5D/route.ts#L3) — lines 3; spellings: `gcp`.
- [apps/web/src/app/api/v1/servers/[serverId]/plugins/[pluginId]/version/route.ts](../apps/web/src/app/api/v1/servers/%5BserverId%5D/plugins/%5BpluginId%5D/version/route.ts#L3) — lines 3; spellings: `gcp`.
- [apps/web/src/app/api/v1/servers/[serverId]/plugins/reload/route.ts](../apps/web/src/app/api/v1/servers/%5BserverId%5D/plugins/reload/route.ts#L3) — lines 3; spellings: `gcp`.
- [apps/web/src/app/api/v1/servers/[serverId]/plugins/route.ts](../apps/web/src/app/api/v1/servers/%5BserverId%5D/plugins/route.ts#L5) — lines 5; spellings: `gcp`.
- [apps/web/src/app/api/v1/servers/[serverId]/route.ts](../apps/web/src/app/api/v1/servers/%5BserverId%5D/route.ts#L2) — lines 2; spellings: `gcp`.
- [apps/web/src/app/api/v1/servers/[serverId]/server-plugin/events/route.ts](../apps/web/src/app/api/v1/servers/%5BserverId%5D/server-plugin/events/route.ts#L3) — lines 3; spellings: `gcp`.
- [apps/web/src/app/api/v1/servers/[serverId]/server-plugin/route.ts](../apps/web/src/app/api/v1/servers/%5BserverId%5D/server-plugin/route.ts#L10) — lines 10; spellings: `gcp`.
- [apps/web/src/app/api/v1/servers/[serverId]/server-plugin/variables/route.ts](../apps/web/src/app/api/v1/servers/%5BserverId%5D/server-plugin/variables/route.ts#L3) — lines 3; spellings: `gcp`.
- [apps/web/src/app/api/v1/servers/[serverId]/settings/route.ts](../apps/web/src/app/api/v1/servers/%5BserverId%5D/settings/route.ts#L8) — lines 8; spellings: `gcp`.
- [apps/web/src/app/api/v1/servers/[serverId]/teams/[teamId]/points/route.ts](../apps/web/src/app/api/v1/servers/%5BserverId%5D/teams/%5BteamId%5D/points/route.ts#L7) — lines 7; spellings: `gcp`.
- [apps/web/src/app/api/v1/servers/route.ts](../apps/web/src/app/api/v1/servers/route.ts#L2) — lines 2; spellings: `gcp`.
- [apps/web/src/app/api/ws-ticket/route.ts](../apps/web/src/app/api/ws-ticket/route.ts#L4) — lines 4; spellings: `gcp`.
- [apps/web/src/app/layout.tsx](../apps/web/src/app/layout.tsx#L32) — lines 32; spellings: `GoControlPanel`.
- [apps/web/src/components/landing/landing-page.tsx](../apps/web/src/components/landing/landing-page.tsx#L181) — lines 181, 204, 248, 288, 377, 398; spellings: `GoControlPanel`.
- [apps/web/src/components/live/knockout-scores.tsx](../apps/web/src/components/live/knockout-scores.tsx#L2) — lines 2; spellings: `gcp`.
- [apps/web/src/components/live/live-chat.tsx](../apps/web/src/components/live/live-chat.tsx#L7) — lines 7; spellings: `gcp`.
- [apps/web/src/components/live/live-dashboard.tsx](../apps/web/src/components/live/live-dashboard.tsx#L13) — lines 13; spellings: `gcp`.
- [apps/web/src/components/live/live-round.tsx](../apps/web/src/components/live/live-round.tsx#L2) — lines 2; spellings: `gcp`.
- [apps/web/src/components/live/match-settings.tsx](../apps/web/src/components/live/match-settings.tsx#L1) — lines 1; spellings: `gcp`.
- [apps/web/src/components/live/player-actions.tsx](../apps/web/src/components/live/player-actions.tsx#L1) — lines 1; spellings: `gcp`.
- [apps/web/src/components/live/rankings.tsx](../apps/web/src/components/live/rankings.tsx#L2) — lines 2; spellings: `gcp`.
- [apps/web/src/components/live/round-scores.tsx](../apps/web/src/components/live/round-scores.tsx#L2) — lines 2; spellings: `gcp`.
- [apps/web/src/components/live/team-scores.tsx](../apps/web/src/components/live/team-scores.tsx#L2) — lines 2; spellings: `gcp`.
- [apps/web/src/components/live/teams-actions.tsx](../apps/web/src/components/live/teams-actions.tsx#L3) — lines 3; spellings: `gcp`.
- [apps/web/src/components/live/time-attack-scores.tsx](../apps/web/src/components/live/time-attack-scores.tsx#L2) — lines 2; spellings: `gcp`.
- [apps/web/src/components/maps/carousel-map-card.tsx](../apps/web/src/components/maps/carousel-map-card.tsx#L6) — lines 6; spellings: `gcp`.
- [apps/web/src/components/maps/jukebox.tsx](../apps/web/src/components/maps/jukebox.tsx#L4) — lines 4, 5, 11; spellings: `gcp`, `gocontroller`.
- [apps/web/src/components/maps/local-maps-table.tsx](../apps/web/src/components/maps/local-maps-table.tsx#L5) — lines 5, 6; spellings: `gcp`, `gocontroller`.
- [apps/web/src/components/maps/map-carousel.tsx](../apps/web/src/components/maps/map-carousel.tsx#L5) — lines 5, 6; spellings: `gcp`.
- [apps/web/src/components/maps/map-order.tsx](../apps/web/src/components/maps/map-order.tsx#L4) — lines 4, 5; spellings: `gcp`, `gocontroller`.
- [apps/web/src/components/maps/server-maps.tsx](../apps/web/src/components/maps/server-maps.tsx#L3) — lines 3; spellings: `gcp`.
- [apps/web/src/components/modals/groups/edit-group-theme.tsx](../apps/web/src/components/modals/groups/edit-group-theme.tsx#L8) — lines 8; spellings: `gcp`.
- [apps/web/src/components/modals/live/player/set-player-match-points-modal.tsx](../apps/web/src/components/modals/live/player/set-player-match-points-modal.tsx#L6) — lines 6; spellings: `gcp`.
- [apps/web/src/components/modals/live/teams/set-team-map-points-modal.tsx](../apps/web/src/components/modals/live/teams/set-team-map-points-modal.tsx#L6) — lines 6; spellings: `gcp`.
- [apps/web/src/components/modals/live/teams/set-team-match-points-modal.tsx](../apps/web/src/components/modals/live/teams/set-team-match-points-modal.tsx#L6) — lines 6; spellings: `gcp`.
- [apps/web/src/components/modals/nadeo/activity-map-card.tsx](../apps/web/src/components/modals/nadeo/activity-map-card.tsx#L4) — lines 4; spellings: `gcp`.
- [apps/web/src/components/modals/roles/edit-role.tsx](../apps/web/src/components/modals/roles/edit-role.tsx#L6) — lines 6; spellings: `gcp`.
- [apps/web/src/components/modals/users/edit-user.tsx](../apps/web/src/components/modals/users/edit-user.tsx#L6) — lines 6; spellings: `gcp`.
- [apps/web/src/components/players/banlist-list.tsx](../apps/web/src/components/players/banlist-list.tsx#L4) — lines 4; spellings: `gocontroller`.
- [apps/web/src/components/players/blacklist-list.tsx](../apps/web/src/components/players/blacklist-list.tsx#L3) — lines 3; spellings: `gocontroller`.
- [apps/web/src/components/players/guestlist-list.tsx](../apps/web/src/components/players/guestlist-list.tsx#L3) — lines 3; spellings: `gocontroller`.
- [apps/web/src/components/players/player-list.tsx](../apps/web/src/components/players/player-list.tsx#L3) — lines 3, 5; spellings: `gcp`, `gocontroller`.
- [apps/web/src/components/plugins/capability-list.tsx](../apps/web/src/components/plugins/capability-list.tsx#L7) — lines 7; spellings: `gcp`.
- [apps/web/src/components/plugins/install-dialog.tsx](../apps/web/src/components/plugins/install-dialog.tsx#L25) — lines 25; spellings: `gcp`.
- [apps/web/src/components/plugins/installed-plugins.tsx](../apps/web/src/components/plugins/installed-plugins.tsx#L38) — lines 38; spellings: `gcp`.
- [apps/web/src/components/plugins/marketplace-catalog.tsx](../apps/web/src/components/plugins/marketplace-catalog.tsx#L16) — lines 16; spellings: `gcp`.
- [apps/web/src/components/plugins/plugin-config-form.tsx](../apps/web/src/components/plugins/plugin-config-form.tsx#L29) — lines 29; spellings: `gcp`.
- [apps/web/src/components/plugins/uploaded-plugins.tsx](../apps/web/src/components/plugins/uploaded-plugins.tsx#L35) — lines 35, 76; spellings: `gocontrolpanel`, `tmcp`.
- [apps/web/src/components/servers/clients/client-card.tsx](../apps/web/src/components/servers/clients/client-card.tsx#L12) — lines 12; spellings: `gcp`.
- [apps/web/src/components/shell/app-sidebar.tsx](../apps/web/src/components/shell/app-sidebar.tsx#L23) — lines 23; spellings: `GoControlPanel`.
- [apps/web/src/components/shell/navbar/nav-groups.tsx](../apps/web/src/components/shell/navbar/nav-groups.tsx#L31) — lines 31; spellings: `gcp`.
- [apps/web/src/components/shell/notification.tsx](../apps/web/src/components/shell/notification.tsx#L1) — lines 1; spellings: `gcp`.
- [apps/web/src/components/shell/site-header.tsx](../apps/web/src/components/shell/site-header.tsx#L28) — lines 28, 44; spellings: `gocontrolpanel`.
- [apps/web/src/components/theme/manialink-theme-preview.tsx](../apps/web/src/components/theme/manialink-theme-preview.tsx#L1) — lines 1; spellings: `gcp`.
- [apps/web/src/forms/admin/group/add-group-form.tsx](../apps/web/src/forms/admin/group/add-group-form.tsx#L12) — lines 12; spellings: `gcp`.
- [apps/web/src/forms/admin/group/edit-group-form.tsx](../apps/web/src/forms/admin/group/edit-group-form.tsx#L13) — lines 13; spellings: `gcp`.
- [apps/web/src/forms/admin/hetzner/add-project-form.tsx](../apps/web/src/forms/admin/hetzner/add-project-form.tsx#L7) — lines 7; spellings: `gcp`.
- [apps/web/src/forms/admin/hetzner/edit-project-form.tsx](../apps/web/src/forms/admin/hetzner/edit-project-form.tsx#L8) — lines 8; spellings: `gcp`.
- [apps/web/src/forms/admin/role/edit-role-form.tsx](../apps/web/src/forms/admin/role/edit-role-form.tsx#L6) — lines 6; spellings: `gcp`.
- [apps/web/src/forms/admin/server/add-server-form.tsx](../apps/web/src/forms/admin/server/add-server-form.tsx#L7) — lines 7; spellings: `gcp`.
- [apps/web/src/forms/admin/server/edit-server-form.tsx](../apps/web/src/forms/admin/server/edit-server-form.tsx#L8) — lines 8; spellings: `gcp`.
- [apps/web/src/forms/admin/user/edit-user-form.tsx](../apps/web/src/forms/admin/user/edit-user-form.tsx#L11) — lines 11; spellings: `gcp`.
- [apps/web/src/forms/api-keys/create-api-key-form.tsx](../apps/web/src/forms/api-keys/create-api-key-form.tsx#L10) — lines 10; spellings: `gcp`.
- [apps/web/src/forms/api-keys/create-api-key-schema.ts](../apps/web/src/forms/api-keys/create-api-key-schema.ts#L1) — lines 1; spellings: `gcp`.
- [apps/web/src/forms/server/advanced/script-generator-form.tsx](../apps/web/src/forms/server/advanced/script-generator-form.tsx#L27) — lines 27, 199; spellings: `gcp`, `GoControlPanel`.
- [apps/web/src/forms/server/live/teams/set-team-map-points-form.tsx](../apps/web/src/forms/server/live/teams/set-team-map-points-form.tsx#L8) — lines 8; spellings: `gcp`.
- [apps/web/src/forms/server/live/teams/set-team-match-points-form.tsx](../apps/web/src/forms/server/live/teams/set-team-match-points-form.tsx#L8) — lines 8; spellings: `gcp`.
- [apps/web/src/forms/server/plugins/chatconfig-form.tsx](../apps/web/src/forms/server/plugins/chatconfig-form.tsx#L7) — lines 7; spellings: `gcp`.
- [apps/web/src/forms/theme/theme-form.tsx](../apps/web/src/forms/theme/theme-form.tsx#L17) — lines 17; spellings: `gcp`.
- [apps/web/src/hooks/use-websocket.ts](../apps/web/src/hooks/use-websocket.ts#L7) — lines 7; spellings: `gcp`.
- [apps/web/src/lib/actor.ts](../apps/web/src/lib/actor.ts#L6) — lines 6; spellings: `gcp`.
- [apps/web/src/lib/admin-inputs.ts](../apps/web/src/lib/admin-inputs.ts#L1) — lines 1; spellings: `gcp`.
- [apps/web/src/lib/api-client/codriver.ts](../apps/web/src/lib/api-client/codriver.ts#L3) — lines 3; spellings: `gcp`.
- [apps/web/src/lib/api-keys/authenticate.ts](../apps/web/src/lib/api-keys/authenticate.ts#L10) — lines 10; spellings: `gcp`.
- [apps/web/src/lib/api-keys/token.ts](../apps/web/src/lib/api-keys/token.ts#L1) — lines 1, 6; spellings: `gcp`.
- [apps/web/src/lib/api/nadeo.ts](../apps/web/src/lib/api/nadeo.ts#L23) — lines 23; spellings: `gcp`.
- [apps/web/src/lib/api/tmx.ts](../apps/web/src/lib/api/tmx.ts#L3) — lines 3; spellings: `gcp`.
- [apps/web/src/lib/auth.ts](../apps/web/src/lib/auth.ts#L11) — lines 11; spellings: `gcp`.
- [apps/web/src/lib/channel-socket.ts](../apps/web/src/lib/channel-socket.ts#L25) — lines 25; spellings: `gcp`.
- [apps/web/src/lib/chat-config.ts](../apps/web/src/lib/chat-config.ts#L1) — lines 1; spellings: `gcp`.
- [apps/web/src/lib/codriver/eval/run.ts](../apps/web/src/lib/codriver/eval/run.ts#L2) — lines 2; spellings: `gcp`.
- [apps/web/src/lib/codriver/progress.ts](../apps/web/src/lib/codriver/progress.ts#L1) — lines 1; spellings: `gcp`.
- [apps/web/src/lib/codriver/roles.ts](../apps/web/src/lib/codriver/roles.ts#L2) — lines 2; spellings: `gcp`.
- [apps/web/src/lib/codriver/runner.ts](../apps/web/src/lib/codriver/runner.ts#L3) — lines 3; spellings: `gcp`.
- [apps/web/src/lib/codriver/stream.ts](../apps/web/src/lib/codriver/stream.ts#L1) — lines 1; spellings: `gcp`.
- [apps/web/src/lib/codriver/tools/match.ts](../apps/web/src/lib/codriver/tools/match.ts#L5) — lines 5; spellings: `gcp`.
- [apps/web/src/lib/codriver/tools/plugins.ts](../apps/web/src/lib/codriver/tools/plugins.ts#L8) — lines 8; spellings: `gcp`.
- [apps/web/src/lib/codriver/tools/scripts.ts](../apps/web/src/lib/codriver/tools/scripts.ts#L7) — lines 7, 26, 38, 58, 78, 79, 292; spellings: `GCP`, `gcp`, `GoControlPanel`.
- [apps/web/src/lib/codriver/usage.ts](../apps/web/src/lib/codriver/usage.ts#L3) — lines 3; spellings: `gcp`.
- [apps/web/src/lib/config-check.ts](../apps/web/src/lib/config-check.ts#L2) — lines 2; spellings: `gcp`.
- [apps/web/src/lib/config.ts](../apps/web/src/lib/config.ts#L2) — lines 2; spellings: `gcp`.
- [apps/web/src/lib/dbclient.ts](../apps/web/src/lib/dbclient.ts#L5) — lines 5; spellings: `gcp`.
- [apps/web/src/lib/gbx-service.ts](../apps/web/src/lib/gbx-service.ts#L16) — lines 16; spellings: `gcp`.
- [apps/web/src/lib/global.ts](../apps/web/src/lib/global.ts#L5) — lines 5; spellings: `gcp`.
- [apps/web/src/lib/hetzner.ts](../apps/web/src/lib/hetzner.ts#L2) — lines 2, 3; spellings: `gcp`.
- [apps/web/src/lib/marketplace.ts](../apps/web/src/lib/marketplace.ts#L8) — lines 8, 13; spellings: `gcp`.
- [apps/web/src/lib/plugin-access.ts](../apps/web/src/lib/plugin-access.ts#L1) — lines 1; spellings: `gcp`.
- [apps/web/src/lib/public-api/dto.ts](../apps/web/src/lib/public-api/dto.ts#L6) — lines 6, 7, 18; spellings: `gcp`.
- [apps/web/src/lib/public-api/files.ts](../apps/web/src/lib/public-api/files.ts#L2) — lines 2; spellings: `gcp`.
- [apps/web/src/lib/public-api/openapi.ts](../apps/web/src/lib/public-api/openapi.ts#L5) — lines 5, 10, 85; spellings: `gcp`, `GoControlPanel`.
- [apps/web/src/lib/public-api/route.ts](../apps/web/src/lib/public-api/route.ts#L20) — lines 20; spellings: `gcp`.
- [apps/web/src/lib/public-api/settings.ts](../apps/web/src/lib/public-api/settings.ts#L5) — lines 5; spellings: `gcp`.
- [apps/web/src/lib/secrets.ts](../apps/web/src/lib/secrets.ts#L2) — lines 2; spellings: `gcp`.
- [apps/web/src/lib/server-credentials.ts](../apps/web/src/lib/server-credentials.ts#L4) — lines 4; spellings: `gcp`.
- [apps/web/src/lib/service-request.ts](../apps/web/src/lib/service-request.ts#L2) — lines 2; spellings: `gcp`.
- [apps/web/src/lib/site.ts](../apps/web/src/lib/site.ts#L1) — lines 1, 2, 3, 6; spellings: `gocontrolpanel`, `GoControlPanel`.
- [apps/web/src/providers/notification-provider.tsx](../apps/web/src/providers/notification-provider.tsx#L8) — lines 8, 9; spellings: `gcp`.
- [apps/web/src/providers/servers-provider.tsx](../apps/web/src/providers/servers-provider.tsx#L7) — lines 7; spellings: `gcp`.
- [apps/web/src/services/codriver.ts](../apps/web/src/services/codriver.ts#L33) — lines 33; spellings: `gcp`.
- [apps/web/src/services/database/api-keys.ts](../apps/web/src/services/database/api-keys.ts#L5) — lines 5, 6; spellings: `gcp`.
- [apps/web/src/services/database/audit-logs.ts](../apps/web/src/services/database/audit-logs.ts#L5) — lines 5; spellings: `gcp`.
- [apps/web/src/services/database/groups.ts](../apps/web/src/services/database/groups.ts#L4) — lines 4; spellings: `gcp`.
- [apps/web/src/services/database/hetzner-projects.ts](../apps/web/src/services/database/hetzner-projects.ts#L6) — lines 6; spellings: `gcp`.
- [apps/web/src/services/database/maps.ts](../apps/web/src/services/database/maps.ts#L14) — lines 14, 15; spellings: `gcp`.
- [apps/web/src/services/database/matches.ts](../apps/web/src/services/database/matches.ts#L12) — lines 12, 13; spellings: `gcp`.
- [apps/web/src/services/database/notifications.ts](../apps/web/src/services/database/notifications.ts#L4) — lines 4; spellings: `gcp`.
- [apps/web/src/services/database/records.ts](../apps/web/src/services/database/records.ts#L4) — lines 4; spellings: `gcp`.
- [apps/web/src/services/database/roles.ts](../apps/web/src/services/database/roles.ts#L4) — lines 4; spellings: `gcp`.
- [apps/web/src/services/database/server-plugins.ts](../apps/web/src/services/database/server-plugins.ts#L6) — lines 6; spellings: `gcp`.
- [apps/web/src/services/database/servers.ts](../apps/web/src/services/database/servers.ts#L9) — lines 9; spellings: `gcp`.
- [apps/web/src/services/database/themes.ts](../apps/web/src/services/database/themes.ts#L4) — lines 4; spellings: `gcp`.
- [apps/web/src/services/database/users.ts](../apps/web/src/services/database/users.ts#L4) — lines 4; spellings: `gcp`.
- [apps/web/src/services/filemanager/index.ts](../apps/web/src/services/filemanager/index.ts#L12) — lines 12; spellings: `gcp`.
- [apps/web/src/services/gbx/advanced.ts](../apps/web/src/services/gbx/advanced.ts#L5) — lines 5; spellings: `gcp`.
- [apps/web/src/services/gbx/game.ts](../apps/web/src/services/gbx/game.ts#L6) — lines 6; spellings: `gcp`.
- [apps/web/src/services/gbx/map.ts](../apps/web/src/services/gbx/map.ts#L8) — lines 8; spellings: `gcp`.
- [apps/web/src/services/gbx/player.ts](../apps/web/src/services/gbx/player.ts#L6) — lines 6; spellings: `gcp`.
- [apps/web/src/services/gbx/server.ts](../apps/web/src/services/gbx/server.ts#L11) — lines 11; spellings: `gcp`.
- [apps/web/src/services/plugins.ts](../apps/web/src/services/plugins.ts#L44) — lines 44; spellings: `gcp`.
- [apps/web/src/types/api/nadeo.ts](../apps/web/src/types/api/nadeo.ts#L1) — lines 1; spellings: `gcp`.
- [apps/web/src/types/auth.ts](../apps/web/src/types/auth.ts#L6) — lines 6; spellings: `gcp`.
- [apps/web/src/types/map.ts](../apps/web/src/types/map.ts#L1) — lines 1, 2; spellings: `gcp`.
- [apps/web/src/types/plugins/catalog.ts](../apps/web/src/types/plugins/catalog.ts#L1) — lines 1, 75, 104; spellings: `gcp`, `GoControlPanel`.
- [apps/web/test/actor-actions.test.ts](../apps/web/test/actor-actions.test.ts#L1) — lines 1, 133; spellings: `gcp`.
- [apps/web/test/actor.test.ts](../apps/web/test/actor.test.ts#L1) — lines 1; spellings: `gcp`.
- [apps/web/test/api-key-auth.test.ts](../apps/web/test/api-key-auth.test.ts#L1) — lines 1, 115, 129; spellings: `gcp`.
- [apps/web/test/audit-delete-access.test.ts](../apps/web/test/audit-delete-access.test.ts#L2) — lines 2; spellings: `gcp`.
- [apps/web/test/chat-config.test.ts](../apps/web/test/chat-config.test.ts#L1) — lines 1; spellings: `gcp`.
- [apps/web/test/codriver-admin-tools.test.ts](../apps/web/test/codriver-admin-tools.test.ts#L1) — lines 1; spellings: `gcp`.
- [apps/web/test/codriver-ingame.test.ts](../apps/web/test/codriver-ingame.test.ts#L1) — lines 1; spellings: `gcp`.
- [apps/web/test/codriver-jev.test.ts](../apps/web/test/codriver-jev.test.ts#L33) — lines 33; spellings: `gcp`.
- [apps/web/test/codriver-panel.test.ts](../apps/web/test/codriver-panel.test.ts#L1) — lines 1; spellings: `gcp`.
- [apps/web/test/codriver-scripts.test.ts](../apps/web/test/codriver-scripts.test.ts#L1) — lines 1, 188, 193, 202, 203, 204, 208, 221, 222, 238, 239, 247, 248, 251, 255, 263, 345, 346, 361, 383; spellings: `GCP`, `gcp`.
- [apps/web/test/codriver-stream.test.ts](../apps/web/test/codriver-stream.test.ts#L1) — lines 1; spellings: `gcp`.
- [apps/web/test/codriver.test.ts](../apps/web/test/codriver.test.ts#L37) — lines 37; spellings: `gcp`.
- [apps/web/test/helpers/public-api.ts](../apps/web/test/helpers/public-api.ts#L1) — lines 1, 28; spellings: `gcp`.
- [apps/web/test/marketplace.test.ts](../apps/web/test/marketplace.test.ts#L1) — lines 1, 21, 30; spellings: `gcp`, `tmcp`.
- [apps/web/test/player-selection.test.ts](../apps/web/test/player-selection.test.ts#L1) — lines 1; spellings: `gcp`.
- [apps/web/test/provisioning-templates.test.ts](../apps/web/test/provisioning-templates.test.ts#L21) — lines 21, 22; spellings: `gcp`.
- [apps/web/test/public-api-commands.test.ts](../apps/web/test/public-api-commands.test.ts#L30) — lines 30; spellings: `gcp`.
- [apps/web/test/public-api-endpoints.test.ts](../apps/web/test/public-api-endpoints.test.ts#L54) — lines 54, 55, 98; spellings: `gcp`.
- [apps/web/test/public-api-openapi.test.ts](../apps/web/test/public-api-openapi.test.ts#L3) — lines 3; spellings: `gcp`.
- [apps/web/test/public-api-plugins.test.ts](../apps/web/test/public-api-plugins.test.ts#L83) — lines 83, 109; spellings: `GoControlPanel`.
- [apps/web/test/public-api-route.test.ts](../apps/web/test/public-api-route.test.ts#L29) — lines 29, 63; spellings: `gcp`.
- [apps/web/test/themes.test.ts](../apps/web/test/themes.test.ts#L39) — lines 39; spellings: `gcp`.
- [bun.lock](../bun.lock#L6) — lines 6, 14, 20, 21, 37, 50, 60, 61, 153, 164, 167, 175, 184, 402, 404, 406, 408, 834, 968, 1248, 2582; spellings: `gCP`, `Gcp`, `gcp`, `gocontrolpanel`, `tmcontrolpanel`, `tmcp`.
- [dev/docker-compose.yml](../dev/docker-compose.yml#L8) — lines 8, 29, 47, 51; spellings: `gcp`, `gocontrolpanel`.
- [docker-compose.yml](../docker-compose.yml#L2) — lines 2, 3, 17, 18, 35, 40, 46, 50, 57, 83, 85; spellings: `gocontrolpanel`, `GoControlPanel`.
- [docker/evosc/docker-compose.yml](../docker/evosc/docker-compose.yml#L45) — lines 45, 46, 60, 62, 75, 80, 87, 94; spellings: `gocontrolpanel`, `GoControlPanel`.
- [docker/evosc/init/01-create-gocontrolpanel.sql](../docker/evosc/init/01-create-gocontrolpanel.sql#L1) — lines 1, 3, 4; spellings: `gocontrolpanel`.
- [docker/maniacontrol/docker-compose.yml](../docker/maniacontrol/docker-compose.yml#L21) — lines 21, 35, 43, 44, 58, 60, 73, 78, 85, 92; spellings: `GCP`, `gocontrolpanel`, `GoControlPanel`.
- [docker/maniacontrol/init/01-create-gocontrolpanel.sql](../docker/maniacontrol/init/01-create-gocontrolpanel.sql#L1) — lines 1, 3, 4; spellings: `gocontrolpanel`.
- [docker/minicontrol/docker-compose.yml](../docker/minicontrol/docker-compose.yml#L50) — lines 50, 51, 65, 67, 80, 85, 92, 99; spellings: `gocontrolpanel`, `GoControlPanel`.
- [docker/minicontrol/init/01-create-gocontrolpanel.sql](../docker/minicontrol/init/01-create-gocontrolpanel.sql#L1) — lines 1, 3, 4; spellings: `gocontrolpanel`.
- [docker/pyplanet/docker-compose.yml](../docker/pyplanet/docker-compose.yml#L37) — lines 37, 38, 52, 54, 67, 72, 79, 86; spellings: `gocontrolpanel`, `GoControlPanel`.
- [docker/pyplanet/init/01-create-gocontrolpanel.sql](../docker/pyplanet/init/01-create-gocontrolpanel.sql#L1) — lines 1, 3, 4; spellings: `gocontrolpanel`.
- [docs/api-keys-plan.md](../docs/api-keys-plan.md#L68) — lines 68, 84, 90, 126; spellings: `gcp`.
- [docs/audits/2026-10-11-claude-security-audit.md](../docs/audits/2026-10-11-claude-security-audit.md#L131) — lines 131; spellings: `gocontroller`.
- [docs/audits/2026-10-11-dependencies.json](../docs/audits/2026-10-11-dependencies.json#L953) — lines 953; spellings: `gcp`.
- [docs/audits/2026-10-11-dependencies.md](../docs/audits/2026-10-11-dependencies.md#L96) — lines 96; spellings: `gcp`.
- [docs/backend-split-requirements.md](../docs/backend-split-requirements.md#L68) — lines 68, 76, 276; spellings: `gcp`, `gocontrolpanel`, `GoControlPanel`.
- [docs/backups.md](../docs/backups.md#L3) — lines 3, 15, 22, 34, 39, 49, 53, 56, 58, 61, 71; spellings: `gcp`, `gocontrolpanel`, `GoControlPanel`, `tmcp`.
- [docs/codriver-plan.md](../docs/codriver-plan.md#L5) — lines 5, 300, 348, 354, 355, 403; spellings: `gcp`, `GoControlPanel`.
- [docs/first-party-plugins.md](../docs/first-party-plugins.md#L3) — lines 3, 21, 42; spellings: `GoControlPanel`, `tmcontrolpanel`, `tmcp`.
- [docs/mcp-server-proposal.md](../docs/mcp-server-proposal.md#L5) — lines 5; spellings: `GoControlPanel`.
- [docs/migrating-from-dev.md](../docs/migrating-from-dev.md#L3) — lines 3, 9, 38, 53, 58, 59, 65, 72, 75, 77, 79, 118, 122, 129, 162, 163, 164, 171, 175, 180; spellings: `gcp`, `gocontrolpanel`, `GoControlPanel`, `tmcontrolpanel`.
- [docs/plugin-marketplace.md](../docs/plugin-marketplace.md#L10) — lines 10, 25, 31, 33, 34, 36, 114; spellings: `GOCONTROLPANEL`, `GoControlPanel`, `tmcontrolpanel`, `tmcp`.
- [docs/plugin-sdk.md](../docs/plugin-sdk.md#L3) — lines 3, 10, 12, 17, 21, 22, 23, 24, 25, 31, 44, 85, 348, 354; spellings: `gocontrolpanel`, `GoControlPanel`, `tmcontrolpanel`, `tmcp`.
- [docs/privacy.md](../docs/privacy.md#L7) — lines 7; spellings: `GoControlPanel`.
- [docs/public-api.md](../docs/public-api.md#L3) — lines 3, 82, 91, 96; spellings: `gcp`, `GoControlPanel`.
- [docs/real-server-testing.md](../docs/real-server-testing.md#L49) — lines 49, 50, 51, 52, 56, 60, 63, 65, 74, 75, 76, 78, 93, 96, 98, 100, 106, 108, 109, 110, 112, 113, 137, 147, 167, 189, 201; spellings: `GCP`, `gcp`.
- [docs/refactor-plan.md](../docs/refactor-plan.md#L12) — lines 12, 13, 26, 27, 29, 30, 37, 43, 44, 102, 108, 111, 135, 137; spellings: `gcp`, `gocontrolpanel`.
- [docs/security-audit-2026-10-11.md](../docs/security-audit-2026-10-11.md#L287) — lines 287, 409, 410, 411; spellings: `gcp`, `gocontrolpanel`.
- [package.json](../package.json#L2) — lines 2, 10, 11, 20, 21, 22, 23, 24; spellings: `gcp`, `gocontrolpanel`.
- [packages/db/package.json](../packages/db/package.json#L2) — lines 2; spellings: `gcp`.
- [packages/plugin-sdk/examples/hello/README.md](../packages/plugin-sdk/examples/hello/README.md#L17) — lines 17; spellings: `gocontrolpanel`, `GoControlPanel`.
- [packages/plugin-sdk/examples/hello/src/index.ts](../packages/plugin-sdk/examples/hello/src/index.ts#L1) — lines 1; spellings: `tmcontrolpanel`.
- [packages/plugin-sdk/examples/hello/tmcp-plugin.json](../packages/plugin-sdk/examples/hello/tmcp-plugin.json#L7) — lines 7, 9; spellings: `gocontrolpanel`, `GoControlPanel`.
- [packages/plugin-sdk/package.json](../packages/plugin-sdk/package.json#L2) — lines 2, 4, 15, 29; spellings: `gcp`, `GoControlPanel`, `tmcontrolpanel`, `tmcp`.
- [packages/plugin-sdk/registry-template/.github/PULL_REQUEST_TEMPLATE.md](../packages/plugin-sdk/registry-template/.github/PULL_REQUEST_TEMPLATE.md#L6) — lines 6; spellings: `tmcp`.
- [packages/plugin-sdk/registry-template/.github/workflows/check.yml](../packages/plugin-sdk/registry-template/.github/workflows/check.yml#L15) — lines 15, 16, 17, 24, 28; spellings: `GOCONTROLPANEL`, `gocontrolpanel`.
- [packages/plugin-sdk/registry-template/.github/workflows/publish.yml](../packages/plugin-sdk/registry-template/.github/workflows/publish.yml#L25) — lines 25, 26, 27, 34, 39; spellings: `GOCONTROLPANEL`, `gocontrolpanel`.
- [packages/plugin-sdk/registry-template/README.md](../packages/plugin-sdk/registry-template/README.md#L1) — lines 1, 3, 6, 15, 18, 27, 34; spellings: `gocontrolpanel`, `GoControlPanel`, `tmcontrolpanel`, `tmcp`.
- [packages/plugin-sdk/registry-template/registry.json](../packages/plugin-sdk/registry-template/registry.json#L2) — lines 2, 3; spellings: `GoControlPanel`, `tmcontrolpanel`.
- [packages/plugin-sdk/src/cli/build.ts](../packages/plugin-sdk/src/cli/build.ts#L43) — lines 43; spellings: `tmcontrolpanel`.
- [packages/plugin-sdk/src/cli/init.ts](../packages/plugin-sdk/src/cli/init.ts#L9) — lines 9, 34, 56, 97, 112, 113; spellings: `gcp`, `GoControlPanel`, `tmcontrolpanel`, `tmcp`.
- [packages/plugin-sdk/src/cli/main.ts](../packages/plugin-sdk/src/cli/main.ts#L4) — lines 4, 5, 12, 54, 85; spellings: `gcp`, `tmcp`.
- [packages/plugin-sdk/src/cli/pack.ts](../packages/plugin-sdk/src/cli/pack.ts#L3) — lines 3, 9; spellings: `gcp`.
- [packages/plugin-sdk/src/cli/project.ts](../packages/plugin-sdk/src/cli/project.ts#L3) — lines 3, 5; spellings: `gcp`, `tmcp`.
- [packages/plugin-sdk/src/cli/registry.ts](../packages/plugin-sdk/src/cli/registry.ts#L13) — lines 13, 14, 287, 293; spellings: `gcp`, `gocontrolpanel`, `GoControlPanel`.
- [packages/plugin-sdk/src/index.ts](../packages/plugin-sdk/src/index.ts#L7) — lines 7, 11, 12; spellings: `tmcp`.
- [packages/plugin-sdk/test/cli.test.ts](../packages/plugin-sdk/test/cli.test.ts#L1) — lines 1, 13, 29, 39, 53, 63; spellings: `gcp`, `tmcp`.
- [packages/plugin-sdk/tsup.config.ts](../packages/plugin-sdk/tsup.config.ts#L11) — lines 11, 14, 20; spellings: `gcp`.
- [packages/shared/package.json](../packages/shared/package.json#L2) — lines 2; spellings: `gcp`.
- [packages/shared/src/api-keys.ts](../packages/shared/src/api-keys.ts#L53) — lines 53; spellings: `gcp`.
- [packages/shared/src/crypto/server-credentials.ts](../packages/shared/src/crypto/server-credentials.ts#L8) — lines 8; spellings: `gcp`.
- [packages/shared/src/plugins/manifest.ts](../packages/shared/src/plugins/manifest.ts#L10) — lines 10, 12, 14, 31, 32, 33, 34; spellings: `gcp`, `GoControlPanel`, `gocontrolpanel`, `tmcontrolpanel`, `tmcp`.
- [packages/shared/src/plugins/marketplace-index.ts](../packages/shared/src/plugins/marketplace-index.ts#L13) — lines 13; spellings: `tmcontrolpanel`.
- [packages/shared/src/plugins/package.ts](../packages/shared/src/plugins/package.ts#L5) — lines 5; spellings: `tmcp`.
- [packages/shared/src/server-events.ts](../packages/shared/src/server-events.ts#L4) — lines 4; spellings: `gcp`.
- [packages/shared/src/ws/ticket.ts](../packages/shared/src/ws/ticket.ts#L4) — lines 4, 5; spellings: `gcp`.
- [packages/shared/test/plugin-package.test.ts](../packages/shared/test/plugin-package.test.ts#L28) — lines 28, 82, 83, 97, 103; spellings: `tmcp`.
- [packages/shared/test/ticket.test.ts](../packages/shared/test/ticket.test.ts#L27) — lines 27, 28, 39; spellings: `gcp`.
- [scripts/backup-db.sh](../scripts/backup-db.sh#L2) — lines 2, 4, 133, 185, 198, 204; spellings: `gcp`, `gocontrolpanel`, `GoControlPanel`.
- [scripts/backup.env.example](../scripts/backup.env.example#L5) — lines 5, 20; spellings: `gocontrolpanel`.
- [scripts/encrypt-server-credentials.ts](../scripts/encrypt-server-credentials.ts#L1) — lines 1, 6; spellings: `gcp`.

## Appendix B — every matching main-repository path

- [apps/web/src/app/(gocontroller)/admin/api-keys/columns.tsx](../apps/web/src/app/%28gocontroller%29/admin/api-keys/columns.tsx) — Route-group directory rename; preserve the public route.
- [apps/web/src/app/(gocontroller)/admin/api-keys/page.tsx](../apps/web/src/app/%28gocontroller%29/admin/api-keys/page.tsx) — Route-group directory rename; preserve the public route.
- [apps/web/src/app/(gocontroller)/admin/audit-logs/columns.tsx](../apps/web/src/app/%28gocontroller%29/admin/audit-logs/columns.tsx) — Route-group directory rename; preserve the public route.
- [apps/web/src/app/(gocontroller)/admin/audit-logs/page.tsx](../apps/web/src/app/%28gocontroller%29/admin/audit-logs/page.tsx) — Route-group directory rename; preserve the public route.
- [apps/web/src/app/(gocontroller)/admin/codriver/page.tsx](../apps/web/src/app/%28gocontroller%29/admin/codriver/page.tsx) — Route-group directory rename; preserve the public route.
- [apps/web/src/app/(gocontroller)/admin/groups/actions.tsx](../apps/web/src/app/%28gocontroller%29/admin/groups/actions.tsx) — Route-group directory rename; preserve the public route.
- [apps/web/src/app/(gocontroller)/admin/groups/columns.tsx](../apps/web/src/app/%28gocontroller%29/admin/groups/columns.tsx) — Route-group directory rename; preserve the public route.
- [apps/web/src/app/(gocontroller)/admin/groups/page.tsx](../apps/web/src/app/%28gocontroller%29/admin/groups/page.tsx) — Route-group directory rename; preserve the public route.
- [apps/web/src/app/(gocontroller)/admin/hetzner/[id]/networks-actions.tsx](../apps/web/src/app/%28gocontroller%29/admin/hetzner/%5Bid%5D/networks-actions.tsx) — Route-group directory rename; preserve the public route.
- [apps/web/src/app/(gocontroller)/admin/hetzner/[id]/networks-columns.tsx](../apps/web/src/app/%28gocontroller%29/admin/hetzner/%5Bid%5D/networks-columns.tsx) — Route-group directory rename; preserve the public route.
- [apps/web/src/app/(gocontroller)/admin/hetzner/[id]/page.tsx](../apps/web/src/app/%28gocontroller%29/admin/hetzner/%5Bid%5D/page.tsx) — Route-group directory rename; preserve the public route.
- [apps/web/src/app/(gocontroller)/admin/hetzner/[id]/servers-actions.tsx](../apps/web/src/app/%28gocontroller%29/admin/hetzner/%5Bid%5D/servers-actions.tsx) — Route-group directory rename; preserve the public route.
- [apps/web/src/app/(gocontroller)/admin/hetzner/[id]/servers-columns.tsx](../apps/web/src/app/%28gocontroller%29/admin/hetzner/%5Bid%5D/servers-columns.tsx) — Route-group directory rename; preserve the public route.
- [apps/web/src/app/(gocontroller)/admin/hetzner/[id]/volumes-actions.tsx](../apps/web/src/app/%28gocontroller%29/admin/hetzner/%5Bid%5D/volumes-actions.tsx) — Route-group directory rename; preserve the public route.
- [apps/web/src/app/(gocontroller)/admin/hetzner/[id]/volumes-columns.tsx](../apps/web/src/app/%28gocontroller%29/admin/hetzner/%5Bid%5D/volumes-columns.tsx) — Route-group directory rename; preserve the public route.
- [apps/web/src/app/(gocontroller)/admin/hetzner/actions.tsx](../apps/web/src/app/%28gocontroller%29/admin/hetzner/actions.tsx) — Route-group directory rename; preserve the public route.
- [apps/web/src/app/(gocontroller)/admin/hetzner/columns.tsx](../apps/web/src/app/%28gocontroller%29/admin/hetzner/columns.tsx) — Route-group directory rename; preserve the public route.
- [apps/web/src/app/(gocontroller)/admin/hetzner/page.tsx](../apps/web/src/app/%28gocontroller%29/admin/hetzner/page.tsx) — Route-group directory rename; preserve the public route.
- [apps/web/src/app/(gocontroller)/admin/layout.tsx](../apps/web/src/app/%28gocontroller%29/admin/layout.tsx) — Route-group directory rename; preserve the public route.
- [apps/web/src/app/(gocontroller)/admin/roles/actions.tsx](../apps/web/src/app/%28gocontroller%29/admin/roles/actions.tsx) — Route-group directory rename; preserve the public route.
- [apps/web/src/app/(gocontroller)/admin/roles/columns.tsx](../apps/web/src/app/%28gocontroller%29/admin/roles/columns.tsx) — Route-group directory rename; preserve the public route.
- [apps/web/src/app/(gocontroller)/admin/roles/page.tsx](../apps/web/src/app/%28gocontroller%29/admin/roles/page.tsx) — Route-group directory rename; preserve the public route.
- [apps/web/src/app/(gocontroller)/admin/servers/actions.tsx](../apps/web/src/app/%28gocontroller%29/admin/servers/actions.tsx) — Route-group directory rename; preserve the public route.
- [apps/web/src/app/(gocontroller)/admin/servers/clients.tsx](../apps/web/src/app/%28gocontroller%29/admin/servers/clients.tsx) — Route-group directory rename; preserve the public route.
- [apps/web/src/app/(gocontroller)/admin/servers/columns.tsx](../apps/web/src/app/%28gocontroller%29/admin/servers/columns.tsx) — Route-group directory rename; preserve the public route.
- [apps/web/src/app/(gocontroller)/admin/servers/page.tsx](../apps/web/src/app/%28gocontroller%29/admin/servers/page.tsx) — Route-group directory rename; preserve the public route.
- [apps/web/src/app/(gocontroller)/admin/users/columns.tsx](../apps/web/src/app/%28gocontroller%29/admin/users/columns.tsx) — Route-group directory rename; preserve the public route.
- [apps/web/src/app/(gocontroller)/admin/users/page.tsx](../apps/web/src/app/%28gocontroller%29/admin/users/page.tsx) — Route-group directory rename; preserve the public route.
- [apps/web/src/app/(gocontroller)/layout.tsx](../apps/web/src/app/%28gocontroller%29/layout.tsx) — Route-group directory rename; preserve the public route.
- [apps/web/src/app/(gocontroller)/page.tsx](../apps/web/src/app/%28gocontroller%29/page.tsx) — Route-group directory rename; preserve the public route.
- [apps/web/src/app/(gocontroller)/plugins/[slug]/page.tsx](../apps/web/src/app/%28gocontroller%29/plugins/%5Bslug%5D/page.tsx) — Route-group directory rename; preserve the public route.
- [apps/web/src/app/(gocontroller)/plugins/layout.tsx](../apps/web/src/app/%28gocontroller%29/plugins/layout.tsx) — Route-group directory rename; preserve the public route.
- [apps/web/src/app/(gocontroller)/plugins/page.tsx](../apps/web/src/app/%28gocontroller%29/plugins/page.tsx) — Route-group directory rename; preserve the public route.
- [apps/web/src/app/(gocontroller)/server/[id]/advanced/page.tsx](../apps/web/src/app/%28gocontroller%29/server/%5Bid%5D/advanced/page.tsx) — Route-group directory rename; preserve the public route.
- [apps/web/src/app/(gocontroller)/server/[id]/api-keys/page.tsx](../apps/web/src/app/%28gocontroller%29/server/%5Bid%5D/api-keys/page.tsx) — Route-group directory rename; preserve the public route.
- [apps/web/src/app/(gocontroller)/server/[id]/codriver/page.tsx](../apps/web/src/app/%28gocontroller%29/server/%5Bid%5D/codriver/page.tsx) — Route-group directory rename; preserve the public route.
- [apps/web/src/app/(gocontroller)/server/[id]/files/editor/page.tsx](../apps/web/src/app/%28gocontroller%29/server/%5Bid%5D/files/editor/page.tsx) — Route-group directory rename; preserve the public route.
- [apps/web/src/app/(gocontroller)/server/[id]/files/layout.tsx](../apps/web/src/app/%28gocontroller%29/server/%5Bid%5D/files/layout.tsx) — Route-group directory rename; preserve the public route.
- [apps/web/src/app/(gocontroller)/server/[id]/files/loading.tsx](../apps/web/src/app/%28gocontroller%29/server/%5Bid%5D/files/loading.tsx) — Route-group directory rename; preserve the public route.
- [apps/web/src/app/(gocontroller)/server/[id]/files/page.tsx](../apps/web/src/app/%28gocontroller%29/server/%5Bid%5D/files/page.tsx) — Route-group directory rename; preserve the public route.
- [apps/web/src/app/(gocontroller)/server/[id]/game/loading.tsx](../apps/web/src/app/%28gocontroller%29/server/%5Bid%5D/game/loading.tsx) — Route-group directory rename; preserve the public route.
- [apps/web/src/app/(gocontroller)/server/[id]/game/page.tsx](../apps/web/src/app/%28gocontroller%29/server/%5Bid%5D/game/page.tsx) — Route-group directory rename; preserve the public route.
- [apps/web/src/app/(gocontroller)/server/[id]/layout.tsx](../apps/web/src/app/%28gocontroller%29/server/%5Bid%5D/layout.tsx) — Route-group directory rename; preserve the public route.
- [apps/web/src/app/(gocontroller)/server/[id]/live/page.tsx](../apps/web/src/app/%28gocontroller%29/server/%5Bid%5D/live/page.tsx) — Route-group directory rename; preserve the public route.
- [apps/web/src/app/(gocontroller)/server/[id]/maps/jukebox-columns.tsx](../apps/web/src/app/%28gocontroller%29/server/%5Bid%5D/maps/jukebox-columns.tsx) — Route-group directory rename; preserve the public route.
- [apps/web/src/app/(gocontroller)/server/[id]/maps/loading.tsx](../apps/web/src/app/%28gocontroller%29/server/%5Bid%5D/maps/loading.tsx) — Route-group directory rename; preserve the public route.
- [apps/web/src/app/(gocontroller)/server/[id]/maps/local-maps-columns.tsx](../apps/web/src/app/%28gocontroller%29/server/%5Bid%5D/maps/local-maps-columns.tsx) — Route-group directory rename; preserve the public route.
- [apps/web/src/app/(gocontroller)/server/[id]/maps/map-order-columns.tsx](../apps/web/src/app/%28gocontroller%29/server/%5Bid%5D/maps/map-order-columns.tsx) — Route-group directory rename; preserve the public route.
- [apps/web/src/app/(gocontroller)/server/[id]/maps/page.tsx](../apps/web/src/app/%28gocontroller%29/server/%5Bid%5D/maps/page.tsx) — Route-group directory rename; preserve the public route.
- [apps/web/src/app/(gocontroller)/server/[id]/maps/server-maps-columns.tsx](../apps/web/src/app/%28gocontroller%29/server/%5Bid%5D/maps/server-maps-columns.tsx) — Route-group directory rename; preserve the public route.
- [apps/web/src/app/(gocontroller)/server/[id]/nadeo/page.tsx](../apps/web/src/app/%28gocontroller%29/server/%5Bid%5D/nadeo/page.tsx) — Route-group directory rename; preserve the public route.
- [apps/web/src/app/(gocontroller)/server/[id]/players/banlist-columns.tsx](../apps/web/src/app/%28gocontroller%29/server/%5Bid%5D/players/banlist-columns.tsx) — Route-group directory rename; preserve the public route.
- [apps/web/src/app/(gocontroller)/server/[id]/players/blacklist-columns.tsx](../apps/web/src/app/%28gocontroller%29/server/%5Bid%5D/players/blacklist-columns.tsx) — Route-group directory rename; preserve the public route.
- [apps/web/src/app/(gocontroller)/server/[id]/players/guestlist-columns.tsx](../apps/web/src/app/%28gocontroller%29/server/%5Bid%5D/players/guestlist-columns.tsx) — Route-group directory rename; preserve the public route.
- [apps/web/src/app/(gocontroller)/server/[id]/players/page.tsx](../apps/web/src/app/%28gocontroller%29/server/%5Bid%5D/players/page.tsx) — Route-group directory rename; preserve the public route.
- [apps/web/src/app/(gocontroller)/server/[id]/players/players-columns.tsx](../apps/web/src/app/%28gocontroller%29/server/%5Bid%5D/players/players-columns.tsx) — Route-group directory rename; preserve the public route.
- [apps/web/src/app/(gocontroller)/server/[id]/plugins/page.tsx](../apps/web/src/app/%28gocontroller%29/server/%5Bid%5D/plugins/page.tsx) — Route-group directory rename; preserve the public route.
- [apps/web/src/app/(gocontroller)/server/[id]/records/actions.tsx](../apps/web/src/app/%28gocontroller%29/server/%5Bid%5D/records/actions.tsx) — Route-group directory rename; preserve the public route.
- [apps/web/src/app/(gocontroller)/server/[id]/records/maps-columns.tsx](../apps/web/src/app/%28gocontroller%29/server/%5Bid%5D/records/maps-columns.tsx) — Route-group directory rename; preserve the public route.
- [apps/web/src/app/(gocontroller)/server/[id]/records/matches-columns.tsx](../apps/web/src/app/%28gocontroller%29/server/%5Bid%5D/records/matches-columns.tsx) — Route-group directory rename; preserve the public route.
- [apps/web/src/app/(gocontroller)/server/[id]/records/page.tsx](../apps/web/src/app/%28gocontroller%29/server/%5Bid%5D/records/page.tsx) — Route-group directory rename; preserve the public route.
- [apps/web/src/app/(gocontroller)/server/[id]/settings/page.tsx](../apps/web/src/app/%28gocontroller%29/server/%5Bid%5D/settings/page.tsx) — Route-group directory rename; preserve the public route.
- [apps/web/src/app/(gocontroller)/server/[id]/tmx/page.tsx](../apps/web/src/app/%28gocontroller%29/server/%5Bid%5D/tmx/page.tsx) — Route-group directory rename; preserve the public route.
- [docker/evosc/init/01-create-gocontrolpanel.sql](../docker/evosc/init/01-create-gocontrolpanel.sql) — Rename filename and review database/user defaults.
- [docker/maniacontrol/init/01-create-gocontrolpanel.sql](../docker/maniacontrol/init/01-create-gocontrolpanel.sql) — Rename filename and review database/user defaults.
- [docker/minicontrol/init/01-create-gocontrolpanel.sql](../docker/minicontrol/init/01-create-gocontrolpanel.sql) — Rename filename and review database/user defaults.
- [docker/pyplanet/init/01-create-gocontrolpanel.sql](../docker/pyplanet/init/01-create-gocontrolpanel.sql) — Rename filename and review database/user defaults.
- [packages/plugin-sdk/examples/hello/tmcp-plugin.json](../packages/plugin-sdk/examples/hello/tmcp-plugin.json) — Already uses the target plugin manifest name; keep.

## Appendix C — every plugin-repository text match

63 files; 146 matching lines. Each entry lists every matched line in that file.

- [.github/PULL_REQUEST_TEMPLATE.md](../../tmcontrolpanel-plugins/.github/PULL_REQUEST_TEMPLATE.md#L6) — lines 6; spellings: `tmcp`.
- [.github/workflows/check.yml](../../tmcontrolpanel-plugins/.github/workflows/check.yml#L15) — lines 15, 16; spellings: `gocontrolpanel`, `TMCONTROLPANEL`.
- [.github/workflows/publish.yml](../../tmcontrolpanel-plugins/.github/workflows/publish.yml#L25) — lines 25, 26; spellings: `gocontrolpanel`, `TMCONTROLPANEL`.
- [AGENTS.md](../../tmcontrolpanel-plugins/AGENTS.md#L5) — lines 5, 29, 30, 59, 63; spellings: `GoControlPanel`, `gocontrolpanel`, `tmcontrolpanel`, `TMCONTROLPANEL`, `tmcp`.
- [README.md](../../tmcontrolpanel-plugins/README.md#L1) — lines 1, 3, 6, 29, 36, 39, 48, 55, 104, 109, 131; spellings: `GoControlPanel`, `gocontrolpanel`, `tmcontrolpanel`, `TMCONTROLPANEL`, `tmcp`.
- [package.json](../../tmcontrolpanel-plugins/package.json#L2) — lines 2; spellings: `tmcontrolpanel`.
- [plugins/admin/README.md](../../tmcontrolpanel-plugins/plugins/admin/README.md#L5) — lines 5; spellings: `GoControlPanel`.
- [plugins/admin/src/index.ts](../../tmcontrolpanel-plugins/plugins/admin/src/index.ts#L1) — lines 1; spellings: `tmcontrolpanel`.
- [plugins/admin/tmcp-plugin.json](../../tmcontrolpanel-plugins/plugins/admin/tmcp-plugin.json#L7) — lines 7, 9; spellings: `GoControlPanel`, `tmcontrolpanel`.
- [plugins/admin/versions/1.0.0.json](../../tmcontrolpanel-plugins/plugins/admin/versions/1.0.0.json#L5) — lines 5; spellings: `GoControlPanel`.
- [plugins/ecm/README.md](../../tmcontrolpanel-plugins/plugins/ecm/README.md#L5) — lines 5; spellings: `GoControlPanel`.
- [plugins/ecm/src/index.ts](../../tmcontrolpanel-plugins/plugins/ecm/src/index.ts#L9) — lines 9; spellings: `tmcontrolpanel`.
- [plugins/ecm/tmcp-plugin.json](../../tmcontrolpanel-plugins/plugins/ecm/tmcp-plugin.json#L7) — lines 7, 9; spellings: `GoControlPanel`, `tmcontrolpanel`.
- [plugins/ecm/versions/1.0.0.json](../../tmcontrolpanel-plugins/plugins/ecm/versions/1.0.0.json#L5) — lines 5; spellings: `GoControlPanel`.
- [plugins/hello/README.md](../../tmcontrolpanel-plugins/plugins/hello/README.md#L3) — lines 3, 18; spellings: `GoControlPanel`, `tmcp`.
- [plugins/hello/src/index.ts](../../tmcontrolpanel-plugins/plugins/hello/src/index.ts#L1) — lines 1; spellings: `tmcontrolpanel`.
- [plugins/hello/tmcp-plugin.json](../../tmcontrolpanel-plugins/plugins/hello/tmcp-plugin.json#L7) — lines 7, 9; spellings: `GoControlPanel`, `tmcontrolpanel`.
- [plugins/live-ranking/README.md](../../tmcontrolpanel-plugins/plugins/live-ranking/README.md#L5) — lines 5; spellings: `GoControlPanel`.
- [plugins/live-ranking/src/index.ts](../../tmcontrolpanel-plugins/plugins/live-ranking/src/index.ts#L13) — lines 13; spellings: `tmcontrolpanel`.
- [plugins/live-ranking/tmcp-plugin.json](../../tmcontrolpanel-plugins/plugins/live-ranking/tmcp-plugin.json#L7) — lines 7, 9; spellings: `GoControlPanel`, `tmcontrolpanel`.
- [plugins/live-ranking/versions/1.0.0.json](../../tmcontrolpanel-plugins/plugins/live-ranking/versions/1.0.0.json#L5) — lines 5; spellings: `GoControlPanel`.
- [plugins/live-round/README.md](../../tmcontrolpanel-plugins/plugins/live-round/README.md#L5) — lines 5; spellings: `GoControlPanel`.
- [plugins/live-round/src/index.ts](../../tmcontrolpanel-plugins/plugins/live-round/src/index.ts#L19) — lines 19; spellings: `tmcontrolpanel`.
- [plugins/live-round/tmcp-plugin.json](../../tmcontrolpanel-plugins/plugins/live-round/tmcp-plugin.json#L7) — lines 7, 9; spellings: `GoControlPanel`, `tmcontrolpanel`.
- [plugins/live-round/versions/1.0.0.json](../../tmcontrolpanel-plugins/plugins/live-round/versions/1.0.0.json#L5) — lines 5; spellings: `GoControlPanel`.
- [plugins/map-info/README.md](../../tmcontrolpanel-plugins/plugins/map-info/README.md#L5) — lines 5; spellings: `GoControlPanel`.
- [plugins/map-info/src/index.ts](../../tmcontrolpanel-plugins/plugins/map-info/src/index.ts#L1) — lines 1; spellings: `tmcontrolpanel`.
- [plugins/map-info/tmcp-plugin.json](../../tmcontrolpanel-plugins/plugins/map-info/tmcp-plugin.json#L7) — lines 7, 9; spellings: `GoControlPanel`, `tmcontrolpanel`.
- [plugins/map-info/versions/1.0.0.json](../../tmcontrolpanel-plugins/plugins/map-info/versions/1.0.0.json#L5) — lines 5; spellings: `GoControlPanel`.
- [plugins/match/README.md](../../tmcontrolpanel-plugins/plugins/match/README.md#L5) — lines 5; spellings: `GoControlPanel`.
- [plugins/match/src/index.ts](../../tmcontrolpanel-plugins/plugins/match/src/index.ts#L9) — lines 9; spellings: `tmcontrolpanel`.
- [plugins/match/tmcp-plugin.json](../../tmcontrolpanel-plugins/plugins/match/tmcp-plugin.json#L7) — lines 7, 9; spellings: `GoControlPanel`, `tmcontrolpanel`.
- [plugins/match/versions/1.0.0.json](../../tmcontrolpanel-plugins/plugins/match/versions/1.0.0.json#L5) — lines 5; spellings: `GoControlPanel`.
- [plugins/player-info/README.md](../../tmcontrolpanel-plugins/plugins/player-info/README.md#L5) — lines 5; spellings: `GoControlPanel`.
- [plugins/player-info/src/index.ts](../../tmcontrolpanel-plugins/plugins/player-info/src/index.ts#L9) — lines 9; spellings: `tmcontrolpanel`.
- [plugins/player-info/tmcp-plugin.json](../../tmcontrolpanel-plugins/plugins/player-info/tmcp-plugin.json#L7) — lines 7, 9; spellings: `GoControlPanel`, `tmcontrolpanel`.
- [plugins/player-info/versions/1.0.0.json](../../tmcontrolpanel-plugins/plugins/player-info/versions/1.0.0.json#L5) — lines 5; spellings: `GoControlPanel`.
- [plugins/records-info/README.md](../../tmcontrolpanel-plugins/plugins/records-info/README.md#L5) — lines 5; spellings: `GoControlPanel`.
- [plugins/records-info/src/index.ts](../../tmcontrolpanel-plugins/plugins/records-info/src/index.ts#L7) — lines 7; spellings: `tmcontrolpanel`.
- [plugins/records-info/tmcp-plugin.json](../../tmcontrolpanel-plugins/plugins/records-info/tmcp-plugin.json#L7) — lines 7, 9; spellings: `GoControlPanel`, `tmcontrolpanel`.
- [plugins/records-info/versions/1.0.0.json](../../tmcontrolpanel-plugins/plugins/records-info/versions/1.0.0.json#L5) — lines 5; spellings: `GoControlPanel`.
- [plugins/ta-active-runs/README.md](../../tmcontrolpanel-plugins/plugins/ta-active-runs/README.md#L5) — lines 5; spellings: `GoControlPanel`.
- [plugins/ta-active-runs/src/index.ts](../../tmcontrolpanel-plugins/plugins/ta-active-runs/src/index.ts#L12) — lines 12; spellings: `tmcontrolpanel`.
- [plugins/ta-active-runs/tmcp-plugin.json](../../tmcontrolpanel-plugins/plugins/ta-active-runs/tmcp-plugin.json#L7) — lines 7, 9; spellings: `GoControlPanel`, `tmcontrolpanel`.
- [plugins/ta-active-runs/versions/1.0.0.json](../../tmcontrolpanel-plugins/plugins/ta-active-runs/versions/1.0.0.json#L5) — lines 5; spellings: `GoControlPanel`.
- [plugins/ta-leaderboard/README.md](../../tmcontrolpanel-plugins/plugins/ta-leaderboard/README.md#L5) — lines 5; spellings: `GoControlPanel`.
- [plugins/ta-leaderboard/src/index.ts](../../tmcontrolpanel-plugins/plugins/ta-leaderboard/src/index.ts#L9) — lines 9; spellings: `tmcontrolpanel`.
- [plugins/ta-leaderboard/tmcp-plugin.json](../../tmcontrolpanel-plugins/plugins/ta-leaderboard/tmcp-plugin.json#L7) — lines 7, 9; spellings: `GoControlPanel`, `tmcontrolpanel`.
- [plugins/ta-leaderboard/versions/1.0.0.json](../../tmcontrolpanel-plugins/plugins/ta-leaderboard/versions/1.0.0.json#L5) — lines 5; spellings: `GoControlPanel`.
- [registry.json](../../tmcontrolpanel-plugins/registry.json#L2) — lines 2, 3; spellings: `GoControlPanel`, `tmcontrolpanel`.
- [scripts/build.ts](../../tmcontrolpanel-plugins/scripts/build.ts#L9) — lines 9, 23, 30; spellings: `tmcontrolpanel`, `tmcp`.
- [scripts/publish-wiki.ts](../../tmcontrolpanel-plugins/scripts/publish-wiki.ts#L6) — lines 6, 15, 23, 50; spellings: `tmcontrolpanel`, `tmcp`.
- [test/**snapshots**/manialink.test.ts.snap](../../tmcontrolpanel-plugins/test/__snapshots__/manialink.test.ts.snap#L6) — lines 6, 142, 206, 312, 423, 764, 803, 1394, 1450, 1580, 1606, 2195, 2237, 2350, 2604, 2634, 2831, 2864, 3204, 3232, 3637, 3665, 3711, 3912, 3938; spellings: `GCP`.
- [test/config-forms.test.ts](../../tmcontrolpanel-plugins/test/config-forms.test.ts#L8) — lines 8, 12; spellings: `gcp`, `tmcp`.
- [test/fakes/harness.ts](../../tmcontrolpanel-plugins/test/fakes/harness.ts#L10) — lines 10, 17; spellings: `tmcontrolpanel`, `tmcp`.
- [wiki/Configuration-Forms.md](../../tmcontrolpanel-plugins/wiki/Configuration-Forms.md#L3) — lines 3; spellings: `tmcp`.
- [wiki/Creating-a-Plugin.md](../../tmcontrolpanel-plugins/wiki/Creating-a-Plugin.md#L11) — lines 11, 16, 27, 57; spellings: `tmcontrolpanel`, `tmcp`.
- [wiki/Developing-and-Testing.md](../../tmcontrolpanel-plugins/wiki/Developing-and-Testing.md#L7) — lines 7; spellings: `tmcp`.
- [wiki/Developing-with-AI.md](../../tmcontrolpanel-plugins/wiki/Developing-with-AI.md#L9) — lines 9, 13, 83, 116; spellings: `tmcontrolpanel`.
- [wiki/Getting-Started.md](../../tmcontrolpanel-plugins/wiki/Getting-Started.md#L10) — lines 10, 11, 12; spellings: `gocontrolpanel`, `tmcontrolpanel`.
- [wiki/Home.md](../../tmcontrolpanel-plugins/wiki/Home.md#L3) — lines 3, 7, 10, 11, 12, 13, 14, 17, 20; spellings: `gocontrolpanel`, `GoControlPanel`, `tmcontrolpanel`.
- [wiki/Publishing.md](../../tmcontrolpanel-plugins/wiki/Publishing.md#L16) — lines 16; spellings: `tmcp`.
- [wiki/\_Sidebar.md](../../tmcontrolpanel-plugins/wiki/_Sidebar.md#L1) — lines 1, 2, 3, 4, 5, 6, 7, 8; spellings: `tmcontrolpanel`.

## Appendix D — every linked tmservers worktree text match

316 files; 819 matching lines. Each entry lists every matched line in that file.

- [.env.example](../../gocontrolpanel-tmservers/.env.example#L6) — lines 6, 9, 36; spellings: `gocontrolpanel`, `GoControlPanel`.
- [.github/workflows/deploy-production.yml](../../gocontrolpanel-tmservers/.github/workflows/deploy-production.yml#L38) — lines 38; spellings: `gocontrolpanel`.
- [.github/workflows/deploy-staging.yml](../../gocontrolpanel-tmservers/.github/workflows/deploy-staging.yml#L39) — lines 39; spellings: `gocontrolpanel`.
- [.github/workflows/docker-publish-on-release.yml](../../gocontrolpanel-tmservers/.github/workflows/docker-publish-on-release.yml#L36) — lines 36; spellings: `gocontrolpanel`.
- [.github/workflows/nextjs-build-check.yml](../../gocontrolpanel-tmservers/.github/workflows/nextjs-build-check.yml#L48) — lines 48; spellings: `gcp`.
- [.github/workflows/workspace-check.yml](../../gocontrolpanel-tmservers/.github/workflows/workspace-check.yml#L36) — lines 36, 37, 38, 42, 43, 44, 45, 49, 50, 63, 64, 65, 68, 76, 77, 94; spellings: `gcp`, `tmcontrolpanel`.
- [AGENTS.md](../../gocontrolpanel-tmservers/AGENTS.md#L1) — lines 1, 3, 9, 10, 11, 12, 13, 23, 33, 34; spellings: `gcp`, `GoControlPanel`, `tmcontrolpanel`.
- [CHANGELOG.md](../../gocontrolpanel-tmservers/CHANGELOG.md#L3) — lines 3, 24, 73, 327, 522, 523, 524, 525, 526, 527, 528, 529, 530, 531, 532, 533, 534, 535, 536, 537, 538, 539, 540, 541, 542, 543, 544, 545, 546, 547, 548, 549, 550, 551, 552, 553, 554, 555, 556, 557, 558, 559; spellings: `gocontrolpanel`, `GoControlPanel`, `tmcp`.
- [README.md](../../gocontrolpanel-tmservers/README.md#L1) — lines 1, 2, 3, 5, 7, 46, 165, 169, 170, 180, 189, 207, 216, 218, 237, 238, 240, 242, 247, 248, 258, 260, 266, 277, 278, 292, 294, 306, 311, 318, 325, 353, 367, 373, 374, 382, 390, 392, 410, 422, 424, 430, 473, 485, 488; spellings: `gocontrolpanel`, `GoControlPanel`.
- [apps/gbx-service/.env.example](../../gocontrolpanel-tmservers/apps/gbx-service/.env.example#L5) — lines 5, 7, 33; spellings: `gocontrolpanel`, `GoControlPanel`.
- [apps/gbx-service/Dockerfile](../../gocontrolpanel-tmservers/apps/gbx-service/Dockerfile#L26) — lines 26; spellings: `gcp`.
- [apps/gbx-service/README.md](../../gocontrolpanel-tmservers/apps/gbx-service/README.md#L12) — lines 12, 19, 20, 23, 24, 25, 27, 28, 58; spellings: `gcp`, `tmcontrolpanel`.
- [apps/gbx-service/docker-compose.test.yml](../../gocontrolpanel-tmservers/apps/gbx-service/docker-compose.test.yml#L6) — lines 6, 7, 8; spellings: `gcp`.
- [apps/gbx-service/e2e/.env.example](../../gocontrolpanel-tmservers/apps/gbx-service/e2e/.env.example#L14) — lines 14, 25; spellings: `gcp`, `GoControlPanel`.
- [apps/gbx-service/e2e/docker-compose.yml](../../gocontrolpanel-tmservers/apps/gbx-service/e2e/docker-compose.yml#L2) — lines 2, 3, 18, 26, 27, 28, 29; spellings: `GCP`, `gcp`, `GoControlPanel`.
- [apps/gbx-service/package.json](../../gocontrolpanel-tmservers/apps/gbx-service/package.json#L2) — lines 2, 25, 26, 41; spellings: `gcp`, `tmcontrolpanel`.
- [apps/gbx-service/scripts/seed-e2e.ts](../../gocontrolpanel-tmservers/apps/gbx-service/scripts/seed-e2e.ts#L1) — lines 1, 3, 4, 27, 60; spellings: `GCP`, `gcp`.
- [apps/gbx-service/scripts/ws-watch.ts](../../gocontrolpanel-tmservers/apps/gbx-service/scripts/ws-watch.ts#L3) — lines 3, 29, 30; spellings: `GCP`, `gcp`.
- [apps/gbx-service/src/config.ts](../../gocontrolpanel-tmservers/apps/gbx-service/src/config.ts#L1) — lines 1, 33; spellings: `gcp`, `GoControlPanel`.
- [apps/gbx-service/src/container.ts](../../gocontrolpanel-tmservers/apps/gbx-service/src/container.ts#L1) — lines 1; spellings: `gcp`.
- [apps/gbx-service/src/core/chat/chat-service.ts](../../gocontrolpanel-tmservers/apps/gbx-service/src/core/chat/chat-service.ts#L1) — lines 1; spellings: `gcp`.
- [apps/gbx-service/src/core/chat/codriver-window.ts](../../gocontrolpanel-tmservers/apps/gbx-service/src/core/chat/codriver-window.ts#L1) — lines 1; spellings: `gcp`.
- [apps/gbx-service/src/core/errors.ts](../../gocontrolpanel-tmservers/apps/gbx-service/src/core/errors.ts#L1) — lines 1; spellings: `gcp`.
- [apps/gbx-service/src/core/gbx/callbacks.ts](../../gocontrolpanel-tmservers/apps/gbx-service/src/core/gbx/callbacks.ts#L15) — lines 15, 17; spellings: `gcp`, `GoControlPanel`.
- [apps/gbx-service/src/core/live/live-state.ts](../../gocontrolpanel-tmservers/apps/gbx-service/src/core/live/live-state.ts#L13) — lines 13; spellings: `gcp`.
- [apps/gbx-service/src/core/live/modes.ts](../../gocontrolpanel-tmservers/apps/gbx-service/src/core/live/modes.ts#L1) — lines 1; spellings: `gcp`.
- [apps/gbx-service/src/core/live/points.ts](../../gocontrolpanel-tmservers/apps/gbx-service/src/core/live/points.ts#L1) — lines 1; spellings: `gcp`.
- [apps/gbx-service/src/core/manialink/action-router.ts](../../gocontrolpanel-tmservers/apps/gbx-service/src/core/manialink/action-router.ts#L1) — lines 1; spellings: `gcp`.
- [apps/gbx-service/src/core/manialink/components/manialink.ts](../../gocontrolpanel-tmservers/apps/gbx-service/src/core/manialink/components/manialink.ts#L1) — lines 1; spellings: `gcp`.
- [apps/gbx-service/src/core/manialink/template-renderer.ts](../../gocontrolpanel-tmservers/apps/gbx-service/src/core/manialink/template-renderer.ts#L1) — lines 1; spellings: `gcp`.
- [apps/gbx-service/src/core/plugins/first-party.ts](../../gocontrolpanel-tmservers/apps/gbx-service/src/core/plugins/first-party.ts#L1) — lines 1; spellings: `gcp`.
- [apps/gbx-service/src/core/plugins/marketplace-watcher.ts](../../gocontrolpanel-tmservers/apps/gbx-service/src/core/plugins/marketplace-watcher.ts#L1) — lines 1; spellings: `gcp`.
- [apps/gbx-service/src/core/plugins/plugin-context.ts](../../gocontrolpanel-tmservers/apps/gbx-service/src/core/plugins/plugin-context.ts#L5) — lines 5; spellings: `gcp`.
- [apps/gbx-service/src/core/plugins/plugin-host.ts](../../gocontrolpanel-tmservers/apps/gbx-service/src/core/plugins/plugin-host.ts#L1) — lines 1; spellings: `gcp`.
- [apps/gbx-service/src/core/plugins/sandbox/guest-runtime.ts](../../gocontrolpanel-tmservers/apps/gbx-service/src/core/plugins/sandbox/guest-runtime.ts#L10) — lines 10, 21, 25, 141, 369; spellings: `gcp`, `tmcontrolpanel`, `tmcp`.
- [apps/gbx-service/src/core/plugins/sandbox/package-loader.ts](../../gocontrolpanel-tmservers/apps/gbx-service/src/core/plugins/sandbox/package-loader.ts#L1) — lines 1, 2; spellings: `gcp`.
- [apps/gbx-service/src/core/plugins/sandbox/quickjs-vm.ts](../../gocontrolpanel-tmservers/apps/gbx-service/src/core/plugins/sandbox/quickjs-vm.ts#L87) — lines 87, 166; spellings: `gcp`.
- [apps/gbx-service/src/core/plugins/sandbox/sandboxed-plugin.ts](../../gocontrolpanel-tmservers/apps/gbx-service/src/core/plugins/sandbox/sandboxed-plugin.ts#L12) — lines 12, 13, 191, 195; spellings: `gcp`.
- [apps/gbx-service/src/core/plugins/sdk.ts](../../gocontrolpanel-tmservers/apps/gbx-service/src/core/plugins/sdk.ts#L1) — lines 1; spellings: `gcp`.
- [apps/gbx-service/src/core/ports.ts](../../gocontrolpanel-tmservers/apps/gbx-service/src/core/ports.ts#L8) — lines 8; spellings: `gcp`.
- [apps/gbx-service/src/core/server/game-event-handler.ts](../../gocontrolpanel-tmservers/apps/gbx-service/src/core/server/game-event-handler.ts#L17) — lines 17; spellings: `gcp`.
- [apps/gbx-service/src/core/server/live-sync.ts](../../gocontrolpanel-tmservers/apps/gbx-service/src/core/server/live-sync.ts#L1) — lines 1, 17; spellings: `gcp`, `gocontrolpanel`.
- [apps/gbx-service/src/core/server/map-catalog.ts](../../gocontrolpanel-tmservers/apps/gbx-service/src/core/server/map-catalog.ts#L1) — lines 1; spellings: `gcp`.
- [apps/gbx-service/src/core/server/map-list.ts](../../gocontrolpanel-tmservers/apps/gbx-service/src/core/server/map-list.ts#L1) — lines 1; spellings: `gcp`.
- [apps/gbx-service/src/core/server/match-recorder.ts](../../gocontrolpanel-tmservers/apps/gbx-service/src/core/server/match-recorder.ts#L1) — lines 1; spellings: `gcp`.
- [apps/gbx-service/src/core/server/players.ts](../../gocontrolpanel-tmservers/apps/gbx-service/src/core/server/players.ts#L1) — lines 1; spellings: `gcp`.
- [apps/gbx-service/src/core/server/server-commands.ts](../../gocontrolpanel-tmservers/apps/gbx-service/src/core/server/server-commands.ts#L1) — lines 1; spellings: `gcp`.
- [apps/gbx-service/src/core/server/server-events.ts](../../gocontrolpanel-tmservers/apps/gbx-service/src/core/server/server-events.ts#L14) — lines 14; spellings: `gcp`.
- [apps/gbx-service/src/core/server/server-registry.ts](../../gocontrolpanel-tmservers/apps/gbx-service/src/core/server/server-registry.ts#L1) — lines 1; spellings: `gcp`.
- [apps/gbx-service/src/core/server/server-runtime.ts](../../gocontrolpanel-tmservers/apps/gbx-service/src/core/server/server-runtime.ts#L6) — lines 6, 108; spellings: `gcp`, `GoControlPanel`.
- [apps/gbx-service/src/http/errors.ts](../../gocontrolpanel-tmservers/apps/gbx-service/src/http/errors.ts#L1) — lines 1; spellings: `gcp`.
- [apps/gbx-service/src/http/routes/internal.ts](../../gocontrolpanel-tmservers/apps/gbx-service/src/http/routes/internal.ts#L16) — lines 16; spellings: `gcp`.
- [apps/gbx-service/src/http/ws/channels.ts](../../gocontrolpanel-tmservers/apps/gbx-service/src/http/ws/channels.ts#L9) — lines 9; spellings: `gcp`.
- [apps/gbx-service/src/http/ws/ticket-verifier.ts](../../gocontrolpanel-tmservers/apps/gbx-service/src/http/ws/ticket-verifier.ts#L1) — lines 1; spellings: `gcp`.
- [apps/gbx-service/src/infra/db/prisma-repositories.ts](../../gocontrolpanel-tmservers/apps/gbx-service/src/infra/db/prisma-repositories.ts#L1) — lines 1, 7, 8; spellings: `gcp`.
- [apps/gbx-service/src/infra/db/system-command-services.ts](../../gocontrolpanel-tmservers/apps/gbx-service/src/infra/db/system-command-services.ts#L1) — lines 1; spellings: `gcp`.
- [apps/gbx-service/src/infra/first-party-packages.ts](../../gocontrolpanel-tmservers/apps/gbx-service/src/infra/first-party-packages.ts#L1) — lines 1, 2; spellings: `gcp`.
- [apps/gbx-service/src/infra/http/codriver-client.ts](../../gocontrolpanel-tmservers/apps/gbx-service/src/infra/http/codriver-client.ts#L1) — lines 1; spellings: `gcp`.
- [apps/gbx-service/src/infra/http/plugin-http-client.ts](../../gocontrolpanel-tmservers/apps/gbx-service/src/infra/http/plugin-http-client.ts#L1) — lines 1, 10, 11, 25; spellings: `gcp`, `GoControlPanel`.
- [apps/gbx-service/src/infra/marketplace/index-source.ts](../../gocontrolpanel-tmservers/apps/gbx-service/src/infra/marketplace/index-source.ts#L5) — lines 5; spellings: `gcp`.
- [apps/gbx-service/src/infra/redis/jukebox-store.ts](../../gocontrolpanel-tmservers/apps/gbx-service/src/infra/redis/jukebox-store.ts#L1) — lines 1; spellings: `gcp`.
- [apps/gbx-service/src/infra/redis/lifecycle-subscriber.ts](../../gocontrolpanel-tmservers/apps/gbx-service/src/infra/redis/lifecycle-subscriber.ts#L5) — lines 5; spellings: `gcp`.
- [apps/gbx-service/src/infra/sandbox-assets.ts](../../gocontrolpanel-tmservers/apps/gbx-service/src/infra/sandbox-assets.ts#L4) — lines 4; spellings: `gcp`.
- [apps/gbx-service/templates/manialink.hbs](../../gocontrolpanel-tmservers/apps/gbx-service/templates/manialink.hbs#L3) — lines 3; spellings: `GCP`.
- [apps/gbx-service/test/core/**snapshots**/manialink.test.ts.snap](../../gocontrolpanel-tmservers/apps/gbx-service/test/core/__snapshots__/manialink.test.ts.snap#L6) — lines 6, 142, 359, 396, 460, 566; spellings: `GCP`.
- [apps/gbx-service/test/core/game-events.test.ts](../../gocontrolpanel-tmservers/apps/gbx-service/test/core/game-events.test.ts#L1) — lines 1, 229, 238; spellings: `gcp`, `gocontrolpanel`.
- [apps/gbx-service/test/core/manialink.test.ts](../../gocontrolpanel-tmservers/apps/gbx-service/test/core/manialink.test.ts#L1) — lines 1; spellings: `gcp`.
- [apps/gbx-service/test/core/points.test.ts](../../gocontrolpanel-tmservers/apps/gbx-service/test/core/points.test.ts#L1) — lines 1; spellings: `gcp`.
- [apps/gbx-service/test/fakes/harness.ts](../../gocontrolpanel-tmservers/apps/gbx-service/test/fakes/harness.ts#L1) — lines 1, 2; spellings: `gcp`.
- [apps/gbx-service/test/fakes/repositories.ts](../../gocontrolpanel-tmservers/apps/gbx-service/test/fakes/repositories.ts#L1) — lines 1; spellings: `gcp`.
- [apps/gbx-service/test/http/app-fixture.ts](../../gocontrolpanel-tmservers/apps/gbx-service/test/http/app-fixture.ts#L1) — lines 1; spellings: `gcp`.
- [apps/gbx-service/test/http/internal-routes.test.ts](../../gocontrolpanel-tmservers/apps/gbx-service/test/http/internal-routes.test.ts#L1) — lines 1; spellings: `gcp`.
- [apps/gbx-service/test/infra/env-examples.test.ts](../../gocontrolpanel-tmservers/apps/gbx-service/test/infra/env-examples.test.ts#L55) — lines 55; spellings: `gocontrolpanel`.
- [apps/gbx-service/test/infra/first-party-packages.test.ts](../../gocontrolpanel-tmservers/apps/gbx-service/test/infra/first-party-packages.test.ts#L4) — lines 4, 11, 21; spellings: `gcp`, `tmcp`.
- [apps/gbx-service/test/infra/server-credentials.test.ts](../../gocontrolpanel-tmservers/apps/gbx-service/test/infra/server-credentials.test.ts#L1) — lines 1; spellings: `gcp`.
- [apps/gbx-service/test/infra/system-command-services.test.ts](../../gocontrolpanel-tmservers/apps/gbx-service/test/infra/system-command-services.test.ts#L1) — lines 1; spellings: `gcp`.
- [apps/gbx-service/test/integration/prisma-repositories.test.ts](../../gocontrolpanel-tmservers/apps/gbx-service/test/integration/prisma-repositories.test.ts#L1) — lines 1, 5, 6, 480, 486, 489, 533, 542; spellings: `gcp`, `GoControlPanel`, `tmcp`.
- [apps/gbx-service/test/integration/redis.test.ts](../../gocontrolpanel-tmservers/apps/gbx-service/test/integration/redis.test.ts#L1) — lines 1; spellings: `gcp`.
- [apps/gbx-service/test/integration/system-command-services.test.ts](../../gocontrolpanel-tmservers/apps/gbx-service/test/integration/system-command-services.test.ts#L1) — lines 1; spellings: `gcp`.
- [apps/gbx-service/test/plugins/guest-runtime.test.ts](../../gocontrolpanel-tmservers/apps/gbx-service/test/plugins/guest-runtime.test.ts#L32) — lines 32, 36; spellings: `gcp`.
- [apps/gbx-service/test/plugins/marketplace-watcher.test.ts](../../gocontrolpanel-tmservers/apps/gbx-service/test/plugins/marketplace-watcher.test.ts#L1) — lines 1; spellings: `gcp`.
- [apps/gbx-service/test/plugins/sandbox.test.ts](../../gocontrolpanel-tmservers/apps/gbx-service/test/plugins/sandbox.test.ts#L1) — lines 1, 2, 8, 27, 40, 50; spellings: `gcp`, `tmcontrolpanel`, `tmcp`.
- [apps/gbx-service/test/plugins/sdk-types.test.ts](../../gocontrolpanel-tmservers/apps/gbx-service/test/plugins/sdk-types.test.ts#L1) — lines 1, 2, 3; spellings: `gcp`, `tmcontrolpanel`.
- [apps/gbx-service/tsup.config.ts](../../gocontrolpanel-tmservers/apps/gbx-service/tsup.config.ts#L12) — lines 12; spellings: `gcp`.
- [apps/web/.env.example](../../gocontrolpanel-tmservers/apps/web/.env.example#L6) — lines 6, 9, 37; spellings: `gocontrolpanel`, `GoControlPanel`.
- [apps/web/AGENTS.md](../../gocontrolpanel-tmservers/apps/web/AGENTS.md#L17) — lines 17, 54, 66; spellings: `gcp`, `gocontroller`.
- [apps/web/Dockerfile](../../gocontrolpanel-tmservers/apps/web/Dockerfile#L30) — lines 30; spellings: `gcp`.
- [apps/web/hetzner/add-server.sh.hbs](../../gocontrolpanel-tmservers/apps/web/hetzner/add-server.sh.hbs#L5) — lines 5, 8, 12; spellings: `gocontrolpanel`.
- [apps/web/hetzner/server-init.sh.hbs](../../gocontrolpanel-tmservers/apps/web/hetzner/server-init.sh.hbs#L9) — lines 9, 10, 11, 12, 13, 15, 18, 23, 66; spellings: `gcp`, `gocontrolpanel`.
- [apps/web/hetzner/update-containers.sh](../../gocontrolpanel-tmservers/apps/web/hetzner/update-containers.sh#L11) — lines 11; spellings: `gocontrolpanel`.
- [apps/web/next.config.ts](../../gocontrolpanel-tmservers/apps/web/next.config.ts#L16) — lines 16; spellings: `gcp`.
- [apps/web/package.json](../../gocontrolpanel-tmservers/apps/web/package.json#L2) — lines 2, 23, 24; spellings: `gcp`.
- [apps/web/src/actions/database/audit-logs.ts](../../gocontrolpanel-tmservers/apps/web/src/actions/database/audit-logs.ts#L7) — lines 7; spellings: `gcp`.
- [apps/web/src/actions/database/groups.ts](../../gocontrolpanel-tmservers/apps/web/src/actions/database/groups.ts#L20) — lines 20; spellings: `gcp`.
- [apps/web/src/actions/database/notifications.ts](../../gocontrolpanel-tmservers/apps/web/src/actions/database/notifications.ts#L5) — lines 5; spellings: `gcp`.
- [apps/web/src/actions/database/roles.ts](../../gocontrolpanel-tmservers/apps/web/src/actions/database/roles.ts#L6) — lines 6; spellings: `gcp`.
- [apps/web/src/actions/database/server-only/audit-logs.ts](../../gocontrolpanel-tmservers/apps/web/src/actions/database/server-only/audit-logs.ts#L2) — lines 2; spellings: `gcp`.
- [apps/web/src/actions/database/server-only/audit-scope.ts](../../gocontrolpanel-tmservers/apps/web/src/actions/database/server-only/audit-scope.ts#L1) — lines 1; spellings: `gcp`.
- [apps/web/src/actions/database/server-only/auth.ts](../../gocontrolpanel-tmservers/apps/web/src/actions/database/server-only/auth.ts#L4) — lines 4; spellings: `gcp`.
- [apps/web/src/actions/database/server-only/gbx.ts](../../gocontrolpanel-tmservers/apps/web/src/actions/database/server-only/gbx.ts#L3) — lines 3; spellings: `gcp`.
- [apps/web/src/actions/database/server-only/hetzner-servers.ts](../../gocontrolpanel-tmservers/apps/web/src/actions/database/server-only/hetzner-servers.ts#L3) — lines 3; spellings: `gcp`.
- [apps/web/src/actions/database/server-only/maps.ts](../../gocontrolpanel-tmservers/apps/web/src/actions/database/server-only/maps.ts#L6) — lines 6, 7; spellings: `gcp`.
- [apps/web/src/actions/database/server-plugins.ts](../../gocontrolpanel-tmservers/apps/web/src/actions/database/server-plugins.ts#L10) — lines 10, 11; spellings: `gcp`.
- [apps/web/src/actions/database/servers.ts](../../gocontrolpanel-tmservers/apps/web/src/actions/database/servers.ts#L28) — lines 28; spellings: `gcp`.
- [apps/web/src/actions/database/themes.ts](../../gocontrolpanel-tmservers/apps/web/src/actions/database/themes.ts#L8) — lines 8, 9; spellings: `gcp`.
- [apps/web/src/actions/database/users.ts](../../gocontrolpanel-tmservers/apps/web/src/actions/database/users.ts#L13) — lines 13; spellings: `gcp`.
- [apps/web/src/actions/filemanager/server-only/files.ts](../../gocontrolpanel-tmservers/apps/web/src/actions/filemanager/server-only/files.ts#L7) — lines 7; spellings: `gcp`.
- [apps/web/src/actions/gbx/map.ts](../../gocontrolpanel-tmservers/apps/web/src/actions/gbx/map.ts#L12) — lines 12; spellings: `gcp`.
- [apps/web/src/actions/gbx/server-only/advanced.ts](../../gocontrolpanel-tmservers/apps/web/src/actions/gbx/server-only/advanced.ts#L3) — lines 3; spellings: `gcp`.
- [apps/web/src/actions/gbx/server-only/bulk-maps.ts](../../gocontrolpanel-tmservers/apps/web/src/actions/gbx/server-only/bulk-maps.ts#L7) — lines 7, 8; spellings: `gcp`.
- [apps/web/src/actions/gbx/server-only/game.ts](../../gocontrolpanel-tmservers/apps/web/src/actions/gbx/server-only/game.ts#L6) — lines 6; spellings: `gcp`.
- [apps/web/src/actions/gbx/server-only/map.ts](../../gocontrolpanel-tmservers/apps/web/src/actions/gbx/server-only/map.ts#L6) — lines 6, 7; spellings: `gcp`.
- [apps/web/src/actions/gbx/server-only/player.ts](../../gocontrolpanel-tmservers/apps/web/src/actions/gbx/server-only/player.ts#L3) — lines 3; spellings: `gcp`.
- [apps/web/src/actions/gbx/server-only/server.ts](../../gocontrolpanel-tmservers/apps/web/src/actions/gbx/server-only/server.ts#L8) — lines 8; spellings: `gcp`.
- [apps/web/src/actions/hetzner/server-actions.ts](../../gocontrolpanel-tmservers/apps/web/src/actions/hetzner/server-actions.ts#L75) — lines 75, 163; spellings: `gocontrolpanel`.
- [apps/web/src/actions/hetzner/server-setup.ts](../../gocontrolpanel-tmservers/apps/web/src/actions/hetzner/server-setup.ts#L1037) — lines 1037; spellings: `gocontrolpanel`.
- [apps/web/src/actions/plugins.ts](../../gocontrolpanel-tmservers/apps/web/src/actions/plugins.ts#L19) — lines 19, 26, 31, 134, 511, 549; spellings: `gcp`, `GoControlPanel`, `tmcp`.
- [apps/web/src/actions/server-only/plugins.ts](../../gocontrolpanel-tmservers/apps/web/src/actions/server-only/plugins.ts#L7) — lines 7, 13; spellings: `gcp`.
- [apps/web/src/actions/tmx/server-only/maps.ts](../../gocontrolpanel-tmservers/apps/web/src/actions/tmx/server-only/maps.ts#L9) — lines 9; spellings: `gcp`.
- [apps/web/src/app/(gocontroller)/admin/hetzner/[id]/page.tsx](../../gocontrolpanel-tmservers/apps/web/src/app/%28gocontroller%29/admin/hetzner/%5Bid%5D/page.tsx#L131) — lines 131, 143; spellings: `GoControlPanel`.
- [apps/web/src/app/(gocontroller)/admin/roles/columns.tsx](../../gocontrolpanel-tmservers/apps/web/src/app/%28gocontroller%29/admin/roles/columns.tsx#L17) — lines 17; spellings: `gcp`.
- [apps/web/src/app/(gocontroller)/admin/servers/clients.tsx](../../gocontrolpanel-tmservers/apps/web/src/app/%28gocontroller%29/admin/servers/clients.tsx#L5) — lines 5; spellings: `gcp`.
- [apps/web/src/app/(gocontroller)/admin/users/columns.tsx](../../gocontrolpanel-tmservers/apps/web/src/app/%28gocontroller%29/admin/users/columns.tsx#L22) — lines 22; spellings: `gcp`.
- [apps/web/src/app/(gocontroller)/layout.tsx](../../gocontrolpanel-tmservers/apps/web/src/app/%28gocontroller%29/layout.tsx#L17) — lines 17; spellings: `GoController`.
- [apps/web/src/app/(gocontroller)/page.tsx](../../gocontrolpanel-tmservers/apps/web/src/app/%28gocontroller%29/page.tsx#L6) — lines 6; spellings: `GoControlPanel`.
- [apps/web/src/app/(gocontroller)/server/[id]/maps/map-order-columns.tsx](../../gocontrolpanel-tmservers/apps/web/src/app/%28gocontroller%29/server/%5Bid%5D/maps/map-order-columns.tsx#L16) — lines 16; spellings: `gcp`.
- [apps/web/src/app/(gocontroller)/server/[id]/maps/server-maps-columns.tsx](../../gocontrolpanel-tmservers/apps/web/src/app/%28gocontroller%29/server/%5Bid%5D/maps/server-maps-columns.tsx#L13) — lines 13; spellings: `gcp`.
- [apps/web/src/app/(gocontroller)/server/[id]/players/banlist-columns.tsx](../../gocontrolpanel-tmservers/apps/web/src/app/%28gocontroller%29/server/%5Bid%5D/players/banlist-columns.tsx#L17) — lines 17; spellings: `gcp`.
- [apps/web/src/app/(gocontroller)/server/[id]/players/blacklist-columns.tsx](../../gocontrolpanel-tmservers/apps/web/src/app/%28gocontroller%29/server/%5Bid%5D/players/blacklist-columns.tsx#L17) — lines 17; spellings: `gcp`.
- [apps/web/src/app/(gocontroller)/server/[id]/players/guestlist-columns.tsx](../../gocontrolpanel-tmservers/apps/web/src/app/%28gocontroller%29/server/%5Bid%5D/players/guestlist-columns.tsx#L17) — lines 17; spellings: `gcp`.
- [apps/web/src/app/(gocontroller)/server/[id]/players/players-columns.tsx](../../gocontrolpanel-tmservers/apps/web/src/app/%28gocontroller%29/server/%5Bid%5D/players/players-columns.tsx#L26) — lines 26; spellings: `gcp`.
- [apps/web/src/app/api/internal/codriver/route.ts](../../gocontrolpanel-tmservers/apps/web/src/app/api/internal/codriver/route.ts#L8) — lines 8; spellings: `gcp`.
- [apps/web/src/app/api/servers/[serverId]/files/download/route.ts](../../gocontrolpanel-tmservers/apps/web/src/app/api/servers/%5BserverId%5D/files/download/route.ts#L5) — lines 5; spellings: `gcp`.
- [apps/web/src/app/api/servers/[serverId]/files/upload/route.ts](../../gocontrolpanel-tmservers/apps/web/src/app/api/servers/%5BserverId%5D/files/upload/route.ts#L6) — lines 6; spellings: `gcp`.
- [apps/web/src/app/api/ws-ticket/route.ts](../../gocontrolpanel-tmservers/apps/web/src/app/api/ws-ticket/route.ts#L4) — lines 4; spellings: `gcp`.
- [apps/web/src/app/layout.tsx](../../gocontrolpanel-tmservers/apps/web/src/app/layout.tsx#L32) — lines 32; spellings: `GoControlPanel`.
- [apps/web/src/components/landing/landing-page.tsx](../../gocontrolpanel-tmservers/apps/web/src/components/landing/landing-page.tsx#L181) — lines 181, 204, 248, 288, 377, 398; spellings: `GoControlPanel`.
- [apps/web/src/components/live/knockout-scores.tsx](../../gocontrolpanel-tmservers/apps/web/src/components/live/knockout-scores.tsx#L2) — lines 2; spellings: `gcp`.
- [apps/web/src/components/live/live-chat.tsx](../../gocontrolpanel-tmservers/apps/web/src/components/live/live-chat.tsx#L7) — lines 7; spellings: `gcp`.
- [apps/web/src/components/live/live-dashboard.tsx](../../gocontrolpanel-tmservers/apps/web/src/components/live/live-dashboard.tsx#L13) — lines 13; spellings: `gcp`.
- [apps/web/src/components/live/live-round.tsx](../../gocontrolpanel-tmservers/apps/web/src/components/live/live-round.tsx#L2) — lines 2; spellings: `gcp`.
- [apps/web/src/components/live/match-settings.tsx](../../gocontrolpanel-tmservers/apps/web/src/components/live/match-settings.tsx#L1) — lines 1; spellings: `gcp`.
- [apps/web/src/components/live/player-actions.tsx](../../gocontrolpanel-tmservers/apps/web/src/components/live/player-actions.tsx#L1) — lines 1; spellings: `gcp`.
- [apps/web/src/components/live/rankings.tsx](../../gocontrolpanel-tmservers/apps/web/src/components/live/rankings.tsx#L2) — lines 2; spellings: `gcp`.
- [apps/web/src/components/live/round-scores.tsx](../../gocontrolpanel-tmservers/apps/web/src/components/live/round-scores.tsx#L2) — lines 2; spellings: `gcp`.
- [apps/web/src/components/live/team-scores.tsx](../../gocontrolpanel-tmservers/apps/web/src/components/live/team-scores.tsx#L2) — lines 2; spellings: `gcp`.
- [apps/web/src/components/live/teams-actions.tsx](../../gocontrolpanel-tmservers/apps/web/src/components/live/teams-actions.tsx#L3) — lines 3; spellings: `gcp`.
- [apps/web/src/components/live/time-attack-scores.tsx](../../gocontrolpanel-tmservers/apps/web/src/components/live/time-attack-scores.tsx#L2) — lines 2; spellings: `gcp`.
- [apps/web/src/components/maps/carousel-map-card.tsx](../../gocontrolpanel-tmservers/apps/web/src/components/maps/carousel-map-card.tsx#L6) — lines 6; spellings: `gcp`.
- [apps/web/src/components/maps/jukebox.tsx](../../gocontrolpanel-tmservers/apps/web/src/components/maps/jukebox.tsx#L4) — lines 4, 5, 11; spellings: `gcp`, `gocontroller`.
- [apps/web/src/components/maps/local-maps-table.tsx](../../gocontrolpanel-tmservers/apps/web/src/components/maps/local-maps-table.tsx#L5) — lines 5, 6; spellings: `gcp`, `gocontroller`.
- [apps/web/src/components/maps/map-carousel.tsx](../../gocontrolpanel-tmservers/apps/web/src/components/maps/map-carousel.tsx#L5) — lines 5, 6; spellings: `gcp`.
- [apps/web/src/components/maps/map-order.tsx](../../gocontrolpanel-tmservers/apps/web/src/components/maps/map-order.tsx#L4) — lines 4, 5; spellings: `gcp`, `gocontroller`.
- [apps/web/src/components/maps/server-maps.tsx](../../gocontrolpanel-tmservers/apps/web/src/components/maps/server-maps.tsx#L3) — lines 3; spellings: `gcp`.
- [apps/web/src/components/modals/groups/edit-group-theme.tsx](../../gocontrolpanel-tmservers/apps/web/src/components/modals/groups/edit-group-theme.tsx#L8) — lines 8; spellings: `gcp`.
- [apps/web/src/components/modals/live/player/set-player-match-points-modal.tsx](../../gocontrolpanel-tmservers/apps/web/src/components/modals/live/player/set-player-match-points-modal.tsx#L6) — lines 6; spellings: `gcp`.
- [apps/web/src/components/modals/live/teams/set-team-map-points-modal.tsx](../../gocontrolpanel-tmservers/apps/web/src/components/modals/live/teams/set-team-map-points-modal.tsx#L6) — lines 6; spellings: `gcp`.
- [apps/web/src/components/modals/live/teams/set-team-match-points-modal.tsx](../../gocontrolpanel-tmservers/apps/web/src/components/modals/live/teams/set-team-match-points-modal.tsx#L6) — lines 6; spellings: `gcp`.
- [apps/web/src/components/modals/nadeo/activity-map-card.tsx](../../gocontrolpanel-tmservers/apps/web/src/components/modals/nadeo/activity-map-card.tsx#L4) — lines 4; spellings: `gcp`.
- [apps/web/src/components/modals/roles/edit-role.tsx](../../gocontrolpanel-tmservers/apps/web/src/components/modals/roles/edit-role.tsx#L6) — lines 6; spellings: `gcp`.
- [apps/web/src/components/modals/users/edit-user.tsx](../../gocontrolpanel-tmservers/apps/web/src/components/modals/users/edit-user.tsx#L6) — lines 6; spellings: `gcp`.
- [apps/web/src/components/players/banlist-list.tsx](../../gocontrolpanel-tmservers/apps/web/src/components/players/banlist-list.tsx#L4) — lines 4; spellings: `gocontroller`.
- [apps/web/src/components/players/blacklist-list.tsx](../../gocontrolpanel-tmservers/apps/web/src/components/players/blacklist-list.tsx#L3) — lines 3; spellings: `gocontroller`.
- [apps/web/src/components/players/guestlist-list.tsx](../../gocontrolpanel-tmservers/apps/web/src/components/players/guestlist-list.tsx#L3) — lines 3; spellings: `gocontroller`.
- [apps/web/src/components/players/player-list.tsx](../../gocontrolpanel-tmservers/apps/web/src/components/players/player-list.tsx#L3) — lines 3, 5; spellings: `gcp`, `gocontroller`.
- [apps/web/src/components/plugins/capability-list.tsx](../../gocontrolpanel-tmservers/apps/web/src/components/plugins/capability-list.tsx#L7) — lines 7; spellings: `gcp`.
- [apps/web/src/components/plugins/install-dialog.tsx](../../gocontrolpanel-tmservers/apps/web/src/components/plugins/install-dialog.tsx#L25) — lines 25; spellings: `gcp`.
- [apps/web/src/components/plugins/installed-plugins.tsx](../../gocontrolpanel-tmservers/apps/web/src/components/plugins/installed-plugins.tsx#L38) — lines 38; spellings: `gcp`.
- [apps/web/src/components/plugins/marketplace-catalog.tsx](../../gocontrolpanel-tmservers/apps/web/src/components/plugins/marketplace-catalog.tsx#L16) — lines 16; spellings: `gcp`.
- [apps/web/src/components/plugins/plugin-config-form.tsx](../../gocontrolpanel-tmservers/apps/web/src/components/plugins/plugin-config-form.tsx#L29) — lines 29; spellings: `gcp`.
- [apps/web/src/components/plugins/uploaded-plugins.tsx](../../gocontrolpanel-tmservers/apps/web/src/components/plugins/uploaded-plugins.tsx#L35) — lines 35, 76; spellings: `gocontrolpanel`, `tmcp`.
- [apps/web/src/components/servers/clients/client-card.tsx](../../gocontrolpanel-tmservers/apps/web/src/components/servers/clients/client-card.tsx#L12) — lines 12; spellings: `gcp`.
- [apps/web/src/components/shell/app-sidebar.tsx](../../gocontrolpanel-tmservers/apps/web/src/components/shell/app-sidebar.tsx#L23) — lines 23; spellings: `GoControlPanel`.
- [apps/web/src/components/shell/navbar/nav-groups.tsx](../../gocontrolpanel-tmservers/apps/web/src/components/shell/navbar/nav-groups.tsx#L31) — lines 31; spellings: `gcp`.
- [apps/web/src/components/shell/notification.tsx](../../gocontrolpanel-tmservers/apps/web/src/components/shell/notification.tsx#L1) — lines 1; spellings: `gcp`.
- [apps/web/src/components/shell/site-header.tsx](../../gocontrolpanel-tmservers/apps/web/src/components/shell/site-header.tsx#L74) — lines 74, 86; spellings: `gocontrolpanel`.
- [apps/web/src/components/theme/manialink-theme-preview.tsx](../../gocontrolpanel-tmservers/apps/web/src/components/theme/manialink-theme-preview.tsx#L1) — lines 1; spellings: `gcp`.
- [apps/web/src/forms/admin/group/add-group-form.tsx](../../gocontrolpanel-tmservers/apps/web/src/forms/admin/group/add-group-form.tsx#L12) — lines 12; spellings: `gcp`.
- [apps/web/src/forms/admin/group/edit-group-form.tsx](../../gocontrolpanel-tmservers/apps/web/src/forms/admin/group/edit-group-form.tsx#L13) — lines 13; spellings: `gcp`.
- [apps/web/src/forms/admin/hetzner/add-project-form.tsx](../../gocontrolpanel-tmservers/apps/web/src/forms/admin/hetzner/add-project-form.tsx#L7) — lines 7; spellings: `gcp`.
- [apps/web/src/forms/admin/hetzner/edit-project-form.tsx](../../gocontrolpanel-tmservers/apps/web/src/forms/admin/hetzner/edit-project-form.tsx#L8) — lines 8; spellings: `gcp`.
- [apps/web/src/forms/admin/role/edit-role-form.tsx](../../gocontrolpanel-tmservers/apps/web/src/forms/admin/role/edit-role-form.tsx#L6) — lines 6; spellings: `gcp`.
- [apps/web/src/forms/admin/server/add-server-form.tsx](../../gocontrolpanel-tmservers/apps/web/src/forms/admin/server/add-server-form.tsx#L7) — lines 7; spellings: `gcp`.
- [apps/web/src/forms/admin/server/edit-server-form.tsx](../../gocontrolpanel-tmservers/apps/web/src/forms/admin/server/edit-server-form.tsx#L8) — lines 8; spellings: `gcp`.
- [apps/web/src/forms/admin/user/edit-user-form.tsx](../../gocontrolpanel-tmservers/apps/web/src/forms/admin/user/edit-user-form.tsx#L11) — lines 11; spellings: `gcp`.
- [apps/web/src/forms/server/advanced/script-generator-form.tsx](../../gocontrolpanel-tmservers/apps/web/src/forms/server/advanced/script-generator-form.tsx#L27) — lines 27, 199; spellings: `gcp`, `GoControlPanel`.
- [apps/web/src/forms/server/live/teams/set-team-map-points-form.tsx](../../gocontrolpanel-tmservers/apps/web/src/forms/server/live/teams/set-team-map-points-form.tsx#L8) — lines 8; spellings: `gcp`.
- [apps/web/src/forms/server/live/teams/set-team-match-points-form.tsx](../../gocontrolpanel-tmservers/apps/web/src/forms/server/live/teams/set-team-match-points-form.tsx#L8) — lines 8; spellings: `gcp`.
- [apps/web/src/forms/server/plugins/chatconfig-form.tsx](../../gocontrolpanel-tmservers/apps/web/src/forms/server/plugins/chatconfig-form.tsx#L7) — lines 7; spellings: `gcp`.
- [apps/web/src/forms/theme/theme-form.tsx](../../gocontrolpanel-tmservers/apps/web/src/forms/theme/theme-form.tsx#L17) — lines 17; spellings: `gcp`.
- [apps/web/src/hooks/use-websocket.ts](../../gocontrolpanel-tmservers/apps/web/src/hooks/use-websocket.ts#L7) — lines 7; spellings: `gcp`.
- [apps/web/src/lib/actor.ts](../../gocontrolpanel-tmservers/apps/web/src/lib/actor.ts#L6) — lines 6; spellings: `gcp`.
- [apps/web/src/lib/admin-inputs.ts](../../gocontrolpanel-tmservers/apps/web/src/lib/admin-inputs.ts#L1) — lines 1; spellings: `gcp`.
- [apps/web/src/lib/api-client/codriver.ts](../../gocontrolpanel-tmservers/apps/web/src/lib/api-client/codriver.ts#L3) — lines 3; spellings: `gcp`.
- [apps/web/src/lib/api/nadeo.ts](../../gocontrolpanel-tmservers/apps/web/src/lib/api/nadeo.ts#L23) — lines 23; spellings: `gcp`.
- [apps/web/src/lib/api/tmx.ts](../../gocontrolpanel-tmservers/apps/web/src/lib/api/tmx.ts#L3) — lines 3; spellings: `gcp`.
- [apps/web/src/lib/auth.ts](../../gocontrolpanel-tmservers/apps/web/src/lib/auth.ts#L11) — lines 11; spellings: `gcp`.
- [apps/web/src/lib/channel-socket.ts](../../gocontrolpanel-tmservers/apps/web/src/lib/channel-socket.ts#L25) — lines 25; spellings: `gcp`.
- [apps/web/src/lib/chat-config.ts](../../gocontrolpanel-tmservers/apps/web/src/lib/chat-config.ts#L1) — lines 1; spellings: `gcp`.
- [apps/web/src/lib/codriver/eval/run.ts](../../gocontrolpanel-tmservers/apps/web/src/lib/codriver/eval/run.ts#L2) — lines 2; spellings: `gcp`.
- [apps/web/src/lib/codriver/progress.ts](../../gocontrolpanel-tmservers/apps/web/src/lib/codriver/progress.ts#L1) — lines 1; spellings: `gcp`.
- [apps/web/src/lib/codriver/roles.ts](../../gocontrolpanel-tmservers/apps/web/src/lib/codriver/roles.ts#L2) — lines 2; spellings: `gcp`.
- [apps/web/src/lib/codriver/runner.ts](../../gocontrolpanel-tmservers/apps/web/src/lib/codriver/runner.ts#L3) — lines 3; spellings: `gcp`.
- [apps/web/src/lib/codriver/stream.ts](../../gocontrolpanel-tmservers/apps/web/src/lib/codriver/stream.ts#L1) — lines 1; spellings: `gcp`.
- [apps/web/src/lib/codriver/tools/match.ts](../../gocontrolpanel-tmservers/apps/web/src/lib/codriver/tools/match.ts#L5) — lines 5; spellings: `gcp`.
- [apps/web/src/lib/codriver/tools/plugins.ts](../../gocontrolpanel-tmservers/apps/web/src/lib/codriver/tools/plugins.ts#L8) — lines 8; spellings: `gcp`.
- [apps/web/src/lib/codriver/tools/scripts.ts](../../gocontrolpanel-tmservers/apps/web/src/lib/codriver/tools/scripts.ts#L7) — lines 7, 26, 38, 58, 78, 79, 292; spellings: `GCP`, `gcp`, `GoControlPanel`.
- [apps/web/src/lib/codriver/usage.ts](../../gocontrolpanel-tmservers/apps/web/src/lib/codriver/usage.ts#L3) — lines 3; spellings: `gcp`.
- [apps/web/src/lib/config-check.ts](../../gocontrolpanel-tmservers/apps/web/src/lib/config-check.ts#L2) — lines 2; spellings: `gcp`.
- [apps/web/src/lib/config.ts](../../gocontrolpanel-tmservers/apps/web/src/lib/config.ts#L2) — lines 2; spellings: `gcp`.
- [apps/web/src/lib/dbclient.ts](../../gocontrolpanel-tmservers/apps/web/src/lib/dbclient.ts#L5) — lines 5; spellings: `gcp`.
- [apps/web/src/lib/gbx-service.ts](../../gocontrolpanel-tmservers/apps/web/src/lib/gbx-service.ts#L14) — lines 14; spellings: `gcp`.
- [apps/web/src/lib/global.ts](../../gocontrolpanel-tmservers/apps/web/src/lib/global.ts#L5) — lines 5; spellings: `gcp`.
- [apps/web/src/lib/hetzner.ts](../../gocontrolpanel-tmservers/apps/web/src/lib/hetzner.ts#L2) — lines 2, 3; spellings: `gcp`.
- [apps/web/src/lib/marketplace.ts](../../gocontrolpanel-tmservers/apps/web/src/lib/marketplace.ts#L8) — lines 8, 13; spellings: `gcp`.
- [apps/web/src/lib/plugin-access.ts](../../gocontrolpanel-tmservers/apps/web/src/lib/plugin-access.ts#L1) — lines 1; spellings: `gcp`.
- [apps/web/src/lib/secrets.ts](../../gocontrolpanel-tmservers/apps/web/src/lib/secrets.ts#L2) — lines 2; spellings: `gcp`.
- [apps/web/src/lib/server-credentials.ts](../../gocontrolpanel-tmservers/apps/web/src/lib/server-credentials.ts#L4) — lines 4; spellings: `gcp`.
- [apps/web/src/lib/service-request.ts](../../gocontrolpanel-tmservers/apps/web/src/lib/service-request.ts#L2) — lines 2; spellings: `gcp`.
- [apps/web/src/lib/site.ts](../../gocontrolpanel-tmservers/apps/web/src/lib/site.ts#L1) — lines 1, 2, 3, 6; spellings: `gocontrolpanel`, `GoControlPanel`.
- [apps/web/src/providers/notification-provider.tsx](../../gocontrolpanel-tmservers/apps/web/src/providers/notification-provider.tsx#L8) — lines 8, 9; spellings: `gcp`.
- [apps/web/src/providers/servers-provider.tsx](../../gocontrolpanel-tmservers/apps/web/src/providers/servers-provider.tsx#L7) — lines 7; spellings: `gcp`.
- [apps/web/src/services/codriver.ts](../../gocontrolpanel-tmservers/apps/web/src/services/codriver.ts#L33) — lines 33; spellings: `gcp`.
- [apps/web/src/services/database/audit-logs.ts](../../gocontrolpanel-tmservers/apps/web/src/services/database/audit-logs.ts#L5) — lines 5; spellings: `gcp`.
- [apps/web/src/services/database/groups.ts](../../gocontrolpanel-tmservers/apps/web/src/services/database/groups.ts#L4) — lines 4; spellings: `gcp`.
- [apps/web/src/services/database/hetzner-projects.ts](../../gocontrolpanel-tmservers/apps/web/src/services/database/hetzner-projects.ts#L6) — lines 6; spellings: `gcp`.
- [apps/web/src/services/database/maps.ts](../../gocontrolpanel-tmservers/apps/web/src/services/database/maps.ts#L13) — lines 13, 14; spellings: `gcp`.
- [apps/web/src/services/database/matches.ts](../../gocontrolpanel-tmservers/apps/web/src/services/database/matches.ts#L11) — lines 11; spellings: `gcp`.
- [apps/web/src/services/database/notifications.ts](../../gocontrolpanel-tmservers/apps/web/src/services/database/notifications.ts#L4) — lines 4; spellings: `gcp`.
- [apps/web/src/services/database/records.ts](../../gocontrolpanel-tmservers/apps/web/src/services/database/records.ts#L4) — lines 4; spellings: `gcp`.
- [apps/web/src/services/database/roles.ts](../../gocontrolpanel-tmservers/apps/web/src/services/database/roles.ts#L4) — lines 4; spellings: `gcp`.
- [apps/web/src/services/database/server-plugins.ts](../../gocontrolpanel-tmservers/apps/web/src/services/database/server-plugins.ts#L6) — lines 6; spellings: `gcp`.
- [apps/web/src/services/database/servers.ts](../../gocontrolpanel-tmservers/apps/web/src/services/database/servers.ts#L9) — lines 9; spellings: `gcp`.
- [apps/web/src/services/database/themes.ts](../../gocontrolpanel-tmservers/apps/web/src/services/database/themes.ts#L4) — lines 4; spellings: `gcp`.
- [apps/web/src/services/database/users.ts](../../gocontrolpanel-tmservers/apps/web/src/services/database/users.ts#L4) — lines 4; spellings: `gcp`.
- [apps/web/src/services/gbx/advanced.ts](../../gocontrolpanel-tmservers/apps/web/src/services/gbx/advanced.ts#L4) — lines 4; spellings: `gcp`.
- [apps/web/src/services/gbx/player.ts](../../gocontrolpanel-tmservers/apps/web/src/services/gbx/player.ts#L5) — lines 5; spellings: `gcp`.
- [apps/web/src/services/gbx/server.ts](../../gocontrolpanel-tmservers/apps/web/src/services/gbx/server.ts#L10) — lines 10; spellings: `gcp`.
- [apps/web/src/services/plugins.ts](../../gocontrolpanel-tmservers/apps/web/src/services/plugins.ts#L38) — lines 38; spellings: `gcp`.
- [apps/web/src/types/api/nadeo.ts](../../gocontrolpanel-tmservers/apps/web/src/types/api/nadeo.ts#L1) — lines 1; spellings: `gcp`.
- [apps/web/src/types/auth.ts](../../gocontrolpanel-tmservers/apps/web/src/types/auth.ts#L6) — lines 6; spellings: `gcp`.
- [apps/web/src/types/map.ts](../../gocontrolpanel-tmservers/apps/web/src/types/map.ts#L1) — lines 1, 2; spellings: `gcp`.
- [apps/web/src/types/plugins/catalog.ts](../../gocontrolpanel-tmservers/apps/web/src/types/plugins/catalog.ts#L1) — lines 1, 75, 104; spellings: `gcp`, `GoControlPanel`.
- [apps/web/test/actor-actions.test.ts](../../gocontrolpanel-tmservers/apps/web/test/actor-actions.test.ts#L1) — lines 1, 104; spellings: `gcp`.
- [apps/web/test/actor.test.ts](../../gocontrolpanel-tmservers/apps/web/test/actor.test.ts#L1) — lines 1; spellings: `gcp`.
- [apps/web/test/audit-delete-access.test.ts](../../gocontrolpanel-tmservers/apps/web/test/audit-delete-access.test.ts#L2) — lines 2; spellings: `gcp`.
- [apps/web/test/chat-config.test.ts](../../gocontrolpanel-tmservers/apps/web/test/chat-config.test.ts#L1) — lines 1; spellings: `gcp`.
- [apps/web/test/codriver-admin-tools.test.ts](../../gocontrolpanel-tmservers/apps/web/test/codriver-admin-tools.test.ts#L1) — lines 1; spellings: `gcp`.
- [apps/web/test/codriver-ingame.test.ts](../../gocontrolpanel-tmservers/apps/web/test/codriver-ingame.test.ts#L1) — lines 1; spellings: `gcp`.
- [apps/web/test/codriver-jev.test.ts](../../gocontrolpanel-tmservers/apps/web/test/codriver-jev.test.ts#L33) — lines 33; spellings: `gcp`.
- [apps/web/test/codriver-panel.test.ts](../../gocontrolpanel-tmservers/apps/web/test/codriver-panel.test.ts#L1) — lines 1; spellings: `gcp`.
- [apps/web/test/codriver-scripts.test.ts](../../gocontrolpanel-tmservers/apps/web/test/codriver-scripts.test.ts#L1) — lines 1, 188, 193, 202, 203, 204, 208, 221, 222, 238, 239, 247, 248, 251, 255, 263, 345, 346, 361, 383; spellings: `GCP`, `gcp`.
- [apps/web/test/codriver-stream.test.ts](../../gocontrolpanel-tmservers/apps/web/test/codriver-stream.test.ts#L1) — lines 1; spellings: `gcp`.
- [apps/web/test/codriver.test.ts](../../gocontrolpanel-tmservers/apps/web/test/codriver.test.ts#L37) — lines 37; spellings: `gcp`.
- [apps/web/test/marketplace.test.ts](../../gocontrolpanel-tmservers/apps/web/test/marketplace.test.ts#L1) — lines 1, 21, 30; spellings: `gcp`, `tmcp`.
- [apps/web/test/player-selection.test.ts](../../gocontrolpanel-tmservers/apps/web/test/player-selection.test.ts#L1) — lines 1; spellings: `gcp`.
- [apps/web/test/provisioning-templates.test.ts](../../gocontrolpanel-tmservers/apps/web/test/provisioning-templates.test.ts#L21) — lines 21, 22; spellings: `gcp`.
- [apps/web/test/themes.test.ts](../../gocontrolpanel-tmservers/apps/web/test/themes.test.ts#L39) — lines 39; spellings: `gcp`.
- [bun.lock](../../gocontrolpanel-tmservers/bun.lock#L6) — lines 6, 14, 20, 21, 36, 49, 59, 60, 154, 165, 168, 176, 185, 385, 387, 389, 391, 871, 1127, 2383; spellings: `gCP`, `gcp`, `gocontrolpanel`, `tmcontrolpanel`, `tmcp`.
- [dev/docker-compose.yml](../../gocontrolpanel-tmservers/dev/docker-compose.yml#L8) — lines 8, 29, 47, 51; spellings: `gcp`, `gocontrolpanel`.
- [docker-compose.yml](../../gocontrolpanel-tmservers/docker-compose.yml#L2) — lines 2, 3, 17, 18, 35, 40, 46, 50, 57, 83, 85; spellings: `gocontrolpanel`, `GoControlPanel`.
- [docker/evosc/docker-compose.yml](../../gocontrolpanel-tmservers/docker/evosc/docker-compose.yml#L45) — lines 45, 46, 60, 62, 75, 80, 87, 94; spellings: `gocontrolpanel`, `GoControlPanel`.
- [docker/evosc/init/01-create-gocontrolpanel.sql](../../gocontrolpanel-tmservers/docker/evosc/init/01-create-gocontrolpanel.sql#L1) — lines 1, 3, 4; spellings: `gocontrolpanel`.
- [docker/maniacontrol/docker-compose.yml](../../gocontrolpanel-tmservers/docker/maniacontrol/docker-compose.yml#L21) — lines 21, 35, 43, 44, 58, 60, 73, 78, 85, 92; spellings: `GCP`, `gocontrolpanel`, `GoControlPanel`.
- [docker/maniacontrol/init/01-create-gocontrolpanel.sql](../../gocontrolpanel-tmservers/docker/maniacontrol/init/01-create-gocontrolpanel.sql#L1) — lines 1, 3, 4; spellings: `gocontrolpanel`.
- [docker/minicontrol/docker-compose.yml](../../gocontrolpanel-tmservers/docker/minicontrol/docker-compose.yml#L50) — lines 50, 51, 65, 67, 80, 85, 92, 99; spellings: `gocontrolpanel`, `GoControlPanel`.
- [docker/minicontrol/init/01-create-gocontrolpanel.sql](../../gocontrolpanel-tmservers/docker/minicontrol/init/01-create-gocontrolpanel.sql#L1) — lines 1, 3, 4; spellings: `gocontrolpanel`.
- [docker/pyplanet/docker-compose.yml](../../gocontrolpanel-tmservers/docker/pyplanet/docker-compose.yml#L37) — lines 37, 38, 52, 54, 67, 72, 79, 86; spellings: `gocontrolpanel`, `GoControlPanel`.
- [docker/pyplanet/init/01-create-gocontrolpanel.sql](../../gocontrolpanel-tmservers/docker/pyplanet/init/01-create-gocontrolpanel.sql#L1) — lines 1, 3, 4; spellings: `gocontrolpanel`.
- [docs/audits/2026-10-11-claude-security-audit.md](../../gocontrolpanel-tmservers/docs/audits/2026-10-11-claude-security-audit.md#L131) — lines 131; spellings: `gocontroller`.
- [docs/audits/2026-10-11-dependencies.json](../../gocontrolpanel-tmservers/docs/audits/2026-10-11-dependencies.json#L953) — lines 953; spellings: `gcp`.
- [docs/audits/2026-10-11-dependencies.md](../../gocontrolpanel-tmservers/docs/audits/2026-10-11-dependencies.md#L96) — lines 96; spellings: `gcp`.
- [docs/backend-split-requirements.md](../../gocontrolpanel-tmservers/docs/backend-split-requirements.md#L68) — lines 68, 76, 276; spellings: `gcp`, `gocontrolpanel`, `GoControlPanel`.
- [docs/backups.md](../../gocontrolpanel-tmservers/docs/backups.md#L3) — lines 3, 15, 22, 34, 39, 49, 53, 56, 58, 61, 71; spellings: `gcp`, `gocontrolpanel`, `GoControlPanel`, `tmcp`.
- [docs/codriver-plan.md](../../gocontrolpanel-tmservers/docs/codriver-plan.md#L5) — lines 5, 300, 348, 354, 355, 403; spellings: `gcp`, `GoControlPanel`.
- [docs/first-party-plugins.md](../../gocontrolpanel-tmservers/docs/first-party-plugins.md#L3) — lines 3, 21, 42; spellings: `GoControlPanel`, `tmcontrolpanel`, `tmcp`.
- [docs/mcp-server-proposal.md](../../gocontrolpanel-tmservers/docs/mcp-server-proposal.md#L5) — lines 5; spellings: `GoControlPanel`.
- [docs/migrating-from-dev.md](../../gocontrolpanel-tmservers/docs/migrating-from-dev.md#L3) — lines 3, 9, 38, 53, 58, 59, 65, 72, 75, 77, 79, 118, 122, 129, 162, 163, 164, 171, 175, 180; spellings: `gcp`, `gocontrolpanel`, `GoControlPanel`, `tmcontrolpanel`.
- [docs/plugin-marketplace.md](../../gocontrolpanel-tmservers/docs/plugin-marketplace.md#L10) — lines 10, 25, 31, 33, 34, 36, 114; spellings: `GOCONTROLPANEL`, `GoControlPanel`, `tmcontrolpanel`, `tmcp`.
- [docs/plugin-sdk.md](../../gocontrolpanel-tmservers/docs/plugin-sdk.md#L3) — lines 3, 10, 12, 17, 21, 22, 23, 24, 25, 31, 44, 85, 348, 354; spellings: `gocontrolpanel`, `GoControlPanel`, `tmcontrolpanel`, `tmcp`.
- [docs/privacy.md](../../gocontrolpanel-tmservers/docs/privacy.md#L7) — lines 7; spellings: `GoControlPanel`.
- [docs/real-server-testing.md](../../gocontrolpanel-tmservers/docs/real-server-testing.md#L49) — lines 49, 50, 51, 52, 56, 60, 63, 65, 74, 75, 76, 78, 93, 96, 98, 100, 106, 108, 109, 110, 112, 113, 137, 147, 167, 189, 201; spellings: `GCP`, `gcp`.
- [docs/refactor-plan.md](../../gocontrolpanel-tmservers/docs/refactor-plan.md#L12) — lines 12, 13, 26, 27, 29, 30, 37, 43, 44, 102, 108, 111, 135, 137; spellings: `gcp`, `gocontrolpanel`.
- [docs/security-audit-2026-10-11.md](../../gocontrolpanel-tmservers/docs/security-audit-2026-10-11.md#L287) — lines 287, 409, 410, 411; spellings: `gcp`, `gocontrolpanel`.
- [package.json](../../gocontrolpanel-tmservers/package.json#L2) — lines 2, 10, 11, 20, 21, 22, 23, 24; spellings: `gcp`, `gocontrolpanel`.
- [packages/db/package.json](../../gocontrolpanel-tmservers/packages/db/package.json#L2) — lines 2; spellings: `gcp`.
- [packages/plugin-sdk/examples/hello/README.md](../../gocontrolpanel-tmservers/packages/plugin-sdk/examples/hello/README.md#L17) — lines 17; spellings: `gocontrolpanel`, `GoControlPanel`.
- [packages/plugin-sdk/examples/hello/src/index.ts](../../gocontrolpanel-tmservers/packages/plugin-sdk/examples/hello/src/index.ts#L1) — lines 1; spellings: `tmcontrolpanel`.
- [packages/plugin-sdk/examples/hello/tmcp-plugin.json](../../gocontrolpanel-tmservers/packages/plugin-sdk/examples/hello/tmcp-plugin.json#L7) — lines 7, 9; spellings: `gocontrolpanel`, `GoControlPanel`.
- [packages/plugin-sdk/package.json](../../gocontrolpanel-tmservers/packages/plugin-sdk/package.json#L2) — lines 2, 4, 15, 29; spellings: `gcp`, `GoControlPanel`, `tmcontrolpanel`, `tmcp`.
- [packages/plugin-sdk/registry-template/.github/PULL_REQUEST_TEMPLATE.md](../../gocontrolpanel-tmservers/packages/plugin-sdk/registry-template/.github/PULL_REQUEST_TEMPLATE.md#L6) — lines 6; spellings: `tmcp`.
- [packages/plugin-sdk/registry-template/.github/workflows/check.yml](../../gocontrolpanel-tmservers/packages/plugin-sdk/registry-template/.github/workflows/check.yml#L15) — lines 15, 16, 17, 22, 26; spellings: `GOCONTROLPANEL`, `gocontrolpanel`.
- [packages/plugin-sdk/registry-template/.github/workflows/publish.yml](../../gocontrolpanel-tmservers/packages/plugin-sdk/registry-template/.github/workflows/publish.yml#L25) — lines 25, 26, 27, 32, 37; spellings: `GOCONTROLPANEL`, `gocontrolpanel`.
- [packages/plugin-sdk/registry-template/README.md](../../gocontrolpanel-tmservers/packages/plugin-sdk/registry-template/README.md#L1) — lines 1, 3, 6, 15, 18, 27, 34; spellings: `gocontrolpanel`, `GoControlPanel`, `tmcontrolpanel`, `tmcp`.
- [packages/plugin-sdk/registry-template/registry.json](../../gocontrolpanel-tmservers/packages/plugin-sdk/registry-template/registry.json#L2) — lines 2, 3; spellings: `GoControlPanel`, `tmcontrolpanel`.
- [packages/plugin-sdk/src/cli/build.ts](../../gocontrolpanel-tmservers/packages/plugin-sdk/src/cli/build.ts#L43) — lines 43; spellings: `tmcontrolpanel`.
- [packages/plugin-sdk/src/cli/init.ts](../../gocontrolpanel-tmservers/packages/plugin-sdk/src/cli/init.ts#L9) — lines 9, 34, 56, 97, 112, 113; spellings: `gcp`, `GoControlPanel`, `tmcontrolpanel`, `tmcp`.
- [packages/plugin-sdk/src/cli/main.ts](../../gocontrolpanel-tmservers/packages/plugin-sdk/src/cli/main.ts#L4) — lines 4, 5, 12, 54, 85; spellings: `gcp`, `tmcp`.
- [packages/plugin-sdk/src/cli/pack.ts](../../gocontrolpanel-tmservers/packages/plugin-sdk/src/cli/pack.ts#L3) — lines 3, 9; spellings: `gcp`.
- [packages/plugin-sdk/src/cli/project.ts](../../gocontrolpanel-tmservers/packages/plugin-sdk/src/cli/project.ts#L3) — lines 3, 5; spellings: `gcp`, `tmcp`.
- [packages/plugin-sdk/src/cli/registry.ts](../../gocontrolpanel-tmservers/packages/plugin-sdk/src/cli/registry.ts#L13) — lines 13, 14, 287, 293; spellings: `gcp`, `gocontrolpanel`, `GoControlPanel`.
- [packages/plugin-sdk/src/index.ts](../../gocontrolpanel-tmservers/packages/plugin-sdk/src/index.ts#L7) — lines 7, 11, 12; spellings: `tmcp`.
- [packages/plugin-sdk/test/cli.test.ts](../../gocontrolpanel-tmservers/packages/plugin-sdk/test/cli.test.ts#L1) — lines 1, 13, 29, 39, 53, 63; spellings: `gcp`, `tmcp`.
- [packages/plugin-sdk/tsup.config.ts](../../gocontrolpanel-tmservers/packages/plugin-sdk/tsup.config.ts#L11) — lines 11, 14, 20; spellings: `gcp`.
- [packages/shared/package.json](../../gocontrolpanel-tmservers/packages/shared/package.json#L2) — lines 2; spellings: `gcp`.
- [packages/shared/src/crypto/server-credentials.ts](../../gocontrolpanel-tmservers/packages/shared/src/crypto/server-credentials.ts#L8) — lines 8; spellings: `gcp`.
- [packages/shared/src/plugins/manifest.ts](../../gocontrolpanel-tmservers/packages/shared/src/plugins/manifest.ts#L10) — lines 10, 12, 14, 31, 32, 33, 34; spellings: `gcp`, `GoControlPanel`, `gocontrolpanel`, `tmcontrolpanel`, `tmcp`.
- [packages/shared/src/plugins/marketplace-index.ts](../../gocontrolpanel-tmservers/packages/shared/src/plugins/marketplace-index.ts#L13) — lines 13; spellings: `tmcontrolpanel`.
- [packages/shared/src/plugins/package.ts](../../gocontrolpanel-tmservers/packages/shared/src/plugins/package.ts#L5) — lines 5; spellings: `tmcp`.
- [packages/shared/src/server-events.ts](../../gocontrolpanel-tmservers/packages/shared/src/server-events.ts#L4) — lines 4; spellings: `gcp`.
- [packages/shared/src/ws/ticket.ts](../../gocontrolpanel-tmservers/packages/shared/src/ws/ticket.ts#L4) — lines 4, 5; spellings: `gcp`.
- [packages/shared/test/plugin-package.test.ts](../../gocontrolpanel-tmservers/packages/shared/test/plugin-package.test.ts#L28) — lines 28, 82, 83, 97, 103; spellings: `tmcp`.
- [packages/shared/test/ticket.test.ts](../../gocontrolpanel-tmservers/packages/shared/test/ticket.test.ts#L27) — lines 27, 28, 39; spellings: `gcp`.
- [scripts/backup-db.sh](../../gocontrolpanel-tmservers/scripts/backup-db.sh#L2) — lines 2, 4, 133, 185, 198, 204; spellings: `gcp`, `gocontrolpanel`, `GoControlPanel`.
- [scripts/backup.env.example](../../gocontrolpanel-tmservers/scripts/backup.env.example#L5) — lines 5, 20; spellings: `gocontrolpanel`.
- [scripts/encrypt-server-credentials.ts](../../gocontrolpanel-tmservers/scripts/encrypt-server-credentials.ts#L1) — lines 1, 6; spellings: `gcp`.

## Appendix E — ignored/local configuration references

Values are intentionally omitted. These files are local machine state, not proposed additions to version control.

- `.env` — lines 3, 5, 29, 32, 37; spellings: `gocontrolpanel`, `GoControlPanel`.
- `.env.e2e` — lines 5, 29, 32, 36, 75; spellings: `gcp`, `gocontrolpanel`, `GoControlPanel`.
- `apps/gbx-service/e2e/.env` — lines 2, 14, 23, 25; spellings: `gcp`, `gocontrolpanel`, `GoControlPanel`.
- `.claude/settings.local.json` — lines 7; spellings: `gocontrolpanel`.
- `/home/marijn/gotrackmania/gocontrolpanel.code-workspace` — lines 4, 10, 16; spellings: `gcp`, `gocontrolpanel`, `tmcontrolpanel`.
- `/home/marijn/gotrackmania/gcp-services/docker-compose.yml` — lines 16, 29, 44, 58; spellings: `gcp`, `gocontrolpanel`.
- `/home/marijn/gotrackmania/gcp-services/tutorial.txt` — lines 4; spellings: `gocontrolpanel`.
