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
    nickName: z
      .string()
      .meta({
        description: "Display name, may contain Trackmania formatting tags",
      }),
    playerId: z.int(),
    teamId: z.int().meta({ description: "-1 without teams" }),
    spectator: z.boolean(),
  })
  .meta({ id: "Player" });

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

export const JukeboxEntrySchema = z
  .object({
    map: MapSchema,
    queuedBy: z.object({ login: z.string(), displayName: z.string() }),
    queuedAt: z.iso.datetime(),
  })
  .meta({ id: "JukeboxEntry" });

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
export type ApiMap = z.output<typeof MapSchema>;
export type ApiJukeboxEntry = z.output<typeof JukeboxEntrySchema>;
export type ApiMatch = z.output<typeof MatchSchema>;
export type ApiMatchDetail = z.output<typeof MatchDetailSchema>;
export type ApiErrorBody = z.output<typeof ApiErrorSchema>;
