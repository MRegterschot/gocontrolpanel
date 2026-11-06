import { transform } from "esbuild";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { guestRuntimeScript } from "../../src/core/plugins/sandbox/guest-runtime";
import { GuestError, QuickJsVm } from "../../src/core/plugins/sandbox/quickjs-vm";
import { testSandboxAssets } from "../fakes/harness";

// tsx, which runs the service in dev mode, compiles with keepNames; the serialized runtime must
// still work inside QuickJS
describe("guest runtime", () => {
  it("runs when compiled with keepNames", async () => {
    const source = readFileSync(new URL("../../src/core/plugins/sandbox/guest-runtime.ts", import.meta.url), "utf8");
    const compiled = (await transform(source, { loader: "ts", format: "esm", keepNames: true })).code;
    const start = compiled.indexOf("function guestRuntime(");
    const end = compiled.indexOf("\n__name(guestRuntime", start);
    const fn = compiled.slice(start, end).trim();
    expect(fn).toContain("__name(");

    const vm = await QuickJsVm.create({
      wasmModule: (await testSandboxAssets()).wasmModule,
      memoryBytes: 16 * 1024 * 1024,
      stackBytes: 512 * 1024,
      now: () => performance.now(),
      onHostCall: (method) =>
        method === "init" ? { pluginId: "p", serverId: "s", actionPrefix: "p:", templates: {} } : null,
      onHostAsync: () => undefined,
      onCpu: () => undefined,
    });
    try {
      vm.evaluate(
        `globalThis.Handlebars = { create() { return { registerHelper() {}, registerPartial() {}, compile() { return () => ""; } }; } };
         globalThis.__tmcpLayouts = () => ({});`,
        "stubs.js",
        1000,
      );
      vm.evaluate(guestRuntimeScript(fn), "tmcp-runtime.js", 1000);
      expect(() => vm.callBridge("create", [], 1000)).toThrow(GuestError);
      expect(() => vm.callBridge("create", [], 1000)).toThrow(/never called definePlugin/);
    } finally {
      vm.dispose();
    }
  });
});
