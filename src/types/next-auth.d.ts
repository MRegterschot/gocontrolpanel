import "next-auth";
import { ISODateString } from "next-auth";
import "next-auth/jwt";
import { AdminGroup, UserGroup, UserProject, UserServer } from "./auth";

declare module "next-auth" {
  interface User {
    accountId: string;
    displayName: string;
  }

  interface Session {
    user: {
      id: string;
      admin: boolean;
      displayName: string;
      accountId: string;
      ubiId?: string;
      login: string;
      permissions: string[];
      groups: UserGroup[];
      adminGroups: AdminGroup[];
      projects: UserProject[];
      servers: UserServer[];
    };
    expires: ISODateString;
  }

  interface Profile {
    accountId: string;
    displayName: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    accountId: string;
    login: string;
    displayName: string;
    admin: boolean;
    ubiId?: string;
    permissions: string[];
    groups: UserGroup[];
    adminGroups: AdminGroup[];
    projects: UserProject[];
    servers: UserServer[];
  }
}
