import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { MANIFEST_FILE, parseManifest, type PluginManifest } from "@tmcp/shared";

// A plugin project on disk: tmcp-plugin.json, src/index.(ts|js), templates/ and docs

export class CliError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CliError";
  }
}

export const SOURCE_CANDIDATES = ["src/index.ts", "src/index.js", "index.ts"];
export const DOC_FILES = ["README.md", "CHANGELOG.md", "LICENSE", "LICENSE.md", "LICENSE.txt", "icon.png"];

export function readProjectManifest(dir: string): PluginManifest {
  const file = join(dir, MANIFEST_FILE);
  if (!existsSync(file)) throw new CliError(`${MANIFEST_FILE} not found in ${dir}`);

  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(file, "utf8"));
  } catch {
    throw new CliError(`${MANIFEST_FILE} is not valid JSON`);
  }
  const result = parseManifest(raw);
  if (!result.success) {
    throw new CliError(`${MANIFEST_FILE} is invalid:\n  ${result.issues.join("\n  ")}`);
  }
  return result.manifest;
}

export function findSource(dir: string): string {
  const source = SOURCE_CANDIDATES.map((candidate) => join(dir, candidate)).find(existsSync);
  if (!source) throw new CliError(`No source found; expected one of ${SOURCE_CANDIDATES.join(", ")}`);
  return source;
}

// Bundle output; the package stores it under the manifest's entry path
export function distEntry(dir: string, manifest: PluginManifest, outDir?: string): string {
  return join(outDir ?? join(dir, "dist"), manifest.entry);
}

export function listTemplates(dir: string): string[] {
  const root = join(dir, "templates");
  if (!existsSync(root)) return [];

  const files: string[] = [];
  const walk = (current: string) => {
    for (const entry of readdirSync(current)) {
      const path = join(current, entry);
      if (statSync(path).isDirectory()) walk(path);
      else if (entry.endsWith(".hbs")) files.push(relative(dir, path).split(sep).join("/"));
    }
  };
  walk(root);
  return files.sort();
}
