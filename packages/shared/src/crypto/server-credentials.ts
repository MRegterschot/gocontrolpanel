import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";

export const SERVER_CREDENTIAL_PREFIX = "gcp-server:v1:";
function key(secret: string): Buffer {
  if (secret.length < 32)
    throw new Error(
      "SECRETS_KEY must contain at least 32 characters to store or read server credentials",
    );
  return createHash("sha256").update(secret).digest();
}
export function encryptServerCredential(plain: string, secret: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(secret), iv);
  const ciphertext = Buffer.concat([
    cipher.update(plain, "utf8"),
    cipher.final(),
  ]);
  return (
    SERVER_CREDENTIAL_PREFIX +
    Buffer.concat([iv, cipher.getAuthTag(), ciphertext]).toString("base64")
  );
}
export function decryptServerCredential(
  stored: string,
  secret: string,
): string {
  if (!stored.startsWith(SERVER_CREDENTIAL_PREFIX))
    throw new Error(
      "Server credentials need migration; run encrypt:server-credentials before starting the services",
    );
  const data = Buffer.from(
    stored.slice(SERVER_CREDENTIAL_PREFIX.length),
    "base64",
  );
  try {
    const cipher = createDecipheriv(
      "aes-256-gcm",
      key(secret),
      data.subarray(0, 12),
    );
    cipher.setAuthTag(data.subarray(12, 28));
    return Buffer.concat([
      cipher.update(data.subarray(28)),
      cipher.final(),
    ]).toString("utf8");
  } catch {
    throw new Error("Server credential decryption failed; verify SECRETS_KEY");
  }
}
