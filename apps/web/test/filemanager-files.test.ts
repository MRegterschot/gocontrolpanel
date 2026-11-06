import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  fetch: vi.fn(),
  audit: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/actor", () => ({ requirePermission: vi.fn() }));
vi.mock("@/lib/logger", () => ({ getLogger: () => ({ info: vi.fn() }) }));
vi.mock("@/lib/managers/file-manager", () => ({
  getFileManager: async () => ({
    health: true,
    url: "https://fm.test",
    password: "test",
  }),
  fileManagerFetch: mocks.fetch,
  fileManagerUrl: (url: string, path: string) => url + path,
}));
vi.mock("@/actions/database/server-only/audit-logs", () => ({
  logAudit: mocks.audit,
}));

import {
  createEntryAs,
  readFileBytesAs,
} from "@/actions/filemanager/server-only/files";
import type { Actor } from "@/lib/actor";

const actor = { userId: "user-a" } as Actor;

beforeEach(() => vi.clearAllMocks());

describe("file manager errors", () => {
  it.each([
    [409, "FileExists"],
    [400, "FileCreateError"],
  ])("preserves the create error body for status %s", async (status, name) => {
    mocks.fetch.mockResolvedValue(
      new Response("Folder already exists", { status }),
    );
    await expect(
      createEntryAs(actor, "server-a", { path: "Maps/Event", isDir: true }),
    ).rejects.toMatchObject({ name, message: "Folder already exists" });
    expect(mocks.audit).toHaveBeenCalledWith(
      "user-a",
      "server-a",
      "server.files.create",
      { path: "Maps/Event", isDir: true },
      "Folder already exists",
    );
  });

  it("maps missing files to NotFound", async () => {
    mocks.fetch.mockResolvedValue(new Response("missing", { status: 404 }));
    await expect(
      readFileBytesAs(actor, "server-a", "/UserData/Maps/missing.txt"),
    ).rejects.toMatchObject({ name: "NotFound" });
  });
});
