# Upgrading from the `:beta` images to `:release`

This guide upgrades a Docker Compose deployment that runs the last beta (`marijnregterschot/gocontrolpanel:beta`, v0.12.0-beta) to the current release images, in place: same host, same database, same volumes. Follow it top to bottom.

If you would rather move to a new host or new encryption keys, upgrade first and then use [migrating-database.md](./migrating-database.md).

## What changes

|                            | `:beta` (v0.12.0-beta)                                                                           | `:release`                                                                                                                                                                           |
| -------------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Containers                 | One: `gocontrolpanel` runs the web app, the dedicated-server connections, plugins and live pages | Two: `tmcontrolpanel` (web) and `gbx-service` (connections, plugins, live WebSockets)                                                                                                |
| Image names                | `marijnregterschot/gocontrolpanel`                                                               | `marijnregterschot/tmcontrolpanel` and `marijnregterschot/tmcontrolpanel-gbx-service` (each with a `-postgres` variant). The old images stay on Docker Hub but are no longer updated |
| New secrets                |                                                                                                  | `SECRETS_KEY`, `GBX_SERVICE_TOKEN`, `WS_TICKET_SECRET`, optionally `PANEL_INTERNAL_TOKEN`                                                                                            |
| Dedicated server passwords | Stored as plain text                                                                             | Encrypted with `SECRETS_KEY`. Plain text values are rejected until you encrypt them (step 5)                                                                                         |
| Browser live updates       | Same origin as the panel                                                                         | Straight to the GBX service on port 3100                                                                                                                                             |
| Database                   |                                                                                                  | New tables and columns, applied by migrations. They only go forward, so the backup is your way back                                                                                  |

Things that stay the same: `NEXTAUTH_SECRET` (nobody has to log in again), `HETZNER_KEY` (Hetzner projects keep working), the database name and user, and all your data.

`:release` is built from the `release` branch on every push. Once the release is published you can pin a version tag or `latest` instead.

## Before you start

- You need a shell on the host with Docker Compose and `curl`. Nothing else has to be installed and you don't need a checkout of the repository.
- Plan for a few minutes of downtime. The old and new containers must never run against the same dedicated servers at the same time, so the old stack is stopped before the new one starts.
- Don't upgrade while a Hetzner server is being set up.

## 1. Back up

```bash
docker compose exec db mariadb-dump -u gocontrolpanel -p'<db password>' \
  --single-transaction gocontrolpanel | gzip > before-upgrade.sql.gz
```

Use your own database user, name and password. For PostgreSQL use `pg_dump`. Also keep a copy of your current `docker-compose.yml` and `.env`.

Check that the dump is not empty before you continue.

## 2. Generate the new secrets

```bash
openssl rand -hex 32   # SECRETS_KEY
openssl rand -hex 32   # GBX_SERVICE_TOKEN
openssl rand -hex 32   # WS_TICKET_SECRET
openssl rand -hex 32   # PANEL_INTERNAL_TOKEN (optional, only for the Codriver /co commands)
```

Write them down. **Keep `SECRETS_KEY` safe and never change it afterwards**: it encrypts your server passwords and any Codriver keys, and a different key makes them unreadable. `GBX_SERVICE_TOKEN`, `WS_TICKET_SECRET` and `PANEL_INTERNAL_TOKEN` must be identical in both containers.

## 3. Update `docker-compose.yml`

The easiest way is to start from the [`docker-compose.yml`](../docker-compose.yml) in the repository and fill in your own values. These are the parts that matter for an existing install:

**Keep your database and Redis settings.** The compose file in the repository uses the names `tmcontrolpanel` for the database and its user. Your existing database is called `gocontrolpanel`, and changing the variables does not rename it. Leave the database name, user and password as they are:

```yaml
db:
  environment:
    MARIADB_USER: gocontrolpanel
    MARIADB_DATABASE: gocontrolpanel
    MARIADB_PASSWORD: ${MARIADB_PASSWORD} # your current database password
```

and use the same user and name in `DATABASE_URL` in both containers:

```yaml
DATABASE_URL: mysql://gocontrolpanel:${MARIADB_PASSWORD}@db:3306/gocontrolpanel
```

Changing `MARIADB_PASSWORD` in compose does not change the password of the existing account. Leave it as it is for now, and rotate it later if you want. If your Redis has no password, keep `REDIS_URI: redis://redis:6379`. If you add one, set `REDIS_PASSWORD` and use `redis://:<password>@redis:6379` in both containers.

**Rename the web service and image:**

```yaml
tmcontrolpanel: # was: gocontrolpanel
  image: marijnregterschot/tmcontrolpanel:release # -postgres variant for PostgreSQL
```

**Add the new variables to the web service**, next to the ones you already have:

```yaml
GBX_SERVICE_URL: http://gbx-service:3100
GBX_SERVICE_WS_URL: ws://localhost:3100 # must be reachable from the browser, see step 6
GBX_SERVICE_TOKEN: <GBX_SERVICE_TOKEN>
WS_TICKET_SECRET: <WS_TICKET_SECRET>
PANEL_INTERNAL_TOKEN: <PANEL_INTERNAL_TOKEN> # optional
SECRETS_KEY: <SECRETS_KEY>
```

**Add the GBX service:**

```yaml
gbx-service:
  image: marijnregterschot/tmcontrolpanel-gbx-service:release # -postgres variant for PostgreSQL
  ports:
    - "127.0.0.1:3100:3100"
  restart: unless-stopped
  environment:
    DATABASE_URL: <same as tmcontrolpanel>
    REDIS_URI: <same as tmcontrolpanel>
    SECRETS_KEY: <SECRETS_KEY>
    GBX_SERVICE_TOKEN: <GBX_SERVICE_TOKEN>
    WS_TICKET_SECRET: <WS_TICKET_SECRET>
    WS_ALLOWED_ORIGINS: https://panel.example.com # the public URL of the panel
    PANEL_INTERNAL_URL: http://tmcontrolpanel:3000
    PANEL_INTERNAL_TOKEN: <PANEL_INTERNAL_TOKEN> # optional
    NADEO_SERVER_LOGIN: # copy the Nadeo values from the web service
    NADEO_SERVER_PASSWORD:
    NADEO_CONTACT:
    NADEO_CLIENT_ID:
    NADEO_CLIENT_SECRET:
    LOG_LEVEL: info
  depends_on:
    - db
    - redis
    - tmcontrolpanel # runs the database migrations
```

Everything else (`NEXTAUTH_*`, `DEFAULT_ADMINS`, `HETZNER_KEY`, the dedicated server and file manager services) stays as it is. Don't start anything yet.

## 4. Apply the database migrations

Stop the old stack (volumes are kept), pull the new images and start only the web container. It applies the migrations on start, and the GBX service stays off:

```bash
docker compose down
docker compose pull
docker compose up -d tmcontrolpanel   # also starts db and redis
docker compose logs -f tmcontrolpanel # wait until the web app is ready, then press Ctrl+C
docker compose stop tmcontrolpanel
```

Don't use the panel until step 5 is done: the server passwords are still plain text and are rejected.

## 5. Encrypt the server passwords

Download the helper script next to your `docker-compose.yml`. It needs `docker compose` and either `node` or Docker (it then uses a `node` container); it doesn't need a checkout or Bun. Read it before you run it.

```bash
curl -fsSLo encrypt-server-credentials.sh \
  https://raw.githubusercontent.com/MRegterschot/tmcontrolpanel/release/scripts/encrypt-server-credentials.sh
chmod +x encrypt-server-credentials.sh
```

Run it with your `SECRETS_KEY`. The `db` service must be running (step 4 started it). Put a space in front of the command so your shell doesn't save the key in its history:

```bash
 SECRETS_KEY='<SECRETS_KEY>' ./encrypt-server-credentials.sh --dry-run
 SECRETS_KEY='<SECRETS_KEY>' ./encrypt-server-credentials.sh
```

The dry run only reports how many passwords are plain text. The real run encrypts the dedicated server and file manager passwords of every server (including deleted ones) in one transaction, then reads them back and checks that they decrypt. It is safe to run again with the same key. Use `--db-service <name>` if your database service isn't called `db`. If it fails, don't continue: restore the backup and ask for help.

## 6. Open port 3100 to browsers

The live pages now connect from the browser straight to the GBX service. Follow step 3 of [migrating-from-dev.md](./migrating-from-dev.md#3-open-port-3100-to-browsers) to expose it, including the HTTPS and reverse proxy notes. Then set `GBX_SERVICE_WS_URL` on the web service and `WS_ALLOWED_ORIGINS` on the GBX service to match.

## 7. Start the new stack

```bash
docker compose up -d --remove-orphans
```

`--remove-orphans` removes the leftover container of the old `gocontrolpanel` service. The web container checks for pending migrations (none are left after step 4) and starts, and the GBX service then connects to your servers.

## 8. Verify

```bash
docker compose logs tmcontrolpanel gbx-service
curl http://localhost:3100/health    # {"status":"ok","servers":N,"connected":N}
```

- `connected` should reach `servers` within a minute.
- Open the panel. You stay logged in, because `NEXTAUTH_SECRET` didn't change.
- Open a server's live page: rankings and the map card update, and `/help` works in game.
- Open a server's file manager. This proves the encrypted passwords decrypt.
- Open a Hetzner project if you use them.
- Check that your plugins still react, for example a map change with the Match plugin.

A container that won't stay up almost always means a missing or too short secret: read its log first.

## Rollback

The new code encrypts server passwords and applies migrations the old image doesn't know about, so you can't just start the old image against the new database.

1. `docker compose down`
2. Restore the old `docker-compose.yml`.
3. Restore `before-upgrade.sql.gz` into an empty database (or start from the old volume if you kept a copy).
4. `docker compose up -d`

Anything recorded after the upgrade is lost on rollback. Never run the old and the new stack at the same time.

## Notes

- **Redis** is only caches and short-lived state. Manialink state and the active map are no longer kept there, so old `*:manialinks:*` and `active-map:*` keys are dead and can be deleted.
- **Built-in plugins** are plugin packages now and run sandboxed. Servers that had them on keep them on, with their settings. Local code changes you made in a fork don't carry over; see [migrating-from-dev.md](./migrating-from-dev.md#things-that-behave-differently).
- **Changelog:** read the [changelog](../CHANGELOG.md) for the full list of changes since the beta.
