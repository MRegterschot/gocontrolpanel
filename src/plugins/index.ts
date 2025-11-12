import { GbxClientManager } from "@/lib/managers/gbxclient-manager";

export default abstract class Plugin {
  static pluginId: string;
  static gamemodes: string[] = [];
  static defaultLoaded: boolean = true;
  protected clientManager: GbxClientManager;
  private loaded: boolean = false;

  constructor(clientManager: GbxClientManager) {
    this.clientManager = clientManager;
  }

  abstract onLoad(): Promise<void>;
  abstract onUnload(): Promise<void>;
  abstract onStart(): Promise<void>;

  getPluginId(): string {
    return (this.constructor as typeof Plugin).pluginId;
  }

  getSupportedGamemodes(): string[] {
    return (this.constructor as typeof Plugin).gamemodes;
  }

  getDefaultLoaded(): boolean {
    return (this.constructor as typeof Plugin).defaultLoaded;
  }

  isLoaded(): boolean {
    return this.loaded;
  }

  public setLoaded(loaded: boolean) {
    this.loaded = loaded;
  }
}
