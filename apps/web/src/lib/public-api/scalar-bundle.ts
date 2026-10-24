import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { brotliCompress, constants, gzip } from "node:zlib";
import "server-only";

const PACKAGE = path.join("node_modules", "@scalar", "api-reference");

// node_modules sits next to the app in development and at the image root in Docker
function findPackage(): string {
  let dir = process.cwd();
  for (;;) {
    const candidate = path.join(dir, PACKAGE);
    if (existsSync(path.join(candidate, "package.json"))) return candidate;
    const parent = path.dirname(dir);
    if (parent === dir)
      throw new Error("@scalar/api-reference is not installed");
    dir = parent;
  }
}

interface ScalarBundle {
  version: string;
  source: Buffer;
  // Precompressed once: route handler responses are not compressed by Next.js
  gzip: Buffer;
  brotli: Buffer;
}

let bundle: Promise<ScalarBundle> | undefined;

// The self-contained Scalar UI, served from the panel instead of a public CDN
export function scalarBundle() {
  bundle ??= (async () => {
    const root = findPackage();
    const pkg = JSON.parse(
      await readFile(path.join(root, "package.json"), "utf8"),
    ) as { version: string };
    const source = await readFile(
      path.join(root, "dist", "browser", "standalone.js"),
    );
    const [gzipped, brotli] = await Promise.all([
      promisify(gzip)(source, { level: 9 }),
      promisify(brotliCompress)(source, {
        params: { [constants.BROTLI_PARAM_QUALITY]: 9 },
      }),
    ]);
    return { version: pkg.version, source, gzip: gzipped, brotli };
  })().catch((error) => {
    bundle = undefined;
    throw error;
  });
  return bundle;
}
