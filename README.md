![Docker Pulls](https://img.shields.io/docker/pulls/marijnregterschot/gocontrolpanel?logo=docker&link=https%3A%2F%2Fhub.docker.com%2Fr%2Fmarijnregterschot%2Fgocontrolpanel)
![Docker Image Size](https://img.shields.io/docker/image-size/marijnregterschot/gocontrolpanel?logo=docker&link=https%3A%2F%2Fhub.docker.com%2Fr%2Fmarijnregterschot%2Fgocontrolpanel)
![Docker Version](https://img.shields.io/docker/v/marijnregterschot/gocontrolpanel?logo=docker&link=https%3A%2F%2Fhub.docker.com%2Fr%2Fmarijnregterschot%2Fgocontrolpanel)
![Discord Widget](https://img.shields.io/discord/1397578984023261284?logo=discord&link=https%3A%2F%2Fdiscord.gg%2FNjbtRvbCY8)
![Github Commits](https://img.shields.io/github/commit-activity/t/mregterschot/gocontrolpanel?logo=github)

# GoControlPanel

A Dockerized management panel for dedicated Trackmania servers. Works both standalone and with existing stacks like [PyPlanet](#pyplanetevosc-stack-setup) or [EvoSC](#pyplanetevosc-stack-setup) and others.

## Table of Contents

- [Overview](#overview)
  - [Features](#features)
    - [Server Settings](#server-settings)
    - [Game Management](#game-management)
    - [Maps Management](#maps-management)
    - [Player Management](#player-management)
    - [Live Match](#live-match)
    - [Records and Matches](#records-and-matches)
    - [Plugin Management](#plugin-management)
    - [Plugin Marketplace](#plugin-marketplace)
    - [Trackmania Exchange](#trackmania-exchange)
    - [Files Management](#files-management)
    - [User Management](#user-management)
    - [Group Management](#group-management)
    - [Role Management](#role-management)
    - [Server Management](#server-management)
    - [Hetzner Management](#hetzner-management)
- [Architecture](#architecture)
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

**GoControlPanel** is a management panel designed for dedicated Trackmania servers. It provides an easy-to-use interface for managing server settings, players and maps. The panel can be run as a standalone service or integrated with other server controllers like **PyPlanet** or **EvoSC**.

## Features

#### Server Settings

Manage your general server settings like the server name, password, and other configurations.

![Settings Page](https://i.imgur.com/39jLVUl.png "Settings Page")

#### Game Management

Manage your game settings, this includes map management and mode settings.

![Game Page](https://i.imgur.com/Njkxu0n.png "Game Page")
![Mode Settings Page](https://i.imgur.com/wgIn7Cn.png "Mode Settings Page")

#### Maps Management

Manage your maps, including adding local maps, changing map order and a jukebox.

![Maps Page](https://i.imgur.com/5f1zr3E.png "Maps Page")
![Local Maps Page](https://i.imgur.com/9HLf64R.png "Local Maps Page")
![Map Jukebox Page](https://i.imgur.com/5jgNjiD.png "Map Jukebox Page")

#### Player Management

Manage your players, including banning players and managing blacklists and guestlists.

![Players Page](https://i.imgur.com/A6PDwWd.png "Players Page")
![Blacklist Page](https://i.imgur.com/9VEFLUB.png "Blacklist Page")

#### Live Match

Monitor live matches, including player scores and match status.

![Live Match Page](https://i.imgur.com/huDKrEA.png "Live Match Page")

#### Records and Matches

View past matches and records, including player scores and match details.

![Matches Page](https://i.imgur.com/ZoAdmhQ.png "Matches Page")
![Match Details Page](https://i.imgur.com/aiqEsGw.png "Match Details Page")

#### Plugin Management

Manage the server plugins and chat settings of the server.

![Plugins Page](https://i.imgur.com/5LAxOpO.png "Plugins Page")
![Chat Message Editor Page](https://i.imgur.com/NpvWT3K.png "Chat Message Editor Page")

#### Plugin Marketplace

Browse the plugin marketplace and install plugins on your servers, or upload your own privately. Plugins run in a sandbox with only the permissions you accept when you install them. Updates, rolling back to an older version and settings are all on the server's Plugins page. See [Plugins and the marketplace](#plugins-and-the-marketplace).

#### Trackmania Exchange

Browse and download maps or mappacks directly from Trackmania Exchange.

![Trackmania Exchange Maps Page](https://i.imgur.com/EVD3CX0.png "Trackmania Exchange Maps Page")
![Trackmania Exchange Mappacks Page](https://i.imgur.com/n4HLkGV.png "Trackmania Exchange Mappacks Page")

#### Files Management

Manage your server files, including uploading, deleting and editing files.

![Files Page](https://i.imgur.com/eGqC4Oc.png "Files Page")
![File Editor Page](https://i.imgur.com/Siday3M.png "File Editor Page")

#### User Management

Manage users by modifying roles and permissions.

![User Management Page](https://i.imgur.com/eoErrI2.png "User Management Page")
![User Details Page](https://i.imgur.com/1hG1tUJ.png "User Details Page")

#### Group Management

Manage groups, including adding new groups, managing group permissions and roles.

![Group Management Page](https://i.imgur.com/qxyYNV7.png "Group Management Page")
![Group Details Page](https://i.imgur.com/1WMpo4Y.png "Group Details Page")

#### Role Management

Manage roles, including adding new roles and managing role permissions.

![Role Management Page](https://i.imgur.com/NlqVj6P.png "Role Management Page")
![Role Details Page](https://i.imgur.com/SfCvMNc.png "Role Details Page")

#### Server Management

Manage your servers, add new servers and configure the server settings.

![Server Management Page](https://i.imgur.com/opiwnKL.png "Server Management Page")
![Add Server Page](https://i.imgur.com/6XDqmlk.png "Add Server Page")

#### Hetzner Management

Manage your Hetzner Cloud servers, networks and volumes. You can create and delete Trackmania servers directly from the panel.

![Hetzner Management Page](https://i.imgur.com/9Joq5dK.png "Hetzner Management Page")
![Hetzner Details Page](https://i.imgur.com/miUGWWj.png "Hetzner Details Page")

![Hetzner Servers Page](https://i.imgur.com/dWYLLyT.png "Hetzner Servers Page")
![Hetzner Server Details Page](https://i.imgur.com/N7jfF9f.png "Hetzner Server Details Page")
![Hetzner Server Metrics Page](https://i.imgur.com/PApEtYb.png "Hetzner Server Metrics Page")
![Hetzner Server Pricing Page](https://i.imgur.com/u8rflrh.png "Hetzner Server Pricing Page")

![Hetzner Database Create Page](https://i.imgur.com/xB8H67G.png "Hetzner Database Create Page")
![Hetzner Server Create Page](https://i.imgur.com/o5YPNqL.png "Hetzner Server Create Page")
![Hetzner Server Create Page Controller Step](https://i.imgur.com/LnS03St.png "Hetzner Server Create Page Controller Step")
![Hetzner Server Create Page Database Step](https://i.imgur.com/AH4Ixvp.png "Hetzner Server Create Page Database Step")
![Hetzner Server Create Page Network Step](https://i.imgur.com/f4mEhuJ.png "Hetzner Server Create Page Network Step")
![Hetzner Server Create Page Summary Step](https://i.imgur.com/oPUo7aC.png "Hetzner Server Create Page Summary Step")

# Architecture

GoControlPanel runs as two containers next to your database and Redis:

| Container | Image | What it does |
|---|---|---|
| `gocontrolpanel` | `marijnregterschot/gocontrolpanel` | The web panel: UI, sign in, database, Nadeo, Trackmania Exchange, Hetzner and file manager. Runs the database migrations on start. Port `3000`. |
| `gbx-service` | `marijnregterschot/gocontrolpanel-gbx-service` | Holds the connections to your dedicated servers, runs the in-game plugins and widgets, records matches and serves the live WebSockets to the browser. Port `3100`. |

Both images come in a MariaDB/MySQL and a PostgreSQL (`-postgres` suffix) flavour. The two containers share the database and Redis, and authenticate to each other with `GBX_SERVICE_TOKEN` and `WS_TICKET_SECRET`.

- **Browsers connect to port 3100** for the live pages, so `GBX_SERVICE_WS_URL` must be reachable from your users' browsers. Behind HTTPS it must be a `wss://` URL, see [Expose the GBX service](docs/migrating-from-dev.md#3-open-port-3100-to-browsers).
- **Run one `gbx-service` per set of servers.** Only one process may hold the connection to a dedicated server, a second one would record everything twice. `GBX_SERVICE_ENABLED_SERVERS` limits which servers an instance manages.
- **Keep `/internal/*` private.** Only the web container calls those routes. Don't publish them through a reverse proxy.

# Docker Setup

This repository provides a **Docker Compose** configuration to set up and run **GoControlPanel** and its dependencies using Docker containers.

## Prerequisites

Before using this `docker-compose.yml` file, ensure you have the following installed on your system:

- **Docker**: [Install Docker](https://www.docker.com/get-started)
- **Docker Compose**: [Install Docker Compose](https://docs.docker.com/compose/install/)

You will also need some credentials for the **Nadeo API** to configure the **GoControlPanel**. You can obtain these credentials from the [Nadeo API manager](https://api.trackmania.com/manager). Additionally, you will need a dedicated server login and password, which can be found in the [dedicated server manager](https://www.trackmania.com/player/dedicated-servers).

## Getting Started

This guide will help you set up and run the services for both completely new stacks and with existing stacks like [PyPlanet](#pyplanetevosc-stack-setup) or [EvoSC](#pyplanetevosc-stack-setup). There are also some boilerplate `docker-compose.yml` files available in the [docker](./docker/) folder for a variety of server controllers. Just copy the compose file of your choice, plugin your own configurations and run the `docker compose up -d` command to start the services.

## New Stack Setup

This section will guide you through setting up a new stack using the provided `docker-compose.yml` file.

### 1. Copy the `docker-compose.yml` File

First, copy the `docker-compose.yml` file from the repository to your desired directory. You can move it to any directory you want, the name of the directory will be the name of the stack.

### 2. Modify the Configuration

Make sure to update or add the environment variables for the services in your `docker-compose.yml` file:

- **GoControlPanel Environment Variables**:
  - `NEXTAUTH_URL`, `NEXTAUTH_SECRET`: NextAuth configuration for authentication. `NEXTAUTH_SECRET` can be any random string, e.g., `VettePanel123`.
  - `DEFAULT_ADMINS`: Comma-separated list of default admin logins. Probably your own login, e.g., `v8vgGbx_TuKkBabAyn7nsQ`.
  - `DEFAULT_PERMISSIONS`: Comma-separated list of default permissions for new users. You can find a list of available permissions in the [Permissions](#permissions) section.
  - **NADEO Configuration**: Make sure to update `NADEO_CLIENT_ID`, `NADEO_CLIENT_SECRET`, `NADEO_REDIRECT_URI`, `NADEO_SERVER_LOGIN`, `NADEO_SERVER_PASSWORD` and `NADEO_CONTACT` with your valid NADEO API credentials. Nadeo API credentials can be obtained from the [Nadeo API manager](https://api.trackmania.com/manager). The server login and password can be obtained from the [Dedicated Server Manager](https://www.trackmania.com/player/dedicated-servers).
  - `HETZNER_KEY`: If you are using the Hetzner Cloud API, set this environment variable so that your API tokens are encrypted before being stored in the database. This can be any random string, e.g., `myhetznerkey`.
  - **GBX service connection**: `GBX_SERVICE_URL` is the address of the `gbx-service` container (`http://gbx-service:3100`). `GBX_SERVICE_WS_URL` is the address the browser uses to open the live WebSockets, so it must be reachable from your users (for example `ws://<your-host>:3100`, or `wss://...` behind HTTPS). `GBX_SERVICE_TOKEN` and `WS_TICKET_SECRET` are secrets of at least 32 characters (`openssl rand -base64 32`) and must be identical in both containers. The panel refuses to start without them.
  - `MARKETPLACE_INDEX_URL` (optional): The plugin marketplace the panel browses. Defaults to the official marketplace; set it to an empty value to turn browsing off. Uploading private plugins works either way.
  - `LOG_LEVEL`: Set the log level for GoControlPanel. Supported values are `trace`, `debug`, `info`, `warn`, `error` and `fatal`. The default is `info`.
  - `PLAUSIBLE_API_HOST`: Set the Plausible API host for analytics, e.g., `analytics.mywebsite.com`. This is optional and can be left empty if you do not want to use Plausible analytics.
  - **Sentry Configuration (Optional)**: GoControlPanel can send errors, performance traces, session replays and logs to Sentry. No Sentry configuration is required unless you want to enable telemetry.
    - `NEXT_PUBLIC_SENTRY_ENABLED`: Set to `true` to enable Sentry.
    - `NEXT_PUBLIC_SENTRY_DSN`: The Sentry DSN. Required when Sentry is enabled.
    - `SENTRY_SERVER_DSN` (optional): Server-side DSN. Defaults to `NEXT_PUBLIC_SENTRY_DSN`.
    - `SENTRY_ENVIRONMENT` (optional): Environment reported to Sentry. Defaults to `NODE_ENV` (production).
    - `SENTRY_TRACES_SAMPLE_RATE` (optional): Performance trace sampling rate (`0`-`1`). Defaults to `1`.
    - `SENTRY_PROFILES_SAMPLE_RATE` (optional): Profiling sampling rate (`0`-`1`). Defaults to `1`.
    - `SENTRY_REPLAYS_SESSION_SAMPLE_RATE` (optional): Session Replay sampling rate (`0`-`1`). Defaults to `1`.
    - `SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE` (optional): Session Replay sampling rate when an error occurs (`0`-`1`). Defaults to `1`.
    - `SENTRY_SEND_DEFAULT_PII` (optional): Whether to send personally identifiable information. Defaults to `false`.
    - `SENTRY_ATTACH_STACKTRACE` (optional): Whether to attach stack traces to supported log messages. Defaults to `true`.
    - `SENTRY_ENABLE_LOGS` (optional): Whether to send application logs to Sentry. Defaults to `true`.
    - `NEXT_PUBLIC_SENTRY_TUNNEL_ROUTE` (optional): Optional tunnel route for browser events.
    - `SENTRY_TUNNEL_ROUTE` (optional): Optional tunnel route for server-side events.
    - `SENTRY_MAX_BREADCRUMBS` (optional): Maximum number of breadcrumbs attached to each event. Defaults to `100`.
    - `SENTRY_NORMALIZE_DEPTH` (optional): Maximum object serialization depth. Defaults to `3`.
    - `SENTRY_IGNORE_ERRORS` (optional): Comma-separated list of error messages that should not be reported.

- **GBX Service Environment Variables** (`gbx-service` container):
  - `DATABASE_URL`, `REDIS_URI`: The same values as the `gocontrolpanel` container.
  - `GBX_SERVICE_TOKEN`, `WS_TICKET_SECRET`: The same values as the `gocontrolpanel` container.
  - `WS_ALLOWED_ORIGINS`: The origin(s) of the panel, comma separated, e.g., `https://panel.example.com`. A browser socket from another origin is refused.
  - `NADEO_SERVER_LOGIN`, `NADEO_SERVER_PASSWORD`, `NADEO_CONTACT`, `NADEO_CLIENT_ID`, `NADEO_CLIENT_SECRET`: The same values as the `gocontrolpanel` container.
  - `GBX_SERVICE_ENABLED_SERVERS` (optional): Comma-separated server ids this instance manages. Empty manages every server in the database.
  - `LOG_LEVEL`, `SENTRY_DSN`, `SENTRY_ENVIRONMENT` (optional): Logging and error reporting of the service.
  - `MARKETPLACE_INDEX_URL`, `MARKETPLACE_CHECK_MINUTES` (optional): The plugin marketplace the service checks for withdrawn plugin versions, and how often (default every 30 minutes). Empty URL turns the check off.

- **Dedicated Server Environment Variables**:
  - `TM_MASTERSERVER_LOGIN`: Login for the dedicated server (same as `NADEO_SERVER_LOGIN` in GoControlPanel).
  - `TM_MASTERSERVER_PASSWORD`: Password for the dedicated server (same as `NADEO_SERVER_PASSWORD` in GoControlPanel).

### 3. Start the Services

Run the following command to start all services defined in the `docker-compose.yml` file:

```bash
docker compose up -d
```

### 4. Access the GoControlPanel

That's it! You can now access your **GoControlPanel** at `http://localhost:3000` or your own configured url.

---

## PyPlanet/EvoSC Stack Setup

This section will guide you through setting up the **GoControlPanel** with an existing **PyPlanet** or **EvoSC** stack.

### 1. Navigate to Your Existing Stack Directory

First you need to navigate to your existing stack directory. Navigate to the directory where your `docker-compose.yml` file is located.

### 2. Modify the `docker-compose.yml` File

Paste the following configuration into your existing `docker-compose.yml` file.

```yaml
gocontrolpanel:
  image: marijnregterschot/gocontrolpanel:beta # Use marijnregterschot/gocontrolpanel-postgres:beta if you are using PostgreSQL
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
    NADEO_CONTACT: GoControlPanel / <your contact info>
    REDIS_URI: redis://redis:6379
    DATABASE_URL: mysql://gocontrolpanel:VettePanel123@db:3306/gocontrolpanel
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
  image: marijnregterschot/gocontrolpanel-gbx-service:beta # Use marijnregterschot/gocontrolpanel-gbx-service-postgres:beta if you are using PostgreSQL
  ports:
    - 3100:3100 # WebSockets for the browser; /internal routes require GBX_SERVICE_TOKEN
  restart: unless-stopped
  environment:
    DATABASE_URL: mysql://gocontrolpanel:VettePanel123@db:3306/gocontrolpanel
    REDIS_URI: redis://redis:6379
    GBX_SERVICE_TOKEN: # Same value as the web app, at least 32 characters
    WS_TICKET_SECRET: # Same value as the web app, at least 32 characters
    WS_ALLOWED_ORIGINS: http://localhost:3000
    NADEO_SERVER_LOGIN:
    NADEO_SERVER_PASSWORD:
    NADEO_CONTACT: GoControlPanel / <your contact info>
    NADEO_CLIENT_ID:
    NADEO_CLIENT_SECRET:
    LOG_LEVEL: info
  depends_on:
    - db
    - redis
    - gocontrolpanel # Runs the database migrations

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

Create a new database for GoControlPanel in your existing database service. For the default PyPlanet and EvoSC stacks, this is usually a MariaDB database.
The container name is likely something like `<current-folder>-db-1`.

1. Log into the database container.

```bash
docker exec -it <container-name> mariadb -u root -p
```

> **Note:** The password `secret` is the default, but it may differ depending on your `docker-compose.yml` setup.

2. Create a new database:

```sql
CREATE DATABASE gocontrolpanel;
```

3. Create a new user and grant permissions:

```sql
CREATE USER 'gocontrolpanel'@'%' IDENTIFIED BY 'VettePanel123';
GRANT ALL PRIVILEGES ON gocontrolpanel.* TO 'gocontrolpanel'@'%';
FLUSH PRIVILEGES;
```

### 4. Modify the environment variables

Make sure to update or add the environment variables for the added services in your `docker-compose.yml` file:

- **GoControlPanel Environment Variables**:
  - `NEXTAUTH_URL`, `NEXTAUTH_SECRET`: NextAuth configuration for authentication. `NEXTAUTH_SECRET` can be any random string, e.g., `VettePanel123`.
  - `DEFAULT_ADMINS`: Comma-separated list of default admin logins.
  - `DEFAULT_PERMISSIONS`: Comma-separated list of default permissions for new users. You can find a list of available permissions in the [Permissions](#permissions) section.
  - **NADEO Configuration**: Make sure to update `NADEO_CLIENT_ID`, `NADEO_CLIENT_SECRET`, `NADEO_REDIRECT_URI`, `NADEO_SERVER_LOGIN`, `NADEO_SERVER_PASSWORD` and `NADEO_CONTACT` with your valid NADEO API credentials. Nadeo API credentials can be obtained from the [Nadeo API manager](https://api.trackmania.com/manager). The server login and password can be found in your existing stack configuration under the `dedicated` or `trackmania` service.
  - `HETZNER_KEY`: If you are using the Hetzner Cloud API, set this environment variable so that your API tokens are encrypted before being stored in the database. This can be any random string, e.g., `myhetznerkey`.
  - **GBX service connection**: `GBX_SERVICE_URL` is the address of the `gbx-service` container (`http://gbx-service:3100`). `GBX_SERVICE_WS_URL` is the address the browser uses to open the live WebSockets, so it must be reachable from your users (for example `ws://<your-host>:3100`, or `wss://...` behind HTTPS). `GBX_SERVICE_TOKEN` and `WS_TICKET_SECRET` are secrets of at least 32 characters (`openssl rand -base64 32`) and must be identical in both containers. The panel refuses to start without them.
  - `MARKETPLACE_INDEX_URL` (optional): The plugin marketplace the panel browses. Defaults to the official marketplace; set it to an empty value to turn browsing off. Uploading private plugins works either way.
  - `LOG_LEVEL`: Set the log level for GoControlPanel. Supported values are `trace`, `debug`, `info`, `warn`, `error` and `fatal`. The default is `info`.
  - `PLAUSIBLE_API_HOST`: Set the Plausible API host for analytics, e.g., `analytics.mywebsite.com`. This is optional and can be left empty if you do not want to use Plausible analytics.
  - **Sentry Configuration (Optional)**: GoControlPanel can send errors, performance traces, session replays and logs to Sentry. No Sentry configuration is required unless you want to enable telemetry.
    - `NEXT_PUBLIC_SENTRY_ENABLED`: Set to `true` to enable Sentry.
    - `NEXT_PUBLIC_SENTRY_DSN`: The Sentry DSN. Required when Sentry is enabled.
    - `SENTRY_SERVER_DSN` (optional): Server-side DSN. Defaults to `NEXT_PUBLIC_SENTRY_DSN`.
    - `SENTRY_ENVIRONMENT` (optional): Environment reported to Sentry. Defaults to `NODE_ENV` (production).
    - `SENTRY_TRACES_SAMPLE_RATE` (optional): Performance trace sampling rate (`0`-`1`). Defaults to `1`.
    - `SENTRY_PROFILES_SAMPLE_RATE` (optional): Profiling sampling rate (`0`-`1`). Defaults to `1`.
    - `SENTRY_REPLAYS_SESSION_SAMPLE_RATE` (optional): Session Replay sampling rate (`0`-`1`). Defaults to `1`.
    - `SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE` (optional): Session Replay sampling rate when an error occurs (`0`-`1`). Defaults to `1`.
    - `SENTRY_SEND_DEFAULT_PII` (optional): Whether to send personally identifiable information. Defaults to `false`.
    - `SENTRY_ATTACH_STACKTRACE` (optional): Whether to attach stack traces to supported log messages. Defaults to `true`.
    - `SENTRY_ENABLE_LOGS` (optional): Whether to send application logs to Sentry. Defaults to `true`.
    - `NEXT_PUBLIC_SENTRY_TUNNEL_ROUTE` (optional): Optional tunnel route for browser events.
    - `SENTRY_TUNNEL_ROUTE` (optional): Optional tunnel route for server-side events.
    - `SENTRY_MAX_BREADCRUMBS` (optional): Maximum number of breadcrumbs attached to each event. Defaults to `100`.
    - `SENTRY_NORMALIZE_DEPTH` (optional): Maximum object serialization depth. Defaults to `3`.
    - `SENTRY_IGNORE_ERRORS` (optional): Comma-separated list of error messages that should not be reported.

- **GBX Service Environment Variables** (`gbx-service`): use the same `DATABASE_URL`, `REDIS_URI`, `GBX_SERVICE_TOKEN`, `WS_TICKET_SECRET` and Nadeo values as the `gocontrolpanel` service, and set `WS_ALLOWED_ORIGINS` to the origin of the panel. See [Architecture](#architecture) for what each variable does.

> **Note:** Make sure you are using the correct service name for the dedicated server. For **PyPlanet**, the service name is usually `dedicated`, and for **EvoSC**, it is `trackmania`.

### 5. Start the Services

Run the following command to start the services.

```bash
docker compose up -d
```

### 6. Access the GoControlPanel

That's it! You can now access your **GoControlPanel** at `http://localhost:3000` or your own configured url.

---

## Permissions

The **GoControlPanel** supports a permission system that allows you to manage user access to various features. You can set default permissions for new users using the `DEFAULT_PERMISSIONS` environment variable in your `docker-compose.yml` file. Here is a list of available permissions:

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

---

## Upgrading

Back up your database first (`mysqldump` or `pg_dump`), then pull the new images and recreate the containers:

```bash
docker compose pull
docker compose up -d
```

The `gocontrolpanel` container applies database migrations on start. Check the [changelog](CHANGELOG.md) before upgrading across several versions. If you are coming from the single-container setup of the `dev` branch, follow the [migration guide](docs/migrating-from-dev.md).

---

## Troubleshooting

If you encounter any issues, check the logs of a specific service by running:

```bash
docker compose logs <service-name>
```

For example, to view the logs of the **GoControlPanel** service:

```bash
docker compose logs gocontrolpanel
```

Players can type `/version` in game to receive the control panel app version in a
private chat reply. This native command works without plugins, even when `/help`
is disabled. The version comes from the root `package.json` and is bundled into
the GBX service build. `/help version` describes the command when help is enabled.

Other native commands also reply privately and work without plugins:

| Command | Information | Access |
| --- | --- | --- |
| `/uptime` | Service uptime and duration of the current server connection | Everyone |
| `/status` | Connection state, game mode, drivers and spectators | Everyone |
| `/plugins` | Installed versions and disabled/running/not-running state | Everyone |
| `/ping` | Dedicated server XML-RPC round-trip time (not gameplay latency) | Everyone |
| `/sysinfo` | Node version, platform, process memory, CPU count and host CPU load | Server admins |
| `/diagnostics` | Database, Redis and GBX connectivity checked separately | Server admins |

Global panel admins, direct server Admins, and Admins of groups containing the
server can use the restricted commands. Probes and permission checks time out
after three seconds. Error details remain in service logs. `/help <command>`
describes each command when help is enabled. These native command names are
reserved and cannot be claimed by plugins.

Everything that talks to a dedicated server (connection errors, plugins, chat commands, match recording) is logged by the **GBX service**:

```bash
docker compose logs gbx-service
curl http://localhost:3100/health    # {"status":"ok","servers":N,"connected":N}
```

- **A container exits right after starting:** a missing or too short (< 32 characters) `GBX_SERVICE_TOKEN` or `WS_TICKET_SECRET`, or an invalid value, is listed in its log.
- **Live pages stay empty or the servers show as offline:** the browser can't reach `GBX_SERVICE_WS_URL`, or the panel's origin is missing from `WS_ALLOWED_ORIGINS` (the socket closes with code `4403`). Behind HTTPS the URL must start with `wss://`.
- **Everything is recorded or announced twice:** two controllers hold a connection to the same dedicated server, for example two `gbx-service` containers on one database. Run one, or split the servers with `GBX_SERVICE_ENABLED_SERVERS`.

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
