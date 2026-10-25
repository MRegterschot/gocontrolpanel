import { ServerError } from "@/types/responses";
import { Prisma } from "@tmcontrolpanel/db";
import { MIN_SECRET_LENGTH } from "@tmcontrolpanel/shared";
import crypto from "crypto";
import "server-only";
import config from "./config";
import { getClient } from "./dbclient";
import { logger } from "./logger";
import { reportException } from "./sentry/report";
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

function deriveKey(secret: string): Buffer {
  return crypto.createHash("sha256").update(secret).digest();
}

// New values are only encrypted with a strong key; an empty key would be publicly known
function encryptionKey(): Buffer {
  if (config.HETZNER.KEY.length < MIN_SECRET_LENGTH) {
    throw new ServerError(
      `HETZNER_KEY must be set to at least ${MIN_SECRET_LENGTH} characters to store Hetzner tokens and SSH keys`,
      "HetznerKeyMissing",
    );
  }
  return deriveKey(config.HETZNER.KEY);
}

// The current key, then HETZNER_KEY_PREVIOUS so values stored before a key change still decrypt
function decryptionKeys(): Buffer[] {
  const keys: Buffer[] = [];
  if (config.HETZNER.KEY) keys.push(deriveKey(config.HETZNER.KEY));
  if (config.HETZNER.PREVIOUS_KEY !== undefined) {
    keys.push(deriveKey(config.HETZNER.PREVIOUS_KEY));
  }
  if (keys.length === 0) {
    throw new ServerError("HETZNER_KEY is not set", "HetznerKeyMissing");
  }
  return keys;
}

export function encryptHetznerToken(token: string): string {
  const iv = crypto.randomBytes(ivLength);
  const cipher = crypto.createCipheriv(algorithm, encryptionKey(), iv);

  const encrypted = Buffer.concat([
    cipher.update(token, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

// Throws when no configured key fits; never hands the stored value back as if it were the secret
export function decryptHetznerToken(encryptedBase64: string): string {
  const data = Buffer.from(encryptedBase64, "base64");
  const iv = data.subarray(0, ivLength);
  const tag = data.subarray(ivLength, ivLength + 16);
  const encrypted = data.subarray(ivLength + 16);

  for (const key of decryptionKeys()) {
    try {
      const decipher = crypto.createDecipheriv(algorithm, key, iv);
      decipher.setAuthTag(tag);
      return Buffer.concat([
        decipher.update(encrypted),
        decipher.final(),
      ]).toString("utf8");
    } catch {
      // Try the next key
    }
  }

  const meta = {
    type: "server",
    module: "hetzner",
    function: "decryptHetznerToken",
  };
  const error = new ServerError(
    "A stored Hetzner secret could not be decrypted; check HETZNER_KEY",
    "HetznerDecryptFailed",
  );
  logger.error({ meta }, error.message);
  reportException(error, meta);
  throw error;
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
