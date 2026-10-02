import { definePlugin, type PluginContext, type PluginInstance } from "../sdk";

class NotifyAdminPlugin implements PluginInstance {
  private readonly widget;

  constructor(private readonly ctx: PluginContext) {
    this.widget = ctx.ui.widget({
      id: "notify-admin-widget",
      template: "widgets/notify-admin/notify-admin",
      withUpdate: false,
      position: { x: 119, y: -70 },
      hideWhileDriving: true,
      data: { notifyAdminAction: "notify-admin-action" },
    });

    ctx.action("notify-admin-action", (answer) => this.notify(answer.Login));
    ctx.command("admin", (args, login) => this.notify(login, args.join(" ") || undefined));
  }

  start() {
    this.widget.display();
  }

  private async notify(login: string, description?: string) {
    const player = await this.ctx.players.get(login);
    await this.ctx.notifyAdmins(
      `${player.nickName} asked for help on server ${this.ctx.serverName()}`,
      description,
    );
    await this.ctx.chat.sendTo(login, "Admins have been notified");
  }
}

export const notifyAdminPlugin = definePlugin({
  id: "admin",
  helpText: `This plugin allows players to notify admins when they need help.
Commands: 
/admin <message> - Notifies admins that you need help
`,
  create: (ctx) => new NotifyAdminPlugin(ctx),
});
