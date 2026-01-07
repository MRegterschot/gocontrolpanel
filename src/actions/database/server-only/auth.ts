import { getClient } from "@/lib/dbclient";
import { Prisma, Servers, Users } from "@/lib/prisma/generated";
import { getList } from "@/lib/utils";
import "server-only";

const includeGroupsWithServers = Prisma.validator<Prisma.UsersInclude>()({
  groupMembers: {
    where: {
      group: {
        deletedAt: null,
      },
    },
    select: {
      role: true,
      group: {
        select: {
          id: true,
          name: true,
          groupServers: {
            where: {
              server: {
                deletedAt: null,
              },
            },
            select: {
              server: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                  host: true,
                  port: true,
                  filemanagerUrl: true,
                },
              },
            },
          },
        },
      },
    },
  },
  hetznerProjectUsers: {
    where: {
      project: {
        deletedAt: null,
      },
    },
    select: {
      role: true,
      project: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  },
  userServers: {
    where: {
      server: {
        deletedAt: null,
      },
    },
    select: {
      role: true,
      server: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  },
});

export type UsersWithGroupsWithServers = Prisma.UsersGetPayload<{
  include: typeof includeGroupsWithServers;
}>;

export async function getUserById(
  userId: string,
): Promise<UsersWithGroupsWithServers> {
  const db = getClient();
  const user = await db.users.findUniqueOrThrow({
    where: {
      authenticated: true,
      id: userId,
    },
    include: includeGroupsWithServers,
  });

  return user;
}

export async function getUserByLogin(
  login: string,
): Promise<UsersWithGroupsWithServers> {
  const db = getClient();
  const user = await db.users.findUniqueOrThrow({
    where: {
      authenticated: true,
      login,
    },
    include: includeGroupsWithServers,
  });

  return user;
}

export async function upsertUserAuth(
  user: Omit<Users, "id" | "createdAt" | "updatedAt" | "deletedAt">,
): Promise<UsersWithGroupsWithServers> {
  const db = getClient();

  return await db.users.upsert({
    where: {
      login: user.login,
    },
    update: {
      ...user,
      permissions: getList<string>(user.permissions),
    },
    create: {
      ...user,
      permissions: getList<string>(user.permissions),
    },
    include: includeGroupsWithServers,
  });
}

export async function getPublicGroupsWithServers(): Promise<
  {
    id: string;
    name: string;
    servers: Omit<
      Servers,
      | "user"
      | "password"
      | "manualRouting"
      | "messageFormat"
      | "connectMessage"
      | "disconnectMessage"
      | "filemanagerPassword"
      | "createdAt"
      | "updatedAt"
      | "deletedAt"
    >[];
  }[]
> {
  const db = getClient();
  const groups = await db.groups.findMany({
    where: {
      deletedAt: null,
      public: true,
      groupServers: {
        some: {
          server: {
            deletedAt: null,
          },
        },
      },
    },
    select: {
      id: true,
      name: true,
      groupServers: {
        where: {
          server: {
            deletedAt: null,
          },
        },
        select: {
          server: {
            select: {
              id: true,
              name: true,
              description: true,
              host: true,
              port: true,
              filemanagerUrl: true,
            },
          },
        },
      },
    },
  });

  return groups.map((group) => ({
    id: group.id,
    name: group.name,
    servers: group.groupServers.map((gs) => gs.server),
  }));
}
