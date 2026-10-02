import { z } from "zod";

// Stored plugin configs (server_plugins.config). Lenient on purpose: unknown keys are
// kept so older rows written by the web forms keep loading.

export const ecmPluginConfigSchema = z
  .object({
    apiKey: z.string().optional(),
    isRecording: z.boolean().optional(),
    editors: z.array(z.string()).optional(),
  })
  .passthrough();
export type ECMPluginConfig = z.infer<typeof ecmPluginConfigSchema>;

export const liveRoundPluginConfigSchema = z
  .object({
    localRecordText: z.string().optional(),
    showPoints: z.boolean().optional(),
    rowCount: z.number().optional(),
  })
  .passthrough();
export type LiveRoundPluginConfig = z.infer<typeof liveRoundPluginConfigSchema>;

export const recordsInfoPluginConfigSchema = z
  .object({
    localRecordText: z.string().optional(),
  })
  .passthrough();
export type RecordsInfoPluginConfig = z.infer<
  typeof recordsInfoPluginConfigSchema
>;

export const playerInfoPluginConfigSchema = z
  .object({
    playerInfos: z
      .array(
        z.object({
          login: z.string(),
          device: z.string().optional(),
          camera: z.string().optional(),
        }),
      )
      .optional(),
  })
  .passthrough();
export type PlayerInfoPluginConfig = z.infer<
  typeof playerInfoPluginConfigSchema
>;

export const matchPickAndBanSchema = z.object({
  type: z.enum(["player", "team"]).optional(),
  // Serialized order, e.g. "b:1,b:2,p:2,p:1,r"
  order: z.string().default(""),
  choosePosition: z.boolean().default(false),
  // Seconds per turn before a random map is chosen; 0/unset disables it
  timeout: z.coerce.number().min(0).optional(),
  teams: z
    .array(
      z.object({
        seed: z.number(),
        name: z.string().optional(),
        players: z.array(z.string()),
      }),
    )
    .optional(),
  players: z
    .array(
      z.object({
        login: z.string(),
        seed: z.number(),
      }),
    )
    .optional(),
});
export type MatchPluginPickAndBan = z.infer<typeof matchPickAndBanSchema>;

export const matchPluginConfigSchema = z
  .object({
    admins: z.array(z.string()).optional(),
    maps: z.array(z.string()).optional(),
    pickAndBan: matchPickAndBanSchema.optional(),
    script: z.string().optional(),
    lobby: z
      .object({
        script: z.string().optional(),
        map: z.string().optional(),
      })
      .optional(),
  })
  .passthrough();
export type MatchPluginConfig = z.infer<typeof matchPluginConfigSchema>;

export type PickAndBanOrderItem =
  | { action: "pick"; seed: number }
  | { action: "ban"; seed: number }
  | { action: "random" };

export function pickAndBanToString(order: PickAndBanOrderItem[]): string {
  return order
    .map((item) => {
      if (item.action === "pick") return `p:${item.seed}`;
      if (item.action === "ban") return `b:${item.seed}`;
      return "r";
    })
    .join(",");
}

export function stringToPickAndBan(str?: string): PickAndBanOrderItem[] {
  if (!str) return [];

  return str.split(",").map((item) => {
    const [action, seed] = item.trim().split(":");
    if (action === "p") return { action: "pick", seed: parseInt(seed, 10) };
    if (action === "b") return { action: "ban", seed: parseInt(seed, 10) };
    if (action === "r") return { action: "random" };
    throw new Error(`Invalid pick and ban item: ${item}`);
  });
}
