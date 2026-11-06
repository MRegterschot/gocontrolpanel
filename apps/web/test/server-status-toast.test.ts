import { serverStatusToast } from "@/lib/server-status-toast";
import { expect, it } from "vitest";

it("suppresses snapshots, pre-snapshot events and replay events", () => {
  expect(serverStatusToast("servers", "Test", undefined, 100, 3000)).toBeNull();
  expect(serverStatusToast("connect", "Test", undefined, 0, 3000)).toBeNull();
  expect(serverStatusToast("connect", "Test", undefined, 100, 2099)).toBeNull();
});
it.each(["moved", "restarted", "resumed", "lease", "crashed"] as const)(
  "maps %s handovers",
  (kind) => {
    const result = serverStatusToast("handover", "Test", kind, 100, 2100);
    expect(result?.message).toMatch(/^Test /);
    expect(result?.level).toBe(kind === "crashed" ? "error" : "success");
    expect(result?.description).toBe(
      kind === "crashed"
        ? "The round in progress was not recorded."
        : undefined,
    );
  },
);
it("maps connection changes", () => {
  expect(serverStatusToast("connect", "Test", undefined, 100, 2100)).toEqual({
    level: "success",
    message: "Test connected",
  });
  expect(serverStatusToast("disconnect", "Test", undefined, 100, 2100)).toEqual(
    { level: "warning", message: "Test disconnected" },
  );
});
