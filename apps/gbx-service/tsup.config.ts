import { readdirSync, readFileSync } from "node:fs";
import { defineConfig } from "tsup";

const { version } = JSON.parse(readFileSync("../../package.json", "utf8"));

// Newest migration for the provider this build targets; the service waits for it at startup
const provider = process.env.DB === "postgres" ? "postgres" : "mysql";
const latestMigration = readdirSync(
  `../../packages/db/prisma/${provider}/migrations`,
  {
    withFileTypes: true,
  },
)
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort()
  .at(-1);

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
  define: {
    __TMCP_VERSION__: JSON.stringify(version),
    __TMCP_LATEST_MIGRATION__: JSON.stringify(latestMigration),
  },
});
