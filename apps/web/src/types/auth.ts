import {
  GroupRole,
  HetznerProjectRole,
  Servers,
  UserServerRole,
} from "@gcp/db";

export type MinimalServer = Omit<
  Servers,
  | "user"
  | "password"
  | "manualRouting"
  | "messageFormat"
  | "connectMessage"
  | "disconnectMessage"
  | "scriptNameChangeMessage"
  | "matchSettingsLoadedMessage"
  | "scriptSettingsSavedMessage"
  | "mapListChangeMessage"
  | "filemanagerPassword"
  | "enableHelpCommand"
  | "theme"
  | "createdAt"
  | "updatedAt"
  | "deletedAt"
>;

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
