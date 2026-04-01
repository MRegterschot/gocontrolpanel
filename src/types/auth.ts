import {
  GroupRole,
  HetznerProjectRole,
  Servers,
  UserServerRole,
} from "@/lib/prisma/generated";

export interface UserGroup {
  id: string;
  name: string;
  role: GroupRole;
  order: number;
  serversOrder?: string[];
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
}

export interface UserProject {
  id: string;
  name: string;
  role: HetznerProjectRole;
}

export interface UserServer {
  id: string;
  name: string;
  role: UserServerRole;
}
