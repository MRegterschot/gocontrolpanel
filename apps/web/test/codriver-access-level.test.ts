import { accessLevel } from "@/lib/codriver/access-level";
import { describe, expect, it } from "vitest";

const tools = [
  { minRole: "guest", readOnly: true },
  { minRole: "moderator", readOnly: true },
  { minRole: "moderator", readOnly: false },
  { minRole: "admin", readOnly: false },
] as const;

describe("accessLevel", () => {
  it("is read only without any changing tool", () => {
    expect(accessLevel("guest", [...tools])).toEqual({
      level: "read",
      tools: 1,
      changing: 0,
      total: 4,
    });
    // Members have no changing tool either
    expect(accessLevel("member", [...tools]).level).toBe("read");
  });

  it("is partial when only some changing tools are allowed", () => {
    expect(accessLevel("moderator", [...tools])).toMatchObject({
      level: "partial",
      tools: 3,
      changing: 1,
    });
  });

  it("is full when every tool is allowed", () => {
    expect(accessLevel("admin", [...tools])).toMatchObject({
      level: "full",
      tools: 4,
      changing: 2,
    });
  });
});
