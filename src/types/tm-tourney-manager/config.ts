import z from "zod";
import { ConfigCommonSchema } from "./config/common";
import { ConfigRoundsSchema } from "./config/rounds";
import { ConfigServerOptionsSchema } from "./config/server-options";

export const ModeConfigSchema = z.discriminatedUnion("tag", [
  z.object({
    tag: z.literal("Rounds"),
    value: ConfigRoundsSchema,
  }),
]);

export type ModeConfigSchemaType = z.infer<typeof ModeConfigSchema>;

export const MapPoolConfigSchema = z.object({
  start: z.number().int().nonnegative(),
  mapUids: z.array(z.string()),
});

export type MapPoolConfigSchemaType = z.infer<typeof MapPoolConfigSchema>;

export const ServerConfigSchema = z.object({
  options: ConfigServerOptionsSchema,
  common: ConfigCommonSchema,
  mode: ModeConfigSchema,
  maps: MapPoolConfigSchema,
});

export type ServerConfigSchemaType = z.infer<typeof ServerConfigSchema>;
