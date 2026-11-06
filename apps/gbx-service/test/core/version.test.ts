import { describe, expect, it } from "vitest";
import { controllerLabel, SERVICE_VERSION } from "../../src/core/version";

describe("controllerLabel", () => {
  it("shows the version and the short revision", () => {
    expect(controllerLabel()).toBe(`v${SERVICE_VERSION}`);
    expect(controllerLabel("48d73d53abcdef")).toBe(
      `v${SERVICE_VERSION} 48d73d5`,
    );
  });
});
