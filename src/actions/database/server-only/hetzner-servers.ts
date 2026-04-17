import { getClient } from "@/lib/dbclient";
import { decryptHetznerToken, encryptHetznerToken } from "@/lib/hetzner";
import { HetznerServers } from "@/lib/prisma/generated";
import "server-only";

export async function getDBHetznerServer(
  hetznerId: number,
): Promise<HetznerServers | null> {
  const db = getClient();

  const result = await db.hetznerServers.findUnique({
    where: { hetznerId },
  });

  if (!result) {
    return null;
  }

  return {
    ...result,
    privateKey: result.privateKey
      ? Buffer.from(
          decryptHetznerToken(
            Buffer.from(result.privateKey).toString("base64"),
          ),
          "utf-8",
        )
      : null,
  };
}

export async function createDBHetznerServer(hetznerServer: {
  hetznerId: number;
  publicKey: string;
  privateKey: string;
}): Promise<HetznerServers> {
  const db = getClient();

  return await db.hetznerServers.create({
    data: {
      ...hetznerServer,
      privateKey: Buffer.from(
        encryptHetznerToken(hetznerServer.privateKey),
        "base64",
      ),
    },
  });
}

export async function deleteDBHetznerServer(hetznerId: number): Promise<void> {
  const db = getClient();

  await db.hetznerServers.deleteMany({
    where: { hetznerId },
  });
}
