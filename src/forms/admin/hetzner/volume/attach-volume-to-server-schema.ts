import z from "zod";

export const AttachVolumeToServerSchema = z.object({
  volumeId: z.string().min(1, "Volume ID is required"),
  serverId: z.string().min(1, "Server ID is required"),
});

export type AttachVolumeToServerSchemaType = z.infer<typeof AttachVolumeToServerSchema>;