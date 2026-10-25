import { defineConfig } from "tsup";

export default defineConfig([
  {
    // Types and definePlugin for plugin authors
    entry: { index: "src/index.ts" },
    format: ["esm", "cjs"],
    dts: true,
    outDir: "dist",
    clean: true,
    noExternal: [/^@tmcontrolpanel\/(?!plugin-sdk)/],
  },
  {
    // The CLI bundles @tmcontrolpanel/shared, so the published package has no private dependencies
    entry: { cli: "src/cli/main.ts" },
    format: ["esm"],
    platform: "node",
    target: "node20",
    outDir: "dist",
    noExternal: [/^@tmcontrolpanel\/(?!plugin-sdk)/],
    external: ["esbuild"],
    banner: { js: "#!/usr/bin/env node" },
  },
]);
