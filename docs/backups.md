# Database backups

`scripts/backup-db.sh` dumps the GoControlPanel database, keeps the dump on the machine and can send a copy to another server or to cloud storage. It is built for cron.

It only dumps the application database named in `DATABASE_URL`, not the whole database server, so a restore never touches accounts or system tables. Both supported providers work: MariaDB/MySQL (`mysqldump` or `mariadb-dump`) and PostgreSQL (`pg_dump`).

## Setup

1. Copy `scripts/backup.env.example` to `scripts/backup.env` and fill in what you use. Every setting can also be an environment variable.
2. Run it once by hand and look at the output: `scripts/backup-db.sh --no-upload`.
3. Test a restore (below) before you rely on it.
4. Add it to cron, for example every night at 03:15:

   ```
   15 3 * * * /path/to/gocontrolpanel/scripts/backup-db.sh >> /var/log/gcp-backup.log 2>&1
   ```

The script exits non-zero when anything fails (cron mails that if `MAILTO` is set), and pings `BACKUP_PING_URL/fail` if you configured one. A second run while one is still going is skipped.

## Docker

With the compose setup the database host in `DATABASE_URL` is `db`, which only exists inside Docker. Set `BACKUP_DB_CONTAINER` to the database container name (`docker compose ps`, for example `gocontrolpanel-db-1`). The dump then runs inside that container and the user, password and database name come from `DATABASE_URL`. Use a user with access to that database. The `gocontrolpanel` user from the compose file works.

## Settings

| Setting                             | Default          | Meaning                                         |
| ----------------------------------- | ---------------- | ----------------------------------------------- |
| `BACKUP_DIR`                        | `<repo>/backups` | Where dumps are stored (mode 700)               |
| `BACKUP_KEEP_DAYS`                  | `14`             | Local dumps older than this are deleted         |
| `BACKUP_DB_CONTAINER`               | empty            | Run the dump inside this container              |
| `BACKUP_UPLOAD`                     | `none`           | `none`, `rsync` or `rclone`                     |
| `BACKUP_RSYNC_TARGET`               |                  | `user@host:/path/` for rsync over SSH           |
| `BACKUP_SSH_KEY`, `BACKUP_SSH_PORT` |                  | SSH key and port for rsync                      |
| `BACKUP_RCLONE_TARGET`              |                  | An rclone remote, such as `s3:bucket/gcp`       |
| `BACKUP_REMOTE_KEEP_DAYS`           | empty            | Delete uploaded backups older than this         |
| `BACKUP_ENCRYPT_PASSFILE`           | empty            | Encrypt with AES-256, passphrase from this file |
| `BACKUP_PING_URL`                   | empty            | Success/failure ping (healthchecks.io style)    |

Each backup is `gcp-<database>-<UTC timestamp>.sql.gz` (plus `.enc` when encrypted) with a `.sha256` file next to it. The dump is checked before it is kept: it must be valid gzip and end with the dump tool's completion line. A failed upload leaves the local copy in place.

The dump contains everything in the database, including user records and tokens. Encrypt it if it leaves your machine, restrict who can read the backup server, and do not put `backup.sql` or `backups/` in git (both are ignored here).

## Restore

Make sure the target is the database you mean, and stop the panel and GBX service first.

```bash
# verify the copy you downloaded
sha256sum -c gcp-gocontrolpanel-20261008-204405Z.sql.gz.enc.sha256

# decrypt (only if you used BACKUP_ENCRYPT_PASSFILE)
openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 -pass file:/path/to/passfile \
  -in gcp-gocontrolpanel-20261008-204405Z.sql.gz.enc -out dump.sql.gz

# MariaDB / MySQL, into an existing empty database
gunzip -c dump.sql.gz | mariadb -u gocontrolpanel -p gocontrolpanel
# in Docker
gunzip -c dump.sql.gz | docker exec -i gocontrolpanel-db-1 mariadb -u gocontrolpanel -pPASSWORD gocontrolpanel

# PostgreSQL (the dump drops and recreates the tables)
gunzip -c dump.sql.gz | psql -U gocontrolpanel -d gocontrolpanel
```

To look at a backup without risking the live data, restore it into a new database with another name and point a query tool at that.

## Backblaze B2

Use rclone with a remote you create by hand (`rclone config`, type `Backblaze B2`) and set `BACKUP_RCLONE_TARGET=b2:<bucket>/<folder>`.

- Create the application key for one bucket with `listBuckets,listFiles,writeFiles` and no `deleteFiles`. It can add backups but a hacked server cannot erase them. The script uploads with `--no-check-dest`, so the key does not need `readFiles` either.
- If the key has a file name prefix (for example `tmcp/`), the folder in `BACKUP_RCLONE_TARGET` must be that prefix. A mismatch shows up as `401 unauthorized`.
- Old backups are removed by a bucket lifecycle rule on the same prefix (hide after N days, delete a day later), so leave `BACKUP_REMOTE_KEEP_DAYS` empty.
- A key like that cannot download either. To restore, use a separate read-capable key on the machine you restore from, and keep it off the backup server.
