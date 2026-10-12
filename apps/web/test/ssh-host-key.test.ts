import { generateKeyPairSync } from "node:crypto";
import type { AddressInfo } from "node:net";
import { Server } from "ssh2";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const updateMany = vi.hoisted(() => vi.fn());
vi.mock("server-only", () => ({}));
vi.mock("@/lib/dbclient", () => ({
  getClient: () => ({ hetznerServers: { updateMany } }),
}));

import { connectToSSHServer } from "@/lib/ssh";

const pem = () =>
  generateKeyPairSync("rsa", {
    modulusLength: 2048,
    privateKeyEncoding: { type: "pkcs1", format: "pem" },
    publicKeyEncoding: { type: "pkcs1", format: "pem" },
  }).privateKey;

const clientKey = pem();
let server: Server;
let port: number;

beforeAll(async () => {
  server = new Server({ hostKeys: [pem()] }, (client) => {
    client.on("authentication", (ctx) => ctx.accept());
    client.on("error", () => {});
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  port = (server.address() as AddressInfo).port;
});

afterAll(() => server.close());

describe("SSH host key pinning", () => {
  it("pins the key on first use, then requires it", async () => {
    const first = await connectToSSHServer(
      "127.0.0.1",
      port,
      "root",
      clientKey,
      {
        hetznerId: 1,
        hostKeyFingerprint: null,
      },
    );
    first.end();
    const pinned = updateMany.mock.calls[0][0].data.hostKeyFingerprint;
    expect(pinned).toMatch(/^SHA256:/);

    const again = await connectToSSHServer(
      "127.0.0.1",
      port,
      "root",
      clientKey,
      {
        hetznerId: 1,
        hostKeyFingerprint: pinned,
      },
    );
    again.end();
  });

  it("refuses a different host key", async () => {
    await expect(
      connectToSSHServer("127.0.0.1", port, "root", clientKey, {
        hetznerId: 1,
        hostKeyFingerprint: "SHA256:somethingelse",
      }),
    ).rejects.toThrow(/host key changed/);
  });
});
