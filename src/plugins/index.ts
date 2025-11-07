import { GbxClientManager } from "@/lib/managers/gbxclient-manager";

export default abstract class Plugin {
  static pluginId: string;
  protected clientManager: GbxClientManager;

  constructor(clientManager: GbxClientManager) {
    this.clientManager = clientManager;
  }

  abstract onLoad(): Promise<void>;
  abstract onUnload(): Promise<void>;
  abstract onStart(): Promise<void>;

  getPluginId(): string {
    return (this.constructor as typeof Plugin).pluginId;
  }
}
