import Widget from "@/lib/manialink/widget";
import Plugin from "@/plugins";
import "server-only";

export default class TALeaderboardPlugin extends Plugin {
  static pluginId = "ta-leaderboard";
  widget: Widget | null = null;

  async onLoad() {
    this.widget = new Widget(this.clientManager);
    this.widget.setTemplate("widgets/ta-leaderboard.njk");
    this.widget.setId("ta-leaderboard-widget");

    this.clientManager.addListeners(this.getPluginId(), {
      startMap: this.onStartMap.bind(this),
    });
  }

  async onUnload() {
    this.clientManager.removeListeners(this.getPluginId());
  }

  async onStart() {
    this.displayLeaderboard();
  }

  private async onStartMap(uid: string) {
  }

  private async displayLeaderboard() {
    if (!this.widget) return;

    this.widget.setPosition("100 60");

    this.widget.display();

    for (let i = 1; i <= 9; i++) {
      setTimeout(() => {
        const records = Array.from({ length: i }, (_, idx) => ({
          rank: idx + 1,
          login: `v8vgGbx_TuKkBabAyn7nsQ`,
          name: `Marijntje${String(idx + 1).padStart(2, "0")}`,
          time: 123456 + idx * 50, // slightly varied times
        }));

        this.widget?.setData({
          recordsJson: JSON.stringify(records),
        });

        this.widget?.update();
      }, i * 100);
    }
  }
}
