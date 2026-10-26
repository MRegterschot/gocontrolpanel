# Moving a database to a new deployment with new keys

This guide moves the database of an existing TMControlPanel deployment into a new one, for example a new Coolify stack. The new deployment uses its own `SECRETS_KEY` and `HETZNER_KEY`, so the stored secrets are re-encrypted on the way.

If you would rather keep the old keys, skip the re-encryption: copy the old `SECRETS_KEY` and `HETZNER_KEY` into the new deployment before its first start and import the dump as is.

## What the keys protect

Both keys are hashed into an AES-256-GCM key. A value encrypted under one key can't be read with another, and the panel fails closed instead of guessing.

| Key           | Encrypts                                                                                                                            |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `SECRETS_KEY` | Dedicated server XML-RPC and file manager passwords (`servers`), Codriver API keys (`codriver_panel_settings`, `codriver_settings`) |
| `HETZNER_KEY` | Hetzner project API tokens (`hetzner_projects`), SSH private keys of provisioned servers (`hetzner_servers`)                        |

`scripts/rotate-encryption-keys.ts` decrypts all of these with the old keys and encrypts them with the new ones. It does this in a single transaction. If any value doesn't decrypt, nothing is written.

The other secrets need no data changes:

- `NEXTAUTH_SECRET`: everyone has to log in again.
- `GBX_SERVICE_TOKEN`, `WS_TICKET_SECRET` and `PANEL_INTERNAL_TOKEN`: nothing stored depends on them.
- Public API keys: they're stored as a sha256 hash and keep working.
- Database and Redis passwords: these belong to the new stack.

Redis isn't copied. It holds caches, rate limits and short-lived Hetzner setup state, so don't migrate while a Hetzner server is being provisioned.

## Before you start

- **Only one GBX service may control a dedicated server.** Stop the old panel and GBX service before the new GBX service starts with the imported data. If you import a production database into staging, staging will connect to the production servers.
- Have the old `SECRETS_KEY` and `HETZNER_KEY` at hand. If the old deployment also had `HETZNER_KEY_PREVIOUS` set, you need that too.
- Have the new keys. On Coolify, they're the values of `SERVICE_PASSWORD_64_SECRETS` and `SERVICE_PASSWORD_64_HETZNER` in the stack's environment variables. Start the new stack once so Coolify generates them, and save a copy somewhere safe.
- Check out the repository at the version the new deployment runs, for example the `release` branch for the `release` image, then run `bun install`. You need Docker and Bun on that machine.

The re-encryption runs on a throwaway copy of the database on your own machine. The new deployment's database never has to be reachable from outside.

These commands are for MariaDB/MySQL. For PostgreSQL, use `pg_dump`/`psql` and `DB=postgres`; the script supports both.

## 1. Dump the old database

Stop the old panel and GBX service so nothing changes while you dump, then dump the database:

```bash
docker stop <old tmcontrolpanel container> <old gbx-service container>
docker exec <old db container> mariadb-dump -u tmcontrolpanel -p'<old db password>' \
  --single-transaction tmcontrolpanel | gzip > old.sql.gz
```

`scripts/backup-db.sh --no-upload` works too, see [backups.md](./backups.md).

## 2. Load it into a scratch database

```bash
docker run -d --name tmcp-rekey -e MARIADB_ROOT_PASSWORD=rekey \
  -e MARIADB_DATABASE=tmcontrolpanel -p 127.0.0.1:3307:3306 mariadb:11
# wait until it accepts connections
until docker exec tmcp-rekey mariadb -uroot -prekey -e 'select 1' >/dev/null 2>&1; do sleep 1; done
gunzip -c old.sql.gz | docker exec -i tmcp-rekey mariadb -uroot -prekey tmcontrolpanel

export DB=mysql
export DATABASE_URL=mysql://root:rekey@127.0.0.1:3307/tmcontrolpanel
```

## 3. Bring the schema up to date

The script uses the current Prisma client, so the scratch database must have the same schema as the new deployment:

```bash
(cd packages/db && bun run deploy)
```

The command runs without `--env-file`, so your local `.env` can't redirect it to another database. It also regenerates the Prisma client for `DB`. If you develop against the other provider, run `bun run generate` afterwards.

If the old deployment predates encrypted server credentials, encrypt them with the **old** key first. The script reports which servers it checked.

```bash
SECRETS_KEY='<old SECRETS_KEY>' bun scripts/encrypt-server-credentials.ts
```

## 4. Re-encrypt

Pass the old and new keys as environment variables. Put a space in front of each command so your shell doesn't save the keys in its history (bash `HISTCONTROL=ignorespace`, zsh `HIST_IGNORE_SPACE`).

```bash
 export OLD_SECRETS_KEY='<old SECRETS_KEY>' SECRETS_KEY='<new SECRETS_KEY>'
 export OLD_HETZNER_KEY='<old HETZNER_KEY>' HETZNER_KEY='<new HETZNER_KEY>'
 # only if the old deployment used it
 export OLD_HETZNER_KEY_PREVIOUS='<old HETZNER_KEY_PREVIOUS>'

bun run rotate:encryption-keys --dry-run
bun run rotate:encryption-keys
```

The dry run decrypts everything and reports what it would change. A message like `Server … password could not be decrypted with the old key` means a wrong old key. Fix the key before continuing. Run the script once only: after a successful run the data is under the new keys, so a second run fails.

## 5. Dump the re-encrypted database

```bash
docker exec tmcp-rekey mariadb-dump -uroot -prekey --single-transaction tmcontrolpanel \
  | gzip > rekeyed.sql.gz
```

## 6. Import into the new deployment

On the new deployment's server, stop the web and GBX containers but leave the database running. On Coolify, the container names end in the stack UUID and a timestamp (`docker ps --filter name=<stack uuid>`).

```bash
docker stop <new tmcontrolpanel container> <new gbx-service container>

# start from an empty database; the user's grants survive the drop
docker exec <new db container> mariadb -uroot -p'<new root password>' \
  -e 'DROP DATABASE tmcontrolpanel; CREATE DATABASE tmcontrolpanel;'
gunzip -c rekeyed.sql.gz | docker exec -i <new db container> \
  mariadb -u tmcontrolpanel -p'<new db password>' tmcontrolpanel
```

On Coolify the passwords are `SERVICE_PASSWORD_MARIADBROOT` and `SERVICE_PASSWORD_MARIADB`.

Then redeploy or restart the stack. The web container applies pending migrations on start; there shouldn't be any after step 3.

## 7. Check it

- Log in. Because `NEXTAUTH_SECRET` changed, every user has to log in again.
- `https://<gbx domain>/health` reports the imported servers as connected.
- A dedicated server's file manager opens. This proves the server credentials decrypt.
- A Hetzner project lists its servers, and a provisioned server's SSH actions work.
- Codriver settings show the stored key hints, if you use Codriver.

## 8. Clean up

```bash
docker rm -f tmcp-rekey
shred -u old.sql.gz rekeyed.sql.gz
```

`old.sql.gz` together with the old keys exposes every stored secret, so delete it once the new deployment works, or keep it only in an encrypted backup. Remove the old deployment's volumes when you no longer need a way back. Unset the `OLD_*` and new key variables in your shell.

On Coolify, don't delete and recreate the stack after the import. That generates new keys, and the imported secrets become unreadable.
