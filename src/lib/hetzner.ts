import crypto from "crypto";
import "server-only";
import config from "./config";
import { getClient } from "./dbclient";
import { logger } from "./logger";
import { Prisma } from "./prisma/generated";
import { getList } from "./utils";

const hetznerProjectUsersSchema =
  Prisma.validator<Prisma.HetznerProjectsInclude>()({
    hetznerProjectUsers: true,
  });

type HetznerProjectsWithUsers = Prisma.HetznerProjectsGetPayload<{
  include: typeof hetznerProjectUsersSchema;
}>;

const algorithm = "aes-256-gcm";
const ivLength = 12;
const key = crypto.createHash("sha256").update(config.HETZNER.KEY).digest();

export function encryptHetznerToken(token: string): string {
  const iv = crypto.randomBytes(ivLength);
  const cipher = crypto.createCipheriv(algorithm, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(token, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

export function decryptHetznerToken(encryptedBase64: string): string {
  const data = Buffer.from(encryptedBase64, "base64");
  const iv = data.subarray(0, ivLength);
  const tag = data.subarray(ivLength, ivLength + 16);
  const encrypted = data.subarray(ivLength + 16);

  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  decipher.setAuthTag(tag);

  try {
    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);
    return decrypted.toString("utf8");
  } catch (error) {
    logger.error(error, "Decryption failed");
    return encryptedBase64; // Return the original string if decryption fails
  }
}

export async function getHetznerProject(
  hetznerProjectId: string,
): Promise<HetznerProjectsWithUsers | null> {
  const db = getClient();
  const hetznerProject = await db.hetznerProjects.findUnique({
    where: {
      id: hetznerProjectId,
    },
    include: hetznerProjectUsersSchema,
  });

  if (!hetznerProject) {
    return null;
  }

  return {
    ...hetznerProject,
    apiTokens: getList<string>(hetznerProject.apiTokens).map((token) =>
      decryptHetznerToken(token),
    ),
  };
}
