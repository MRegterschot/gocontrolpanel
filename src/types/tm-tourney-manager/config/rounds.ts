import z from "zod";
import {
  ConfigFinishTimeoutSchema,
  ConfigMapsPerMatchSchema,
  ConfigPointsLimitSchema,
  ConfigRoundsPerMapSchema,
} from "./enums";

export const ConfigRoundsSchema = z.object({
  finishTimeout: ConfigFinishTimeoutSchema,
  mapsPerMatch: ConfigMapsPerMatchSchema,
  pointsLimit: ConfigPointsLimitSchema,
  useCustomPointsRepartition: z.boolean(),
  pointsRepartition: z.array(z.coerce.number().int().nonnegative()),
  roundsPerMap: ConfigRoundsPerMapSchema,
  useTieBreaker: z.boolean(),
});

export type ConfigRoundsSchemaType = z.infer<typeof ConfigRoundsSchema>;
