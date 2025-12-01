import { z } from "zod";

export const ServerSettingsSchema = z.object({
  defaultOptions: z.object({
    Name: z.string().min(1, "Server name is required"),
    Comment: z.string().optional(),
    Password: z.string().optional(),
    PasswordForSpectator: z.string().optional(),
    NextCallVoteTimeOut: z.coerce
      .number()
      .int()
      .min(0, "Vote Timeout must be atleast 0")
      .max(255, "Vote Timeout must be less than or equal 255"),
    CallVoteRatio: z.coerce
      .number()
      .min(-1, "Vote Ratio must be atleast -1")
      .max(100, "Vote Ratio must be less than or equal 100"),
    HideServer: z.coerce
      .number()
      .int()
      .min(0, "Server Visibility is required")
      .max(2, "Server Visibility is required"),
    NextMaxPlayers: z.coerce
      .number()
      .int()
      .min(0, "Max Players must be atleast 0")
      .max(255, "Max Players must be less than or equal to 255")
      .optional(),
    NextMaxSpectators: z.coerce
      .number()
      .int()
      .min(0, "Max Spectators must be atleast 0")
      .max(255, "Max Spectators must be less than or equal to 255")
      .optional(),
    KeepPlayerSlots: z.boolean(),
    AutoSaveReplays: z.boolean(),
    DisableHorns: z.boolean(),
    DisableServiceAnnounces: z.boolean(),
  }),

  allowMapDownload: z.boolean(),
  downloadRate: z.coerce.number().int().min(1, "Download Rate is required"),
  uploadRate: z.coerce.number().int().min(1, "Upload Rate is required"),
  profileSkins: z.boolean(),
});

export type ServerSettingsSchemaType = z.infer<typeof ServerSettingsSchema>;
