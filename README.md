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
    - [Interface Editor](#interface-editor)
    - [Trackmania Exchange](#trackmania-exchange)
    - [Files Management](#files-management)
    - [User Management](#user-management)
    - [Group Management](#group-management)
    - [Role Management](#role-management)
    - [Server Management](#server-management)
    - [Hetzner Management](#hetzner-management)
- [Docker Setup](#docker-setup)
  - [Prerequisites](#prerequisites)
  - [Getting Started](#getting-started)
    - [New Stack Setup](#new-stack-setup)
    - [PyPlanet/EvoSC Stack Setup](#pyplanetevosc-stack-setup)
  - [Permissions](#permissions)
  - [Troubleshooting](#troubleshooting)
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

#### Interface Editor

Edit the interface of your server, manager server plugins and chat message formatting.

![Plugins Page](https://i.imgur.com/5LAxOpO.png "Plugins Page")
![Chat Message Editor Page](https://i.imgur.com/NpvWT3K.png "Chat Message Editor Page")

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

Make sure to update the environment variables for the services in your `docker-compose.yml` file:

- **GoControlPanel Environment Variables**:

  - `NEXTAUTH_URL`, `NEXTAUTH_SECRET`: NextAuth configuration for authentication. `NEXTAUTH_SECRET` can be any random string, e.g., `VettePanel123`.
  - `DEFAULT_ADMINS`: Comma-separated list of default admin logins. Probably your own login, e.g., `v8vgGbx_TuKkBabAyn7nsQ`.
  - `DEFAULT_PERMISSIONS`: Comma-separated list of default permissions for new users. You can find a list of available permissions in the [Permissions](#permissions) section.
  - **NADEO Configurations**: Make sure to update `NADEO_CLIENT_ID`, `NADEO_CLIENT_SECRET`, `NADEO_REDIRECT_URI`, `NADEO_SERVER_LOGIN`, `NADEO_SERVER_PASSWORD` and `NADEO_CONTACT` with your valid NADEO API credentials. Nadeo API credentials can be obtained from the [Nadeo API manager](https://api.trackmania.com/manager). And the server login and password can be obtained from the [dedicated server manager](https://www.trackmania.com/player/dedicated-servers).
  - `HETZNER_KEY`: If you are using the Hetzner Cloud API, make sure to set the this environment variable so that your API Tokens will be encrypted and stored securely in the database. This variable can be any random string, e.g., `myhetznerkey`.

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
  depends_on:
    - db
    - redis

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

Make sure to update the environment variables for the added services in your `docker-compose.yml` file:

- **GoControlPanel Environment Variables**:

  - `NEXTAUTH_URL`, `NEXTAUTH_SECRET`: NextAuth configuration for authentication. `NEXTAUTH_SECRET` can be any random string, e.g., `VettePanel123`.
  - `DEFAULT_ADMINS`: Comma-separated list of default admin logins.
  - `DEFAULT_PERMISSIONS`: Comma-separated list of default permissions for new users. You can find a list of available permissions in the [Permissions](#permissions) section.
  - **NADEO Configurations**: Make sure to update `NADEO_CLIENT_ID`, `NADEO_CLIENT_SECRET`, `NADEO_REDIRECT_URI`, `NADEO_SERVER_LOGIN`, `NADEO_SERVER_PASSWORD` and `NADEO_CONTACT` with your valid NADEO API credentials. Nadeo API credentials can be obtained from the [Nadeo API manager](https://api.trackmania.com/manager). And the server login and password can be found in your existing stack configuration under the `dedicated` or `trackmania` service.
  - `HETZNER_KEY`: If you are using the Hetzner Cloud API, make sure to set the this environment variable so that your API Tokens will be encrypted and stored securely in the database. This variable can be any random string, e.g., `myhetznerkey`.

> **Note:** Make sure you are using the correct service name for the dedicated server. For **PyPlanet**, the service name is usually `dedicated`, and for **EvoSC**, it is `trackmania`.

### 6. Start the Services

Run the following command to start the services.

```bash
docker compose up -d
```

### 7. Access the GoControlPanel

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
- hetzner:view
- hetzner:create
- hetzner:edit
- hetzner:delete
- hetzner:servers:view
- hetzner:servers:create
- hetzner:servers:delete
- audit-logs:view
- audit-logs:delete

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

---

## Contributing

Contributions are welcome! If you have suggestions or improvements, please create a pull request or open an issue. Feel free to fork the repository and make changes as needed.

---

## License

This project is licensed under the MIT License - see the [License](License) file for details.
