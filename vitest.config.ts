import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    // Nothing here should need a database, a Redis, or a game server. Suites
    // that do belong in a separate integration project once those exist.
    exclude: ["node_modules/**", ".next/**"],
  },
});
