import z from "zod";

export const SetPlayerPointsSchema = z.object({
  serverId: z.string().min(1, "Server ID is required"),
  login: z.string().min(1, "Player login is required"),
  points: z.number(),
});

export type SetPlayerPointsSchemaType = z.infer<typeof SetPlayerPointsSchema>;
