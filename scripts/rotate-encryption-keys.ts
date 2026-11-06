import { createPrismaClient } from "@tmcontrolpanel/db";
import {
  decryptServerCredential,
  encryptServerCredential,
  LEGACY_SERVER_CREDENTIAL_PREFIX,
  SERVER_CREDENTIAL_PREFIX,
} from "@tmcontrolpanel/shared/server-credentials";
import crypto from "node:crypto";

// Re-encrypts stored secrets from the OLD_* keys to the new SECRETS_KEY / HETZNER_KEY.
// Run with both services stopped and a backup available; everything happens in one transaction.

const dryRun = process.argv.includes("--dry-run");
const env = (name: string) => process.env[name] ?? "";

const oldSecrets = env("OLD_SECRETS_KEY");
const newSecrets = env("SECRETS_KEY");
const oldHetzner = [env("OLD_HETZNER_KEY"), env("OLD_HETZNER_KEY_PREVIOUS")];
const newHetzner = env("HETZNER_KEY");

for (const [name, value] of [
  ["OLD_SECRETS_KEY", oldSecrets],
  ["SECRETS_KEY", newSecrets],
  ["OLD_HETZNER_KEY", oldHetzner[0]],
  ["HETZNER_KEY", newHetzner],
] as const) {
  if (!value) throw new Error(`${name} is not set`);
}
if (newSecrets.length < 32 || newHetzner.length < 32)
  throw new Error("SECRETS_KEY and HETZNER_KEY need at least 32 characters");

// Same scheme as apps/web/src/lib/secrets.ts and hetzner.ts: AES-256-GCM, iv(12) | tag(16) | data
const deriveKey = (secret: string) =>
  crypto.createHash("sha256").update(secret).digest();

function seal(plain: string, secret: string): Buffer {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", deriveKey(secret), iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), data]);
}

function open(sealed: Buffer, secrets: string[], what: string): string {
  for (const secret of secrets.filter(Boolean)) {
    try {
      const decipher = crypto.createDecipheriv(
        "aes-256-gcm",
        deriveKey(secret),
        sealed.subarray(0, 12),
      );
      decipher.setAuthTag(sealed.subarray(12, 28));
      return Buffer.concat([
        decipher.update(sealed.subarray(28)),
        decipher.final(),
      ]).toString("utf8");
    } catch {
      // Try the next key
    }
  }
  throw new Error(`${what} could not be decrypted with the old key`);
}

const codriverPrefix = "v1:";
function rekeyCodriver(stored: string | null, what: string): string | null {
  if (stored === null) return null;
  if (!stored.startsWith(codriverPrefix))
    throw new Error(`${what} has an unknown format`);
  const plain = open(
    Buffer.from(stored.slice(codriverPrefix.length), "base64"),
    [oldSecrets],
    what,
  );
  return codriverPrefix + seal(plain, newSecrets).toString("base64");
}

function rekeyServerCredential(stored: string, what: string): string {
  if (
    !stored.startsWith(SERVER_CREDENTIAL_PREFIX) &&
    !stored.startsWith(LEGACY_SERVER_CREDENTIAL_PREFIX)
  )
    throw new Error(
      `${what} is not encrypted; run encrypt:server-credentials with the old SECRETS_KEY first`,
    );
  try {
    return encryptServerCredential(
      decryptServerCredential(stored, oldSecrets),
      newSecrets,
    );
  } catch {
    throw new Error(`${what} could not be decrypted with the old key`);
  }
}

const rekeyHetzner = (stored: Buffer, what: string) =>
  seal(open(stored, oldHetzner, what), newHetzner);

const db = createPrismaClient();
const counts = {
  servers: 0,
  codriver: 0,
  hetznerProjects: 0,
  hetznerServers: 0,
};
try {
  await db.$transaction(
    async (tx) => {
      // Soft-deleted rows are included: they still hold ciphertext
      for (const row of await tx.servers.findMany({
        select: { id: true, password: true, filemanagerPassword: true },
      })) {
        const password = rekeyServerCredential(
          row.password,
          `Server ${row.id} password`,
        );
        const filemanagerPassword =
          row.filemanagerPassword === null
            ? null
            : rekeyServerCredential(
                row.filemanagerPassword,
                `Server ${row.id} file manager password`,
              );
        if (!dryRun)
          await tx.servers.update({
            where: { id: row.id },
            data: { password, filemanagerPassword },
          });
        counts.servers++;
      }

      for (const row of await tx.codriverPanelSettings.findMany()) {
        const sharedApiKeyEncrypted = rekeyCodriver(
          row.sharedApiKeyEncrypted,
          "Codriver shared key",
        );
        const jevApiKeyEncrypted = rekeyCodriver(
          row.jevApiKeyEncrypted,
          "Codriver Jev key",
        );
        if (!dryRun)
          await tx.codriverPanelSettings.update({
            where: { id: row.id },
            data: { sharedApiKeyEncrypted, jevApiKeyEncrypted },
          });
        counts.codriver++;
      }

      for (const row of await tx.codriverSettings.findMany({
        where: { apiKeyEncrypted: { not: null } },
        select: { serverId: true, apiKeyEncrypted: true },
      })) {
        const apiKeyEncrypted = rekeyCodriver(
          row.apiKeyEncrypted,
          `Codriver key of server ${row.serverId}`,
        );
        if (!dryRun)
          await tx.codriverSettings.update({
            where: { serverId: row.serverId },
            data: { apiKeyEncrypted },
          });
        counts.codriver++;
      }

      for (const row of await tx.hetznerProjects.findMany({
        select: { id: true, apiTokens: true },
      })) {
        // Json on MySQL, String[] on PostgreSQL; both are an array of base64 strings
        const tokens = Array.isArray(row.apiTokens)
          ? (row.apiTokens as string[])
          : [];
        const apiTokens = tokens.map((token) =>
          rekeyHetzner(
            Buffer.from(token, "base64"),
            `Hetzner project ${row.id} token`,
          ).toString("base64"),
        );
        if (!dryRun)
          await tx.hetznerProjects.update({
            where: { id: row.id },
            data: { apiTokens: apiTokens as never },
          });
        counts.hetznerProjects++;
      }

      for (const row of await tx.hetznerServers.findMany({
        where: { privateKey: { not: null } },
        select: { id: true, privateKey: true },
      })) {
        const privateKey = rekeyHetzner(
          Buffer.from(row.privateKey!),
          `Hetzner server ${row.id} SSH key`,
        );
        if (!dryRun)
          await tx.hetznerServers.update({
            where: { id: row.id },
            data: { privateKey: new Uint8Array(privateKey) },
          });
        counts.hetznerServers++;
      }
    },
    { timeout: 120_000 },
  );
  console.log(
    `${dryRun ? "Dry run, nothing written. Would re-encrypt" : "Re-encrypted"}: ` +
      `${counts.servers} servers, ${counts.codriver} Codriver keys, ` +
      `${counts.hetznerProjects} Hetzner projects, ${counts.hetznerServers} Hetzner SSH keys.`,
  );
} finally {
  await db.$disconnect();
}
