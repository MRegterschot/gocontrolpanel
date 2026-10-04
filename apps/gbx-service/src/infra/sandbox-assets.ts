import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { BASE_TEMPLATES } from "@gcp/shared/plugin-package";
import type { SandboxAssets } from "../core/plugins/sandbox/sandboxed-plugin";
import { precompileTemplates } from "../core/plugins/sandbox/templates";
import { loadTemplateSources } from "./templates";

const require = createRequire(import.meta.url);

// The global exists in Node, but the type definitions only declare its types
const wasmApi = (
  globalThis as unknown as {
    WebAssembly: { compile(bytes: Uint8Array): Promise<WebAssembly.Module> };
  }
).WebAssembly;

// Files every sandbox needs, read once per process. The WebAssembly module is compiled once
// and instantiated per plugin.
export async function loadSandboxAssets(templatesDir: string): Promise<SandboxAssets> {
  const variantDir = dirname(require.resolve("@jitl/quickjs-wasmfile-release-sync/package.json"));
  const wasm = readFileSync(join(variantDir, "dist", "emscripten-module.wasm"));

  const templates = loadTemplateSources(templatesDir);
  const baseTemplates: Record<string, string> = {};
  for (const name of BASE_TEMPLATES) {
    const source = templates[name];
    if (source === undefined) throw new Error(`Base template ${name} is missing from ${templatesDir}`);
    baseTemplates[name] = source;
  }

  return {
    wasmModule: await wasmApi.compile(wasm),
    handlebars: readFileSync(require.resolve("handlebars/dist/handlebars.min.js"), "utf8"),
    layouts: readFileSync(require.resolve("handlebars-layouts"), "utf8"),
    baseTemplates: precompileTemplates(baseTemplates),
  };
}
