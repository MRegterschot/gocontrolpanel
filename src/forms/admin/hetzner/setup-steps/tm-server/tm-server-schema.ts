import z from "zod";

export const TMServerSchema = z.object({
  dediLogin: z.string().min(1, { message: "Dedi login is required" }),
  dediPassword: z.string().min(1, { message: "Dedi password is required" }),
  roomPassword: z.string().optional(),
});

export type TMServerSchemaType = z.infer<typeof TMServerSchema>;
