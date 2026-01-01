import z from "zod";
import { ConfigFinishTimeoutSchema } from "./enums";

export const ConfigRoundsSchema = z.object({
  finishTimeout: ConfigFinishTimeoutSchema,
  mapsPerMatch: z.number().int(),
  pointsLimit: z.number().int().nonnegative(),
  useCustomPointsRepartition: z.boolean(),
  pointsRepartition: z.array(z.number().int().nonnegative()),
  roundsPerMap: z.number().int(),
  useTieBreaker: z.boolean(),
});

export type ConfigRoundsSchemaType = z.infer<typeof ConfigRoundsSchema>;
