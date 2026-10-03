import type { ChatConfig, ChatConfigResult, MapsChangeResult, PointsBody } from "@gcp/shared";
import { stripTmTags } from "tmtags";
import type { ChatService } from "../chat/chat-service";
import { AppError, errorMessage } from "../errors";
import { TypedEventBus } from "../events";
import type { GbxConnection } from "../gbx/connection";
import type { LiveState } from "../live/live-state";
import type { Logger } from "../logger";
import type { MapList } from "./map-list";
import type { ServerEventMap } from "./server-events";

export interface ServerCommandsDeps {
  gbx: GbxConnection;
  state: LiveState;
  bus: TypedEventBus<ServerEventMap>;
  chat: ChatService;
  mapList: MapList;
  log: Logger;
}

type PointsType = PointsBody["type"];

// Positional (round, map, match) arguments of Trackmania.Set*Points; "" leaves a value unchanged
function pointsArgs(type: PointsType, points: number): [string, string, string] {
  const value = points.toString();
  return [
    type === "round" ? value : "",
    type === "map" ? value : "",
    type === "match" ? value : "",
  ];
}

// Admin actions that also touch live state, plugins or chat announcements (GS-52)
export class ServerCommands {
  constructor(private readonly deps: ServerCommandsDeps) {}

  async sendChat(message: string, login?: string): Promise<void> {
    if (login) {
      await this.deps.gbx.call("ChatSendServerMessageToLogin", message, login);
    } else {
      await this.deps.gbx.call("ChatSendServerMessage", message);
    }
  }

  async setScriptName(script: string): Promise<void> {
    await this.deps.gbx.call("SetScriptName", script);
    await this.deps.chat.announce("scriptNameChangeMessage", { script });
  }

  async loadMatchSettings(filename: string): Promise<void> {
    await this.deps.gbx.call("LoadMatchSettings", filename);
    await this.deps.chat.announce("matchSettingsLoadedMessage", { filename });
  }

  async setScriptSettings(settings: Record<string, string | number | boolean>): Promise<void> {
    await this.deps.gbx.call("SetModeScriptSettings", settings);
    // The echo comes back as a callback, which refreshes live state for every listener
    this.deps.gbx.send("Echo", "", "UpdatedSettings");
    await this.deps.chat.announce("scriptSettingsSavedMessage");
  }

  async setPaused(paused: boolean): Promise<void> {
    const { gbx, state } = this.deps;
    await gbx.call("TriggerModeScriptEventArray", "Maniaplanet.Pause.SetActive", [
      paused ? "true" : "false",
    ]);

    if (paused) {
      state.liveInfo.isPaused = true;
      if (state.roundNumber !== null) state.roundNumber--;
    }
  }

  async addMaps(filenames: string[]): Promise<MapsChangeResult> {
    const { gbx } = this.deps;

    if (filenames.length === 1) {
      // AddMap reports why a single map is rejected; AddMapList silently skips it
      await gbx.call("AddMap", filenames[0]);
      await this.announceMapListChange("added", filenames);
      return { count: 1 };
    }

    const count = await gbx.call("AddMapList", filenames);
    if (typeof count !== "number") {
      throw new AppError("AddMapListError", "Failed to add map list");
    }
    if (count > 0) await this.announceMapListChange("added", filenames);
    return { count };
  }

  async removeMaps(filenames: string[]): Promise<MapsChangeResult> {
    const { gbx } = this.deps;

    const remaining = (await this.deps.mapList.getAll()).filter(
      (map) => !filenames.includes(map.FileName),
    );
    if (remaining.length === 0) {
      throw new AppError("RemoveLastMapError", "Cannot remove the last map from the server");
    }

    if (filenames.length === 1) {
      await gbx.call("RemoveMap", filenames[0]);
      await this.announceMapListChange("removed", filenames);
      return { count: 1 };
    }

    const count = await gbx.call("RemoveMapList", filenames);
    if (typeof count !== "number") {
      throw new AppError("RemoveMapListError", "Failed to remove map list");
    }
    if (count > 0) await this.announceMapListChange("removed", filenames);
    return { count };
  }

  // Moves the given maps to the end of the list in the given order
  async reorderMaps(filenames: string[]): Promise<MapsChangeResult> {
    const { gbx } = this.deps;
    const removed = await gbx.call("RemoveMapList", filenames);
    const added = await gbx.call("AddMapList", filenames);

    if (typeof removed !== "number" || typeof added !== "number") {
      throw new AppError("ReorderMapListError", "Failed to reorder map list");
    }

    await this.announceMapListChange("reordered", filenames);
    return { count: added };
  }

  async setPlayerPoints(login: string, type: PointsType, points: number): Promise<void> {
    const { gbx, state, bus } = this.deps;
    await gbx.callScript("Trackmania.SetPlayerPoints", login, ...pointsArgs(type, points));

    // PlayerRound has no map points; only round and match points are mirrored
    const round =
      type === "round"
        ? state.patchPlayer(login, { roundPoints: points })
        : type === "match"
          ? state.patchPlayer(login, { matchPoints: points })
          : state.patchPlayer(login, {});

    bus.emit("playerUpdated", round);
  }

  async setTeamPoints(teamId: number, type: PointsType, points: number): Promise<void> {
    const { gbx, state, bus } = this.deps;
    await gbx.callScript(
      "Trackmania.SetTeamPoints",
      teamId.toString(),
      ...pointsArgs(type, points),
    );

    const existing = state.liveInfo.teams?.[teamId];
    if (!existing) return;

    const field = { round: "roundPoints", map: "mapPoints", match: "matchPoints" } as const;
    const team = { ...existing, [field[type]]: points };
    state.setTeam(teamId, team);
    bus.emit("teamUpdated", team);
  }

  // Manual routing may be refused by the server; it is then turned off and reported back.
  // An offline server is not a refusal: it applies the stored config when it connects.
  async applyChatConfig(config: ChatConfig): Promise<ChatConfigResult> {
    let error: string | undefined;
    const applied = { ...config };

    try {
      await this.deps.gbx.call("ChatEnableManualRouting", config.manualRouting);
    } catch (e) {
      if (!(e instanceof AppError && e.code === "ServerNotConnected")) {
        error = errorMessage(e);
        applied.manualRouting = false;
        this.deps.log.error({ err: e }, "Failed to apply manual chat routing");
      }
    }

    this.deps.state.chat = applied;
    return { applied, error };
  }

  private async announceMapListChange(
    action: "added" | "removed" | "reordered",
    filenames: string[],
  ): Promise<void> {
    if (!this.deps.state.chat?.mapListChangeMessage) return;

    // The map list already changed; a failed announcement must not report the command as failed
    try {
      const infos = await this.deps.mapList.getInfos(filenames);
      await this.deps.chat.announce("mapListChangeMessage", {
        action,
        count: filenames.length,
        maps: infos.map((map) => stripTmTags(map.Name)).join(", "),
      });
    } catch (error) {
      this.deps.log.warn({ err: error }, "Failed to announce map list change");
    }
  }
}
