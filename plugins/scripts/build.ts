import { copyFileSync, existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { packPlugin } from "@tmcontrolpanel/plugin-sdk/cli";

// Packs every first-party plugin. The GBX service image ships these and installs them on
// start; the same packages are published to the marketplace.
const root = fileURLToPath(new URL("..", import.meta.url));
const outIndex = process.argv.indexOf("--out");
const outDir = resolve(outIndex > 0 ? process.argv[outIndex + 1] : join(root, "../apps/gbx-service/first-party"));

const plugins = readdirSync(root, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && existsSync(join(root, entry.name, "tmcp-plugin.json")))
  .map((entry) => entry.name)
  .sort();

// Only the current versions: the service installs every zip it finds
mkdirSync(outDir, { recursive: true });
for (const file of readdirSync(outDir).filter((name) => name.endsWith(".zip"))) {
  rmSync(join(outDir, file));
}
for (const name of plugins) {
  const { file, pkg } = await packPlugin(join(root, name));
  copyFileSync(file, join(outDir, basename(file)));
  console.log(`${pkg.manifest.slug} ${pkg.manifest.version}  ${pkg.sha256}`);
}
