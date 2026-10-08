import { ServerError } from "@/types/responses";
import { MIN_SECRET_LENGTH } from "@gcp/shared";
import crypto from "node:crypto";
import "server-only";
import config from "./config";

// API keys and other secrets stored in the database. Unlike the Hetzner token helpers this never
// falls back to returning the stored value: a key that can't be decrypted is an error.

const algorithm = "aes-256-gcm";
const ivLength = 12;
const tagLength = 16;
const version = "v1:";

export function canStoreSecrets(): boolean {
  return config.SECRETS_KEY.length >= MIN_SECRET_LENGTH;
}

function key(): Buffer {
  if (!canStoreSecrets()) {
    throw new ServerError(
      `SECRETS_KEY must be set to at least ${MIN_SECRET_LENGTH} characters to store API keys`,
      "SecretsKeyMissing",
    );
  }
  return crypto.createHash("sha256").update(config.SECRETS_KEY).digest();
}

export function encryptSecret(plain: string): string {
  const iv = crypto.randomBytes(ivLength);
  const cipher = crypto.createCipheriv(algorithm, key(), iv);
  const encrypted = Buffer.concat([
    cipher.update(plain, "utf8"),
    cipher.final(),
  ]);
  return (
    version +
    Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString("base64")
  );
}

// Throws when the value is not ours or SECRETS_KEY changed since it was stored
export function decryptSecret(stored: string): string {
  if (!stored.startsWith(version)) {
    throw new ServerError("Unknown secret format", "SecretDecryptFailed");
  }
  const data = Buffer.from(stored.slice(version.length), "base64");
  const decipher = crypto.createDecipheriv(
    algorithm,
    key(),
    data.subarray(0, ivLength),
  );
  decipher.setAuthTag(data.subarray(ivLength, ivLength + tagLength));
  try {
    return Buffer.concat([
      decipher.update(data.subarray(ivLength + tagLength)),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    throw new ServerError(
      "Stored secret could not be decrypted",
      "SecretDecryptFailed",
    );
  }
}

// What the UI shows instead of the key
export function secretHint(plain: string): string {
  return plain.length <= 12 ? "…" : `${plain.slice(0, 7)}…${plain.slice(-4)}`;
}
