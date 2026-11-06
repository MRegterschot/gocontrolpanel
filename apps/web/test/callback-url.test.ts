import { safeCallbackUrl } from "@/lib/callback-url";
import { describe, expect, it } from "vitest";

describe("safeCallbackUrl", () => {
  it("keeps a path on this site", () => {
    expect(safeCallbackUrl("/server/abc/live")).toBe("/server/abc/live");
    expect(safeCallbackUrl("/admin/users?tab=2")).toBe("/admin/users?tab=2");
  });

  it("falls back to the dashboard without a value", () => {
    expect(safeCallbackUrl(undefined)).toBe("/");
    expect(safeCallbackUrl("")).toBe("/");
  });

  it.each([
    "https://evil.example",
    "//evil.example",
    "/\\evil.example",
    "javascript:alert(1)",
  ])("refuses %s", (url) => {
    expect(safeCallbackUrl(url)).toBe("/");
  });

  it("does not loop back to the landing page", () => {
    expect(safeCallbackUrl("/login")).toBe("/");
    expect(safeCallbackUrl("/login?signingIn=1")).toBe("/");
  });

  it("takes the first of repeated values", () => {
    expect(safeCallbackUrl(["/a", "/b"])).toBe("/a");
  });
});
