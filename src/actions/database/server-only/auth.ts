import { getClient } from "@/lib/dbclient";
import { Prisma, Servers, Users } from "@/lib/prisma/generated";
import { getKeyUserInfo, getRedisClient } from "@/lib/redis";
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

type UserInfo = Pick<
  Users,
  "login" | "nickName" | "path" | "device" | "camera"
>;

export async function getUserInfoByLogin(
  login: string,
): Promise<UserInfo | null> {
  const redis = await getRedisClient();
  const db = getClient();

  const key = getKeyUserInfo(login);

  const cached = await redis.get(key);
  if (cached) {
    return JSON.parse(cached) as UserInfo;
  }

  const user = await db.users.findUnique({
    where: {
      login,
    },
    select: {
      login: true,
      nickName: true,
      path: true,
      device: true,
      camera: true,
    },
  });

  if (user) {
    await redis.set(key, JSON.stringify(user), "EX", 60 * 60 * 24); // Cache for 24 hours
  }

  return user;
}

export async function getUserInfosByLogin(
  logins: string[],
): Promise<{ [key: string]: UserInfo }> {
  const redis = await getRedisClient();
  const db = getClient();

  const userInfos: { [key: string]: UserInfo } = {};
  const loginsToFetch: string[] = [];

  // First try to get from cache
  for (const login of logins) {
    const key = getKeyUserInfo(login);
    const cached = await redis.get(key);
    if (cached) {
      userInfos[login] = JSON.parse(cached) as UserInfo;
    } else {
      loginsToFetch.push(login);
    }
  }

  // Fetch missing from database
  if (loginsToFetch.length > 0) {
    const users = await db.users.findMany({
      where: {
        login: {
          in: loginsToFetch,
        },
      },
      select: {
        login: true,
        nickName: true,
        path: true,
        device: true,
        camera: true,
      },
    });

    for (const user of users) {
      userInfos[user.login] = user;

      const key = getKeyUserInfo(user.login);
      await redis.set(key, JSON.stringify(user), "EX", 60 * 60 * 24); // Cache for 24 hours
    }
  }

  return userInfos;
}
