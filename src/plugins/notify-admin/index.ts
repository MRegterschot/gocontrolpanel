import { getPlayerInfo } from "@/actions/gbx/server-only";
import { GbxClientManager } from "@/lib/managers/gbxclient-manager";
import ManialinkManager from "@/lib/managers/manialink-manager";
import Widget from "@/lib/manialink/components/widget";
import { AdminCommand } from "@/types/commands";
import { PlayerManialinkPageAnswer } from "@/types/gbx/player";
import Plugin from "..";

export default class NotifyAdminPlugin extends Plugin {
  static pluginId = "admin";
  private widget: Widget;

  constructor(
    clientManager: GbxClientManager,
    manialinkManager: ManialinkManager,
  ) {
    super(clientManager, manialinkManager);
    this.widget = new Widget(manialinkManager, undefined, false);
    this.widget.setTemplate("widgets/notify-admin/notify-admin");
    this.widget.setId("notify-admin-widget");
    this.widget.setPosition("119 -70");
    this.widget.setData({
      notifyAdminAction: "notify-admin-action",
    });
  }

  async onLoad() {
    this.clientManager.onAction(
      "notify-admin-action",
      this.onPlayerManialinkPageAnswer,
    );

    this.clientManager.onCommand("admin", this.onAdminCommand);
  }

  async onUnload() {
    this.widget.destroy();

    this.clientManager.offAction(
      "notify-admin-action",
      this.onPlayerManialinkPageAnswer,
    );

    this.clientManager.offCommand("admin", this.onAdminCommand);
  }

  async onStart() {
    this.widget.display();
  }

  onPlayerManialinkPageAnswer = async (
    pageAnswer: PlayerManialinkPageAnswer,
  ) => {
    let player = this.clientManager.info.activePlayers.find(
      (p) => p.login === pageAnswer.Login,
    );

    if (!player) {
      player = await getPlayerInfo(this.clientManager.client, pageAnswer.Login);
    }

    const adminCommand: AdminCommand = {
      serverId: this.clientManager.getServerId(),
      login: player.login,
      name: player.nickName,
      message: "",
      timestamp: new Date(),
    };

    this.clientManager.client.call(
      "ChatSendServerMessageToLogin",
      "Admins have been notified",
      pageAnswer.Login,
    );

    this.clientManager.emit("adminCommand", adminCommand);
  };

  onAdminCommand = async (args: string[], login: string) => {
    let player = this.clientManager.info.activePlayers.find(
      (p) => p.login === login,
    );

    if (!player) {
      player = await getPlayerInfo(this.clientManager.client, login);
    }

    const adminCommand: AdminCommand = {
      serverId: this.clientManager.getServerId(),
      login: player.login,
      name: player.nickName,
      message: args.join(" "),
      timestamp: new Date(),
    };

    this.clientManager.client.call(
      "ChatSendServerMessageToLogin",
      "Admins have been notified",
      login,
    );

    this.clientManager.emit("adminCommand", adminCommand);
  };
}
