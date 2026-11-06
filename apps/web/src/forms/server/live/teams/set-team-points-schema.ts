import z from "zod";

export const SetTeamPointsSchema = z.object({
  serverId: z.string().min(1, "Server ID is required"),
  team: z.string().min(1).max(1),
  points: z.number(),
});

export type SetTeamPointsSchemaType = z.infer<typeof SetTeamPointsSchema>;
