import type { SMapInfo } from "@gcp/shared";
import type { Manialink } from "../../manialink/components/manialink";
import { definePlugin, type PluginContext, type PluginInstance } from "../sdk";

type MapInfo = { name: string; author: string };

const UNKNOWN: MapInfo = { name: "-", author: "-" };

class MapInfoPlugin implements PluginInstance {
  private readonly widget: Manialink;

  constructor(private readonly ctx: PluginContext) {
    this.widget = ctx.ui.widget({
      id: "map-info-widget",
      template: "widgets/map-info/map-info",
      position: { x: 100, y: 85 },
      hideWhileDriving: true,
    });
    ctx.on("beginMap", () => this.refresh());
  }

  async start() {
    this.widget.display();
    await this.refresh();
  }

  private async refresh() {
    const info = await this.resolve();
    this.widget.setData({ mapJson: JSON.stringify(info) });
    this.widget.update();
  }

  private async resolve(): Promise<MapInfo> {
    const map = await this.ctx.gbx.call<SMapInfo>("GetCurrentMapInfo");
    if (!map) return UNKNOWN;
    if (map.Name && map.AuthorNickname) {
      return { name: map.Name, author: map.AuthorNickname };
    }
    if (!map.UId) return UNKNOWN;

    const record = await this.ctx.maps.findByUid(map.UId);
    return record ? { name: record.name, author: record.authorNickname || "-" } : UNKNOWN;
  }
}

export const mapInfoPlugin = definePlugin({
  id: "map-info",
  create: (ctx) => new MapInfoPlugin(ctx),
});
