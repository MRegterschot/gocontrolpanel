import Manialink from "@/lib/manialink/manialink";
import Widget from "@/lib/manialink/widget";
import Plugin from "@/plugins";
import "server-only";

export default class TALeaderboardPlugin extends Plugin {
  static pluginId = "ta-leaderboard";
  widget: Widget | null = null;
  widget2: Manialink | null = null;

  async onLoad() {
    console.log("TA Leaderboard Plugin loaded");

    this.widget = new Widget(this.clientManager);
    this.widget.setTemplate("widgets/ta-leaderboard.njk");
    this.widget.id = "ta-leaderboard-widget";

    this.widget2 = new Manialink(this.clientManager);
    this.widget2.setTemplate("widgets/ta-leaderboard-update.njk");
    this.widget2.id = "ta-leaderboard-widget-2";

    this.clientManager.addListeners(this.getPluginId(), {
      startMap: this.onStartMap.bind(this),
    });

    this.displayLeaderboard();
  }

  async onUnload() {
    this.clientManager.removeListeners(this.getPluginId());
  }

  async onStart() {
    console.log("TA Leaderboard Plugin started");
  }

  private async onStartMap(uid: string) {
    console.log(`TA Leaderboard Plugin: Map started with UID ${uid}`);
  }

  private async displayLeaderboard() {
    if (!this.widget || !this.widget2) return;

    this.widget.setData({
      title: "Trackmania Leaderboard",
    });

    this.widget.setPosition("100 60");

    this.widget2.setData({
      recordsJson: JSON.stringify([
        {
          rank: 1,
          login: "v8vgGbx_TuKkBabAyn7nsQ",
          name: "Marijntje04",
          time: 123456,
        },
      ]),
    });

    this.widget2.display();
    this.widget.display();
  }
}
