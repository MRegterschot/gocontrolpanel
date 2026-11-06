import { validateListFilename } from "@/lib/list-filename";
import {
  fileManagerFetch,
  fileManagerUrl,
  getFileManager,
} from "@/lib/managers/file-manager";
import { encryptServerPassword } from "@/lib/server-credentials";
import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ findFirst: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/dbclient", () => ({
  getClient: () => ({ servers: { findFirst: mocks.findFirst } }),
}));
vi.mock("@/lib/sentry/report", () => ({ reportException: vi.fn() }));
vi.mock("@/lib/config", () => ({
  default: { SECRETS_KEY: "test-only-server-credentials-0123456789" },
}));
beforeEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});
describe("file manager trust boundary", () => {
  it("decrypts only at the outbound boundary and excludes deleted servers", async () => {
    mocks.findFirst.mockResolvedValue({
      filemanagerUrl: "https://fm.example/",
      filemanagerPassword: encryptServerPassword("secret"),
    });
    const fetch = vi.fn().mockResolvedValue(new Response("", { status: 200 }));
    vi.stubGlobal("fetch", fetch);
    const manager = await getFileManager("server");
    expect(manager.password).toBe("secret");
    expect(mocks.findFirst.mock.calls[0][0].where).toEqual({
      id: "server",
      deletedAt: null,
    });
    expect(fetch.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal);
  });
  it.each([
    ".attacker.test/x",
    "//attacker.test/x",
    "/../secret",
    "/%2e%2e/secret",
    "/\\attacker.test",
  ])("rejects an unsafe path %s", (path) => {
    expect(() => fileManagerUrl("https://fm.example", path)).toThrow();
  });
  it("keeps valid paths on the configured origin", () => {
    expect(
      new URL(fileManagerUrl("https://fm.example", "/UserData/Maps/a.Map.Gbx"))
        .origin,
    ).toBe("https://fm.example");
  });
  it("applies a deadline and forbids redirects for authenticated proxy calls", async () => {
    const fetch = vi.fn().mockResolvedValue(new Response("ok"));
    vi.stubGlobal("fetch", fetch);
    const controller = new AbortController();
    controller.abort();
    await fileManagerFetch("https://fm.example/file", {
      signal: controller.signal,
    });
    expect(fetch.mock.calls[0][1]).toMatchObject({ redirect: "error" });
    expect(fetch.mock.calls[0][1].signal.aborted).toBe(true);
  });
});
describe("dedicated list filenames", () => {
  it.each([
    "../secret.txt",
    "/etc/file.xml",
    "a/../b.txt",
    "a\\b.xml",
    "a%2fb.txt",
    "a\n.txt",
    "file.exe",
  ])("rejects %s", (name) =>
    expect(() => validateListFilename(name)).toThrow(),
  );
  it("allows relative folders and existing list extensions", () =>
    expect(validateListFilename("MatchSettings/Race-1.txt")).toBe(
      "MatchSettings/Race-1.txt",
    ));
});

import { assertResourceId } from "@/lib/resource-id";
it.each(["", " ", "*", "id:admin", "../server"])(
  "does not allow resource permission substitution with %s",
  (id) => {
    expect(() => assertResourceId(id)).toThrow();
  },
);
