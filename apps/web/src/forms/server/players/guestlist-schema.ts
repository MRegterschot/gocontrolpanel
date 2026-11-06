import { z } from "zod";

export const guestlistSchema = z.object({
  filename: z.string().min(1, "Filename is required"),
});

export type GuestlistSchemaType = z.infer<typeof guestlistSchema>;
