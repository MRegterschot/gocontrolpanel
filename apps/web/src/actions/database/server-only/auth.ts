import { getClient } from "@/lib/dbclient";
import { getList } from "@/lib/utils";
import { MinimalServer } from "@/types/auth";
import { Prisma, Users } from "@tmcontrolpanel/db";
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
      order: true,
      serversOrder: true,
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

const includeServersAndMembers = Prisma.validator<Prisma.GroupsInclude>()({
  groupMembers: {
    where: {
      user: {
        authenticated: true,
      },
    },
    select: {
      userId: true,
    },
  },
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
          filemanagerUrl: true,
        },
      },
    },
  },
});

export type GroupsWithServersAndMembers = Prisma.GroupsGetPayload<{
  include: typeof includeServersAndMembers;
}>;

export async function getUserById(
  userId: string,
): Promise<UsersWithGroupsWithServers> {
  const db = getClient();

  return await db.users.findUniqueOrThrow({
    where: {
      authenticated: true,
      deletedAt: null,
      id: userId,
    },
    include: includeGroupsWithServers,
  });
}

export async function getUserByLogin(
  login: string,
): Promise<UsersWithGroupsWithServers | null> {
  const db = getClient();

  return await db.users.findUnique({
    where: {
      login,
    },
    include: includeGroupsWithServers,
  });
}

export async function upsertUserAuth(
  user: Omit<Users, "id" | "createdAt" | "updatedAt" | "deletedAt">,
): Promise<UsersWithGroupsWithServers> {
  const db = getClient();

  return await db.users.upsert({
    where: {
      login: user.login,
      deletedAt: null,
    },
    update: {
      authenticated: true,
      nickName: user.nickName,
      ubiUid: user.ubiUid,
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
    servers: MinimalServer[];
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
    servers: group.groupServers.map((gs) => ({
      id: gs.server.id,
      name: gs.server.name,
      description: gs.server.description,
      hasFileManager: !!gs.server.filemanagerUrl,
    })),
  }));
}

export async function getAllGroupsWithServersAndMembers(): Promise<
  GroupsWithServersAndMembers[]
> {
  const db = getClient();

  return await db.groups.findMany({
    where: {
      deletedAt: null,
    },
    include: includeServersAndMembers,
  });
}
