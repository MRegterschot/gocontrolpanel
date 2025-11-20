import { GbxClientManager } from "@/lib/managers/gbxclient-manager";
import ManialinkManager from "@/lib/managers/manialink-manager";
import Window from "@/lib/manialink/components/window";
import { ECMPluginConfig } from "@/types/plugins/ecm";

export default class ECMWindow extends Window {
  private clientManager: GbxClientManager;
  private config: ECMPluginConfig | null;

  constructor(
    clientManager: GbxClientManager,
    manialinkManager: ManialinkManager,
    config: ECMPluginConfig | null,
    title: string,
    login: string,
  ) {
    super(manialinkManager, title, "ecm-window", login);
    this.clientManager = clientManager;
    this.config = config;

    this.setTemplate("windows/ecm/ecm-window");
    this.setData({
      ecmConfigJson: JSON.stringify(this.config ?? {}),
    });
  }

  updateConfig(config: ECMPluginConfig | null) {
    this.config = config;
    this.setData({
      ecmConfigJson: JSON.stringify(this.config ?? {}),
    });
    this.update();
  }
}
