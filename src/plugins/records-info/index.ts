import { getLocalRecord } from "@/actions/database/server-only/records";
import { getPlayerInfo } from "@/actions/gbx/server-only";
import { getAccountNames, getMapLeaderboard } from "@/lib/api/nadeo";
import { GbxClientManager } from "@/lib/managers/gbxclient-manager";
import ManialinkManager from "@/lib/managers/manialink-manager";
import Widget from "@/lib/manialink/components/widget";
import { SMapInfo } from "@/types/gbx/map";
import { Waypoint } from "@/types/gbx/waypoint";
import Plugin from "..";

type RecordsInfo = {
  worldRecord: {
    time: number;
    nickName: string;
  };
  localRecord: {
    time: number;
    nickName: string;
  };
};

export default class RecordsInfoPlugin extends Plugin {
  static pluginId = "records-info";
  private widget: Widget;
  private recordsInfo: RecordsInfo = {
    worldRecord: {
      time: 0,
      nickName: "-",
    },
    localRecord: {
      time: 0,
      nickName: "-",
    },
  };

  constructor(
    clientManager: GbxClientManager,
    manialinkManager: ManialinkManager,
  ) {
    super(clientManager, manialinkManager);
    this.widget = new Widget(manialinkManager);
    this.widget.setTemplate("widgets/records-info/records-info");
    this.widget.setId("records-info-widget");
    this.widget.setPosition({ x: 100, y: 73.5 });
  }

  async onLoad() {
    this.clientManager.addListeners(this.getPluginId(), {
      beginMap: this.onBeginMap.bind(this),
      finish: this.onPlayerFinish.bind(this),
    });
  }

  async onUnload() {
    this.widget.destroy();
    this.clientManager.removeListeners(this.getPluginId());
  }

  async onStart() {
    this.widget.display();
    this.updateRecordsInfo();
  }

  async onBeginMap() {
    this.updateRecordsInfo();
  }

  async onPlayerFinish(waypoint: Waypoint) {
    const beatLR = this.fasterThanLocalRecord(waypoint.racetime);
    const beatWR = this.fasterThanWorldRecord(waypoint.racetime);

    if (beatLR || beatWR) {
      const playerInfo = await getPlayerInfo(
        this.clientManager.client,
        waypoint.login,
      );

      if (beatLR) {
        this.recordsInfo.localRecord = {
          time: waypoint.racetime,
          nickName: playerInfo?.nickName || "-",
        };
      }

      if (beatWR) {
        this.recordsInfo.worldRecord = {
          time: waypoint.racetime,
          nickName: playerInfo?.nickName || "-",
        };
      }

      this.widget.setData({
        recordsInfoJson: JSON.stringify(this.recordsInfo),
      });
      this.widget.update();
    }
  }

  async updateRecordsInfo() {
    const map: SMapInfo =
      await this.clientManager.client.call("GetCurrentMapInfo");

    if (!map) {
      this.recordsInfo = {
        worldRecord: {
          time: 0,
          nickName: "-",
        },
        localRecord: {
          time: 0,
          nickName: "-",
        },
      };
    } else {
      const localRecord = await getLocalRecord(
        this.clientManager.getServerId(),
        map.UId,
      );

      if (localRecord) {
        this.recordsInfo.localRecord = {
          time: localRecord.time,
          nickName: localRecord.user?.nickName || "-",
        };
      } else {
        this.recordsInfo.localRecord = {
          time: 0,
          nickName: "-",
        };
      }

      const onlineLeaderboard = await getMapLeaderboard(map.UId);
      if (onlineLeaderboard.tops.length > 0) {
        if (onlineLeaderboard.tops[0].top.length > 0) {
          const wr = onlineLeaderboard.tops[0].top[0];

          const accountNames = await getAccountNames([wr.accountId]);

          this.recordsInfo.worldRecord = {
            time: wr.score,
            nickName: accountNames[wr.accountId] || "-",
          };
        }
      }
    }

    this.widget.setData({
      recordsInfoJson: JSON.stringify(this.recordsInfo),
    });
    this.widget.update();
  }

  private fasterThanLocalRecord(time: number) {
    return (
      this.recordsInfo.localRecord.time === 0 ||
      time < this.recordsInfo.localRecord.time
    );
  }

  private fasterThanWorldRecord(time: number) {
    return time < this.recordsInfo.worldRecord.time;
  }
}
