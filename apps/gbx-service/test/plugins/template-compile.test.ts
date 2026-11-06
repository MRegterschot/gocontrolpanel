import { describe, expect, it } from "vitest";
import {
  DEFAULT_COMPILE_LIMITS,
  precompileTemplates,
  precompileUntrustedTemplates,
} from "../../src/core/plugins/sandbox/templates";

const sources = { page: "<manialink>{{#each players}}<label text='{{name}}'/>{{/each}}</manialink>" };

describe("untrusted template compilation", () => {
  it("compiles in a worker to the same output as the host compiler", async () => {
    expect(await precompileUntrustedTemplates(sources)).toEqual(precompileTemplates(sources));
  });

  it("reports templates that don't compile", async () => {
    await expect(precompileUntrustedTemplates({ broken: "{{#if}}" })).rejects.toThrow(
      /Template broken doesn't compile/,
    );
  });

  it("stops the worker when compiling takes too long", async () => {
    await expect(
      precompileUntrustedTemplates(sources, { ...DEFAULT_COMPILE_LIMITS, timeoutMs: 1 }),
    ).rejects.toThrow(/too long/);
  });

  it("limits the number of templates", async () => {
    const many = Object.fromEntries(Array.from({ length: 3 }, (_, i) => [`t${i}`, "x"]));
    await expect(
      precompileUntrustedTemplates(many, { ...DEFAULT_COMPILE_LIMITS, maxTemplates: 2 }),
    ).rejects.toThrow(/at most 2/);
  });
});
