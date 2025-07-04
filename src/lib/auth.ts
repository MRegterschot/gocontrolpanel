import {
  createUserAuth,
  getUserById,
  getUserByLogin,
} from "@/actions/database/users";
import {
  GetServerSidePropsContext,
  NextApiRequest,
  NextApiResponse,
} from "next";
import { getServerSession, NextAuthOptions, Profile, Session } from "next-auth";
import { OAuthConfig } from "next-auth/providers/oauth";
import slugid from "slugid";
import { getWebIdentities } from "./api/nadeo";
import { axiosAuth } from "./axios/connector";
import config from "./config";
import { Users } from "./prisma/generated";
import { getRoles } from "./utils";

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
        roles: token.roles || [],
        ubiId: token.ubiId,
      };

      session.jwt = token.jwt;

      return session;
    },
    async jwt({ token, user }) {
      let dbUser: Users | null;
      if (user) {
        const login = slugid.encode(user.accountId);
        ({ data: dbUser } = await getUserByLogin(login));

        token.accountId = user.accountId;
        token.login = login;
        token.displayName = user.displayName;
      } else {
        ({ data: dbUser } = await getUserById(token.id));
      }

      if (!dbUser) {
        let ubiUid = "";
        try {
          const { data: webidentities, error } = await getWebIdentities([
            token.accountId,
          ]);
          if (error) {
            throw new Error(error);
          }
          if (webidentities && webidentities.length > 0) {
            ubiUid = webidentities[0].uid;
          }
        } catch (error) {
          console.error("Failed to fetch web identities", error);
        }

        ({ data: dbUser } = await createUserAuth({
          login: token.login,
          nickName: token.displayName,
          roles: config.DEFAULT_ADMINS.includes(token.login) ? ["admin"] : [],
          path: "",
          ubiUid,
        }));
      }

      if (!dbUser) {
        throw new Error("Failed to fetch user from database");
      }

      try {
        token.jwt = await getConnectorToken(dbUser);
      } catch (error) {
        console.error("Failed to fetch connector token", error);
      }

      token.id = dbUser.id;
      token.roles = getRoles(dbUser.roles);
      token.ubiId = dbUser.ubiUid;

      return token;
    },
  },
  session: {
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

export async function withAuth(roles?: string[]): Promise<Session> {
  const session = await auth();
  if (!session) {
    throw new Error("Not authenticated");
  }

  if (roles && !session.user.roles.some((role) => roles.includes(role))) {
    throw new Error("Not authorized");
  }
  return session;
}

async function getConnectorToken(user: Users): Promise<string> {
  const res = await axiosAuth.post("/auth", user);

  if (res.status !== 200) {
    throw new Error("Failed to fetch connector token");
  }

  const data = res.data;
  if (!data.token) {
    throw new Error("Failed to fetch connector token");
  }

  return data.token;
}
