import { defineConfig } from "tsup";

export default defineConfig({
  // The front forks worker.js next to main.js
  entry: ["src/main.ts", "src/worker.ts"],
  format: ["esm"],
  platform: "node",
  target: "node22",
  outDir: "dist",
  clean: true,
  sourcemap: true,
  // Workspace packages ship TypeScript source, so they are bundled in
  noExternal: [/^@tmcontrolpanel\/(?!plugin-sdk)/],
  // Prisma loads its engine relative to its own package
  external: ["@prisma/client", ".prisma/client"],
});
