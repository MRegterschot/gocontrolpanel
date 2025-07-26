import z from "zod";

const hetznerVolumeNameSchema = z
  .string()
  .max(64, "Volume name must be at most 64 characters")
  .regex(
    /^[a-zA-Z0-9](?:[a-zA-Z0-9._-]*[a-zA-Z0-9])?$/,
    "Volume name must start and end with an alphanumeric character and may contain alphanumerics, dashes, underscores, and dots",
  );

export const AddHetznerVolumeSchema = z.object({
  size: z
    .number()
    .min(10, "Size must be at least 10 GB")
    .max(10240, "Size must be at most 10 TB"),
  name: hetznerVolumeNameSchema,
  location: z.string(),
});

export type AddHetznerVolumeSchemaType = z.infer<typeof AddHetznerVolumeSchema>;
