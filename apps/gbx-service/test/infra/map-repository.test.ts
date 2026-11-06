import type { DbClient } from "@tmcontrolpanel/db";
import { describe, expect, it, vi } from "vitest";
import { PrismaMapRepository } from "../../src/infra/db/prisma-repositories";

const row = {
  id: "m1",
  uid: "uid1",
  name: "Map",
  fileName: "Map.Map.Gbx",
  author: "a",
  authorNickname: "A",
  thumbnailUrl: null,
  uploadCheck: null,
};
const newMap = { uid: "uid1", name: "Map", fileName: "Map.Map.Gbx" };
const dupe = () => Object.assign(new Error("dupe"), { code: "P2002" });

function setup() {
  const create = vi.fn();
  const findFirst = vi.fn();
  const repo = new PrismaMapRepository({
    maps: { create, findFirst },
  } as unknown as DbClient);
  return { create, findFirst, repo };
}

describe("PrismaMapRepository.create", () => {
  it("returns the existing map when another worker inserted it first", async () => {
    const { create, findFirst, repo } = setup();
    create.mockRejectedValue(dupe());
    findFirst.mockResolvedValue(row);
    const result = await repo.create(newMap as never, null);
    expect(result).toMatchObject({ id: "m1", uid: "uid1" });
    expect(findFirst).toHaveBeenCalledWith({
      where: { uid: "uid1", deletedAt: null },
    });
  });

  it("rethrows P2002 when no existing row is found", async () => {
    const { create, findFirst, repo } = setup();
    const error = dupe();
    create.mockRejectedValue(error);
    findFirst.mockResolvedValue(null);
    await expect(repo.create(newMap as never, null)).rejects.toBe(error);
  });

  it("rethrows other errors without a lookup", async () => {
    const { create, findFirst, repo } = setup();
    const error = Object.assign(new Error("other"), { code: "P1001" });
    create.mockRejectedValue(error);
    await expect(repo.create(newMap as never, null)).rejects.toBe(error);
    expect(findFirst).not.toHaveBeenCalled();
  });
});
