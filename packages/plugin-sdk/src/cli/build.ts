import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import { CliError, distEntry, findSource, readProjectManifest } from "./project";

// This package's own entry (src/index.ts here, dist/index.js once built), so plugins always
// bundle the definePlugin() of the CLI that builds them
function sdkEntry(): string | undefined {
  return ["../index.ts", "./index.js"]
    .map((path) => fileURLToPath(new URL(path, import.meta.url)))
    .find(existsSync);
}

export interface BuildResult {
  file: string;
  bytes: number;
}

// Bundles the plugin into one script for the QuickJS sandbox. Not minified by default: reviewers
// read the bundle in the package, not the source.
export async function buildPlugin(
  dir: string,
  options: { minify?: boolean; outDir?: string } = {},
): Promise<BuildResult> {
  const manifest = readProjectManifest(dir);
  const source = findSource(dir);
  const outFile = distEntry(dir, manifest, options.outDir);

  const result = await build({
    entryPoints: [source],
    bundle: true,
    format: "iife",
    platform: "neutral",
    target: "es2022",
    mainFields: ["module", "main"],
    conditions: ["import", "default"],
    write: false,
    minify: options.minify ?? false,
    legalComments: "inline",
    logLevel: "silent",
    charset: "utf8",
    alias: sdkEntry() ? { "@tmcontrolpanel/plugin-sdk": sdkEntry()! } : {},
  }).catch((error: { errors?: { text: string; location?: { file: string; line: number } | null }[] }) => {
    const messages = (error.errors ?? []).map(
      (e) => `${e.location ? `${e.location.file}:${e.location.line}: ` : ""}${e.text}`,
    );
    throw new CliError(`Build failed:\n  ${messages.join("\n  ") || String(error)}`);
  });

  const output = result.outputFiles?.[0];
  if (!output) throw new CliError("Build produced no output");

  mkdirSync(dirname(outFile), { recursive: true });
  writeFileSync(outFile, output.contents);
  return { file: outFile, bytes: output.contents.byteLength };
}
