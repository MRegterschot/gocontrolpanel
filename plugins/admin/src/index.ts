import { definePlugin, type PluginContext, type Widget } from "@tmcontrolpanel/plugin-sdk";

class NotifyAdminPlugin {
  private readonly widget: Widget;

  constructor(private readonly ctx: PluginContext) {
    this.widget = ctx.ui.widget({
      id: "notify-admin-widget",
      template: "widgets/notify-admin/notify-admin",
      withUpdate: false,
      position: { x: 119, y: -70 },
      hideWhileDriving: true,
      data: { notifyAdminAction: "notify-admin-action" },
    });

    ctx.action("notify-admin-action", (answer) => this.notify(answer.login));
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

export default definePlugin({
  create: (ctx) => new NotifyAdminPlugin(ctx),
});
