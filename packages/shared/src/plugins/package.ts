import { createHash } from "node:crypto";
import { strToU8, unzipSync, zipSync, type Zippable } from "fflate";
import { MANIFEST_FILE, parseManifest, type PluginManifest } from "./manifest";

// Reads and writes plugin packages: a zip with tmcp-plugin.json, one JavaScript bundle and
// the manialink templates. Server-side only (node:crypto), so it has its own entry point.

export const PACKAGE_LIMITS = {
  maxPackageBytes: 5 * 1024 * 1024,
  maxUnpackedBytes: 10 * 1024 * 1024,
  maxFiles: 500,
  maxEntryBytes: 2 * 1024 * 1024,
  maxManifestBytes: 64 * 1024,
  maxTemplateBytes: 256 * 1024,
  maxTemplates: 200,
  maxDocBytes: 200 * 1024,
  maxIconBytes: 256 * 1024,
} as const;

// Layouts every plugin template can extend; a package can't replace them
export const BASE_TEMPLATES = ["manialink", "widget", "window", "scripts/hide"] as const;

const TEMPLATE_NAME = /^[A-Za-z0-9_-]+(\/[A-Za-z0-9_-]+){0,4}$/;
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
// Fixed timestamp so packing the same files twice gives the same sha256
const ZIP_MTIME = new Date("1980-01-02T00:00:00Z");

export interface PluginPackage {
  manifest: PluginManifest;
  // Source of the JavaScript bundle
  entry: string;
  // Template sources by name, e.g. "widgets/board" for templates/widgets/board.hbs
  templates: Record<string, string>;
  readme: string | null;
  changelog: string | null;
  license: string | null;
  icon: Uint8Array | null;
  sha256: string;
  size: number;
}

export class PluginPackageError extends Error {
  constructor(readonly issues: string[]) {
    super(issues.length === 1 ? issues[0] : `Invalid plugin package: ${issues.join("; ")}`);
    this.name = "PluginPackageError";
  }
}

export function sha256Hex(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

const decoder = new TextDecoder("utf-8", { fatal: true });

function decodeText(name: string, bytes: Uint8Array, issues: string[]): string | null {
  try {
    // Leading BOMs break JSON.parse and show up in templates
    return decoder.decode(bytes).replace(/^﻿/, "");
  } catch {
    issues.push(`${name} is not valid UTF-8`);
    return null;
  }
}

function checkPath(name: string): string | null {
  if (name.length > 200) return `Path too long: ${name.slice(0, 50)}...`;
  if (name.includes("\\") || name.includes("\0")) return `Invalid path: ${name}`;
  if (name.startsWith("/") || /^[A-Za-z]:/.test(name)) return `Absolute path: ${name}`;
  if (name.split("/").some((part) => part === ".." || part === ".")) {
    return `Path leaves the package: ${name}`;
  }
  return null;
}

function isIgnored(name: string): boolean {
  return (
    name.endsWith("/") ||
    name.startsWith("__MACOSX/") ||
    name.split("/").some((part) => part.startsWith("."))
  );
}

// Zips made by "compress folder" put everything in one top-level folder
function stripCommonFolder(files: Record<string, Uint8Array>): Record<string, Uint8Array> {
  const names = Object.keys(files);
  if (names.includes(MANIFEST_FILE) || names.length === 0) return files;

  const first = names[0].split("/")[0];
  if (!names.every((name) => name.startsWith(`${first}/`))) return files;

  return Object.fromEntries(
    Object.entries(files).map(([name, bytes]) => [name.slice(first.length + 1), bytes]),
  );
}

function unpack(bytes: Uint8Array): Record<string, Uint8Array> {
  const issues: string[] = [];
  let files = 0;
  let declared = 0;

  let raw: Record<string, Uint8Array>;
  try {
    raw = unzipSync(bytes, {
      // Sizes come from the zip headers; fflate never inflates past them, so a lying
      // header gives a truncated file instead of a zip bomb
      filter: (file) => {
        files++;
        declared += file.originalSize;
        const pathIssue = checkPath(file.name);
        if (pathIssue) {
          issues.push(pathIssue);
          return false;
        }
        if (isIgnored(file.name)) return false;
        return (
          files <= PACKAGE_LIMITS.maxFiles &&
          declared <= PACKAGE_LIMITS.maxUnpackedBytes &&
          file.originalSize <= PACKAGE_LIMITS.maxEntryBytes
        );
      },
    });
  } catch (error) {
    throw new PluginPackageError([
      `Not a valid zip file (${error instanceof Error ? error.message : String(error)})`,
    ]);
  }

  if (files > PACKAGE_LIMITS.maxFiles) {
    issues.push(`More than ${PACKAGE_LIMITS.maxFiles} files`);
  }
  if (declared > PACKAGE_LIMITS.maxUnpackedBytes) {
    issues.push(`Unpacks to more than ${PACKAGE_LIMITS.maxUnpackedBytes / 1024 / 1024} MB`);
  }
  if (issues.length > 0) throw new PluginPackageError(issues);

  return stripCommonFolder(raw);
}

export function readPluginPackage(bytes: Uint8Array): PluginPackage {
  if (bytes.byteLength > PACKAGE_LIMITS.maxPackageBytes) {
    throw new PluginPackageError([
      `Package is larger than ${PACKAGE_LIMITS.maxPackageBytes / 1024 / 1024} MB`,
    ]);
  }

  const files = unpack(bytes);
  const issues: string[] = [];

  const manifestBytes = files[MANIFEST_FILE];
  if (!manifestBytes) throw new PluginPackageError([`${MANIFEST_FILE} is missing`]);
  if (manifestBytes.byteLength > PACKAGE_LIMITS.maxManifestBytes) {
    throw new PluginPackageError([`${MANIFEST_FILE} is too large`]);
  }

  const manifestText = decodeText(MANIFEST_FILE, manifestBytes, issues);
  let manifestJson: unknown = null;
  if (manifestText !== null) {
    try {
      manifestJson = JSON.parse(manifestText);
    } catch {
      issues.push(`${MANIFEST_FILE} is not valid JSON`);
    }
  }
  if (issues.length > 0) throw new PluginPackageError(issues);

  const parsed = parseManifest(manifestJson);
  if (!parsed.success) throw new PluginPackageError(parsed.issues);
  const manifest = parsed.manifest;

  const entryBytes = files[manifest.entry];
  let entry: string | null = null;
  if (!entryBytes) {
    issues.push(`Entry file ${manifest.entry} is missing`);
  } else {
    entry = decodeText(manifest.entry, entryBytes, issues);
  }

  const templates: Record<string, string> = {};
  let templateBytes = 0;
  for (const [name, content] of Object.entries(files)) {
    if (!name.startsWith("templates/")) continue;
    if (!name.endsWith(".hbs")) continue;

    const key = name.slice("templates/".length, -".hbs".length);
    if (!TEMPLATE_NAME.test(key)) {
      issues.push(`Invalid template name: ${name}`);
      continue;
    }
    if ((BASE_TEMPLATES as readonly string[]).includes(key)) {
      issues.push(`Template ${name} would replace a built-in layout`);
      continue;
    }
    if (content.byteLength > PACKAGE_LIMITS.maxTemplateBytes) {
      issues.push(`Template ${name} is larger than 256 KB`);
      continue;
    }
    templateBytes += content.byteLength;
    const source = decodeText(name, content, issues);
    if (source !== null) templates[key] = source;
  }
  if (Object.keys(templates).length > PACKAGE_LIMITS.maxTemplates) {
    issues.push(`More than ${PACKAGE_LIMITS.maxTemplates} templates`);
  }
  if (templateBytes > PACKAGE_LIMITS.maxEntryBytes) {
    issues.push("Templates are larger than 2 MB together");
  }

  const doc = (name: string): string | null => {
    const content = files[name];
    if (!content) return null;
    if (content.byteLength > PACKAGE_LIMITS.maxDocBytes) {
      issues.push(`${name} is larger than 200 KB`);
      return null;
    }
    return decodeText(name, content, issues);
  };

  const readme = doc("README.md");
  const changelog = doc("CHANGELOG.md");
  const license = doc("LICENSE") ?? doc("LICENSE.md") ?? doc("LICENSE.txt");

  let icon: Uint8Array | null = files["icon.png"] ?? null;
  if (icon) {
    const isPng = PNG_SIGNATURE.every((byte, i) => icon![i] === byte);
    if (!isPng || icon.byteLength > PACKAGE_LIMITS.maxIconBytes) {
      issues.push("icon.png must be a PNG image of at most 256 KB");
      icon = null;
    }
  }

  if (issues.length > 0 || entry === null) throw new PluginPackageError(issues);

  return {
    manifest,
    entry,
    templates,
    readme,
    changelog,
    license,
    icon,
    sha256: sha256Hex(bytes),
    size: bytes.byteLength,
  };
}

// Packs files (path -> content) into a plugin zip with stable timestamps
export function createPluginPackage(files: Record<string, string | Uint8Array>): Uint8Array {
  const zippable: Zippable = {};
  for (const name of Object.keys(files).sort()) {
    const content = files[name];
    zippable[name] = [typeof content === "string" ? strToU8(content) : content, {}];
  }
  return zipSync(zippable, { level: 9, mtime: ZIP_MTIME });
}
