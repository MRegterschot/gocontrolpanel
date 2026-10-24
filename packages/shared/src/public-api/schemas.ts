import { z } from "zod/v4";

// Same rule as the web's assertResourceId: no empty IDs, nothing that changes a path
export const resourceId = z
  .string()
  .regex(/^[A-Za-z0-9_-]{1,64}$/)
  .meta({
    description: "Resource ID",
    example: "3f1c2a9e-8d4b-4c4e-9b7a-1f2e3d4c5b6a",
  });

export const playerLogin = z
  .string()
  .regex(/^[A-Za-z0-9_-]{1,64}$/)
  .meta({
    description: "Trackmania account login",
    example: "v8XxSOkeTqy7tw8DGcZd0Q",
  });

export const mapUid = z
  .string()
  .regex(/^[A-Za-z0-9_-]{1,64}$/)
  .meta({ description: "Map UID", example: "Tp9Ozi0W0DMRwv1MJHTtD6cTgw0" });

// A path below the server's Maps folder; the dedicated server resolves it from there
export const mapFileName = z
  .string()
  .max(255)
  .regex(/^(?!\/)(?!.*(^|\/)\.{1,2}(\/|$))[^\\:*?"<>|]+\.Map\.Gbx$/i)
  .meta({
    description: "Path below the server's Maps folder",
    example: "Downloaded/Spring 2026 - 01.Map.Gbx",
  });

// A list of map UIDs in a new order; it must hold exactly the current entries
export const uidOrderBody = z.object({
  uids: z.array(mapUid).min(1).max(1000),
});

const time = z.int().meta({ description: "Time in milliseconds; -1 is a DNF" });
const medal = z.int().meta({ description: "Medal time in milliseconds" });

export const serverParams = z.object({ serverId: resourceId });

export const ApiErrorSchema = z
  .object({
    error: z.object({
      code: z.string().meta({ example: "Unauthorized" }),
      message: z.string(),
      issues: z
        .array(z.object({ path: z.string(), message: z.string() }))
        .optional()
        .meta({ description: "Validation problems, for 400 responses" }),
    }),
  })
  .meta({ id: "Error" });

export const ServerSchema = z
  .object({
    id: resourceId,
    name: z.string(),
    description: z.string(),
  })
  .meta({ id: "Server" });

export const PlayerSchema = z
  .object({
    login: z.string(),
    nickName: z.string().meta({
      description: "Display name, may contain Trackmania formatting tags",
    }),
    playerId: z.int(),
    teamId: z.int().meta({ description: "-1 without teams" }),
    spectator: z.boolean(),
  })
  .meta({ id: "Player" });

export const ListedPlayerSchema = z
  .object({
    login: z.string(),
    nickName: z.string().meta({
      description:
        "Display name, or - when the server does not know the player",
    }),
  })
  .meta({ id: "ListedPlayer" });

// Same rule as the web's validateListFilename, which checks it again
export const listFileBody = z.object({
  filename: z
    .string()
    .max(255)
    .regex(/^(?!\/)(?!.*(^|\/)\.{1,2}(\/|$))[\w .\/-]+\.(txt|xml)$/i)
    .meta({
      description: "Relative .txt or .xml file on the dedicated server",
      example: "blacklist.txt",
    }),
});

export const MapSummarySchema = z
  .object({
    uid: z.string(),
    name: z
      .string()
      .meta({ description: "May contain Trackmania formatting tags" }),
  })
  .meta({ id: "MapSummary" });

export const MapSchema = MapSummarySchema.extend({
  fileName: z.string(),
  author: z.string().meta({ description: "Author login" }),
  authorNickname: z.string(),
  medals: z.object({
    author: medal,
    gold: medal,
    silver: medal,
    bronze: medal,
  }),
}).meta({ id: "Map" });

export const CurrentMapsSchema = z
  .object({ current: MapSchema, next: MapSchema })
  .meta({ id: "CurrentMaps" });

export const JukeboxEntrySchema = z
  .object({
    map: MapSchema,
    queuedBy: z.object({ login: z.string(), displayName: z.string() }),
    queuedAt: z.iso.datetime(),
  })
  .meta({ id: "JukeboxEntry" });

const currentAndNext = <S extends z.ZodType>(value: S) =>
  z.object({
    current: value,
    next: value.meta({ description: "Takes effect on the next map" }),
  });

export const GameSchema = z
  .object({
    script: currentAndNext(z.string()).meta({
      description: "Game mode script",
    }),
    showOpponents: currentAndNext(z.int()).meta({
      description:
        "Forced opponent visibility; 0 keeps the players' choice, 1 shows all",
    }),
  })
  .meta({ id: "Game" });

const scriptDescription = z.object({
  name: z.string(),
  description: z.string(),
  type: z.string(),
  default: z.string(),
});

export const ScriptInfoSchema = z
  .object({
    name: z.string(),
    description: z.string(),
    version: z.string(),
    compatibleMapTypes: z.string(),
    settings: z.array(scriptDescription),
    commands: z.array(scriptDescription),
  })
  .meta({ id: "ScriptInfo" });

export const scriptSettingValue = z.union([
  z.string(),
  z.number(),
  z.boolean(),
]);

export const ScriptSettingsSchema = z
  .record(z.string(), scriptSettingValue)
  .meta({ id: "ScriptSettings", example: { S_TimeLimit: 300 } });

export const pointsType = z.enum(["round", "map", "match"]);

export const MatchSchema = z
  .object({
    id: resourceId,
    mode: z.string().meta({ description: "Game mode script name" }),
    map: MapSummarySchema,
    recordCount: z.int(),
    createdAt: z.iso.datetime(),
  })
  .meta({ id: "Match" });

export const MatchRecordSchema = z
  .object({
    login: z.string().nullable(),
    nickName: z.string().nullable(),
    time,
    round: z.int().nullable(),
    points: z.int().nullable(),
  })
  .meta({ id: "MatchRecord" });

export const MatchDetailSchema = MatchSchema.extend({
  records: z.array(MatchRecordSchema),
}).meta({ id: "MatchDetail" });

export const PaginationSchema = z
  .object({
    page: z.int().min(1),
    pageSize: z.int().min(1),
    total: z.int().min(0),
  })
  .meta({ id: "Pagination" });

export const paginationQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export function dataOf<S extends z.ZodType>(schema: S) {
  return z.object({ data: schema });
}

export function pageOf<S extends z.ZodType>(item: S) {
  return z.object({ data: z.array(item), pagination: PaginationSchema });
}

export type ApiServer = z.output<typeof ServerSchema>;
export type ApiPlayer = z.output<typeof PlayerSchema>;
export type ApiListedPlayer = z.output<typeof ListedPlayerSchema>;
export type ApiMap = z.output<typeof MapSchema>;
export type ApiCurrentMaps = z.output<typeof CurrentMapsSchema>;
export type ApiJukeboxEntry = z.output<typeof JukeboxEntrySchema>;
export type ApiGame = z.output<typeof GameSchema>;
export type ApiScriptInfo = z.output<typeof ScriptInfoSchema>;
export type ApiMatch = z.output<typeof MatchSchema>;
export type ApiMatchDetail = z.output<typeof MatchDetailSchema>;
export type ApiErrorBody = z.output<typeof ApiErrorSchema>;
