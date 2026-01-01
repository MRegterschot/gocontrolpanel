import z from "zod";
import {
  ConfigLapsNumberSchema,
  ConfigRespawnBehaviourSchema,
  ConfigWarmupDurationSchema,
  ConfigWarmupTimeoutSchema,
} from "./enums";

export const ConfigCommonSchema = z.object({
  chatTime: z.coerce.number().int().nonnegative(),
  respawnBehaviour: ConfigRespawnBehaviourSchema,

  delayBeforeNextMap: z.number().int().nonnegative(),

  synchronizePlayersAtMapStart: z.boolean(),
  synchronizePlayersAtRoundStart: z.boolean(),
  trustClientSimulation: z.boolean(),
  useCrudeExtrapolation: z.boolean(),

  warmupDuration: ConfigWarmupDurationSchema,
  warmupTimeout: ConfigWarmupTimeoutSchema,
  warmupNumber: z.number().int().nonnegative(),

  decoImageUrlCheckpoint: z.string(),
  decoImageUrlDecalSponsor4X1: z.string(),
  decoImageUrlScreen16X1: z.string(),
  decoImageUrlScreen16X9: z.string(),
  decoImageUrlScreen8X1: z.string(),
  decoImageUrlWhoAmIUrl: z.string(),

  forceLapsNumber: ConfigLapsNumberSchema,
});

export type ConfigCommonSchemaType = z.infer<typeof ConfigCommonSchema>;
