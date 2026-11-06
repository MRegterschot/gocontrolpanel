![Docker Pulls](https://img.shields.io/docker/pulls/marijnregterschot/tmcontrolpanel?logo=docker&link=https%3A%2F%2Fhub.docker.com%2Fr%2Fmarijnregterschot%2Ftmcontrolpanel)
![Docker Image Size](https://img.shields.io/docker/image-size/marijnregterschot/tmcontrolpanel?logo=docker&link=https%3A%2F%2Fhub.docker.com%2Fr%2Fmarijnregterschot%2Ftmcontrolpanel)
![Docker Version](https://img.shields.io/docker/v/marijnregterschot/tmcontrolpanel?logo=docker&link=https%3A%2F%2Fhub.docker.com%2Fr%2Fmarijnregterschot%2Ftmcontrolpanel)
![Discord Widget](https://img.shields.io/discord/1397578984023261284?logo=discord&link=https%3A%2F%2Fdiscord.gg%2FNjbtRvbCY8)
![Github Commits](https://img.shields.io/github/commit-activity/t/mregterschot/tmcontrolpanel?logo=github)

# TMControlPanel

A Dockerized management panel for dedicated Trackmania servers. Works both standalone and with existing stacks like [PyPlanet](#pyplanetevosc-stack-setup) or [EvoSC](#pyplanetevosc-stack-setup) and others.

## Table of Contents

- [Overview](#overview)
  - [Features](#features)
- [Architecture](#architecture)
  - [Expose the GBX service](#expose-the-gbx-service)
- [Docker Setup](#docker-setup)
  - [Prerequisites](#prerequisites)
  - [Getting Started](#getting-started)
    - [New Stack Setup](#new-stack-setup)
    - [PyPlanet/EvoSC Stack Setup](#pyplanetevosc-stack-setup)
  - [Permissions](#permissions)
  - [Upgrading](#upgrading)
  - [Troubleshooting](#troubleshooting)
  - [Changelog](#changelog)
  - [Plugins and the marketplace](#plugins-and-the-marketplace)
  - [Contributing](#contributing)
  - [License](#license)

# Overview

**TMControlPanel** is a management panel designed for dedicated Trackmania servers. It provides an easy-to-use interface for managing server settings, players and maps. The panel can be run as a standalone service or integrated with other server controllers like **PyPlanet** or **EvoSC**.

## Features

You can use the free hosted panel at [tmcontrolpanel.com](https://tmcontrolpanel.com) or self-host it with Docker.

#### Multiple servers

Manage all your dedicated servers from one panel and switch between them in a click. Group servers together, for example for a league or a team, and give people access per server or per group.

#### Hetzner Cloud

Create and delete Trackmania servers on Hetzner Cloud straight from the panel, together with databases, networks and volumes, and keep an eye on their metrics.

#### Server settings

Change the server name, password, player and spectator limits and the other general settings from the browser.

#### Game and mode settings

Switch game modes, edit mode script settings, load and save match settings and manage the playlist without touching a file.

#### Maps and jukebox

Add maps from the server, reorder the map list by dragging, jump to a map and queue the next ones in the jukebox.

#### Trackmania Exchange and Nadeo

Search maps and mappacks on Trackmania Exchange, or pull in seasonal campaigns, Track of the Day, weekly shorts and club campaigns and rooms, straight onto the server.

#### Live match view

Follow rounds, checkpoints, scores and chat as they happen. Pause the match, set round, map and match points, and talk to players from the browser.

#### Players

Kick, ban and force players to spectator, and keep the blacklist and guestlist in order across restarts.

#### Records and matches

Every round and finish is recorded. Browse match history per map, look up player results and export them to CSV.

#### Plugins and marketplace

Turn in-game widgets on per server, such as a match manager with pick and ban, live rankings, a Time Attack leaderboard and map and record info, and change their settings from the panel without a restart. Browse the plugin marketplace to install more, or upload your own privately. Plugins run in a sandbox with only the permissions you accept when you install them, and you can update or roll back a plugin from the server's Plugins page. See [Plugins and the marketplace](#plugins-and-the-marketplace).

#### File manager

Browse, upload, delete and edit the server's files, match settings and scripts with a built-in code editor.

#### Users, groups and roles

Give people access to exactly the servers and actions they need with roles and permissions on users, groups and servers. Every change is written to an audit log.

#### Public API

Server and group admins create API keys for external tools such as scoreboards, bots and tournament software. A server key reaches its server; a group key reaches every server in the group. Keys are limited to scopes, and stop working when their creator is no longer an admin. The versioned API lives at `/api/v1`, with an OpenAPI document at `/api/v1/openapi.json` and an interactive reference at `/api/v1/docs`. See [the public API guide](docs/public-api.md).

#### High availability

Self-hosters can add a second host that runs the web panel and GBX workers against the same database. If a worker goes down, another one takes over its servers. See [the backup host guide](docs/backup-host.md).

#### Codriver (experimental)

An AI assistant for running your servers, in the panel and in game with the `/co` chat command. It uses an AI provider API key that you add per server or for the whole panel. It is still experimental, so expect rough edges.

# Architecture

TMControlPanel runs as two containers next to your database and Redis:

| Container        | Image                                          | What it does                                                                                                                                                       |
| ---------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `tmcontrolpanel` | `marijnregterschot/tmcontrolpanel`             | The web panel: UI, sign in, database, Nadeo, Trackmania Exchange, Hetzner and file manager. Runs the database migrations on start. Port `3000`.                    |
| `gbx-service`    | `marijnregterschot/tmcontrolpanel-gbx-service` | Holds the connections to your dedicated servers, runs the in-game plugins and widgets, records matches and serves the live WebSockets to the browser. Port `3100`. |

Both images come in a MariaDB/MySQL and a PostgreSQL (`-postgres` suffix) flavour. The two containers share the database and Redis, and authenticate to each other with `GBX_SERVICE_TOKEN` and `WS_TICKET_SECRET`.

- **Browsers connect to port 3100** for the live pages, so `GBX_SERVICE_WS_URL` must be reachable from your users' browsers. Behind HTTPS it must be a `wss://` URL, see [Expose the GBX service](#expose-the-gbx-service).
  The service's main process is a front for the internal HTTP API and browser WebSockets. It never opens a GBX connection.
  It forks workers that hold GBX connections, run plugins and record matches. Redis leases assign each server to one worker.
  Commands, live events and status snapshots pass through Redis. Requests for a server with no owner return HTTP 503 (`ServerUnavailable`).
  A crashed or hung worker is restarted; other workers can take over its servers. Allow roughly 80–150 MB per worker, plus the front.
  Several containers sharing the database and Redis split servers by lease; see the [backup host guide](docs/backup-host.md).
  `GBX_SERVICE_ENABLED_SERVERS` limits which servers a container may claim.
- **Keep `/internal/*` private.** Only the web container calls those routes. Don't publish them through a reverse proxy.

## Expose the GBX service

The live pages, notifications and the server list connect from the browser straight to the GBX service. Make `GBX_SERVICE_WS_URL` reachable from your users' browsers:

- **Plain setup:** publish `3100` and use `ws://<host>:3100`.
- **HTTPS:** a page served over HTTPS may only open `wss://` sockets. Put a TLS-terminating reverse proxy in front of the service and set `GBX_SERVICE_WS_URL=wss://...`. The proxy must pass WebSocket upgrades.
- **Only expose `/ws/*` and `/health`.** The `/internal/*` routes are protected by `GBX_SERVICE_TOKEN` but are meant for the web container only; keep them off the public internet.
- Add the web app's public origin (for example `https://panel.example.com`) to `WS_ALLOWED_ORIGINS`. A socket from another origin is closed with code 4403. An empty value allows any origin.

### Example: Nginx Proxy Manager

1. Create a proxy host (for example `gbx.example.com`) that forwards to `http` / `gbx-service` / `3100`. Use the host IP and port instead if NPM does not share a Docker network with the service. Turn on **Websockets Support**, request a certificate on the **SSL** tab and enable **Force SSL**.
2. On the **Advanced** tab, add this custom configuration so that only `/ws/*` and `/health` pass through:

   ```nginx
   location ~ ^/(?!(ws/|health$)) {
       return 404;
   }
   ```

   Nginx checks regex locations before NPM's generated `location /`. The negative lookahead keeps `/ws/` and `/health` out of the regex, so they use the normal proxy block and everything else, including `/internal/*`, returns 404. To also hide `/health`, use `(ws/)`.

3. Set `GBX_SERVICE_WS_URL: wss://gbx.example.com` on the web container and `WS_ALLOWED_ORIGINS: https://panel.example.com` on the service. `GBX_SERVICE_URL` stays `http://gbx-service:3100` because the web container talks to the service directly, not through NPM.
4. Remove `ports: - 3100:3100` from the `gbx-service` compose entry when NPM reaches it over the Docker network, or bind it to localhost with `127.0.0.1:3100:3100` when NPM runs on the host. Otherwise the port stays open and the proxy rules can be bypassed.
5. Check it:

   ```bash
   curl -i https://gbx.example.com/internal/servers   # 404
   curl -i https://gbx.example.com/health             # 200
   curl -i http://<server-ip>:3100/health             # should fail from outside
   ```

   In the browser dev tools the `/ws/live/...` socket should show `101 Switching Protocols`. A close with code 4403 means `WS_ALLOWED_ORIGINS` does not match the panel's origin exactly.

# Docker Setup

This repository provides a **Docker Compose** configuration to set up and run **TMControlPanel** and its dependencies using Docker containers.

> **Self-hosting takes some technical knowledge.** You should be comfortable with Docker and Docker Compose, editing environment variables, running a database and Redis, and, if you expose the panel, putting it behind a reverse proxy with HTTPS. If that's new to you, ask in the [Discord](https://discord.gg/NjbtRvbCY8) before you start.
>
> **You are responsible for your own deployment** and any issues with it. Questions and help in the Discord are always welcome, but there is no guaranteed support.

To add a second host running only the web app and GBX workers against the same database and Redis, use the [backup host guide](docs/backup-host.md). It covers the Docker and Coolify node stacks, private networking and failover checks.
For option B, move the shared database and Redis off the primary with the [database host guide](docs/database-host.md).

## Prerequisites

Before using this `docker-compose.yml` file, ensure you have the following installed on your system:

- **Docker**: [Install Docker](https://www.docker.com/get-started)
- **Docker Compose**: [Install Docker Compose](https://docs.docker.com/compose/install/)

You will also need some credentials for the **Nadeo API** to configure the **TMControlPanel**. You can obtain these credentials from the [Nadeo API manager](https://api.trackmania.com/manager). Additionally, you will need a dedicated server login and password, which can be found in the [dedicated server manager](https://www.trackmania.com/player/dedicated-servers).

## Getting Started

This guide will help you set up and run the services for both completely new stacks and with existing stacks like [PyPlanet](#pyplanetevosc-stack-setup) or [EvoSC](#pyplanetevosc-stack-setup). There are also some boilerplate `docker-compose.yml` files available in the [docker](./docker/) folder for a variety of server controllers. Just copy the compose file of your choice, plugin your own configurations and run the `docker compose up -d` command to start the services.

## New Stack Setup

This section will guide you through setting up a new stack using the provided `docker-compose.yml` file.

### 1. Copy the `docker-compose.yml` File

First, copy the `docker-compose.yml` file from the repository to your desired directory. You can move it to any directory you want, the name of the directory will be the name of the stack.

### 2. Modify the Configuration

Make sure to update or add the environment variables for the services in your `docker-compose.yml` file:

- **TMControlPanel Environment Variables**:
  - `NEXTAUTH_URL`, `NEXTAUTH_SECRET`: NextAuth configuration for authentication. `NEXTAUTH_SECRET` can be any random string, e.g., `VettePanel123`.
  - `DEFAULT_ADMINS`: Comma-separated list of default admin logins. Probably your own login, e.g., `v8vgGbx_TuKkBabAyn7nsQ`.
  - `DEFAULT_PERMISSIONS`: Comma-separated list of default permissions for new users. You can find a list of available permissions in the [Permissions](#permissions) section.
  - **NADEO Configuration**: Make sure to update `NADEO_CLIENT_ID`, `NADEO_CLIENT_SECRET`, `NADEO_REDIRECT_URI`, `NADEO_SERVER_LOGIN`, `NADEO_SERVER_PASSWORD` and `NADEO_CONTACT` with your valid NADEO API credentials. Nadeo API credentials can be obtained from the [Nadeo API manager](https://api.trackmania.com/manager). The server login and password can be obtained from the [Dedicated Server Manager](https://www.trackmania.com/player/dedicated-servers).
  - `HETZNER_KEY`: Required for the Hetzner Cloud integration. Encrypts API tokens and SSH keys before they are stored in the database. Use a random string of at least 32 characters, for example from `openssl rand -hex 32`. When you change it, set the old value as `HETZNER_KEY_PREVIOUS` so stored values can still be decrypted.
  - **GBX service connection**: `GBX_SERVICE_URL` is the address of the `gbx-service` container (`http://gbx-service:3100`). `GBX_SERVICE_WS_URL` is the address the browser uses to open the live WebSockets, so it must be reachable from your users (for example `ws://<your-host>:3100`, or `wss://...` behind HTTPS). `GBX_SERVICE_TOKEN` and `WS_TICKET_SECRET` are secrets of at least 32 characters (`openssl rand -base64 32`) and must be identical in both containers. The panel refuses to start without them.
  - **Codriver AI assistant (optional)**: the panel operator enables Codriver and stores the Anthropic API keys on the Codriver admin page. `SECRETS_KEY` (at least 32 characters, shared with the GBX service) encrypts those keys and all stored dedicated/file-manager credentials; keep it stable, because changing it makes stored keys unreadable. `ANTHROPIC_API_KEY` is only a fallback for the shared key while none is stored. Optional Jev routing sends request text to TypeSafe and needs its own key, stored on the same page; `TYPESAFE_API_KEY` is its fallback while none is stored, like `ANTHROPIC_API_KEY`. `PANEL_INTERNAL_TOKEN` (at least 32 characters, the same in both containers) authenticates the GBX service when it forwards `/co` chat commands. Leave it empty to turn `/co` off. The server Codriver page provides chat, usage and request history; operator-wide usage is under Admin → Codriver. Apply pending database migrations during upgrades, including the phase 5 model-call tracking column.
  - `MARKETPLACE_INDEX_URL` (optional): The plugin marketplace the panel browses. Defaults to the official marketplace; set it to an empty value to turn browsing off. Uploading private plugins works either way.
  - `LOG_LEVEL`: Set the log level for TMControlPanel. Supported values are `trace`, `debug`, `info`, `warn`, `error` and `fatal`. The default is `info`.
  - `PLAUSIBLE_API_HOST`: Set the Plausible API host for analytics, e.g., `analytics.mywebsite.com`. This is optional and can be left empty if you do not want to use Plausible analytics.
  - **Sentry Configuration (Optional)**: TMControlPanel can send errors, performance traces, session replays and logs to Sentry. No Sentry configuration is required unless you want to enable telemetry.
    - `NEXT_PUBLIC_SENTRY_ENABLED`: Set to `true` to enable Sentry.
    - `NEXT_PUBLIC_SENTRY_DSN`: The Sentry DSN. Required when Sentry is enabled.
    - `SENTRY_SERVER_DSN` (optional): Server-side DSN. Defaults to `NEXT_PUBLIC_SENTRY_DSN`.
    - `SENTRY_ENVIRONMENT` (optional): Environment reported to Sentry. Defaults to `NODE_ENV` (production).
    - `SENTRY_TRACES_SAMPLE_RATE` (optional): Performance trace sampling rate (`0`-`1`). Defaults to `1`.
    - `SENTRY_PROFILES_SAMPLE_RATE` (optional): Profiling sampling rate (`0`-`1`). Defaults to `1`.
    - `NEXT_PUBLIC_SENTRY_REPLAYS_SESSION_SAMPLE_RATE` (optional): Session Replay sampling rate (`0`-`1`). Defaults to `1`.
    - `NEXT_PUBLIC_SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE` (optional): Session Replay sampling rate when an error occurs (`0`-`1`). Defaults to `1`.
    - `SENTRY_SEND_DEFAULT_PII` (optional): Whether to send personally identifiable information. Defaults to `false`.
    - `SENTRY_ATTACH_STACKTRACE` (optional): Whether to attach stack traces to supported log messages. Defaults to `true`.
    - `SENTRY_ENABLE_LOGS` (optional): Whether to send application logs to Sentry. Defaults to `true`.
    - `NEXT_PUBLIC_SENTRY_TUNNEL_ROUTE` (optional): Optional tunnel route for browser events.
    - `SENTRY_TUNNEL_ROUTE` (optional): Optional tunnel route for server-side events.
    - `SENTRY_MAX_BREADCRUMBS` (optional): Maximum number of breadcrumbs attached to each event. Defaults to `100`.
    - `SENTRY_NORMALIZE_DEPTH` (optional): Maximum object serialization depth. Defaults to `3`.
    - `SENTRY_IGNORE_ERRORS` (optional): Comma-separated list of error messages that should not be reported.

- **GBX Service Environment Variables** (`gbx-service` container):
  - `DATABASE_URL`, `REDIS_URI`: The same values as the `tmcontrolpanel` container.
  - `GBX_SERVICE_TOKEN`, `WS_TICKET_SECRET`: The same values as the `tmcontrolpanel` container.
  - `WS_ALLOWED_ORIGINS`: The origin(s) of the panel, comma separated, e.g., `https://panel.example.com`. A browser socket from another origin is refused.
  - `NADEO_SERVER_LOGIN`, `NADEO_SERVER_PASSWORD`, `NADEO_CONTACT`, `NADEO_CLIENT_ID`, `NADEO_CLIENT_SECRET`: The same values as the `tmcontrolpanel` container.
  - `GBX_SERVICE_ENABLED_SERVERS` (optional): Comma-separated server ids this container may claim. Empty allows every server in the database.
  - `GBX_WORKERS` (default `1`): Worker processes. Set `0` to roll back to the single-process mode.
  - `GBX_NODE_ID` (default hostname): Unique id per container.
  - `GBX_LEASE_TTL_MS` (default `15000`, minimum `6000`): Lease lifetime in milliseconds. Workers renew every TTL/3.
  - `PANEL_INTERNAL_URL`, `PANEL_INTERNAL_TOKEN` (optional): The panel address the service uses for Codriver `/co` commands (`http://tmcontrolpanel:3000`), and the same token as the `tmcontrolpanel` container. Empty turns `/co` off.
  - `LOG_LEVEL`, `SENTRY_DSN`, `SENTRY_ENVIRONMENT` (optional): Logging and error reporting of the service.
  - `MARKETPLACE_INDEX_URL`, `MARKETPLACE_CHECK_MINUTES` (optional): The plugin marketplace the service checks for withdrawn plugin versions, and how often (default every 30 minutes). Empty URL turns the check off.

- **Dedicated Server Environment Variables**:
  - `TM_MASTERSERVER_LOGIN`: Login for the dedicated server (same as `NADEO_SERVER_LOGIN` in TMControlPanel).
  - `TM_MASTERSERVER_PASSWORD`: Password for the dedicated server (same as `NADEO_SERVER_PASSWORD` in TMControlPanel).

### 3. Start the Services

Run the following command to start all services defined in the `docker-compose.yml` file:

```bash
docker compose up -d
```

### 4. Access the TMControlPanel

That's it! You can now access your **TMControlPanel** at `http://localhost:3000` or your own configured url.

---

## PyPlanet/EvoSC Stack Setup

This section will guide you through setting up the **TMControlPanel** with an existing **PyPlanet** or **EvoSC** stack.

### 1. Navigate to Your Existing Stack Directory

First you need to navigate to your existing stack directory. Navigate to the directory where your `docker-compose.yml` file is located.

### 2. Modify the `docker-compose.yml` File

Paste the following configuration into your existing `docker-compose.yml` file.

```yaml
tmcontrolpanel:
  image: marijnregterschot/tmcontrolpanel:latest # Use marijnregterschot/tmcontrolpanel-postgres:latest if you are using PostgreSQL
  ports:
    - 3000:3000
  restart: unless-stopped
  environment:
    NEXTAUTH_URL: http://localhost:3000
    NEXTAUTH_SECRET:
    DEFAULT_ADMINS:
    DEFAULT_PERMISSIONS:
    NADEO_CLIENT_ID:
    NADEO_CLIENT_SECRET:
    NADEO_REDIRECT_URI: http://localhost:3000/api/auth/callback/nadeo
    NADEO_SERVER_LOGIN:
    NADEO_SERVER_PASSWORD:
    NADEO_CONTACT: TMControlPanel / <your contact info>
    REDIS_URI: redis://redis:6379
    DATABASE_URL: mysql://tmcontrolpanel:VettePanel123@db:3306/tmcontrolpanel
    HETZNER_KEY:
    GBX_SERVICE_URL: http://gbx-service:3100
    GBX_SERVICE_WS_URL: ws://localhost:3100 # Must be reachable from the browser
    GBX_SERVICE_TOKEN: # Same value as the GBX service, at least 32 characters
    WS_TICKET_SECRET: # Same value as the GBX service, at least 32 characters
    LOG_LEVEL: info
  depends_on:
    - db
    - redis

gbx-service:
  image: marijnregterschot/tmcontrolpanel-gbx-service:latest # Use marijnregterschot/tmcontrolpanel-gbx-service-postgres:latest if you are using PostgreSQL
  ports:
    - 3100:3100 # WebSockets for the browser; /internal routes require GBX_SERVICE_TOKEN
  restart: unless-stopped
  environment:
    DATABASE_URL: mysql://tmcontrolpanel:VettePanel123@db:3306/tmcontrolpanel
    REDIS_URI: redis://redis:6379
    GBX_SERVICE_TOKEN: # Same value as the web app, at least 32 characters
    WS_TICKET_SECRET: # Same value as the web app, at least 32 characters
    WS_ALLOWED_ORIGINS: http://localhost:3000
    NADEO_SERVER_LOGIN:
    NADEO_SERVER_PASSWORD:
    NADEO_CONTACT: TMControlPanel / <your contact info>
    NADEO_CLIENT_ID:
    NADEO_CLIENT_SECRET:
    LOG_LEVEL: info
  depends_on:
    - db
    - redis
    - tmcontrolpanel # Runs the database migrations

filemanager:
  image: marijnregterschot/trackmania-server-fm:latest
  restart: unless-stopped
  volumes:
    # for PyPlanet the volume name is 'tmserverData', for EvoSC it is 'serverData' change accordingly
    - tmserverData:/app/UserData

redis:
  image: redis:latest
  restart: unless-stopped
  volumes:
    - redisData:/data
```

Also add the redis volume to the list of volumes at the bottom of your `docker-compose.yml` file:

```yaml
volumes:
  ...
  redisData: null
```

> **Note:** Make sure you are using the correct volume names for the filemanger service. For **PyPlanet**, the volume name is usually `tmserverData`, and for **EvoSC**, it is `serverData`.

### 3. Create Database

Create a new database for TMControlPanel in your existing database service. For the default PyPlanet and EvoSC stacks, this is usually a MariaDB database.
The container name is likely something like `<current-folder>-db-1`.

1. Log into the database container.

```bash
docker exec -it <container-name> mariadb -u root -p
```

> **Note:** The password `secret` is the default, but it may differ depending on your `docker-compose.yml` setup.

2. Create a new database:

```sql
CREATE DATABASE tmcontrolpanel;
```

3. Create a new user and grant permissions:

```sql
CREATE USER 'tmcontrolpanel'@'%' IDENTIFIED BY 'VettePanel123';
GRANT ALL PRIVILEGES ON tmcontrolpanel.* TO 'tmcontrolpanel'@'%';
FLUSH PRIVILEGES;
```

### 4. Modify the environment variables

Make sure to update or add the environment variables for the added services in your `docker-compose.yml` file:

- **TMControlPanel Environment Variables**:
  - `NEXTAUTH_URL`, `NEXTAUTH_SECRET`: NextAuth configuration for authentication. `NEXTAUTH_SECRET` can be any random string, e.g., `VettePanel123`.
  - `DEFAULT_ADMINS`: Comma-separated list of default admin logins.
  - `DEFAULT_PERMISSIONS`: Comma-separated list of default permissions for new users. You can find a list of available permissions in the [Permissions](#permissions) section.
  - **NADEO Configuration**: Make sure to update `NADEO_CLIENT_ID`, `NADEO_CLIENT_SECRET`, `NADEO_REDIRECT_URI`, `NADEO_SERVER_LOGIN`, `NADEO_SERVER_PASSWORD` and `NADEO_CONTACT` with your valid NADEO API credentials. Nadeo API credentials can be obtained from the [Nadeo API manager](https://api.trackmania.com/manager). The server login and password can be found in your existing stack configuration under the `dedicated` or `trackmania` service.
  - `HETZNER_KEY`: Required for the Hetzner Cloud integration. Encrypts API tokens and SSH keys before they are stored in the database. Use a random string of at least 32 characters, for example from `openssl rand -hex 32`. When you change it, set the old value as `HETZNER_KEY_PREVIOUS` so stored values can still be decrypted.
  - **GBX service connection**: `GBX_SERVICE_URL` is the address of the `gbx-service` container (`http://gbx-service:3100`). `GBX_SERVICE_WS_URL` is the address the browser uses to open the live WebSockets, so it must be reachable from your users (for example `ws://<your-host>:3100`, or `wss://...` behind HTTPS). `GBX_SERVICE_TOKEN` and `WS_TICKET_SECRET` are secrets of at least 32 characters (`openssl rand -base64 32`) and must be identical in both containers. The panel refuses to start without them.
  - `MARKETPLACE_INDEX_URL` (optional): The plugin marketplace the panel browses. Defaults to the official marketplace; set it to an empty value to turn browsing off. Uploading private plugins works either way.
  - `LOG_LEVEL`: Set the log level for TMControlPanel. Supported values are `trace`, `debug`, `info`, `warn`, `error` and `fatal`. The default is `info`.
  - `PLAUSIBLE_API_HOST`: Set the Plausible API host for analytics, e.g., `analytics.mywebsite.com`. This is optional and can be left empty if you do not want to use Plausible analytics.
  - **Sentry Configuration (Optional)**: TMControlPanel can send errors, performance traces, session replays and logs to Sentry. No Sentry configuration is required unless you want to enable telemetry.
    - `NEXT_PUBLIC_SENTRY_ENABLED`: Set to `true` to enable Sentry.
    - `NEXT_PUBLIC_SENTRY_DSN`: The Sentry DSN. Required when Sentry is enabled.
    - `SENTRY_SERVER_DSN` (optional): Server-side DSN. Defaults to `NEXT_PUBLIC_SENTRY_DSN`.
    - `SENTRY_ENVIRONMENT` (optional): Environment reported to Sentry. Defaults to `NODE_ENV` (production).
    - `SENTRY_TRACES_SAMPLE_RATE` (optional): Performance trace sampling rate (`0`-`1`). Defaults to `1`.
    - `SENTRY_PROFILES_SAMPLE_RATE` (optional): Profiling sampling rate (`0`-`1`). Defaults to `1`.
    - `NEXT_PUBLIC_SENTRY_REPLAYS_SESSION_SAMPLE_RATE` (optional): Session Replay sampling rate (`0`-`1`). Defaults to `1`.
    - `NEXT_PUBLIC_SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE` (optional): Session Replay sampling rate when an error occurs (`0`-`1`). Defaults to `1`.
    - `SENTRY_SEND_DEFAULT_PII` (optional): Whether to send personally identifiable information. Defaults to `false`.
    - `SENTRY_ATTACH_STACKTRACE` (optional): Whether to attach stack traces to supported log messages. Defaults to `true`.
    - `SENTRY_ENABLE_LOGS` (optional): Whether to send application logs to Sentry. Defaults to `true`.
    - `NEXT_PUBLIC_SENTRY_TUNNEL_ROUTE` (optional): Optional tunnel route for browser events.
    - `SENTRY_TUNNEL_ROUTE` (optional): Optional tunnel route for server-side events.
    - `SENTRY_MAX_BREADCRUMBS` (optional): Maximum number of breadcrumbs attached to each event. Defaults to `100`.
    - `SENTRY_NORMALIZE_DEPTH` (optional): Maximum object serialization depth. Defaults to `3`.
    - `SENTRY_IGNORE_ERRORS` (optional): Comma-separated list of error messages that should not be reported.

- **GBX Service Environment Variables** (`gbx-service`): use the same `DATABASE_URL`, `REDIS_URI`, `GBX_SERVICE_TOKEN`, `WS_TICKET_SECRET` and Nadeo values as the `tmcontrolpanel` service, and set `WS_ALLOWED_ORIGINS` to the origin of the panel. See [Architecture](#architecture) for what each variable does.

> **Note:** Make sure you are using the correct service name for the dedicated server. For **PyPlanet**, the service name is usually `dedicated`, and for **EvoSC**, it is `trackmania`.

### 5. Start the Services

Run the following command to start the services.

```bash
docker compose up -d
```

### 6. Access the TMControlPanel

That's it! You can now access your **TMControlPanel** at `http://localhost:3000` or your own configured url.

---

## Permissions

The **TMControlPanel** supports a permission system that allows you to manage user access to various features. You can set default permissions for new users using the `DEFAULT_PERMISSIONS` environment variable in your `docker-compose.yml` file. Here is a list of available permissions:

- users:view
- users:edit
- users:delete
- groups:view
- groups:create
- groups:edit
- groups:delete
- roles:view
- roles:create
- roles:edit
- roles:delete
- servers:view
- servers:create
- servers:edit
- servers:delete
- servers:clients:view
- servers:clients:manage
- hetzner:view
- hetzner:create
- hetzner:edit
- hetzner:delete
- hetzner:servers:view
- hetzner:servers:create
- hetzner:servers:delete
- audit-logs:view
- audit-logs:delete
- plugins:upload
- codriver:view
- codriver:edit
- api-keys:view
- api-keys:revoke

---

## Upgrading

Back up your database first (`mysqldump` or `pg_dump`), then pull the new images and recreate the containers:

```bash
docker compose pull
docker compose up -d
```

The `tmcontrolpanel` container applies database migrations on start. Check the [changelog](CHANGELOG.md) before upgrading across several versions. Coming from an older deployment? Starting a new stack is recommended, and migrating is at your own risk. If you do migrate from the `:beta` images or the single-container `dev` branch, follow [Upgrading from `:beta` to the release](docs/migrating-beta-to-release.md). To move a database to a new deployment with new `SECRETS_KEY` and `HETZNER_KEY` values, see [Moving a database to a new deployment](docs/migrating-database.md).

---

## Troubleshooting

If you encounter any issues, check the logs of a specific service by running:

```bash
docker compose logs <service-name>
```

For example, to view the logs of the **TMControlPanel** service:

```bash
docker compose logs tmcontrolpanel
```

Players can type `/version` in game to receive the control panel app version in a
private chat reply. This native command works without plugins, even when `/help`
is disabled. The version comes from the root `package.json` and is bundled into
the GBX service build. `/help version` describes the command when help is enabled.

Other native commands also reply privately and work without plugins:

| Command        | Information                                                         | Access        |
| -------------- | ------------------------------------------------------------------- | ------------- |
| `/uptime`      | Service uptime and duration of the current server connection        | Everyone      |
| `/status`      | Connection state, game mode, drivers and spectators                 | Everyone      |
| `/plugins`     | Installed versions and disabled/running/not-running state           | Everyone      |
| `/ping`        | Dedicated server XML-RPC round-trip time (not gameplay latency)     | Everyone      |
| `/sysinfo`     | Node version, platform, process memory, CPU count and host CPU load | Server admins |
| `/diagnostics` | Database, Redis and GBX connectivity checked separately             | Server admins |

Global panel admins, direct server Admins, and Admins of groups containing the
server can use the restricted commands. Probes and permission checks time out
after three seconds. Error details remain in service logs. `/help <command>`
describes each command when help is enabled. These native command names are
reserved and cannot be claimed by plugins.

Everything that talks to a dedicated server (connection errors, plugins, chat commands, match recording) is logged by the **GBX service**:

```bash
docker compose logs gbx-service
curl http://localhost:3100/health    # Includes workers in cluster mode; 503 when degraded
curl http://localhost:3100/healthz   # 200 when Redis is reachable and a worker heartbeat exists; otherwise 503
```

- **A container exits right after starting:** a missing or too short (< 32 characters) `GBX_SERVICE_TOKEN` or `WS_TICKET_SECRET`, or an invalid value, is listed in its log.
- **Live pages stay empty or the servers show as offline:** the browser can't reach `GBX_SERVICE_WS_URL`, or the panel's origin is missing from `WS_ALLOWED_ORIGINS` (the socket closes with code `4403`). Behind HTTPS the URL must start with `wss://`.
- **Everything is recorded or announced twice:** check for an older controller, a service using another Redis, or overlapping services with `GBX_WORKERS=0`. Cluster workers sharing Redis coordinate ownership through leases.

---

## Changelog

The release notes of every version are in [CHANGELOG.md](CHANGELOG.md).

---

## Plugins and the marketplace

Admins of a server can install plugins from the marketplace on the **Plugins** page, or upload their own (with the `plugins:upload` permission). Plugins run sandboxed in the GBX service, and a plugin that misbehaves is turned off and its admins are notified.

- `MARKETPLACE_INDEX_URL` on **both** containers selects the marketplace. The default is the official one; leave it empty to turn browsing off.
- [Plugin marketplace](docs/plugin-marketplace.md): how it works, running your own registry, withdrawing plugins, and the security model.
- [Plugin SDK](docs/plugin-sdk.md): writing, testing and publishing a plugin.
- [First-party plugins](docs/first-party-plugins.md): the first-party plugins published in the registry.

---

## Contributing

Contributions are welcome! If you have suggestions or improvements, please create a pull request or open an issue. Feel free to fork the repository and make changes as needed. See [CONTRIBUTING.md](CONTRIBUTING.md) for how to set up a local development environment.

---

## License

This project is licensed under the MIT License - see the [License](License) file for details.
