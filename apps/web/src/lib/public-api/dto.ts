import type { getMatchAs, MatchSummary } from "@/services/database/matches";
import type { ModeScriptInfo } from "@/types/gbx";
import type { ServerPlugin } from "@/types/gbx/server-plugin";
import type { JukeboxMap } from "@/types/map";
import type { InstalledPlugin } from "@/types/plugins/catalog";
import type { Maps } from "@gcp/db";
import type { PlayerInfo, SMapInfo } from "@gcp/shared";
import type {
  ApiInstalledPlugin,
  ApiJukeboxEntry,
  ApiListedPlayer,
  ApiMap,
  ApiMatch,
  ApiMatchDetail,
  ApiPlayer,
  ApiScriptInfo,
  ApiServerScriptPlugin,
} from "@gcp/shared/public-api";
import "server-only";

// Panel and GBX shapes to the public API's DTOs; the route wrapper strips anything extra

export function toApiPlayer(player: PlayerInfo): ApiPlayer {
  return {
    login: player.login,
    nickName: player.nickName,
    playerId: player.playerId,
    teamId: player.teamId,
    spectator: player.spectatorStatus % 10 !== 0,
  };
}

export function toApiListedPlayer(player: PlayerInfo): ApiListedPlayer {
  return { login: player.login, nickName: player.nickName };
}

export function toApiMap(map: Maps): ApiMap {
  return {
    uid: map.uid,
    name: map.name,
    fileName: map.fileName,
    author: map.author,
    authorNickname: map.authorNickname,
    medals: {
      author: map.authorTime,
      gold: map.goldTime,
      silver: map.silverTime,
      bronze: map.bronzeTime,
    },
  };
}

// Map info straight from the dedicated server, for maps the panel may not have stored
export function toApiMapInfo(map: SMapInfo): ApiMap {
  return {
    uid: map.UId,
    name: map.Name,
    fileName: map.FileName,
    author: map.Author,
    authorNickname: map.AuthorNickname,
    medals: {
      author: map.AuthorTime,
      gold: map.GoldTime,
      silver: map.SilverTime,
      bronze: map.BronzeTime,
    },
  };
}

// Jukebox entries come from Redis as JSON, so QueuedAt may already be a string
export function toApiJukeboxEntry(entry: JukeboxMap): ApiJukeboxEntry {
  return {
    map: toApiMap(entry),
    queuedBy: {
      login: entry.QueuedBy,
      displayName: entry.QueuedByDisplayName,
    },
    queuedAt: new Date(entry.QueuedAt).toISOString(),
  };
}

export function toApiMatch(match: MatchSummary): ApiMatch {
  return {
    id: match.id,
    mode: match.mode,
    map: { uid: match.map.uid, name: match.map.name },
    recordCount: match._count.records,
    createdAt: match.createdAt.toISOString(),
  };
}

export function toApiMatchDetail(
  match: NonNullable<Awaited<ReturnType<typeof getMatchAs>>>,
): ApiMatchDetail {
  return {
    ...toApiMatch(match),
    records: match.records.map((record) => ({
      login: record.login,
      nickName: record.user?.nickName ?? null,
      time: record.time,
      round: record.round,
      points: record.points,
    })),
  };
}

export function toApiScriptInfo(info: ModeScriptInfo): ApiScriptInfo {
  const describe = (d: {
    Name: string;
    Desc: string;
    Type: string;
    Default: string;
  }) => ({
    name: d.Name,
    description: d.Desc,
    type: d.Type,
    default: d.Default,
  });
  return {
    name: info.Name,
    description: info.Description,
    version: info.Version,
    compatibleMapTypes: info.CompatibleMapTypes,
    settings: (info.ParamDescs ?? []).map(describe),
    commands: (info.CommandDescs ?? []).map(describe),
  };
}

export function toApiInstalledPlugin(
  plugin: InstalledPlugin,
): ApiInstalledPlugin {
  const version = (v: InstalledPlugin["versions"][number]) => ({
    version: v.version,
    capabilities: v.capabilities,
    yanked: v.yanked,
  });
  return {
    id: plugin.pluginId,
    slug: plugin.slug,
    name: plugin.name,
    description: plugin.description,
    author: plugin.author,
    source: plugin.source,
    version: plugin.version,
    enabled: plugin.enabled,
    yanked: plugin.yanked,
    grantedCapabilities: plugin.grantedCapabilities,
    config: plugin.config,
    setSecrets: plugin.setSecrets,
    update: plugin.update ? version(plugin.update) : null,
    versions: plugin.versions.map(version),
  };
}

export function toApiServerScriptPlugin(
  plugin: ServerPlugin,
): ApiServerScriptPlugin {
  return {
    name: plugin.Name,
    settings: (plugin.SettingsDesc ?? []).map((d) => ({
      name: d.Name,
      description: d.Desc,
      type: d.Type,
      default: String(d.Default),
    })),
    values: plugin.SettingsValues ?? {},
  };
}
