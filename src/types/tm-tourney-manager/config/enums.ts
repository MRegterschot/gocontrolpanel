import z from "zod";

export const ConfigRespawnBehaviourSchema = z.discriminatedUnion("tag", [
  z.object({ tag: z.literal("Default") }),
  z.object({ tag: z.literal("TimeAttack") }),
  z.object({ tag: z.literal("Ignore") }),
  z.object({ tag: z.literal("GiveUpAtStart") }),
  z.object({ tag: z.literal("GiveUpAlways") }),
  z.object({ tag: z.literal("GiveUpNever") }),
]);

export type ConfigRespawnBehaviourSchemaType = z.infer<
  typeof ConfigRespawnBehaviourSchema
>;

export const ConfigFinishTimeoutSchema = z.discriminatedUnion("tag", [
  z.object({ tag: z.literal("BasedOnMedal") }),
  z.object({
    tag: z.literal("Seconds"),
    value: z.number().int().nonnegative(),
  }),
]);

export type ConfigFinishTimeoutSchemaType = z.infer<
  typeof ConfigFinishTimeoutSchema
>;

export const ConfigWarmupDurationSchema = z.discriminatedUnion("tag", [
  z.object({ tag: z.literal("OneTry") }),
  z.object({ tag: z.literal("BasedOnMedal") }),
  z.object({
    tag: z.literal("Seconds"),
    value: z.number().int().nonnegative(),
  }),
]);

export type ConfigWarmupDurationSchemaType = z.infer<
  typeof ConfigWarmupDurationSchema
>;

export const ConfigWarmupTimeoutSchema = z.discriminatedUnion("tag", [
  z.object({ tag: z.literal("BasedOnMedal") }),
  z.object({
    tag: z.literal("Seconds"),
    value: z.number().int().nonnegative(),
  }),
]);

export type ConfigWarmupTimeoutSchemaType = z.infer<
  typeof ConfigWarmupTimeoutSchema
>;

export const ConfigLapsNumberSchema = z.discriminatedUnion("tag", [
  z.object({ tag: z.literal("Validation") }),
  z.object({ tag: z.literal("Independent") }),
  z.object({
    tag: z.literal("Laps"),
    value: z.number().int().nonnegative(),
  }),
]);

export type ConfigLapsNumberSchemaType = z.infer<typeof ConfigLapsNumberSchema>;

export const ConfigMapsPerMatchSchema = z.discriminatedUnion("tag", [
  z.object({ tag: z.literal("One") }),
  z.object({
    tag: z.literal("Maps"),
    value: z.number().int().nonnegative(),
  }),
]);

export type ConfigMapsPerMatchSchemaType = z.infer<
  typeof ConfigMapsPerMatchSchema
>;

export const ConfigPointsLimitSchema = z.discriminatedUnion("tag", [
  z.object({ tag: z.literal("Unlimited") }),
  z.object({
    tag: z.literal("PointsLimit"),
    value: z.number().int().nonnegative(),
  }),
]);

export type ConfigPointsLimitSchemaType = z.infer<
  typeof ConfigPointsLimitSchema
>;

export const ConfigRoundsPerMapSchema = z.discriminatedUnion("tag", [
  z.object({ tag: z.literal("Unlimited") }),
  z.object({
    tag: z.literal("Rounds"),
    value: z.number().int().nonnegative(),
  }),
]);
