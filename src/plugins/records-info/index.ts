import { getLocalRecord } from "@/actions/database/server-only/records";
import { getPlayerInfo } from "@/actions/gbx/server-only";
import { getAccountNames, getMapLeaderboard } from "@/lib/api/nadeo";
import { GbxClientManager } from "@/lib/managers/gbxclient-manager";
import ManialinkManager from "@/lib/managers/manialink-manager";
import Widget from "@/lib/manialink/components/widget";
import { SMapInfo } from "@/types/gbx/map";
import { Waypoint } from "@/types/gbx/waypoint";
import { RecordsInfoPluginConfig } from "@/types/plugins/records-info";
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

export default class RecordsInfoPlugin extends Plugin<RecordsInfoPluginConfig | null> {
  static pluginId = "records-info";
  private widget: Widget;
  private liveFastestTime: number | null = null;
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
    this.liveFastestTime = null;
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
    this.updateRecordsInfo();
  }

  async onConfigUpdate() {
    this.widget.setData({
      recordsInfoJson: JSON.stringify(this.recordsInfo),
      localRecordText: this.config?.localRecordText || "LR",
    });
    this.widget.update();
  }

  async onPlayerFinish(waypoint: Waypoint) {
    if (
      waypoint.racetime === 0 ||
      (this.liveFastestTime !== null &&
        waypoint.racetime >= this.liveFastestTime)
    ) {
      return;
    }

    this.liveFastestTime = waypoint.racetime;

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
        localRecordText: this.config?.localRecordText || "LR",
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
      if (
        onlineLeaderboard.tops.length > 0 &&
        onlineLeaderboard.tops[0].top.length > 0
      ) {
        const wr = onlineLeaderboard.tops[0].top[0];

        const accountNames = await getAccountNames([wr.accountId]);

        this.recordsInfo.worldRecord = {
          time: wr.score,
          nickName: accountNames[wr.accountId] || "-",
        };
      } else {
        this.recordsInfo.worldRecord = {
          time: 0,
          nickName: "-",
        };
      }
    }

    this.widget.setData({
      recordsInfoJson: JSON.stringify(this.recordsInfo),
      localRecordText: this.config?.localRecordText || "LR",
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
