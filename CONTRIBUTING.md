Contributions are welcome! If you have suggestions or improvements, please create a pull request or open an issue. Feel free to fork the repository and make changes as needed.

## Local development

The repository is a Bun workspaces monorepo:

| Path | What it is |
|---|---|
| `apps/web` | Next.js panel (UI, auth, database, Nadeo/TMX/Hetzner) |
| `apps/gbx-service` | Fastify service that owns the dedicated server connections, plugins and live WebSockets ([README](apps/gbx-service/README.md)) |
| `packages/db` | Prisma schemas and migrations (MySQL and PostgreSQL) |
| `packages/shared` | Types and contracts shared by the web app and the service |
| `dev/` | Docker Compose file with the local infrastructure |

### Prerequisites

- [Bun](https://bun.sh) and Node.js 22 or newer
- Docker with Compose v2 (tested with 2.39)
- A Trackmania account with two things set up:
  - an OAuth app at the [Nadeo API manager](https://api.trackmania.com/manager), with `http://localhost:3000/api/auth/callback/nadeo` as redirect URL
  - a dedicated server account from the [dedicated server manager](https://www.trackmania.com/player/dedicated-servers)

### First start

```bash
cp .env.example .env     # then fill in the values marked below
bun run infra:up         # Redis + MariaDB
bun run setup            # installs dependencies and applies the database migrations
bun run dev:gbx          # GBX service on http://localhost:3100
bun run dev              # web app on http://localhost:3000 (in a second terminal)
```

These `.env` values have no usable default:

| Variable | Value |
|---|---|
| `NEXTAUTH_SECRET` | `openssl rand -base64 32` |
| `DEFAULT_ADMINS` | your own Trackmania login, so you are admin after your first login |
| `NADEO_CLIENT_ID`, `NADEO_CLIENT_SECRET` | from your OAuth app |
| `NADEO_SERVER_LOGIN`, `NADEO_SERVER_PASSWORD` | your dedicated server account. The web app signs in with it on startup and exits if it is wrong |

The service token and ticket secret in `.env.example` are throwaway values that work as they are.

Both apps read the root `.env` whichever folder you start them from, then an optional `.env` in their own folder on top for app-only overrides. Variables you export in your shell win over both. Prefer the root file alone: a second copy of a secret like `NEXTAUTH_SECRET` in `apps/web/.env` that drifts from the root one invalidates sessions without any error.

### Running a dedicated server

```bash
bun run infra:dedicated  # dedicated Trackmania server + file manager
```

Then add it in the panel under Admin → Servers:

| Field | Value |
|---|---|
| Host / Port | `127.0.0.1` / `5001` |
| User / Password | `SuperAdmin` / `SuperAdmin` |
| File manager URL | `http://localhost:3300` (no password) |

Players join on port `2351`. The container registers with the Trackmania master server using `NADEO_SERVER_LOGIN`, so it only starts with valid credentials.

### PostgreSQL instead of MariaDB

Switch `DB` and `DATABASE_URL` in `.env` to the PostgreSQL lines, then:

```bash
bun run infra:up:postgres
bun run setup
```

Schema changes have to be made for both databases (`packages/db/prisma/mysql` and `packages/db/prisma/postgres`), including a migration for each.

### Everyday commands

| Command | What it does |
|---|---|
| `bun run infra:down` | Stops all containers. Data is kept |
| `docker compose -f dev/docker-compose.yml --profile "*" down -v` | Stops everything and deletes the database and server files |
| `docker compose -f dev/docker-compose.yml logs -f` | Follows the container logs |
| `bun run test` / `bun run typecheck` | Tests and type checks for every workspace |
| `bun run deploy` | Applies pending migrations and regenerates the Prisma client |

### Ports

| Port | What |
|---|---|
| 3000 | web app |
| 3100 | GBX service |
| 3306 / 5432 / 6379 | MariaDB / PostgreSQL / Redis (localhost only) |
| 2351 | game port of the dedicated server |
| 5001 / 3300 | XML-RPC / file manager of the dedicated server (localhost only) |

If one of these is taken, stop whatever uses it. The databases only listen on `127.0.0.1` because their passwords are throwaway values.

### Testing the GBX service

The service has its own unit and integration tests, and an isolated stack for testing against a real dedicated server on separate ports, so it can run next to the setup above. See the [service README](apps/gbx-service/README.md) and [docs/real-server-testing.md](docs/real-server-testing.md).
