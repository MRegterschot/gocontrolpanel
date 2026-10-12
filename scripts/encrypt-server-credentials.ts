import { createPrismaClient } from "@gcp/db";
import {
  decryptServerCredential,
  encryptServerCredential,
  SERVER_CREDENTIAL_PREFIX,
} from "@gcp/shared/server-credentials";

// Run after the schema migration, with both services stopped and a database backup available.
const secret = process.env.SECRETS_KEY ?? "";
encryptServerCredential("", secret); // Validate before touching the database.
const db = createPrismaClient();
let updated = 0;
try {
  let cursor: string | undefined;
  for (;;) {
    const rows = await db.servers.findMany({
      orderBy: { id: "asc" },
      take: 100,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: { id: true, password: true, filemanagerPassword: true },
    });
    if (!rows.length) break;
    for (const row of rows) {
      const encrypt = (value: string) => {
        if (value.startsWith(SERVER_CREDENTIAL_PREFIX)) {
          decryptServerCredential(value, secret); // Do not silently accept another key's ciphertext.
          return value;
        }
        return encryptServerCredential(value, secret);
      };
      const password = encrypt(row.password);
      const filemanagerPassword =
        row.filemanagerPassword === null
          ? null
          : encrypt(row.filemanagerPassword);
      const result = await db.servers.updateMany({
        where: {
          id: row.id,
          password: row.password,
          filemanagerPassword: row.filemanagerPassword,
        },
        data: { password, filemanagerPassword },
      });
      if (result.count !== 1)
        throw new Error(
          "A server changed during migration; stop services and retry",
        );
      updated++;
    }
    cursor = rows.at(-1)!.id;
  }
  console.log(`Verified/encrypted credentials for ${updated} servers.`);
} finally {
  await db.$disconnect();
}
