export interface AdminCommand {
  serverId: string;
  serverName?: string;
  login: string;
  name: string;
  message: string;
  timestamp: Date;
}
