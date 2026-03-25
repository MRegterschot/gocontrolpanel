import {
  getPublicGroupsWithServers,
  getUserById,
  getUserByLogin,
  upsertUserAuth,
  UsersWithGroupsWithServers,
} from "@/actions/database/server-only/auth";
import { parse } from "cookie";
import {
  GetServerSidePropsContext,
  NextApiRequest,
  NextApiResponse,
} from "next";
import { getServerSession, NextAuthOptions, Profile, Session } from "next-auth";
import { getToken } from "next-auth/jwt";
import { OAuthConfig } from "next-auth/providers/oauth";
import { IncomingMessage } from "node:http";
import slugid from "slugid";
import { getWebIdentities } from "./api/nadeo";
import config from "./config";
import { logger } from "./logger";
import { GroupRole } from "./prisma/generated";
import { getList, hasPermissionSync } from "./utils";

const NadeoProvider = (): OAuthConfig<Profile> => ({
  id: "nadeo",
  name: "Nadeo",
  type: "oauth",
  authorization: {
    url: "https://api.trackmania.com/oauth/authorize",
    params: {
      response_type: "code",
      client_id: config.NADEO.CLIENT_ID,
      redirect_uri: config.NADEO.REDIRECT_URI,
      scope: "",
    },
  },
  token: {
    url: "https://api.trackmania.com/api/access_token",
    async request({ params }) {
      const response = await fetch(
        "https://api.trackmania.com/api/access_token",
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            grant_type: "authorization_code",
            client_id: process.env.NADEO_CLIENT_ID!,
            client_secret: process.env.NADEO_CLIENT_SECRET!,
            code: params.code || "",
            redirect_uri: process.env.NADEO_REDIRECT_URI!,
          }),
        },
      );

      if (!response.ok) {
        throw new Error("Failed to fetch access token");
      }

      const data = await response.json();

      return { tokens: data };
    },
  },
  userinfo: "https://api.trackmania.com/api/user",
  clientId: config.NADEO.CLIENT_ID,
  clientSecret: config.NADEO.CLIENT_SECRET,
  async profile(profile) {
    return {
      id: profile.accountId,
      accountId: profile.accountId,
      displayName: profile.displayName,
    };
  },
});

export const authOptions: NextAuthOptions = {
  providers: [NadeoProvider()],
  callbacks: {
    async session({ session, token }) {
      if (!token) {
        throw new Error("Token is missing");
      }

      session.user = {
        id: token.id,
        accountId: token.accountId,
        login: token.login,
        displayName: token.displayName,
        admin: token.admin,
        ubiId: token.ubiId || undefined,
        permissions: token.permissions,
        groups: token.groups,
        projects: token.projects,
        servers: token.servers,
      };

      return session;
    },
    async jwt({ token, user }) {
      let dbUser: UsersWithGroupsWithServers | null = null;
      try {
        if (user) {
          const login = slugid.encode(user.accountId);

          token.accountId = user.accountId;
          token.login = login;
          token.displayName = user.displayName;

          dbUser = await getUserByLogin(login);
        } else {
          dbUser = await getUserById(token.id);
        }
      } catch {
        if (!dbUser) {
          if (!token.ubiId) {
            try {
              const { data: webidentities, error } = await getWebIdentities([
                token.accountId,
              ]);
              if (error) {
                throw new Error(error);
              }
              if (webidentities && webidentities.length > 0) {
                token.ubiId = webidentities[0].uid;
              }
            } catch (error) {
              logger.error(error, "Failed to fetch web identities");
            }
          }

          dbUser = await upsertUserAuth({
            login: token.login,
            nickName: token.displayName,
            admin: config.DEFAULT_ADMINS.includes(token.login),
            path: "",
            ubiUid: token.ubiId ?? "",
            permissions: config.DEFAULT_PERMISSIONS,
            authenticated: true,
          });
        }
      }

      if (!dbUser) {
        throw new Error("Failed to fetch user from database");
      }

      token.id = dbUser.id;
      token.admin = dbUser.admin;
      token.ubiId = dbUser.ubiUid || undefined;
      token.permissions = getList<string>(dbUser.permissions);
      token.groups = dbUser.groupMembers.map((g) => ({
        id: g.group.id,
        name: g.group.name,
        servers: g.group.groupServers.map((s) => s.server),
        role: g.role,
      }));
      token.projects = dbUser.hetznerProjectUsers.map((p) => ({
        id: p.project.id,
        name: p.project.name,
        role: p.role,
      }));
      token.servers = dbUser.userServers.map((s) => ({
        id: s.server.id,
        name: s.server.name,
        role: s.role,
      }));

      const publicGroups = await getPublicGroupsWithServers();

      token.groups.push(
        ...publicGroups
          .filter((g) => !token.groups.some((tg) => tg.id === g.id))
          .map((g) => ({
            id: g.id,
            name: g.name,
            role: "Member" as GroupRole,
            servers: g.servers,
          })),
      );

      return token;
    },
  },
  session: {
    strategy: "jwt",
    maxAge: 1 * 86400, // 1 day,
    updateAge: 6 * 3600, // 6 hours
  },
};

export function auth(
  ...args:
    | [GetServerSidePropsContext["req"], GetServerSidePropsContext["res"]]
    | [NextApiRequest, NextApiResponse]
    | []
) {
  return getServerSession(...args, authOptions);
}

export async function withAuth(
  permissions?: string[],
  id = "",
): Promise<Session> {
  const perm = await hasPermission(permissions, id);
  if (!perm) {
    throw new Error("Unauthorized");
  }

  const session = await auth();
  if (!session) {
    throw new Error("Unauthorized");
  }

  return session;
}

export async function parseTokenFromRequest(req: IncomingMessage) {
  const cookies = parse(req.headers.cookie || "");
  (req as any).cookies = cookies;

  return getToken({
    req: req as any,
    secret: process.env.NEXTAUTH_SECRET!,
  });
}

export async function hasPermission(
  permissions?: string[],
  id = "",
): Promise<boolean> {
  const session = await auth();
  if (!session) {
    return false;
  }

  return hasPermissionSync(session, permissions, id);
}
