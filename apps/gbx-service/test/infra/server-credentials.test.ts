import { encryptServerCredential } from "@tmcontrolpanel/shared/server-credentials";
import { afterEach, expect, it, vi } from "vitest";
import { PrismaServerRepository } from "../../src/infra/db/prisma-repositories";
afterEach(() => vi.unstubAllEnvs());
it("decrypts server credentials for XML-RPC and rejects legacy plaintext", async () => {
  const key = "test-only-service-credential-key-0123456789";
  vi.stubEnv("SECRETS_KEY", key);
  const row = {
    id: "server",
    password: encryptServerCredential("rpc-secret", key),
    groupServers: [],
    serverPlugins: [],
    theme: null,
  };
  const findFirst = vi.fn().mockResolvedValue(row);
  const repo = new PrismaServerRepository({ servers: { findFirst } } as never);
  expect((await repo.findById("server"))?.password).toBe("rpc-secret");
  findFirst.mockResolvedValue({ ...row, password: "legacy-secret" });
  await expect(repo.findById("server")).rejects.toThrow("migration");
});
