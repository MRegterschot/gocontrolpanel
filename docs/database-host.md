# Move the database and Redis to a separate host

This implements option B of the [high availability plan](high-availability-plan.md#database-and-redis). The primary (Contabo, Coolify) and backup (Hetzner Cloud) share MariaDB or PostgreSQL and Redis on a third VPS. Losing either application host no longer takes storage down. You still need the [backup host and front-door routing](backup-host.md#front-door) to keep the panel available.

The database host remains a single point of failure. Option C adds database replication and Redis Sentinel; it needs separate failover tooling. Hetzner has no managed MySQL, PostgreSQL or Redis service. You maintain this host yourself.

The database holds servers, matches, records and plugins. Back it up. Redis holds GBX leases, RPC, events and status, plus web sessions, Codriver state, jukebox queues and the Nadeo token cache. Losing Redis data logs users out and loses that temporary state, but no recorded match data. During a Redis outage, all GBX runtimes are disposed within the lease TTL. They reconnect within about a second after Redis returns.

## 1. Create and secure the VPS

Choose a Hetzner CX23 (2 vCPU / 4 GB), about €6/month. Check availability and prices in the console. Enable Hetzner backups if wanted (+20%). Use a nearby location to limit latency between the three hosts.

Install a current Ubuntu LTS, add your SSH public key and install Docker Engine with the Compose plugin. Keep a second SSH session open while changing SSH or firewall settings. On the new host:

```bash
sudo apt update
sudo apt upgrade -y
sudo apt install -y ufw unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
sudo tee /etc/ssh/sshd_config.d/00-keys-only.conf >/dev/null <<'SSH'
PasswordAuthentication no
KbdInteractiveAuthentication no
PubkeyAuthentication yes
SSH
sudo sshd -t
sudo systemctl reload ssh
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow OpenSSH
sudo ufw enable
```

Verify a fresh key-based SSH login before closing the old session. Restrict SSH to your administration IP or mesh once that works. Keep the provider firewall equally restrictive.

## 2. Join the private mesh

Follow [Private networking](backup-host.md#private-networking) for WireGuard or Tailscale, including mesh access rules and dedicated-server access. Join all three hosts to the same mesh. Do not repeat the database installation examples there; use the containers below.

Note the database host's mesh IP. This guide uses `100.64.0.10`, as in the backup guide. Replace it everywhere with your actual IP. For WireGuard, use your subnet and interface (for example `10.20.0.0/24` and `wg0`) instead of `100.64.0.0/10` and `tailscale0`. The mesh must be up before Docker publishes these ports, including after a reboot. Make Docker wait for it, or the containers fail to bind after a reboot:

```bash
sudo mkdir -p /etc/systemd/system/docker.service.d
# Tailscale; for WireGuard use wg-quick@wg0.service instead
printf '[Unit]\nAfter=tailscaled.service\nWants=tailscaled.service\n' \
  | sudo tee /etc/systemd/system/docker.service.d/mesh.conf
sudo systemctl daemon-reload
```

Tailscale can report the service as started before the IP is assigned. If a container still fails to bind after a reboot, its `restart: unless-stopped` policy retries it.

## 3. Start the storage services

On the database host:

```bash
sudo install -d -m 700 /opt/tmcp-storage
sudo chown "$USER":"$(id -gn)" /opt/tmcp-storage
cd /opt/tmcp-storage
umask 077
cat > .env <<ENV
MESH_IP=100.64.0.10
MARIADB_ROOT_PASSWORD=$(openssl rand -hex 32)
MARIADB_PASSWORD=$(openssl rand -hex 32)
REDIS_PASSWORD=$(openssl rand -hex 32)
ENV
chmod 600 .env
```

Keep these passwords in your password manager. Fresh storage credentials are fine; preserve the application's encryption and auth secrets during cutover. The current Coolify stack uses `SERVICE_PASSWORD_MARIADBROOT`, `SERVICE_PASSWORD_MARIADB` and `SERVICE_PASSWORD_REDIS` for its old storage. Its volumes are `db-data:/var/lib/mysql` and `redis-data:/data`. Keep those old volumes for rollback.

Save this as `/opt/tmcp-storage/compose.yml` on the VPS. MariaDB 11 and Redis 7 match [the Coolify stack](../docker-compose.coolify.yml). These tags pin the major version; pull updates during maintenance.

```yaml
services:
  db:
    image: mariadb:11
    restart: unless-stopped
    ports:
      - "${MESH_IP:?}:3306:3306"
    environment:
      MARIADB_ROOT_PASSWORD: ${MARIADB_ROOT_PASSWORD:?}
      MARIADB_USER: tmcontrolpanel
      MARIADB_PASSWORD: ${MARIADB_PASSWORD:?}
      MARIADB_DATABASE: tmcontrolpanel
    volumes:
      - db-data:/var/lib/mysql
    healthcheck:
      test: ["CMD", "healthcheck.sh", "--connect", "--innodb_initialized"]
      interval: 10s
      timeout: 5s
      retries: 10
      start_period: 30s

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    ports:
      - "${MESH_IP:?}:6379:6379"
    environment:
      REDIS_PASSWORD: ${REDIS_PASSWORD:?}
    command:
      - sh
      - -c
      - 'exec redis-server --requirepass "$$REDIS_PASSWORD" --appendonly yes --appendfsync everysec --maxmemory 512mb --maxmemory-policy noeviction'
    volumes:
      - redis-data:/data
    healthcheck:
      test:
        [
          "CMD-SHELL",
          'REDISCLI_AUTH="$$REDIS_PASSWORD" redis-cli ping | grep -q PONG',
        ]
      interval: 10s
      timeout: 5s
      retries: 10

volumes:
  db-data:
  redis-data:
```

`noeviction` prevents Redis from evicting ownership leases. At the memory limit, writes fail instead; alert on memory use and increase the limit before reaching it. AOF with `appendfsync everysec` limits persistence loss to roughly a second. Leave RAM for the database, Redis persistence work and the OS.

### PostgreSQL alternative

Keep your existing database provider; this is not a MariaDB-to-PostgreSQL conversion. The full Coolify file only includes MariaDB. For PostgreSQL, replace its `db` block above with this one and replace `db-data` in `volumes` with `postgres-data`. PostgreSQL 17 matches the repository's development stack. If your source runs another major, plan compatibility first; never attach an old data volume to another major version.

```yaml
db:
  image: postgres:17-alpine
  restart: unless-stopped
  ports:
    - "${MESH_IP:?}:5432:5432"
  environment:
    POSTGRES_USER: tmcontrolpanel
    POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:?}
    POSTGRES_DB: tmcontrolpanel
  volumes:
    - postgres-data:/var/lib/postgresql/data
  healthcheck:
    test: ["CMD-SHELL", 'pg_isready -U "$$POSTGRES_USER" -d "$$POSTGRES_DB"']
    interval: 10s
    timeout: 5s
    retries: 10
    start_period: 30s
```

Add a strong `POSTGRES_PASSWORD` to `.env` (`openssl rand -hex 32`). Source deployments use `DB=mysql` or `DB=postgres`. Docker images have the provider built in: MariaDB uses `tmcontrolpanel` and `tmcontrolpanel-gbx-service`; PostgreSQL uses their `-postgres` variants. In both node Compose files, set `IMAGE_SUFFIX=-postgres` for PostgreSQL, or leave it empty for MariaDB. Keep the application release tag unchanged during this move.

Start only after applying the firewall rules in the next step:

```bash
cd /opt/tmcp-storage
docker compose config -q
docker compose up -d
docker compose ps
```

Database initialization variables only apply to an empty volume. Changing `.env` later does not change an existing database user's password.

## 4. Restrict and test access

Allow only application hosts through the mesh ACL. On the storage host, allow the selected database port and Redis only through the mesh interface/subnet:

```bash
sudo ufw allow in on tailscale0 from 100.64.0.0/10 to 100.64.0.10 port 3306 proto tcp
sudo ufw allow in on tailscale0 from 100.64.0.0/10 to 100.64.0.10 port 6379 proto tcp
# For PostgreSQL, use 5432 instead of 3306.
sudo ufw status verbose
```

Prefer the two application hosts' `/32` addresses over the whole subnet where possible. Do not open these ports on the public provider firewall. Allow the mesh transport itself if using WireGuard (your chosen UDP port).

Docker-published ports can bypass UFW. With Docker's iptables backend, also restrict forwarding to the published mesh address. These rules reject storage traffic arriving outside the mesh interface or source subnet:

```bash
sudo iptables -I DOCKER-USER 1 -p tcp -m multiport --dports 3306,5432,6379 \
  -m conntrack --ctorigdst 100.64.0.10 ! -s 100.64.0.0/10 -j DROP
sudo iptables -I DOCKER-USER 1 -p tcp -m multiport --dports 3306,5432,6379 \
  -m conntrack --ctorigdst 100.64.0.10 ! -i tailscale0 -j DROP
```

Persist these through your host's firewall configuration and recheck after reboot. If Docker uses its nftables backend, apply equivalent forwarding rules there; `DOCKER-USER` is an iptables chain. Mesh ACLs and mesh-only publishing are still required.

Install `mariadb-client` (or `postgresql-client`) and `redis-tools` on both application hosts. Test from the primary and backup using the new passwords:

```bash
mariadb -h 100.64.0.10 -u tmcontrolpanel -p tmcontrolpanel -e 'SELECT 1;'
# PostgreSQL alternative:
psql -h 100.64.0.10 -U tmcontrolpanel -W -d tmcontrolpanel -c 'SELECT 1;'
read -rs -p 'Redis password: ' REDISCLI_AUTH
export REDISCLI_AUTH
redis-cli -h 100.64.0.10 ping
unset REDISCLI_AUTH
```

Redis must answer `PONG`. Also test from both application containers after cutover; Docker routing may differ from host routing. From a machine outside the mesh, each applicable probe must fail (also check public IPv6 if assigned):

```bash
nc -zv -w 3 <public-ip> 3306
nc -zv -w 3 <public-ip> 5432
nc -zv -w 3 <public-ip> 6379
```

## 5. Copy the database in a maintenance window

Rehearse the dump and restore before the window to estimate downtime. Save the current Coolify Compose definition and resolved environment privately. Do not combine this move with an application upgrade.

In Coolify, stop only `tmcontrolpanel` and `gbx-service`. Stop the same services on any existing backup node too. Leave the old database and Redis running for the dump. No application may write to either database until the copy is verified. Dedicated game servers can keep running, but recording pauses.

On the primary, find the actual database container name:

```bash
docker ps --format 'table {{.Names}}\t{{.Image}}'
OLD_DB='<coolify-db-container-name>'
umask 077
set -o pipefail
docker exec "$OLD_DB" sh -c 'exec mariadb-dump -uroot -p"$MARIADB_ROOT_PASSWORD" --single-transaction --routines --triggers "$MARIADB_DATABASE"' \
  | gzip > tmcontrolpanel.sql.gz
gzip -t tmcontrolpanel.sql.gz
test -s tmcontrolpanel.sql.gz
scp tmcontrolpanel.sql.gz <ssh-user>@100.64.0.10:/opt/tmcp-storage/
```

On the database host, restore into the newly initialized, empty application database:

```bash
cd /opt/tmcp-storage
set -o pipefail
gunzip -c tmcontrolpanel.sql.gz | docker compose exec -T db sh -c \
  'exec mariadb -uroot -p"$MARIADB_ROOT_PASSWORD" tmcontrolpanel'
```

Compare exact counts on the stopped source and destination before starting the apps:

```bash
# Primary:
docker exec "$OLD_DB" sh -c 'exec mariadb -uroot -p"$MARIADB_ROOT_PASSWORD" "$MARIADB_DATABASE" -e "SELECT COUNT(*) AS servers FROM servers; SELECT COUNT(*) AS matches FROM matches; SELECT COUNT(*) AS users FROM users;"'
# Database host:
docker compose exec -T db sh -c 'exec mariadb -uroot -p"$MARIADB_ROOT_PASSWORD" tmcontrolpanel -e "SELECT COUNT(*) AS servers FROM servers; SELECT COUNT(*) AS matches FROM matches; SELECT COUNT(*) AS users FROM users;"'
```

### PostgreSQL dump and restore

Instead of the MariaDB commands, use a custom-format archive. Run `pg_dump` from the source container (same major as the source server), then restore with the destination's tools:

```bash
# Primary; OLD_DB is the source PostgreSQL container:
docker exec "$OLD_DB" sh -c 'exec pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc --no-owner --no-acl' > tmcontrolpanel.dump
test -s tmcontrolpanel.dump
scp tmcontrolpanel.dump <ssh-user>@100.64.0.10:/opt/tmcp-storage/
# Database host; restore into the empty database:
cd /opt/tmcp-storage
docker compose exec -T db pg_restore -U tmcontrolpanel -d tmcontrolpanel \
  --no-owner --no-acl --exit-on-error < tmcontrolpanel.dump
```

Compare `servers`, `matches` and `users` counts using `psql` on each host:

```bash
# Primary:
docker exec "$OLD_DB" sh -c 'exec psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT COUNT(*) AS servers FROM servers; SELECT COUNT(*) AS matches FROM matches; SELECT COUNT(*) AS users FROM users;"'
# Database host:
docker compose exec -T db psql -U tmcontrolpanel -d tmcontrolpanel \
  -c 'SELECT COUNT(*) AS servers FROM servers; SELECT COUNT(*) AS matches FROM matches; SELECT COUNT(*) AS users FROM users;'
```

### Redis state

Start the new Redis empty. Users must sign in again; Codriver state, queues and caches also reset. This loses no recorded matches. Keep all GBX services stopped while changing Redis: two independent Redis instances cannot coordinate ownership.

Copying Redis is optional. If preserving temporary state matters, stop every client, run `SAVE` on the old Redis and stop it cleanly. Copy its complete `/data` volume over the mesh into the stopped destination Redis volume. For Redis 7 AOF, include the entire `appendonlydir` and its manifest, not just one AOF file. If the source only has `dump.rdb`, first boot the destination with AOF disabled, load the RDB, then enable AOF with `CONFIG SET appendonly yes`; wait for the rewrite to finish before restarting with the Compose AOF settings. Preserve file ownership. Never copy live AOF files or start workers against both Redis instances.

## 6. Repoint the primary in Coolify

Switch the primary's resource to [docker-compose.coolify.node.yml](../docker-compose.coolify.node.yml). It already has no `db` or `redis`, and removes their `depends_on` entries. Merely setting `DATABASE_URL` in Coolify does not override the old full stack's hardcoded service URLs.

Follow [Coolify deployment and shared configuration](backup-host.md#coolify-deployment) to copy the resolved generated secrets to their plain variable names. Preserve `SECRETS_KEY`, `HETZNER_KEY`, `NEXTAUTH_SECRET`, service tokens and Nadeo settings. Keep domains, proxy network and aliases working. Use `GBX_NODE_ID=node-a`, `GBX_WORKERS=1` or more, and the same lease TTL as the backup.

In Coolify set:

```dotenv
SHARED_DATABASE_URL=mysql://tmcontrolpanel:<encoded-new-db-password>@100.64.0.10:3306/tmcontrolpanel
SHARED_REDIS_URI=redis://:<encoded-new-redis-password>@100.64.0.10:6379/0
# PostgreSQL alternative:
# SHARED_DATABASE_URL=postgresql://tmcontrolpanel:<encoded-new-db-password>@100.64.0.10:5432/tmcontrolpanel
# IMAGE_SUFFIX=-postgres
```

The node file sets `DATABASE_URL=${SHARED_DATABASE_URL}` and `REDIS_URI=${SHARED_REDIS_URI}` in **both** `tmcontrolpanel` and `gbx-service`. URL-encode passwords; generated hex passwords need no encoding. Keep the same Redis logical database everywhere.

Stop the old `db` and `redis` containers after the dump. Remove their service definitions by switching to the node file, and remove any stopped orphan containers if Coolify leaves them behind. Retain their named volumes and the old resource configuration. Do not use `down -v` or delete Coolify persistent storage. Check the volumes with `docker volume ls` before redeploying.

Deploy the node stack. The web container runs `prisma migrate deploy` on start with retries. Prisma's advisory lock serialises concurrent migrations on both MariaDB and PostgreSQL; starting both hosts together is supported. Never disable the advisory lock.

Check container logs and health from inside each container (Coolify node stacks do not publish host ports):

```bash
docker exec <web-container> node -e "fetch('http://127.0.0.1:3000/api/health').then(async r=>{console.log(r.status,await r.text());process.exit(r.ok?0:1)})"
docker exec <gbx-container> node -e "fetch('http://127.0.0.1:3100/healthz').then(async r=>{console.log(r.status,await r.text());process.exit(r.ok?0:1)})"
```

Both must return 200. `/api/health` checks the database, Redis and the local GBX front; `/healthz` checks Redis and a worker heartbeat. Open the panel, inspect matches, test a live page and verify stored server credentials and plugins still work.

## 7. Point the backup at the same storage

Follow the [backup host guide](backup-host.md). Set the same `SHARED_DATABASE_URL`, `SHARED_REDIS_URI`, image tag and shared secrets. Set `GBX_NODE_ID=node-b`. Keep `GBX_SERVICE_URL` pointing at each node's local front.

Verify both hosts' health, then run the [failover checks](backup-host.md#verify-and-test-failover) and configure the [front door](backup-host.md#front-door). Stop one application host at a time and confirm the surviving host still serves the panel and controls the servers.

## 8. Back up and test restores

Keep nightly logical dumps, 14 local copies, and an off-host copy. A dump on the database VPS alone does not survive losing it. Dumps contain credentials and user data; restrict access and encrypt off-host storage.

Save this as `/usr/local/sbin/tmcp-db-backup` on the database VPS, owned by root with mode `700`. It uses the container's credentials rather than putting passwords in cron:

```bash
#!/bin/bash
set -euo pipefail
umask 077
cd /opt/tmcp-storage
backup_dir=/var/backups/tmcontrolpanel
install -d -m 700 "$backup_dir"
stamp=$(date -u +%Y%m%dT%H%M%SZ)
file="$backup_dir/$stamp.sql.gz"
trap 'rm -f "$file.partial"' EXIT
docker compose exec -T db sh -c \
  'exec mariadb-dump -uroot -p"$MARIADB_ROOT_PASSWORD" --single-transaction --routines --triggers "$MARIADB_DATABASE"' \
  | gzip > "$file.partial"
gzip -t "$file.partial"
mv "$file.partial" "$file"
find "$backup_dir" -maxdepth 1 -type f -name '*.sql.gz' -printf '%f\n' \
  | sort -r | tail -n +15 | while IFS= read -r old; do rm -- "$backup_dir/$old"; done
# Configure this rclone remote as root before enabling the job:
rclone copy "$backup_dir" storage:tmcontrolpanel/database
```

For PostgreSQL, set `file="$backup_dir/$stamp.dump"`, replace the dump pipeline with the following, replace `gzip -t` with `test -s`, and rotate `*.dump` instead of `*.sql.gz`:

```bash
docker compose exec -T db sh -c \
  'exec pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc --no-owner --no-acl' > "$file.partial"
```

Install `rclone` and configure `storage:` for a Hetzner Storage Box (SFTP) or S3-compatible storage. `copy` preserves older remote backups; set a separate remote retention policy. Hetzner server backups are another off-host layer, but do not replace tested logical dumps. Back up the private Compose environment and application encryption keys separately.

Add this to root's crontab (`sudo crontab -e`); monitor failures and the log:

```cron
15 3 * * * /usr/local/sbin/tmcp-db-backup >> /var/log/tmcp-db-backup.log 2>&1
```

Test a restore regularly, including a dump retrieved from off-host storage. For MariaDB, restore into a scratch database; the dump above does not contain `CREATE DATABASE` or `USE`:

```bash
cd /opt/tmcp-storage
docker compose exec -T db sh -c 'exec mariadb -uroot -p"$MARIADB_ROOT_PASSWORD" -e "CREATE DATABASE tmcp_restore_test;"'
set -o pipefail
gunzip -c /var/backups/tmcontrolpanel/<backup>.sql.gz | docker compose exec -T db sh -c \
  'exec mariadb -uroot -p"$MARIADB_ROOT_PASSWORD" tmcp_restore_test'
docker compose exec -T db sh -c 'exec mariadb -uroot -p"$MARIADB_ROOT_PASSWORD" tmcp_restore_test -e "SELECT COUNT(*) FROM servers; SELECT COUNT(*) FROM matches; SELECT COUNT(*) FROM users;"'
docker compose exec -T db sh -c 'exec mariadb -uroot -p"$MARIADB_ROOT_PASSWORD" -e "DROP DATABASE tmcp_restore_test;"'
```

For PostgreSQL:

```bash
docker compose exec -T db createdb -U tmcontrolpanel tmcp_restore_test
docker compose exec -T db pg_restore -U tmcontrolpanel -d tmcp_restore_test \
  --no-owner --no-acl --exit-on-error < /var/backups/tmcontrolpanel/<backup>.dump
docker compose exec -T db psql -U tmcontrolpanel -d tmcp_restore_test \
  -c 'SELECT COUNT(*) FROM servers; SELECT COUNT(*) FROM matches; SELECT COUNT(*) FROM users;'
docker compose exec -T db dropdb -U tmcontrolpanel tmcp_restore_test
```

Compare with the expected counts for that backup. Never point a running GBX service at a scratch restore.

## 9. Monitor the three hosts

Configure Coolify or an uptime monitor to probe each application host's `/api/health` independently, using host-specific routes rather than only the shared public domain. Alert on failures. Monitor free disk space on the database volume and backup directory, memory, backup age and failed backup jobs. Leave room for database growth and Redis AOF rewrites.

Check Redis persistence on the storage host:

```bash
cd /opt/tmcp-storage
docker compose exec -T redis sh -c 'REDISCLI_AUTH="$REDIS_PASSWORD" redis-cli INFO persistence'
docker compose exec -T redis sh -c 'REDISCLI_AUTH="$REDIS_PASSWORD" redis-cli INFO memory'
df -h
```

Expect `aof_enabled:1`, `aof_last_write_status:ok` and `aof_last_bgrewrite_status:ok`. Investigate persistence errors immediately. Health checks do not prove backups can be restored.

## 10. Roll back if needed

Stop web and GBX services on **both** application hosts first. If the new database has accepted writes, the old volume is stale. Dump and restore the new database back into the old service before restarting, or explicitly accept losing everything written since cutover. Keep the application version unchanged.

Restore the primary's saved full Coolify Compose definition and original secrets. Start the old `db` and `redis` with their retained volumes. Restore the original URLs in both app services:

```dotenv
DATABASE_URL=mysql://tmcontrolpanel:<encoded-original-SERVICE_PASSWORD_MARIADB>@db:3306/tmcontrolpanel
REDIS_URI=redis://:<encoded-original-SERVICE_PASSWORD_REDIS>@redis:6379
```

Use the saved PostgreSQL URL for a PostgreSQL deployment. The full Coolify file already supplies the MariaDB URLs from its generated variables. Redeploy, check health and restore routing. Keep the backup stopped until it can reach the same old storage over the mesh. Never run workers against separate Redis instances for the same dedicated servers.

## Costs and troubleshooting

Allow about €6/month for the CX23 database VPS, plus about €1.20 for Hetzner backups (+20%), around €7.20/month before VAT. Off-host dump storage may cost extra. Check availability and current prices in the console.

- **Connection refused or timed out:** check the mesh IP, container health, mesh startup, port binding, ACL and firewall. Test from the application containers as well as the hosts. Do not fix it by publishing on `0.0.0.0`.
- **MariaDB access denied:** check the password and user host grant. The official image creates `'tmcontrolpanel'@'%'`; networking must restrict access. A narrower grant must match the source MariaDB actually sees, such as the Tailscale subnet in the [backup guide](backup-host.md#private-networking), or `'tmcontrolpanel'@'10.%'` for a matching WireGuard range. An old `'tmcontrolpanel'@'localhost'` grant does not allow remote clients.
- **Migrations waiting:** another host may be migrating under Prisma's advisory lock. Check both web logs and let it finish. Startup retries lock contention; do not disable locking or run a database reset.
- **Redis write or persistence errors:** check `INFO memory`, disk space and `INFO persistence`. Increase capacity; keep `noeviction` so leases cannot disappear under memory pressure.
