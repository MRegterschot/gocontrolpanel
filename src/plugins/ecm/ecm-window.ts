import { getClient } from "@/lib/dbclient";
import { GbxClientManager } from "@/lib/managers/gbxclient-manager";
import ManialinkManager from "@/lib/managers/manialink-manager";
import Window from "@/lib/manialink/components/window";
import { PrismaClient } from "@/lib/prisma/generated";
import { PlayerManialinkPageAnswer } from "@/types/gbx/player";
import { ECMPluginConfig } from "@/types/plugins/ecm";

export default class ECMWindow extends Window {
  private clientManager: GbxClientManager;
  private pluginId: string;
  private db: PrismaClient;
  private config: ECMPluginConfig | null;
  private roundOffset: number;
  private isEditor: boolean;

  public onRoundOffsetUpdateCallback: ((offset: number) => void) | null = null;
  public onConfigUpdateCallback:
    | ((config: ECMPluginConfig | null) => void)
    | null = null;

  constructor(
    clientManager: GbxClientManager,
    manialinkManager: ManialinkManager,
    config: ECMPluginConfig | null,
    roundOffset: number,
    title: string,
    login: string,
    pluginId: string,
  ) {
    super(manialinkManager, title, "ecm-window", login);
    this.clientManager = clientManager;
    this.db = getClient();
    this.config = config;
    this.roundOffset = roundOffset;
    this.pluginId = pluginId;
    this.isEditor = this.userIsEditor();

    this.setTemplate("windows/ecm/ecm-window");
    this.setSize({
      x: 54,
      y: 32.5,
    });
    this.updateData();

    this.clientManager.addListeners(`${this.getId()}-${login}`, {
      startRound: this.update.bind(this),
    });

    this.clientManager.onAction("ecm-toggle-recording", this.onToggleRecording);
    this.clientManager.onAction("ecm-save-api-key", this.onSaveApiKey);
    this.clientManager.onAction(
      "ecm-increase-round-offset",
      this.onIncreaseRoundOffset,
    );
    this.clientManager.onAction(
      "ecm-decrease-round-offset",
      this.onDecreaseRoundOffset,
    );
  }

  private onToggleRecording = async () => {
    const updatedConfig = {
      ...this.config,
      isRecording: this.config?.isRecording ? false : true,
    };

    await this.db.serverPlugins.update({
      where: {
        serverId_pluginId: {
          serverId: this.clientManager.getServerId(),
          pluginId: this.pluginId,
        },
      },
      data: {
        config: updatedConfig,
      },
    });

    this.onConfigUpdateCallback?.(updatedConfig);
  };

  private onSaveApiKey = async (data: PlayerManialinkPageAnswer) => {
    const apiKeyValue = data.Entries[0]?.Value;

    if (apiKeyValue && (apiKeyValue.match(/_/g) || []).length !== 1) return;

    const updatedConfig = {
      ...this.config,
      apiKey: data.Entries[0]?.Value,
    };

    await this.db.serverPlugins.update({
      where: {
        serverId_pluginId: {
          serverId: this.clientManager.getServerId(),
          pluginId: this.pluginId,
        },
      },
      data: {
        config: updatedConfig,
      },
    });

    this.onConfigUpdateCallback?.(updatedConfig);
  };

  private onIncreaseRoundOffset = async () => {
    this.onRoundOffsetUpdateCallback?.(1);
  };

  private onDecreaseRoundOffset = async () => {
    this.onRoundOffsetUpdateCallback?.(-1);
  };

  updateConfig(config: ECMPluginConfig | null) {
    this.config = config;
    this.isEditor = this.userIsEditor();
    this.update();
  }

  updateRoundOffset(roundOffset: number) {
    this.roundOffset = roundOffset;
    this.update();
  }

  updateData() {
    this.setData({
      isEditor: this.isEditor,
      apiKey: this.isEditor ? this.config?.apiKey || "" : "",
      isRecording: this.config?.isRecording || false,
      currentRound: (this.clientManager.roundNumber || 1) + this.roundOffset,
    });
  }

  update() {
    this.updateData();
    super.update();
  }

  destroy() {
    this.clientManager.removeListeners(`${this.getId()}-${this.login}`);

    this.clientManager.offAction(
      "ecm-toggle-recording",
      this.onToggleRecording,
    );
    this.clientManager.offAction("ecm-save-api-key", this.onSaveApiKey);
    this.clientManager.offAction(
      "ecm-increase-round-offset",
      this.onIncreaseRoundOffset,
    );
    this.clientManager.offAction(
      "ecm-decrease-round-offset",
      this.onDecreaseRoundOffset,
    );

    super.destroy();
  }

  private userIsEditor() {
    if (this.config?.editors && this.config.editors.length > 0) {
      return this.config.editors.includes(this.login);
    }
    return true;
  }
}
