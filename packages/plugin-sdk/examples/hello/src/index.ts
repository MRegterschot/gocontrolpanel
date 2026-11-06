import { definePlugin, type Widget } from "@tmcontrolpanel/plugin-sdk";

interface Config {
  greeting: string;
  showWidget: boolean;
}

export default definePlugin<Config>({
  create(ctx) {
    let widget: Widget | null = null;
    let total = 0;

    const refresh = () => {
      if (!widget) return;
      widget.setData({ text: `${ctx.config().greeting}! ${total} greetings so far` });
      widget.display();
    };

    const greet = async (login: string) => {
      const player = await ctx.players.get(login);
      const key = `greetings:${login}`;
      const count = ((await ctx.storage.get<number>(key)) ?? 0) + 1;
      await ctx.storage.set(key, count);
      total++;
      await ctx.chat.sendTo(login, `${ctx.config().greeting} ${player.nickName}! (greeting #${count})`);
      refresh();
    };

    const applyConfig = () => {
      if (ctx.config().showWidget) {
        widget ??= ctx.ui.widget({
          id: "greeting",
          template: "widgets/greeting",
          withUpdate: false,
          position: { x: -158, y: 60 },
          hideWhileDriving: true,
        });
        refresh();
      } else {
        widget?.destroy();
        widget = null;
      }
    };

    ctx.command("hello", (_args, login) => greet(login));
    ctx.on("playerConnect", (player) => greet(player.login));
    ctx.action("wave", (answer) => greet(answer.login));

    return {
      start: applyConfig,
      onConfigUpdate: applyConfig,
    };
  },
});
