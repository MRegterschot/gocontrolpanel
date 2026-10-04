import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { MANIFEST_FILE } from "@gcp/shared";
import {
  createPluginPackage,
  PluginPackageError,
  readPluginPackage,
  type PluginPackage,
} from "@gcp/shared/plugin-package";
import { buildPlugin } from "./build";
import { CliError, distEntry, DOC_FILES, listTemplates, readProjectManifest } from "./project";

export interface PackResult {
  file: string;
  bytes: Uint8Array;
  pkg: PluginPackage;
}

// Builds (unless told not to), zips and validates the package exactly as a panel reads it
export async function packPlugin(
  dir: string,
  options: { build?: boolean; minify?: boolean; outDir?: string } = {},
): Promise<PackResult> {
  const manifest = readProjectManifest(dir);
  const outDir = options.outDir ?? join(dir, "dist");
  if (options.build !== false) await buildPlugin(dir, { minify: options.minify, outDir });

  const entry = distEntry(dir, manifest, outDir);
  if (!existsSync(entry)) throw new CliError(`${entry} not found; run the build first`);

  const files: Record<string, Uint8Array> = {
    [MANIFEST_FILE]: readFileSync(join(dir, MANIFEST_FILE)),
    [manifest.entry]: readFileSync(entry),
  };
  for (const template of listTemplates(dir)) files[template] = readFileSync(join(dir, template));
  for (const doc of DOC_FILES) {
    if (existsSync(join(dir, doc))) files[doc] = readFileSync(join(dir, doc));
  }

  const bytes = createPluginPackage(files);
  let pkg: PluginPackage;
  try {
    pkg = readPluginPackage(bytes);
  } catch (error) {
    if (error instanceof PluginPackageError) {
      throw new CliError(`The package is invalid:\n  ${error.issues.join("\n  ")}`);
    }
    throw error;
  }

  mkdirSync(outDir, { recursive: true });
  const file = join(outDir, `${manifest.slug}-${manifest.version}.zip`);
  writeFileSync(file, bytes);
  return { file, bytes, pkg };
}
