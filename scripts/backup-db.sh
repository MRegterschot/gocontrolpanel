#!/usr/bin/env bash
# Dumps the GoControlPanel database, keeps a copy locally and optionally sends it to another
# machine or storage. Meant for cron, for example every night at 03:15:
#   15 3 * * * /path/to/gocontrolpanel/scripts/backup-db.sh >> /var/log/gcp-backup.log 2>&1
# See docs/backups.md for the settings and how to restore.
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(dirname "$SCRIPT_DIR")"

usage() {
  cat <<USAGE
Usage: backup-db.sh [--no-upload] [--help]

Settings come from the environment or from scripts/backup.env (override with BACKUP_CONFIG).
DATABASE_URL is read from the environment or from the .env file in the repository root.
  --no-upload   dump and keep the file locally, skip the upload
USAGE
}

UPLOAD_OVERRIDE=""
for arg in "$@"; do
  case "$arg" in
    --no-upload) UPLOAD_OVERRIDE="none" ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $arg" >&2; usage >&2; exit 2 ;;
  esac
done

log() { printf '%s %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*"; }
SKIP_PING=""
ping_fail() { [ -n "$SKIP_PING" ] || [ -z "${BACKUP_PING_URL:-}" ] || curl -fsS -m 10 -o /dev/null "${BACKUP_PING_URL%/}/fail" || true; }
die() { log "ERROR: $*" >&2; exit 1; }

# Reads KEY=VALUE lines without running anything from the file, and never overrides the environment
load_file() {
  local file="$1" line key value
  [ -f "$file" ] || return 0
  while IFS= read -r line || [ -n "$line" ]; do
    case "$line" in ''|'#'*) continue ;; esac
    key="${line%%=*}"; value="${line#*=}"
    [[ "$key" =~ ^(DATABASE_URL|BACKUP_[A-Z_]+)$ ]] || continue
    value="${value%\"}"; value="${value#\"}"; value="${value%\'}"; value="${value#\'}"
    case "$value" in "~"|"~/"*) value="$HOME${value#\~}" ;; esac
    [ -n "${!key:-}" ] || export "$key=$value"
  done < "$file"
}

load_file "${BACKUP_CONFIG:-$SCRIPT_DIR/backup.env}"
load_file "$REPO_DIR/.env"

BACKUP_DIR="${BACKUP_DIR:-$REPO_DIR/backups}"
BACKUP_KEEP_DAYS="${BACKUP_KEEP_DAYS:-14}"
BACKUP_UPLOAD="${UPLOAD_OVERRIDE:-${BACKUP_UPLOAD:-none}}"
BACKUP_REMOTE_KEEP_DAYS="${BACKUP_REMOTE_KEEP_DAYS:-}"
BACKUP_SSH_PORT="${BACKUP_SSH_PORT:-22}"
BACKUP_DB_CONTAINER="${BACKUP_DB_CONTAINER:-}"
BACKUP_ENCRYPT_PASSFILE="${BACKUP_ENCRYPT_PASSFILE:-}"
BACKUP_PING_URL="${BACKUP_PING_URL:-}"

[ -n "${DATABASE_URL:-}" ] || die "DATABASE_URL is not set (environment, scripts/backup.env or .env)"
[[ "$BACKUP_KEEP_DAYS" =~ ^[0-9]+$ ]] || die "BACKUP_KEEP_DAYS must be a number"

# --- Parse DATABASE_URL: scheme://user:password@host:port/database?options ---
URL_RE='^([a-zA-Z0-9+]+)://([^:/?#@]*)(:([^@]*))?@([^:/?#]+)(:([0-9]+))?/([^?]+)'
[[ "$DATABASE_URL" =~ $URL_RE ]] || die "DATABASE_URL is not in the form scheme://user:password@host:port/database"
SCHEME="${BASH_REMATCH[1]}"
urldecode() { local s="${1//+/ }"; printf '%b' "${s//%/\\x}"; }
DB_USER="$(urldecode "${BASH_REMATCH[2]}")"
DB_PASSWORD="$(urldecode "${BASH_REMATCH[4]}")"
DB_HOST="${BASH_REMATCH[5]}"
DB_PORT="${BASH_REMATCH[7]}"
DB_NAME="$(urldecode "${BASH_REMATCH[8]}")"

case "$SCHEME" in
  mysql|mariadb) PROVIDER=mysql; DB_PORT="${DB_PORT:-3306}" ;;
  postgres|postgresql) PROVIDER=postgres; DB_PORT="${DB_PORT:-5432}" ;;
  *) die "Unsupported database scheme: $SCHEME" ;;
esac
[[ "$DB_NAME" =~ ^[A-Za-z0-9_.-]+$ ]] || die "Unexpected characters in the database name"

case "$BACKUP_UPLOAD" in
  none) ;;
  rsync) [ -n "${BACKUP_RSYNC_TARGET:-}" ] || die "BACKUP_RSYNC_TARGET is required for rsync uploads" ;;
  rclone) [ -n "${BACKUP_RCLONE_TARGET:-}" ] || die "BACKUP_RCLONE_TARGET is required for rclone uploads" ;;
  *) die "BACKUP_UPLOAD must be none, rsync or rclone" ;;
esac
if [ -n "$BACKUP_ENCRYPT_PASSFILE" ]; then
  [ -r "$BACKUP_ENCRYPT_PASSFILE" ] || die "Cannot read BACKUP_ENCRYPT_PASSFILE"
  command -v openssl >/dev/null || die "openssl is required for encryption"
fi

mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"

# A slow upload must not overlap with the next run
exec 9>"$BACKUP_DIR/.lock"
# The run that holds the lock reports its own result, so this one stays quiet
flock -n 9 || { SKIP_PING=1; die "Another backup is still running"; }

TMP_DIR="$(mktemp -d "$BACKUP_DIR/.tmp.XXXXXX")"
MAIN_PID=$$
on_exit() {
  local rc=$?
  # Only the main shell reports; the subshells of a pipeline exit through here too
  if [ "$BASHPID" = "$MAIN_PID" ]; then
    rm -rf "$TMP_DIR"
    if [ "$rc" -ne 0 ]; then log "Backup FAILED (exit $rc)" >&2; ping_fail; fi
  fi
}
trap on_exit EXIT

# --- Dump ---
# Run the dump tool on the host, or inside the database container when BACKUP_DB_CONTAINER is set
run_db() {
  if [ -n "$BACKUP_DB_CONTAINER" ]; then
    docker exec -i -e MYSQL_PWD="$DB_PASSWORD" -e PGPASSWORD="$DB_PASSWORD" "$BACKUP_DB_CONTAINER" "$@"
  else
    MYSQL_PWD="$DB_PASSWORD" PGPASSWORD="$DB_PASSWORD" "$@"
  fi
}
# Inside a container the server is reached over its own socket, so no host or port
conn_args() {
  if [ -n "$BACKUP_DB_CONTAINER" ]; then return 0; fi
  if [ "$PROVIDER" = mysql ]; then
    printf '%s\n' "-h$DB_HOST" "-P$DB_PORT" "--protocol=tcp"
  else
    printf '%s\n' "-h$DB_HOST" "-p$DB_PORT"
  fi
}

STAMP="$(date -u '+%Y%m%d-%H%M%SZ')"
BASE="gcp-${DB_NAME}-${STAMP}"
DUMP="$TMP_DIR/$BASE.sql.gz"

mapfile -t CONN < <(conn_args)
log "Dumping $PROVIDER database '$DB_NAME'${BACKUP_DB_CONTAINER:+ from container $BACKUP_DB_CONTAINER}"
if [ "$PROVIDER" = mysql ]; then
  DUMP_BIN=mysqldump
  if run_db sh -c 'command -v mariadb-dump' >/dev/null 2>&1; then DUMP_BIN=mariadb-dump; fi
  EXTRA=()
  # MySQL 8 clients need this unless the user has the PROCESS privilege; MariaDB has no such option
  help_text="$(run_db "$DUMP_BIN" --help 2>/dev/null || true)"
  case "$help_text" in *--no-tablespaces*) EXTRA+=(--no-tablespaces) ;; esac
  run_db "$DUMP_BIN" ${CONN[@]+"${CONN[@]}"} -u"$DB_USER" \
    --single-transaction --quick --routines --triggers --events \
    --default-character-set=utf8mb4 ${EXTRA[@]+"${EXTRA[@]}"} "$DB_NAME" | gzip -9 > "$DUMP"
else
  run_db pg_dump ${CONN[@]+"${CONN[@]}"} -U "$DB_USER" --no-owner --no-privileges --clean --if-exists "$DB_NAME" | gzip -9 > "$DUMP"
fi

# --- Check the dump before it replaces anything ---
[ -s "$DUMP" ] || die "The dump is empty"
gzip -t "$DUMP" || die "The dump is not a valid gzip file"
MARKER='Dump completed'
[ "$PROVIDER" = postgres ] && MARKER='PostgreSQL database dump complete'
dump_tail="$(gzip -dc "$DUMP" | tail -c 2000)"
[[ "$dump_tail" == *"$MARKER"* ]] || die "The dump looks truncated (no completion marker)"

FINAL="$DUMP"
if [ -n "$BACKUP_ENCRYPT_PASSFILE" ]; then
  openssl enc -aes-256-cbc -pbkdf2 -iter 200000 -salt -pass "file:$BACKUP_ENCRYPT_PASSFILE" -in "$DUMP" -out "$DUMP.enc"
  rm -f "$DUMP"
  FINAL="$DUMP.enc"
fi

NAME="$(basename "$FINAL")"
(cd "$TMP_DIR" && sha256sum "$NAME" > "$NAME.sha256")
mv "$FINAL" "$FINAL.sha256" "$BACKUP_DIR/"
chmod 600 "$BACKUP_DIR/$NAME" "$BACKUP_DIR/$NAME.sha256"
SIZE="$(du -h "$BACKUP_DIR/$NAME" | cut -f1)"
log "Saved $BACKUP_DIR/$NAME ($SIZE)"

# --- Upload ---
SSH_CMD=(ssh -p "$BACKUP_SSH_PORT" -o BatchMode=yes -o StrictHostKeyChecking=accept-new)
[ -z "${BACKUP_SSH_KEY:-}" ] || SSH_CMD+=(-i "$BACKUP_SSH_KEY")
case "$BACKUP_UPLOAD" in
  rsync)
    command -v rsync >/dev/null || die "rsync is not installed"
    log "Uploading to $BACKUP_RSYNC_TARGET"
    rsync -a --partial -e "${SSH_CMD[*]}" "$BACKUP_DIR/$NAME" "$BACKUP_DIR/$NAME.sha256" "$BACKUP_RSYNC_TARGET"
    if [ -n "$BACKUP_REMOTE_KEEP_DAYS" ] && [[ "$BACKUP_RSYNC_TARGET" == *:* ]]; then
      host="${BACKUP_RSYNC_TARGET%%:*}"; path="${BACKUP_RSYNC_TARGET#*:}"
      log "Removing remote backups older than $BACKUP_REMOTE_KEEP_DAYS days"
      "${SSH_CMD[@]}" "$host" "find '$path' -maxdepth 1 -name 'gcp-*.sql.gz*' -mtime +$BACKUP_REMOTE_KEEP_DAYS -delete"
    fi
    ;;
  rclone)
    command -v rclone >/dev/null || die "rclone is not installed"
    target="${BACKUP_RCLONE_TARGET%/}"
    log "Uploading to $target"
    # --no-check-dest skips the lookup of an existing file, which a key without read access
    # is refused (every file name has a timestamp, so there is nothing to overwrite anyway)
    rclone copyto --no-check-dest "$BACKUP_DIR/$NAME" "$target/$NAME"
    rclone copyto --no-check-dest "$BACKUP_DIR/$NAME.sha256" "$target/$NAME.sha256"
    if [ -n "$BACKUP_REMOTE_KEEP_DAYS" ]; then
      log "Removing remote backups older than $BACKUP_REMOTE_KEEP_DAYS days"
      rclone delete "$target" --min-age "${BACKUP_REMOTE_KEEP_DAYS}d" --include 'gcp-*.sql.gz*'
    fi
    ;;
esac

# --- Local retention ---
find "$BACKUP_DIR" -maxdepth 1 -type f -name 'gcp-*.sql.gz*' -mtime "+$BACKUP_KEEP_DAYS" -print -delete |
  while read -r old; do log "Removed old backup $(basename "$old")"; done

log "Backup finished"
[ -z "$BACKUP_PING_URL" ] || curl -fsS -m 10 -o /dev/null "$BACKUP_PING_URL" || log "Could not reach the ping URL"
