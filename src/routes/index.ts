import { TBreadcrumb } from "@/components/shell/breadcrumbs";

export const routes = {
  dashboard: "/",
  servers: {
    settings: "/server/:id/settings",
    game: "/server/:id/game",
    maps: "/server/:id/maps",
    players: "/server/:id/players",
    live: "/server/:id/live",
    files: "/server/:id/files",
    editor: "/server/:id/files/editor",
    interface: "/server/:id/interface",
    tmx: "/server/:id/tmx",
    nadeo: "/server/:id/nadeo",
    records: "/server/:id/records",
  },
  tournaments: {
    tournament: "/tournaments/:id",
    registration: "/tournaments/:id/registration",
  },
  admin: {
    users: "/admin/users",
    servers: "/admin/servers",
    groups: "/admin/groups",
    roles: "/admin/roles",
    hetzner: "/admin/hetzner",
    hetznerServers: "/admin/hetzner/:id",
    auditLogs: "/admin/audit-logs",
  },
  login: "/login",
};

export const routePermissions = {
  servers: {
    settings: ["servers:id:admin", "group:servers:id:admin"],
    game: {
      mapActions: [
        "servers:id:moderator",
        "servers:id:admin",
        "group:servers:id:moderator",
        "group:servers:id:admin",
      ],
      gameSettings: [
        "servers:id:moderator",
        "servers:id:admin",
        "group:servers:id:moderator",
        "group:servers:id:admin",
      ],
      scriptSettings: [
        "servers:id:moderator",
        "servers:id:admin",
        "group:servers:id:moderator",
        "group:servers:id:admin",
      ],
    },
    maps: [
      "servers:id:moderator",
      "servers:id:admin",
      "group:servers:id:moderator",
      "group:servers:id:admin",
    ],
    players: [
      "servers:id:moderator",
      "servers:id:admin",
      "group:servers:id:moderator",
      "group:servers:id:admin",
    ],
    live: {
      actions: [
        "servers:id:moderator",
        "servers:id:admin",
        "group:servers:id:moderator",
        "group:servers:id:admin",
      ],
    },
    files: ["servers:id:admin", "group:servers:id:admin"],
    interface: ["servers:id:admin", "group:servers:id:admin"],
    tmx: [
      "servers:id:moderator",
      "servers:id:admin",
      "group:servers:id:moderator",
      "group:servers:id:admin",
    ],
    nadeo: [
      "servers:id:moderator",
      "servers:id:admin",
      "group:servers:id:moderator",
      "group:servers:id:admin",
    ],
    records: {
      actions: [
        "servers:id:moderator",
        "servers:id:admin",
        "group:servers:id:moderator",
        "group:servers:id:admin",
      ],
    },
  },
  admin: {
    users: {
      view: ["users:view"],
      edit: ["users:edit"],
      delete: ["users:delete"],
    },
    groups: {
      view: [
        "groups:view",
        "groups:create",
        "groups::moderator",
        "groups::admin",
      ],
      create: ["groups:create"],
      edit: ["groups:edit", "groups:id:admin"],
      delete: ["groups:delete", "groups:id:admin"],
    },
    servers: {
      view: [
        "servers:view",
        "servers:create",
        "servers::moderator",
        "servers::admin",
      ],
      create: ["servers:create"],
      edit: ["servers:edit", "servers:id:admin"],
      delete: ["servers:delete", "servers:id:admin"],
    },
    roles: {
      view: ["roles:view"],
      create: ["roles:create"],
      edit: ["roles:edit"],
      delete: ["roles:delete"],
    },
    hetzner: {
      view: [
        "hetzner:view",
        "hetzner:create",
        "hetzner::moderator",
        "hetzner::admin",
      ],
      create: ["hetzner:create"],
      edit: ["hetzner:edit", "hetzner:id:admin"],
      delete: ["hetzner:delete", "hetzner:id:admin"],
      servers: {
        view: [
          "hetzner:servers:view",
          "hetzner:id:moderator",
          "hetzner:id:admin",
        ],
        create: ["hetzner:servers:create", "hetzner:id:admin"],
        delete: ["hetzner:servers:delete", "hetzner:id:admin"],
      },
    },
    auditLogs: {
      view: [
        "audit-logs:view",
        "servers::admin",
        "groups::admin",
        "group:servers::admin",
        "hetzner::admin",
      ],
      delete: [
        "audit-logs:delete",
        "servers:id:admin",
        "groups:id:admin",
        "group:servers:id:admin",
        "hetzner:id:admin",
      ],
    },
  },
};

export const breadCrumbs: {
  path: string;
  breadCrumbs: TBreadcrumb[];
}[] = [
  {
    path: routes.dashboard,
    breadCrumbs: [
      {
        label: "Dashboard",
      },
    ],
  },
  {
    path: routes.servers.settings,
    breadCrumbs: [
      {
        label: "Server",
      },
      {
        label: "Settings",
      },
    ],
  },
  {
    path: routes.servers.game,
    breadCrumbs: [
      {
        label: "Server",
      },
      {
        label: "Game",
      },
    ],
  },
  {
    path: routes.servers.maps,
    breadCrumbs: [
      {
        label: "Server",
      },
      {
        label: "Maps",
      },
    ],
  },
  {
    path: routes.servers.players,
    breadCrumbs: [
      {
        label: "Server",
      },
      {
        label: "Players",
      },
    ],
  },
  {
    path: routes.servers.live,
    breadCrumbs: [
      {
        label: "Server",
      },
      {
        label: "Live",
      },
    ],
  },
  {
    path: routes.servers.files,
    breadCrumbs: [
      {
        label: "Server",
      },
      {
        label: "Files",
      },
    ],
  },
  {
    path: routes.servers.editor,
    breadCrumbs: [
      {
        label: "Server",
      },
      {
        label: "Files",
      },
      {
        label: "Editor",
      },
    ],
  },
  {
    path: routes.servers.interface,
    breadCrumbs: [
      {
        label: "Server",
      },
      {
        label: "Interface",
      },
    ],
  },
  {
    path: routes.servers.tmx,
    breadCrumbs: [
      {
        label: "Server",
      },
      {
        label: "TMX",
      },
    ],
  },
  {
    path: routes.servers.nadeo,
    breadCrumbs: [
      {
        label: "Server",
      },
      {
        label: "Nadeo",
      },
    ],
  },
  {
    path: routes.servers.records,
    breadCrumbs: [
      {
        label: "Server",
      },
      {
        label: "Records",
      },
    ],
  },
  {
    path: routes.tournaments.tournament,
    breadCrumbs: [
      {
        label: "Tournaments",
      },
      {
        label: "Tournament Info",
      },
    ],
  },
  {
    path: routes.tournaments.registration,
    breadCrumbs: [
      {
        label: "Tournaments",
      },
      {
        label: "Registration",
      },
    ],
  },
  {
    path: routes.admin.users,
    breadCrumbs: [
      {
        label: "Admin",
      },
      {
        label: "Users",
      },
    ],
  },
  {
    path: routes.admin.groups,
    breadCrumbs: [
      {
        label: "Admin",
      },
      {
        label: "Groups",
      },
    ],
  },
  {
    path: routes.admin.roles,
    breadCrumbs: [
      {
        label: "Admin",
      },
      {
        label: "Roles",
      },
    ],
  },
  {
    path: routes.admin.servers,
    breadCrumbs: [
      {
        label: "Admin",
      },
      {
        label: "Servers",
      },
    ],
  },
  {
    path: routes.admin.hetzner,
    breadCrumbs: [
      {
        label: "Admin",
      },
      {
        label: "Hetzner",
      },
    ],
  },
  {
    path: routes.admin.hetznerServers,
    breadCrumbs: [
      {
        label: "Admin",
      },
      {
        label: "Hetzner",
        path: routes.admin.hetzner,
      },
      {
        label: "Project",
      },
    ],
  },
  {
    path: routes.admin.auditLogs,
    breadCrumbs: [
      {
        label: "Admin",
      },
      {
        label: "Audit Logs",
      },
    ],
  },
];
