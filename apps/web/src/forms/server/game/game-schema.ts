import { z } from "zod";

export const ShowOpponentsSchema = z.object({
  showOpponents: z.coerce.number().min(0, "Show Opponents must be atleast 0"),
});

export const ScriptNameSchema = z.object({
  scriptName: z.string().min(1, "Script Name is required"),
});

export const MatchSettingsSchema = z.object({
  filename: z.string().min(1, "Filename is required"),
});

export const PlaylistSchema = z.object({
  filename: z.string().min(1, "Filename is required"),
});

export const ModeScriptSettingsSchema = z.record(
  z.union([z.string(), z.number(), z.boolean()]),
);

export type ShowOpponentsSchemaType = z.infer<typeof ShowOpponentsSchema>;
export type ScriptNameSchemaType = z.infer<typeof ScriptNameSchema>;
export type MatchSettingsSchemaType = z.infer<typeof MatchSettingsSchema>;
export type PlaylistSchemaType = z.infer<typeof PlaylistSchema>;
export type ModeScriptSettingsSchemaType = z.infer<
  typeof ModeScriptSettingsSchema
>;
