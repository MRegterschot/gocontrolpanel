#!/usr/bin/env bash
# Encrypts the stored dedicated-server and file manager passwords with SECRETS_KEY.
# Works on a Docker Compose deployment without a repository checkout. Same result as
# scripts/encrypt-server-credentials.ts. Needs docker compose, and node or docker for the crypto.
set -euo pipefail

usage() {
  cat <<'EOF'
Usage: SECRETS_KEY=<key> ./encrypt-server-credentials.sh [options]

Run it in the directory of your docker-compose.yml, after the database migrations,
with the web and GBX containers stopped and a database backup at hand.

  -s, --db-service NAME   compose service of the database (default: db)
  -n, --dry-run           only report what would change
  -y, --yes               do not ask for confirmation
  -h, --help              show this help

SECRETS_KEY is read from the environment, or asked for when it is not set.
EOF
}

die() { echo "Error: $*" >&2; exit 1; }

DB_SERVICE=db
DRY_RUN=0
ASSUME_YES=0
while [ $# -gt 0 ]; do
  case "$1" in
    -s | --db-service) DB_SERVICE=${2:?Missing service name}; shift 2 ;;
    -n | --dry-run) DRY_RUN=1; shift ;;
    -y | --yes) ASSUME_YES=1; shift ;;
    -h | --help) usage; exit 0 ;;
    *) usage >&2; exit 1 ;;
  esac
done

command -v docker >/dev/null || die "docker is required"
docker compose version >/dev/null 2>&1 || die "docker compose is required"

if [ -z "${SECRETS_KEY:-}" ]; then
  read -rsp "SECRETS_KEY: " SECRETS_KEY
  echo
fi
[ "${#SECRETS_KEY}" -ge 32 ] || die "SECRETS_KEY must contain at least 32 characters"
export SECRETS_KEY

[ -n "$(docker compose ps --status running -q "$DB_SERVICE" 2>/dev/null)" ] ||
  die "service '$DB_SERVICE' is not running; start it with: docker compose up -d $DB_SERVICE"

dbexec() { docker compose exec -T "$DB_SERVICE" "$@"; }

if dbexec sh -c 'command -v psql' >/dev/null 2>&1; then
  KIND=postgres
elif dbexec sh -c 'command -v mariadb || command -v mysql' >/dev/null 2>&1; then
  KIND=mysql
else
  die "service '$DB_SERVICE' is neither MariaDB/MySQL nor PostgreSQL"
fi

# The database credentials come from the database container's own environment
sql_query() {
  if [ "$KIND" = postgres ]; then
    dbexec sh -c 'u=${POSTGRES_USER:-postgres}; exec psql -X -q -At -F "|" -U "$u" -d "${POSTGRES_DB:-$u}"' <<'SQL'
SELECT "id", encode(convert_to("password", 'UTF8'), 'hex'),
  CASE WHEN "filemanagerPassword" IS NULL THEN '-'
       ELSE encode(convert_to("filemanagerPassword", 'UTF8'), 'hex') END
FROM "servers" ORDER BY "id";
SQL
  else
    dbexec sh -c 'c=$(command -v mariadb || command -v mysql); u=${MARIADB_USER:-${MYSQL_USER:-root}}; p=${MARIADB_PASSWORD:-${MYSQL_PASSWORD:-${MARIADB_ROOT_PASSWORD:-$MYSQL_ROOT_PASSWORD}}}; exec "$c" -N -B -u"$u" -p"$p" "${MARIADB_DATABASE:-$MYSQL_DATABASE}"' <<'SQL'
SELECT `id`, HEX(`password`), IF(`filemanagerPassword` IS NULL, '-', HEX(`filemanagerPassword`))
FROM `servers` ORDER BY `id`;
SQL
  fi
}

sql_apply() {
  if [ "$KIND" = postgres ]; then
    dbexec sh -c 'u=${POSTGRES_USER:-postgres}; exec psql -X -q -v ON_ERROR_STOP=1 --single-transaction -U "$u" -d "${POSTGRES_DB:-$u}"'
  else
    dbexec sh -c 'c=$(command -v mariadb || command -v mysql); u=${MARIADB_USER:-${MYSQL_USER:-root}}; p=${MARIADB_PASSWORD:-${MYSQL_PASSWORD:-${MARIADB_ROOT_PASSWORD:-$MYSQL_ROOT_PASSWORD}}}; exec "$c" -u"$u" -p"$p" "${MARIADB_DATABASE:-$MYSQL_DATABASE}"'
  fi
}

# Same AES-256-GCM format as packages/shared/src/crypto/server-credentials.ts.
# Modes: plan (report), encrypt (print UPDATE statements), verify (every value must decrypt).
CRYPTO_JS=$(
  cat <<'EOF'
const crypto = require("node:crypto");
const [mode, kind] = process.argv.slice(1);
const secret = process.env.SECRETS_KEY || "";
const PREFIX = "tmcp-server:v1:";
const LEGACY = "gcp-server:v1:";
const key = crypto.createHash("sha256").update(secret).digest();
const encrypt = (plain) => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return PREFIX + Buffer.concat([iv, cipher.getAuthTag(), data]).toString("base64");
};
const decrypt = (stored) => {
  const prefix = stored.startsWith(PREFIX) ? PREFIX : LEGACY;
  const data = Buffer.from(stored.slice(prefix.length), "base64");
  try {
    const d = crypto.createDecipheriv("aes-256-gcm", key, data.subarray(0, 12));
    d.setAuthTag(data.subarray(12, 28));
    return Buffer.concat([d.update(data.subarray(28)), d.final()]).toString("utf8");
  } catch {
    console.error("A stored credential does not decrypt with this SECRETS_KEY");
    process.exit(1);
  }
};
const counts = { plain: 0, legacy: 0, current: 0 };
const convert = (stored) => {
  if (stored.startsWith(PREFIX)) { decrypt(stored); counts.current++; return stored; }
  if (stored.startsWith(LEGACY)) { counts.legacy++; return encrypt(decrypt(stored)); }
  counts.plain++;
  return encrypt(stored);
};
const q = (s) => "'" + s + "'";
const hexOf = (col) =>
  kind === "postgres" ? `encode(convert_to("${col}", 'UTF8'), 'hex')` : `HEX(\`${col}\`)`;
const col = (c) => (kind === "postgres" ? `"${c}"` : `\`${c}\``);
const table = kind === "postgres" ? '"servers"' : "`servers`";
const input = require("node:fs").readFileSync(0, "utf8").split("\n").filter(Boolean);
const statements = [];
for (const line of input) {
  const [id, pwHex, fmHex] = line.split(/[\t|]/);
  if (!/^[A-Za-z0-9-]+$/.test(id) || !/^[0-9a-fA-F]*$/.test(pwHex) || !/^(-|[0-9a-fA-F]*)$/.test(fmHex))
    throw new Error("Unexpected row format");
  const password = Buffer.from(pwHex, "hex").toString("utf8");
  const fm = fmHex === "-" ? null : Buffer.from(fmHex, "hex").toString("utf8");
  if (mode === "verify") {
    if (!password.startsWith(PREFIX) || (fm !== null && !fm.startsWith(PREFIX)))
      throw new Error(`Server ${id} still has an unencrypted credential`);
    decrypt(password);
    if (fm !== null) decrypt(fm);
    continue;
  }
  const newPassword = convert(password);
  const newFm = fm === null ? null : convert(fm);
  if (newPassword === password && newFm === fm) continue;
  // Only update the row if it still holds the values that were read
  const fmCond = fm === null ? `${col("filemanagerPassword")} IS NULL` : `${hexOf("filemanagerPassword")} = ${q(fmHex.toLowerCase())}`;
  statements.push(
    `UPDATE ${table} SET ${col("password")} = ${q(newPassword)}, ${col("filemanagerPassword")} = ${newFm === null ? "NULL" : q(newFm)} ` +
      `WHERE ${col("id")} = ${q(id)} AND ${hexOf("password")} = ${q(pwHex.toLowerCase())} AND ${fmCond};`,
  );
}
if (mode === "verify") console.error(`Verified ${input.length} servers.`);
else {
  console.error(`${input.length} servers: ${counts.plain} plain text, ${counts.legacy} old marker, ${counts.current} already encrypted.`);
  if (mode === "encrypt") console.log(statements.join("\n"));
}
EOF
)

run_node() {
  if command -v node >/dev/null 2>&1; then
    node -e "$CRYPTO_JS" "$@"
  else
    docker run --rm -i -e SECRETS_KEY "${NODE_IMAGE:-node:lts-alpine}" node -e "$CRYPTO_JS" "$@"
  fi
}

rows=$(sql_query) || die "could not read the servers table; have the migrations been applied?"

if [ "$DRY_RUN" = 1 ]; then
  printf '%s\n' "$rows" | run_node plan "$KIND"
  exit 0
fi

if [ "$ASSUME_YES" != 1 ]; then
  read -rp "Is the database backed up and are the web and GBX containers stopped? [y/N] " answer
  [ "$answer" = y ] || [ "$answer" = Y ] || die "aborted"
fi

statements=$(printf '%s\n' "$rows" | run_node encrypt "$KIND")
if [ -n "$statements" ]; then
  if [ "$KIND" = postgres ]; then
    printf '%s\n' "$statements" | sql_apply
  else
    printf 'START TRANSACTION;\n%s\nCOMMIT;\n' "$statements" | sql_apply
  fi
fi

# Read everything back and check that it decrypts; safe to rerun if a row changed meanwhile
sql_query | run_node verify "$KIND"
echo "Done."
