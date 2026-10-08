import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  upload: vi.fn(),
  addMap: vi.fn(),
  warn: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/logger", () => ({
  getLogger: () => ({ warn: mocks.warn, info: vi.fn(), error: vi.fn() }),
}));
vi.mock("@/lib/managers/file-manager", () => ({
  getFileManager: async () => ({ health: true }),
}));
vi.mock("@/actions/filemanager/server-only/files", () => ({
  uploadFilesAs: mocks.upload,
}));
vi.mock("@/actions/gbx/server-only/map", () => ({ addMapAs: mocks.addMap }));
vi.mock("@/actions/database/server-only/audit-logs", () => ({
  logAudit: vi.fn(),
}));
vi.mock("@/lib/actor", () => ({ requirePermission: vi.fn() }));

import { addMapFilesAs } from "@/actions/gbx/server-only/bulk-maps";

const actor = { userId: "u", login: "l" } as never;

beforeEach(() => {
  vi.resetAllMocks();
  mocks.upload.mockResolvedValue([]);
  mocks.addMap.mockResolvedValue(undefined);
});

describe("addMapFilesAs", () => {
  it("uploads and adds maps under their own names", async () => {
    const result = await addMapFilesAs(
      actor,
      "s",
      [new File(["x"], 'Go "Snow" Car.Map.Gbx')],
      "Week 95",
      "server.nadeo.campaign.add",
      {},
    );
    const uploaded = (mocks.upload.mock.calls[0][2] as FormData).get(
      "files",
    ) as File;
    expect(uploaded.name).toBe('Go "Snow" Car.Map.Gbx');
    expect(mocks.addMap).toHaveBeenCalledWith(
      actor,
      "s",
      'Downloaded/Week 95/Go "Snow" Car.Map.Gbx',
    );
    expect(result).toEqual({
      paths: ['Downloaded/Week 95/Go "Snow" Car.Map.Gbx'],
      failed: [],
    });
  });

  it("counts a map that is already in the list as present", async () => {
    mocks.addMap.mockRejectedValueOnce(new Error("Map already added."));
    const result = await addMapFilesAs(
      actor,
      "s",
      [new File(["x"], "a.Map.Gbx")],
      "Pack",
      "x",
      {},
    );
    expect(result.paths).toEqual(["Downloaded/Pack/a.Map.Gbx"]);
    expect(result.failed).toEqual([]);
  });

  it("reports and logs other add failures by their original name", async () => {
    const reason = new Error("Map unknown.");
    mocks.addMap.mockRejectedValueOnce(reason);
    const result = await addMapFilesAs(
      actor,
      "s",
      [new File(["x"], 'b "q".Map.Gbx')],
      "Pack",
      "x",
      {},
    );
    expect(result).toEqual({ paths: [], failed: ['b "q".Map.Gbx'] });
    expect(mocks.warn).toHaveBeenCalledWith(
      expect.objectContaining({ err: reason }),
      "Codriver could not add a map to the server",
    );
  });
});
