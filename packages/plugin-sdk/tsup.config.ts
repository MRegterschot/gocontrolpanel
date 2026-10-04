import { defineConfig } from "tsup";

export default defineConfig([
  {
    // Types and definePlugin for plugin authors
    entry: { index: "src/index.ts" },
    format: ["esm", "cjs"],
    dts: true,
    outDir: "dist",
    clean: true,
    noExternal: [/^@tmcp\//],
  },
  {
    // The CLI bundles @tmcp/shared, so the published package has no private dependencies
    entry: { cli: "src/cli/main.ts" },
    format: ["esm"],
    platform: "node",
    target: "node20",
    outDir: "dist",
    noExternal: [/^@tmcp\//],
    external: ["esbuild"],
    banner: { js: "#!/usr/bin/env node" },
  },
]);
