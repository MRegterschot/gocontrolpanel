import { GbxClientManager } from "@/lib/managers/gbxclient-manager";
import Widget from "@/lib/manialink/widget";
import Plugin from "..";
import { SMapInfo } from "@/types/gbx/map";

type MapInfo = {
  name: string;
  author: string;
}

export default class MapInfoPlugin extends Plugin {
  static pluginId = "map-info";
  private widget: Widget;
  private mapInfo: MapInfo = {
    name: "-",
    author: "-",
  };

  constructor(clientManager: GbxClientManager) {
    super(clientManager);
    this.widget = new Widget(this.clientManager);
    this.widget.setTemplate("widgets/map-info/map-info.njk");
    this.widget.setId("map-info-widget");
    this.widget.setPosition("100 85");
  }

  async onLoad() {
    this.clientManager.addListeners(this.getPluginId(), {
      beginMap: this.onBeginMap.bind(this),
    });
  }

  async onUnload() {
    this.widget.hide();
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
    const map: SMapInfo = await this.clientManager.client.call("GetCurrentMapInfo");

    if (map) {
      this.mapInfo = {
        name: map.Name,
        author: map.AuthorNickname || map.Author || "-",
      };
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
