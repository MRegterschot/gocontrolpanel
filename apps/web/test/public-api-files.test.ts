import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authenticate: vi.fn(),
  list: vi.fn(),
  read: vi.fn(),
  writeText: vi.fn(),
  upload: vi.fn(),
  create: vi.fn(),
  move: vi.fn(),
  remove: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/logger", () => ({ logger: { error: vi.fn(), warn: vi.fn() } }));
vi.mock("@/lib/sentry/report", () => ({ reportException: vi.fn() }));
vi.mock("@/lib/ratelimiter", () => ({
  takeRateLimitToken: async () => ({ allowed: true, retryAfterMs: 0 }),
}));
vi.mock("@/lib/api-keys/authenticate", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  authenticateApiKey: mocks.authenticate,
}));
vi.mock("@/services/filemanager", () => ({ listDirectoryAs: mocks.list }));
vi.mock("@/actions/filemanager/server-only/files", () => ({
  readFileBytesAs: mocks.read,
  writeFileTextAs: mocks.writeText,
  uploadFilesAs: mocks.upload,
  createEntryAs: mocks.create,
  moveEntriesAs: mocks.move,
  deleteEntriesAs: mocks.remove,
}));

import * as contentRoute from "@/app/api/v1/servers/[serverId]/files/content/route";
import * as deleteRoute from "@/app/api/v1/servers/[serverId]/files/delete/route";
import * as foldersRoute from "@/app/api/v1/servers/[serverId]/files/folders/route";
import * as moveRoute from "@/app/api/v1/servers/[serverId]/files/move/route";
import * as filesRoute from "@/app/api/v1/servers/[serverId]/files/route";
import { encodeFile } from "@/lib/public-api/files";
import { actor, onA, principal, req } from "./helpers/public-api";

const entry = (path: string, isDir = false) => ({
  name: path.split("/").pop(),
  path,
  isDir,
  size: isDir ? undefined : 10,
  lastModified: new Date("2026-10-24T10:00:00.000Z"),
});

beforeEach(() => {
  vi.clearAllMocks();
  mocks.authenticate.mockResolvedValue(principal());
});

describe("encodeFile", () => {
  it("keeps text as utf8 and anything else as base64", () => {
    expect(encodeFile(Buffer.from("héllo"))).toEqual({
      encoding: "utf8",
      content: "héllo",
    });
    expect(encodeFile(Buffer.from([0x47, 0x42, 0x58, 0x00, 0xff]))).toEqual({
      encoding: "base64",
      content: "R0JYAP8=",
    });
    expect(encodeFile(Buffer.from([0xc3, 0x28])).encoding).toBe("base64");
  });
});

describe("v1 files", () => {
  it("lists a folder with paths relative to UserData", async () => {
    mocks.list.mockResolvedValue([
      entry("/UserData/Maps/Downloaded", true),
      entry("/UserData/Maps/a.Map.Gbx"),
    ]);
    const res = await filesRoute.GET(
      req("/servers/server-a/files?path=Maps"),
      onA(),
    );
    expect(mocks.list).toHaveBeenCalledWith(
      actor,
      "server-a",
      "/UserData/Maps",
    );
    expect(await res.json()).toEqual({
      data: [
        {
          name: "Downloaded",
          path: "Maps/Downloaded",
          isDir: true,
          size: null,
          lastModified: "2026-10-24T10:00:00.000Z",
        },
        {
          name: "a.Map.Gbx",
          path: "Maps/a.Map.Gbx",
          isDir: false,
          size: 10,
          lastModified: "2026-10-24T10:00:00.000Z",
        },
      ],
    });
  });

  it("lists UserData itself by default", async () => {
    mocks.list.mockResolvedValue([]);
    await filesRoute.GET(req("/servers/server-a/files"), onA());
    expect(mocks.list).toHaveBeenCalledWith(actor, "server-a", "/UserData");
  });

  it.each(["/etc/passwd", "../secret", "Maps/../../etc", "Maps//x", "Maps\\x"])(
    "never reaches the file manager for %s",
    async (path) => {
      const res = await filesRoute.GET(
        req(`/servers/server-a/files?path=${encodeURIComponent(path)}`),
        onA(),
      );
      expect(res.status).toBe(400);
      const read = await contentRoute.GET(
        req(`/servers/server-a/files/content?path=${encodeURIComponent(path)}`),
        onA(),
      );
      expect(read.status).toBe(400);
      expect(mocks.list).not.toHaveBeenCalled();
      expect(mocks.read).not.toHaveBeenCalled();
    },
  );

  it("reads a file with its encoding", async () => {
    mocks.read.mockResolvedValue(Buffer.from("<dedicated/>"));
    const res = await contentRoute.GET(
      req("/servers/server-a/files/content?path=Config/dedicated_cfg.txt"),
      onA(),
    );
    expect(mocks.read).toHaveBeenCalledWith(
      actor,
      "server-a",
      "/UserData/Config/dedicated_cfg.txt",
    );
    expect(await res.json()).toEqual({
      data: {
        path: "Config/dedicated_cfg.txt",
        encoding: "utf8",
        content: "<dedicated/>",
      },
    });
  });

  it("writes text through the editor's save", async () => {
    const res = await contentRoute.PUT(
      req("/servers/server-a/files/content", {
        method: "PUT",
        body: { path: "Config/motd.txt", content: "Welcome" },
      }),
      onA(),
    );
    expect(res.status).toBe(204);
    expect(mocks.writeText).toHaveBeenCalledWith(
      actor,
      "server-a",
      "Config/motd.txt",
      "Welcome",
    );
    expect(mocks.upload).not.toHaveBeenCalled();
  });

  it("uploads base64 content into the file's folder", async () => {
    const res = await contentRoute.PUT(
      req("/servers/server-a/files/content", {
        method: "PUT",
        body: {
          path: "Maps/Event/final.Map.Gbx",
          content: "R0JYAP8=",
          encoding: "base64",
        },
      }),
      onA(),
    );
    expect(res.status).toBe(204);
    const form = mocks.upload.mock.calls[0][2] as FormData;
    const file = form.get("files") as File;
    expect(file.name).toBe("final.Map.Gbx");
    expect(Buffer.from(await file.arrayBuffer())).toEqual(
      Buffer.from([0x47, 0x42, 0x58, 0x00, 0xff]),
    );
    expect(form.getAll("paths[]")).toEqual(["/UserData/Maps/Event"]);
  });

  it("rejects content that is not base64", async () => {
    const res = await contentRoute.PUT(
      req("/servers/server-a/files/content", {
        method: "PUT",
        body: { path: "a.bin", content: "not base64!", encoding: "base64" },
      }),
      onA(),
    );
    expect(res.status).toBe(400);
    expect(mocks.upload).not.toHaveBeenCalled();
  });

  it("allows file bodies over the usual 64 KB, but not others", async () => {
    const content = "a".repeat(100 * 1024);
    let res = await contentRoute.PUT(
      req("/servers/server-a/files/content", {
        method: "PUT",
        body: { path: "big.txt", content },
      }),
      onA(),
    );
    expect(res.status).toBe(204);

    res = await deleteRoute.POST(
      req("/servers/server-a/files/delete", {
        method: "POST",
        body: { paths: [content] },
      }),
      onA(),
    );
    expect(res.status).toBe(413);
  });

  it("creates folders, moves and deletes with absolute paths", async () => {
    mocks.create.mockResolvedValue(entry("/UserData/Maps/Event", true));
    let res = await foldersRoute.POST(
      req("/servers/server-a/files/folders", {
        method: "POST",
        body: { path: "Maps/Event" },
      }),
      onA(),
    );
    expect(res.status).toBe(201);
    expect(mocks.create).toHaveBeenCalledWith(actor, "server-a", {
      path: "/UserData/Maps/Event",
      isDir: true,
    });
    expect((await res.json()).data.path).toBe("Maps/Event");

    mocks.move.mockResolvedValue([entry("/UserData/Maps/b.Map.Gbx")]);
    res = await moveRoute.POST(
      req("/servers/server-a/files/move", {
        method: "POST",
        body: { items: [{ from: "Maps/a.Map.Gbx", to: "Maps/b.Map.Gbx" }] },
      }),
      onA(),
    );
    expect(mocks.move).toHaveBeenCalledWith(actor, "server-a", {
      items: [
        { from: "/UserData/Maps/a.Map.Gbx", to: "/UserData/Maps/b.Map.Gbx" },
      ],
    });

    res = await deleteRoute.POST(
      req("/servers/server-a/files/delete", {
        method: "POST",
        body: { paths: ["Maps/b.Map.Gbx"] },
      }),
      onA(),
    );
    expect(res.status).toBe(204);
    expect(mocks.remove).toHaveBeenCalledWith(actor, "server-a", [
      "/UserData/Maps/b.Map.Gbx",
    ]);
  });

  it("will not delete UserData itself", async () => {
    const res = await deleteRoute.POST(
      req("/servers/server-a/files/delete", {
        method: "POST",
        body: { paths: [""] },
      }),
      onA(),
    );
    expect(res.status).toBe(400);
    expect(mocks.remove).not.toHaveBeenCalled();
  });

  it("needs files:write to change files", async () => {
    mocks.authenticate.mockResolvedValue(principal(["files:read"]));
    const res = await deleteRoute.POST(
      req("/servers/server-a/files/delete", {
        method: "POST",
        body: { paths: ["Maps/a.Map.Gbx"] },
      }),
      onA(),
    );
    expect(res.status).toBe(403);
  });
});
