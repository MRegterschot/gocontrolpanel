# Plugin marketplace

Every panel, self-hosted ones included, can browse a central plugin marketplace and install plugins per server. Admins can also upload plugins privately, for their own servers only. Plugins run sandboxed in the GBX service with only the capabilities the admin accepted. This document covers how that works and how to run it. Plugin authors want the [plugin SDK guide](./plugin-sdk.md).

## How it fits together

```
 plugin authors                  registry repository (GitHub)             every panel
 ──────────────                  ────────────────────────────            ───────────
 tmcp-plugin pack ──► release     plugins/<slug>/versions/<v>.json ─┐
 asset (zip)                        pull request = review          │
                                                                   ▼
                                 "Publish marketplace" workflow:          web app: browse, install,
                                 download, check sha256, validate ──►     update, roll back
                                 GitHub Pages: index.json + copies  ◄──   (downloads only from
                                 of every package, README and icon        the index's origin)

                                                                          GBX service: runs the
                                                                          packages in QuickJS,
                                                                          checks for yanked
                                                                          versions every 30 min
```

- **The registry** is a GitHub repository made from [`packages/plugin-sdk/registry-template`](../packages/plugin-sdk/registry-template). A plugin version is a JSON file with the URL and sha256 of its package. Pull requests are the review, and merging publishes.
- **The site** is built by the registry's workflow with `tmcp-plugin registry`. It downloads every package, checks it against its sha256 and validates it the same way panels do. GitHub Pages then serves `index.json` with a copy of every package, README, icon and screenshot.
- **Panels** read the index from `MARKETPLACE_INDEX_URL` and download packages only from that same origin. A package must match the sha256, slug, version, SDK and capabilities its index entry lists. Installed versions are stored in the panel's database, so servers keep running even when GitHub is unreachable.
- **Private uploads** never touch the registry. They are stored in the panel's database, and only their uploader can install them, on servers they are an admin of.

## Setting up the registry

1. Create a public repository named `tmcontrolpanel-plugins` from the contents of `packages/plugin-sdk/registry-template`. The template includes the example `hello` plugin as its first entry.
2. In the repository settings, set **Pages → Source** to **GitHub Actions**.
3. Optionally set the repository variable `GOCONTROLPANEL_REF` to the GoControlPanel branch whose validator the workflows use (default `master`).
4. Push to `main`. *Publish marketplace* builds the site, and panels read it at `https://<owner>.github.io/tmcontrolpanel-plugins/index.json`.

`DEFAULT_MARKETPLACE_INDEX_URL` in `packages/shared/src/plugins/marketplace-index.ts` points at `https://mregterschot.github.io/tmcontrolpanel-plugins/index.json`. Change it if the registry lives elsewhere.

The registry's README has the submission steps, the review checklist and the takedown procedure.

### Withdrawing a version (takedown)

Set `"yanked": true` and a `"yankReason"` in the version's JSON file and merge. Within 30 minutes, and before servers load their plugins whenever a GBX service starts, every service:

1. marks the version as withdrawn in its database;
2. turns it off on every server running it;
3. sends the server's admins a notification with the reason.

Panels then refuse to turn it on or install it again, and the marketplace page marks it as withdrawn. To take down a whole plugin, yank every version. Don't delete the files, or panels can't see that a version was withdrawn.

## Panel configuration

| Variable | Container | Default | Meaning |
|---|---|---|---|
| `MARKETPLACE_INDEX_URL` | web and GBX service | the official registry | Marketplace index. Empty turns the marketplace off on the web app (private uploads keep working) and turns the takedown checks off on the service. |
| `MARKETPLACE_CHECK_MINUTES` | GBX service | `30` | How often the service checks the index for withdrawn versions; `0` turns it off. |

**Running your own marketplace.** Make your own registry from the template and point both containers' `MARKETPLACE_INDEX_URL` at its Pages site. Nothing else in a panel depends on the official registry.

**Permissions.**
- Browsing the marketplace needs Admin on at least one server (directly or through a group).
- Installing, configuring, updating and uninstalling a plugin needs Admin on that server.
- Uploading private plugins needs the `plugins:upload` permission. Uploaders only see their own uploads; panel admins see all of them.
- Every install, update, uninstall, upload, deletion and settings change is written to the audit log. Secret values are left out.

## Security model

| Threat | Defence |
|---|---|
| Plugin code reading the service's secrets, files or network | QuickJS compiled to WebAssembly, one instance per plugin per server, with no Node.js APIs, no `require`, no file system and no environment. Plugins only reach the outside through host calls the service checks. |
| Template code running in the service | Handlebars runs inside the sandbox too; the service only receives the finished XML. |
| A plugin doing more than the admin accepted | Every host call checks the capabilities that are both declared in the manifest and granted at install. GBX calls go through an allowlist per capability. Raw manialink and chat methods are never allowed, and nor are methods that return passwords or IP addresses. |
| Hijacking other plugins' widgets or actions | Page ids are `plg.<slug>.<id>` and actions `<slug>:<name>`. A rendered page must be exactly one `<manialink>` with its own id. Answers to other plugins' manialinks are not delivered. |
| Reaching internal services (Redis, the database) | Web requests are HTTPS-only, to declared host names only (no IP addresses), and refused when the name resolves to a private, loopback or link-local address. That check is part of the connection itself, so DNS rebinding can't slip past it. |
| Hanging, memory hogging, flooding | Per-call time limits, a CPU budget per minute and a memory limit; the interrupts can't be caught by plugin code. Rate limits apply to server calls, chat, widgets, storage, web and notifications. A plugin that crosses a hard limit is turned off on that server and its admins are notified. |
| A tampered package | Panels only install from the index's origin, the bytes must match the sha256 in the reviewed index, and the service checks the stored package's sha256 again when it loads. |
| Malicious plugins that pass review | Takedown by yanking, enforced by every service within 30 minutes. Reports go through the registry's issue form, which every plugin page links to. |
| API keys in plugin settings | Fields marked `secret` are write-only in the panel and left out of config exports and audit logs. |
| Private uploads | Unreviewed, but they run in the same sandbox with the same consent step, and only on the uploader's own servers. |

What the sandbox can't stop: a plugin with the `ui` capability runs ManiaScript in the players' game clients. Those scripts can open links and make web requests from the player's machine. Review the templates of plugins that ask for `ui`.

## Data model

| Table | Holds |
|---|---|
| `plugins` | One row per plugin name. `source` is `marketplace` or `upload` (`builtin` only on panels that haven't started the new service yet); `ownerId` is the uploader of a private plugin. |
| `plugin_versions` | Stored packages (zip bytes, sha256, manifest, `yanked`) of marketplace and uploaded plugins. |
| `server_plugins` | A plugin on a server: on/off, settings, the installed `versionId` and the `grantedCapabilities` the admin accepted. |
| `plugin_storage` | `ctx.storage` values per server and plugin, removed on uninstall. |

The [first-party plugins](./first-party-plugins.md) are marketplace rows whose versions the service stores on start. Other marketplace versions nobody runs any more are deleted with their last install. Private uploads stay until their owner deletes them.

## Coverage of the requirements

Against section 12 of [backend-split-requirements.md](./backend-split-requirements.md#12-future-plugin-marketplace):

| Requirement | Status |
|---|---|
| PM-1 SDK boundary | Done: every plugin only gets the sandboxed `ctx`. |
| PM-2 Port the built-ins | Done: the [first-party plugins](./first-party-plugins.md) are SDK packages, installed on start, with existing installs moved onto them. |
| PM-3 Dynamic registry | Done. |
| PM-4 Namespaced, runtime-loaded templates | Done. |
| PM-5 Isolation | Done: QuickJS in WebAssembly. |
| PM-6 Storage API | Done. |
| PM-7 Config schema owned by the plugin | Done, with a generated form and write-only secrets. The first-party plugins keep the panel's own forms. |
| PM-10 Package format | Done. Integrity comes from sha256 pins in the reviewed index rather than signatures. |
| PM-11 Capabilities and consent | Done, including consent again for updates that add capabilities. |
| PM-12 Resource limits | Done; going over a hard limit turns the plugin off and notifies admins. |
| PM-13 Per-server lifecycle | Install, uninstall, on/off, update, roll back and pinned versions are done, all hot without reconnecting. Storage migrations between versions are left to the plugin. |
| PM-14 Private plugins | Done. |
| PM-15 Review workflow | Done through registry pull requests; yanking force-disables everywhere, and reports go through the issue form. |
| PM-16 Catalog UI | Search, game mode filter, detail page (README, screenshots, changelog, versions, author), installed view with updates. No install counts: a GitHub-hosted registry can't count installs. |
| PM-17 Permissions and audit log | `plugins:upload`; installing stays with the server Admin role; review happens on GitHub, so there's no `plugins:review`. |
| PM-18 Developer experience | SDK with types, `tmcp-plugin` CLI, example plugin, this guide. Not published to npm yet, and there is no local dev mode against a test server beyond uploading to your own panel. |
| PM-19 Bundle storage | In the database, so it works with the web app and the service in different containers. |
