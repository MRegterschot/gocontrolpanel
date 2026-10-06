import z from "zod";

const hetznerNetworkNameSchema = z
  .string()
  .max(253, { message: "Network name must be at most 253 characters" })
  .regex(
    /^(?!-)[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*$/,
    {
      message:
        "Invalid network name: must be lowercase letters, digits, dashes, and dots; must start and end with a letter or digit.",
    },
  );

const ipRangeSchema = z
  .string()
  .min(1, {
    message: "IP range is required",
  })
  .refine(
    (value) => {
      // 1. Check basic CIDR pattern
      const cidrPattern = /^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/;
      if (!cidrPattern.test(value)) return false;

      const [ip, prefixStr] = value.split("/");
      const prefix = parseInt(prefixStr, 10);

      // 2. Validate prefix
      if (prefix < 0 || prefix > 32 || prefix > 24) return false;

      // 3. Parse IP into octets
      const octets = ip.split(".").map(Number);
      if (octets.length !== 4 || octets.some((n) => n < 0 || n > 255))
        return false;

      // 4. Ensure it's in RFC1918 private ranges
      const [a, b] = octets;

      const isPrivate =
        a === 10 || // 10.0.0.0/8
        (a === 172 && b >= 16 && b <= 31) || // 172.16.0.0 – 172.31.255.255
        (a === 192 && b === 168); // 192.168.0.0/16

      return isPrivate && prefix <= 24; // Recommend /16 or larger network
    },
    {
      message:
        "Must be a private CIDR IP (RFC1918), /24 or larger, and /16 recommended.",
    },
  );

export const AddHetznerNetworkSchema = z.object({
  name: hetznerNetworkNameSchema,
  ipRange: ipRangeSchema,
  subnets: z
    .array(
      z.object({
        type: z.enum(["cloud", "server", "vswitch"]),
        ipRange: z.string().optional(),
        networkZone: z.string().min(1, { message: "Network zone is required" }),
      }),
    )
    .min(1, {
      message: "At least one subnet must be defined",
    }),
});

export type AddHetznerNetworkSchemaType = z.infer<
  typeof AddHetznerNetworkSchema
>;
