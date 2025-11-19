import { GbxClientManager } from "@/lib/managers/gbxclient-manager";
import ManialinkManager from "@/lib/managers/manialink-manager";

export default abstract class Plugin<ConfigType = unknown> {
  static pluginId: string;
  static gamemodes: string[] = [];
  protected clientManager: GbxClientManager;
  protected manialinkManager: ManialinkManager;
  private loaded: boolean = false;
  protected config: ConfigType | null = null;

  constructor(clientManager: GbxClientManager, manialinkManager: ManialinkManager) {
    this.clientManager = clientManager;
    this.manialinkManager = manialinkManager;
  }

  abstract onLoad(): Promise<void>;
  abstract onUnload(): Promise<void>;
  abstract onStart(): Promise<void>;

  setConfig(config: ConfigType) {
    this.config = config;
  }

  getPluginId(): string {
    return (this.constructor as typeof Plugin).pluginId;
  }

  getSupportedGamemodes(): string[] {
    return (this.constructor as typeof Plugin).gamemodes;
  }

  isLoaded(): boolean {
    return this.loaded;
  }

  public setLoaded(loaded: boolean) {
    this.loaded = loaded;
  }
}
