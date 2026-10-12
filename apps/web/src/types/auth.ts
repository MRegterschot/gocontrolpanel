import {
  GroupRole,
  HetznerProjectRole,
  Servers,
  UserServerRole,
} from "@gcp/db";

export type MinimalServer = Pick<Servers, "id" | "name" | "description"> & {
  hasFileManager: boolean;
};

export interface UserGroup {
  id: string;
  name: string;
  role: GroupRole;
  order: number;
  serversOrder?: string[];
  servers: MinimalServer[];
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

export interface AdminGroup {
  id: string;
  name: string;
  servers: MinimalServer[];
}
