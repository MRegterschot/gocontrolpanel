import { getMapByUidServer } from "@/actions/database/server-only/maps";
import { GbxClientManager } from "@/lib/managers/gbxclient-manager";
import ManialinkManager from "@/lib/managers/manialink-manager";
import Widget from "@/lib/manialink/widget";
import { SMapInfo } from "@/types/gbx/map";
import Plugin from "..";

type MapInfo = {
  name: string;
  author: string;
};

export default class MapInfoPlugin extends Plugin {
  static pluginId = "map-info";
  private widget: Widget;
  private mapInfo: MapInfo = {
    name: "-",
    author: "-",
  };

  constructor(
    clientManager: GbxClientManager,
    manialinkManager: ManialinkManager,
  ) {
    super(clientManager);
    this.widget = new Widget(manialinkManager);
    this.widget.setTemplate("widgets/map-info/map-info");
    this.widget.setId("map-info-widget");
    this.widget.setPosition("100 85");
  }

  async onLoad() {
    this.clientManager.addListeners(this.getPluginId(), {
      beginMap: this.onBeginMap.bind(this),
    });
  }

  async onUnload() {
    this.widget.destroy();
    this.clientManager.removeListeners(this.getPluginId());
  }

  async onStart() {
    this.widget.display();
    this.updateMapInfo();
  }

  async onBeginMap() {
    this.updateMapInfo();
  }

  async updateMapInfo() {
    const map: SMapInfo =
      await this.clientManager.client.call("GetCurrentMapInfo");

    if (map) {
      if (map.Name && map.AuthorNickname) {
        this.mapInfo = {
          name: map.Name,
          author: map.AuthorNickname,
        };
      } else if (map.UId) {
        const dbMap = await getMapByUidServer(map.UId);
        if (dbMap) {
          this.mapInfo = {
            name: dbMap.name,
            author: dbMap.authorNickname || "-",
          };
        } else {
          this.mapInfo = {
            name: "-",
            author: "-",
          };
        }
      }
    } else {
      this.mapInfo = {
        name: "-",
        author: "-",
      };
    }

    this.widget.setData({
      mapJson: JSON.stringify(this.mapInfo),
    });
    this.widget.update();
  }
}
