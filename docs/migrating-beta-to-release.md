# Upgrading from the `:beta` images to `:release`

This guide moves a Docker Compose deployment that runs the last beta (`marijnregterschot/gocontrolpanel:beta`, v0.12.0-beta) to the current release images **side by side**: you build a second, new stack next to the old one, fill it with a copy of your data, test it, and then switch over. The old stack and its database are never changed, so going back is a matter of starting the old container again.

## What changes

|                            | `:beta` (v0.12.0-beta)                                                                           | `:release`                                                                                                                                         |
| -------------------------- | ------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Containers                 | One: `gocontrolpanel` runs the web app, the dedicated-server connections, plugins and live pages | Two: `tmcontrolpanel` (web) and `gbx-service` (connections, plugins, live WebSockets)                                                              |
| Image names                | `marijnregterschot/gocontrolpanel`                                                               | `marijnregterschot/tmcontrolpanel` and `marijnregterschot/tmcontrolpanel-gbx-service`. The old images stay on Docker Hub but are no longer updated |
| New secrets                |                                                                                                  | `SECRETS_KEY`, `GBX_SERVICE_TOKEN`, `WS_TICKET_SECRET`, optionally `PANEL_INTERNAL_TOKEN`                                                          |
| Dedicated server passwords | Stored as plain text                                                                             | Encrypted with `SECRETS_KEY`; plain text values are rejected until you encrypt them (step 5)                                                       |
| Browser live updates       | Same origin as the panel                                                                         | Straight to the GBX service on port 3100                                                                                                           |
| Database                   |                                                                                                  | New tables and columns, applied by migrations when the new web container starts                                                                    |

You keep `NEXTAUTH_SECRET` (nobody has to log in again) and `HETZNER_KEY` (Hetzner projects keep working). The new stack gets a fresh database and Redis with new passwords, so the old database names and passwords don't matter.

`:release` is built from the `release` branch on every push. Once the release is published you can pin a version tag or `latest` instead.

## The one rule

**Only one controller may be connected to a dedicated server.** The old `gocontrolpanel` container and the new `gbx-service` must never run at the same time. Everything below is built around that: the new `gbx-service` stays off until the cutover, and the old container is stopped right before it starts.

## Before you start

- You need a shell on the host with Docker Compose and `curl`. You don't need a checkout of the repository.
- Pick a new directory for the new stack, for example `~/tmcontrolpanel` next to your old one. A different directory means a different Compose project, so containers and volumes don't clash.
- The panel in the new stack runs on other ports (3001 and 3101 below) until the cutover.
- Don't switch over while a Hetzner server is being set up.

## 1. Create the new stack

```bash
mkdir ~/tmcontrolpanel && cd ~/tmcontrolpanel
curl -fsSLO https://raw.githubusercontent.com/MRegterschot/tmcontrolpanel/release/docker-compose.yml
cp <old directory>/.env .env
```

Generate the new secrets and append them to `.env`, together with fresh database and Redis passwords. Use URL-safe values, because the database and Redis passwords end up in connection URLs:

```bash
cat >> .env <<EOF
MARIADB_ROOT_PASSWORD=$(openssl rand -hex 24)
MARIADB_PASSWORD=$(openssl rand -hex 24)
REDIS_PASSWORD=$(openssl rand -hex 24)
SECRETS_KEY=$(openssl rand -hex 32)
GBX_SERVICE_TOKEN=$(openssl rand -hex 32)
WS_TICKET_SECRET=$(openssl rand -hex 32)
PANEL_INTERNAL_TOKEN=$(openssl rand -hex 32)
EOF
```

**Back up `SECRETS_KEY` somewhere safe and never change it afterwards.** It encrypts your server passwords and any Codriver keys; a different key makes them unreadable. The old `.env` already holds `NEXTAUTH_SECRET`, `HETZNER_KEY`, `NADEO_*` and so on: check that those values are there.

Then adjust the new `docker-compose.yml`:

- **Ports.** Use other host ports until the cutover: change `3000:3000` to `3001:3000` and `127.0.0.1:3100:3100` to `127.0.0.1:3101:3100`.
- **URLs.** Set `NEXTAUTH_URL`, `NADEO_REDIRECT_URI`, `GBX_SERVICE_WS_URL` and `WS_ALLOWED_ORIGINS` to the addresses the panel will have after the cutover (your real domain), as in your old file. Step 5 covers the port 3100 setup.
- **Dedicated servers.** If your dedicated server and file manager run in the **old** compose file, leave them there: delete the `dedicated` and `filemanager` services and the `user-data` volume from the new file, and let the new containers reach them over the old Docker network. Find its name with `docker network ls` (usually `<old directory>_default`) and add:

  ```yaml
  services:
    tmcontrolpanel:
      networks: [default, old]
    gbx-service:
      networks: [default, old]

  networks:
    old:
      external: true
      name: <old directory>_default
  ```

  If your servers are on another machine, you don't need this.

Don't start the whole stack yet.

## 2. Copy the data and rehearse

You can do this as often as you like while the old stack keeps running. It never touches the old database, and the new `gbx-service` stays off.

Dump the old database:

```bash
cd <old directory>
docker compose exec -T db sh -c 'exec mariadb-dump -uroot -p"$MARIADB_ROOT_PASSWORD" --single-transaction "$MARIADB_DATABASE"' | gzip > ~/beta.sql.gz
```

Check that the file isn't empty. Then start the new database and import the dump:

```bash
cd ~/tmcontrolpanel
docker compose up -d db
docker compose exec -T db sh -c 'exec mariadb -uroot -p"$MARIADB_ROOT_PASSWORD" -e "DROP DATABASE IF EXISTS tmcontrolpanel; CREATE DATABASE tmcontrolpanel;"'
gunzip -c ~/beta.sql.gz | docker compose exec -T db sh -c 'exec mariadb -uroot -p"$MARIADB_ROOT_PASSWORD" tmcontrolpanel'
```

For PostgreSQL use `pg_dump` and `psql` the same way, with the `-postgres` image tags and a Postgres database service in your compose file.

Start only the web container. It applies the database migrations on start:

```bash
docker compose up -d tmcontrolpanel   # also starts redis
docker compose logs -f tmcontrolpanel # wait until the web app is ready, then press Ctrl+C
docker compose stop tmcontrolpanel
```

## 3. Encrypt the server passwords

The imported server passwords are still plain text. Download the helper script into the new directory. It needs `docker compose` and either `node` or Docker (it then uses a `node` container). Read it before you run it.

```bash
curl -fsSLo encrypt-server-credentials.sh \
  https://raw.githubusercontent.com/MRegterschot/tmcontrolpanel/release/scripts/encrypt-server-credentials.sh
chmod +x encrypt-server-credentials.sh
```

Put a space in front of the commands so your shell doesn't save the key in its history:

```bash
 SECRETS_KEY=$(grep ^SECRETS_KEY= .env | cut -d= -f2) ./encrypt-server-credentials.sh --dry-run
 SECRETS_KEY=$(grep ^SECRETS_KEY= .env | cut -d= -f2) ./encrypt-server-credentials.sh
```

The dry run only reports how many passwords are plain text. The real run encrypts the dedicated server and file manager passwords of every server (including deleted ones) in one transaction, then reads them back and checks that they decrypt. It is safe to run again with the same key. Use `--db-service <name>` if your database service isn't called `db`.

## 4. Test the new web app

Start the web container and open it on its temporary port:

```bash
docker compose up -d tmcontrolpanel
```

- Open `http://<host>:3001`. Log in with Nadeo; this needs the redirect URI of the new address to be registered with Nadeo, so skip it if you test under a different address than your real one.
- Your servers, maps, results and users should all be there.
- Don't use the live pages yet, because the GBX service is off. Don't change Hetzner projects or edit files on a dedicated server while testing: the stored credentials work, so those actions are real.

Stop it again when you're done: `docker compose stop tmcontrolpanel`.

## 5. Cut over

This is the only moment with downtime, a couple of minutes. You repeat the commands of steps 2 and 3 with fresh data.

1. Stop the old controller. Keep the old database and the dedicated server running:

   ```bash
   cd <old directory>
   docker compose stop gocontrolpanel
   ```

2. Dump the old database again, and import it into the new one, run the migrations and encrypt the passwords: the same commands as in steps 2 and 3. Stop the web container between the migration and the encryption, as shown there.
3. Give the new stack the real ports: change `3001` and `3101` back to `3000` and `3100`, or point your reverse proxy at the new containers. If the old web container stays stopped, nothing else uses those ports.
4. Open port 3100 to browsers as described in step 3 of [migrating-from-dev.md](./migrating-from-dev.md#3-open-port-3100-to-browsers). Set `GBX_SERVICE_WS_URL` and `WS_ALLOWED_ORIGINS` to match.
5. Start everything:

   ```bash
   cd ~/tmcontrolpanel
   docker compose up -d
   ```

## 6. Verify

```bash
docker compose logs tmcontrolpanel gbx-service
curl http://localhost:3100/health    # {"status":"ok","servers":N,"connected":N}
```

- `connected` should reach `servers` within a minute.
- You stay logged in, because `NEXTAUTH_SECRET` didn't change.
- Open a server's live page: rankings and the map card update, and `/help` works in game.
- Open a server's file manager. This proves the encrypted passwords decrypt.
- Open a Hetzner project if you use them.
- Check that your plugins still react, for example a map change with the Match plugin.

A container that won't stay up almost always means a missing or too short secret: read its log first.

## Rollback

Nothing in the old stack was changed, so going back is quick:

```bash
cd ~/tmcontrolpanel && docker compose stop tmcontrolpanel gbx-service
cd <old directory> && docker compose start gocontrolpanel
```

Point the ports or the proxy back at the old container. Anything recorded in the new stack after the cutover is lost on rollback. Never run both controllers at once.

## Clean up

Keep the old stack stopped for a week or so. Then remove its web container, image and volumes (`docker compose down -v` in the old directory removes the old database too, so only do it when you're sure), and delete `~/beta.sql.gz`: it holds plain text server passwords.

## Notes

- **Redis** is only caches and short-lived state, so the new stack starts with a fresh one. Manialink state and the active map are no longer kept there.
- **Built-in plugins** are plugin packages now and run sandboxed. Servers that had them on keep them on, with their settings. Local code changes you made in a fork don't carry over; see [migrating-from-dev.md](./migrating-from-dev.md#things-that-behave-differently).
- **Moving to a new host or new keys:** the same method works, with the new stack on the other machine. To re-encrypt data with different `SECRETS_KEY` or `HETZNER_KEY` values, see [migrating-database.md](./migrating-database.md).
- **Changelog:** read the [changelog](../CHANGELOG.md) for the full list of changes since the beta.
