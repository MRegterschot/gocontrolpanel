import {
  definePlugin,
  type PluginContext,
  type SMapInfo,
  type Waypoint,
  type Widget,
} from "@tmcontrolpanel/plugin-sdk";

interface Config {
  localRecordText?: string;
}

type Record = { time: number; nickName: string };
type RecordsInfo = { worldRecord: Record; localRecord: Record };

const emptyRecords = (): RecordsInfo => ({
  worldRecord: { time: 0, nickName: "-" },
  localRecord: { time: 0, nickName: "-" },
});

class RecordsInfoPlugin {
  private readonly widget: Widget;
  private liveFastestTime: number | null = null;
  private records = emptyRecords();

  constructor(private readonly ctx: PluginContext<Config>) {
    this.widget = ctx.ui.widget({
      id: "records-info-widget",
      template: "widgets/records-info/records-info",
      position: { x: 100, y: 73.5 },
      hideWhileDriving: true,
    });

    ctx.on("beginMap", () => this.onBeginMap());
    ctx.on("finish", (waypoint) => this.onFinish(waypoint));
  }

  async start() {
    this.widget.display();
    await this.refresh();
  }

  onConfigUpdate() {
    this.render();
  }

  private async onBeginMap() {
    this.liveFastestTime = null;
    this.records = emptyRecords();
    await this.refresh();
  }

  private async onFinish(waypoint: Waypoint) {
    const { liveInfo } = this.ctx.live;
    if (liveInfo.isWarmUp || liveInfo.isPaused) return;
    if (waypoint.racetime === 0) return;
    if (this.liveFastestTime !== null && waypoint.racetime >= this.liveFastestTime) return;

    this.liveFastestTime = waypoint.racetime;

    const local = this.records.localRecord;
    const beatLocal = local.time === 0 || waypoint.racetime < local.time;
    const beatWorld = waypoint.racetime < this.records.worldRecord.time;
    if (!beatLocal && !beatWorld) return;

    const player = await this.ctx.players.get(waypoint.login).catch(() => null);
    const record = { time: waypoint.racetime, nickName: player?.nickName || "-" };
    if (beatLocal) this.records.localRecord = record;
    if (beatWorld) this.records.worldRecord = { ...record };
    this.render();
  }

  private async refresh() {
    const map = await this.ctx.gbx.call<SMapInfo>("GetCurrentMapInfo");
    if (!map) {
      this.records = emptyRecords();
      this.render();
      return;
    }

    const local = await this.ctx.records.local(map.UId);
    this.records.localRecord = local
      ? { time: local.time, nickName: local.nickName || "-" }
      : { time: 0, nickName: "-" };

    try {
      const world = await this.ctx.nadeo.worldRecord(map.UId);
      if (world) {
        const names = await this.ctx.nadeo.accountNames([world.accountId]);
        this.records.worldRecord = { time: world.score, nickName: names[world.accountId] || "-" };
      } else {
        this.records.worldRecord = { time: 0, nickName: "-" };
      }
    } catch (error) {
      this.ctx.log.error("Failed to fetch world record", { error: String(error) });
    }

    this.render();
  }

  private render() {
    this.widget.setData({
      recordsInfoJson: JSON.stringify(this.records),
      localRecordText: this.ctx.config().localRecordText || "LR",
    });
    this.widget.update();
  }
}

export default definePlugin<Config>({
  create: (ctx) => new RecordsInfoPlugin(ctx),
});
