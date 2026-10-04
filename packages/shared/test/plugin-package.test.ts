import { zipSync } from "fflate";
import { describe, expect, it } from "vitest";
import {
  createPluginPackage,
  PluginPackageError,
  readPluginPackage,
  sha256Hex,
} from "../src/plugins/package";
import {
  latestVersion,
  parseMarketplaceIndex,
  resolveMarketplaceUrl,
  type MarketplacePlugin,
} from "../src/plugins";

const manifest = {
  slug: "hello-world",
  name: "Hello World",
  version: "1.0.0",
  sdk: 1,
  description: "Says hello.",
  author: "Someone",
  capabilities: ["ui"],
};

function files(overrides: Record<string, string | Uint8Array | undefined> = {}) {
  const base: Record<string, string | Uint8Array | undefined> = {
    "tmcp-plugin.json": JSON.stringify(manifest),
    "index.js": "definePlugin({ create() { return {}; } });",
    "templates/widgets/board.hbs": "{{#extend \"widget\"}}{{/extend}}",
    "README.md": "# Hello",
    ...overrides,
  };
  return Object.fromEntries(
    Object.entries(base).filter((entry): entry is [string, string | Uint8Array] => !!entry[1]),
  );
}

function expectIssue(bytes: Uint8Array, pattern: RegExp) {
  try {
    readPluginPackage(bytes);
  } catch (error) {
    expect(error).toBeInstanceOf(PluginPackageError);
    expect((error as PluginPackageError).issues.join("\n")).toMatch(pattern);
    return;
  }
  throw new Error("Expected the package to be rejected");
}

describe("plugin packages", () => {
  it("reads a package", () => {
    const bytes = createPluginPackage(files());
    const pkg = readPluginPackage(bytes);
    expect(pkg.manifest.slug).toBe("hello-world");
    expect(pkg.entry).toContain("definePlugin");
    expect(Object.keys(pkg.templates)).toEqual(["widgets/board"]);
    expect(pkg.readme).toBe("# Hello");
    expect(pkg.sha256).toBe(sha256Hex(bytes));
    expect(pkg.size).toBe(bytes.byteLength);
  });

  it("packs deterministically", () => {
    expect(sha256Hex(createPluginPackage(files()))).toBe(sha256Hex(createPluginPackage(files())));
  });

  it("accepts a zip with everything in one folder", () => {
    const nested = Object.fromEntries(
      Object.entries(files()).map(([name, content]) => [`hello/${name}`, content]),
    );
    expect(readPluginPackage(createPluginPackage(nested)).manifest.slug).toBe("hello-world");
  });

  it("ignores dotfiles and macOS metadata", () => {
    const pkg = readPluginPackage(
      createPluginPackage(files({ ".DS_Store": "x", "__MACOSX/._index.js": "x" })),
    );
    expect(pkg.manifest.slug).toBe("hello-world");
  });

  it("rejects broken packages", () => {
    expectIssue(new Uint8Array([1, 2, 3]), /Not a valid zip/);
    expectIssue(createPluginPackage(files({ "tmcp-plugin.json": undefined })), /tmcp-plugin.json is missing/);
    expectIssue(createPluginPackage(files({ "tmcp-plugin.json": "{nope" })), /not valid JSON/);
    expectIssue(createPluginPackage(files({ "index.js": undefined })), /Entry file index.js is missing/);
    expectIssue(
      createPluginPackage(files({ "index.js": new Uint8Array([0xff, 0xfe, 0x00]) })),
      /not valid UTF-8/,
    );
    expectIssue(
      createPluginPackage(files({ "templates/widget.hbs": "x" })),
      /would replace a built-in layout/,
    );
    expectIssue(createPluginPackage(files({ "icon.png": "not a png" })), /icon.png must be a PNG/);
  });

  it("rejects paths that leave the package", () => {
    const zip = zipSync({ "tmcp-plugin.json": new TextEncoder().encode(JSON.stringify(manifest)), "../evil.js": new Uint8Array([1]) });
    expectIssue(zip, /Path leaves the package/);
  });

  it("does not inflate past the declared size", () => {
    const big = new Uint8Array(20 * 1024 * 1024);
    const zip = zipSync({ "tmcp-plugin.json": big }, { level: 9 });
    // Declared size 20 MB: over the unpacked limit
    expectIssue(zip, /Unpacks to more than 10 MB/);

    // A header that lies about the size gives a truncated file, not 20 MB in memory
    const view = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
    view.setUint32(22, 1024, true);
    for (let i = 0; i < zip.length - 4; i++) {
      if (view.getUint32(i, true) === 0x02014b50) view.setUint32(i + 24, 1024, true);
    }
    expectIssue(zip, /not valid JSON/);
  });
});

const version = (v: string, extra: Partial<MarketplacePlugin["versions"][number]> = {}) => ({
  version: v,
  sdk: 1,
  url: `packages/hello/hello-${v}.zip`,
  sha256: "a".repeat(64),
  size: 100,
  publishedAt: "2026-10-01T10:00:00Z",
  ...extra,
});

describe("marketplace index", () => {
  const raw = {
    schemaVersion: 1,
    generatedAt: "2026-10-04T10:00:00Z",
    repository: "https://github.com/acme/plugins",
    plugins: [
      {
        slug: "hello",
        name: "Hello",
        description: "Hi",
        author: "A",
        versions: [
          version("1.0.0"),
          version("2.0.0", { yanked: true }),
          version("1.1.0"),
          version("3.0.0", { sdk: 99 }),
          version("1.2.0-beta.1"),
        ],
      },
      { slug: "Bad Slug", name: "x" },
      { slug: "hello", name: "Duplicate", description: "x", author: "x", versions: [version("1.0.0")] },
    ],
  };

  it("keeps valid entries, newest version first", () => {
    const { index, skipped } = parseMarketplaceIndex(raw);
    expect(skipped).toBe(2);
    expect(index.plugins.map((p) => p.slug)).toEqual(["hello"]);
    expect(index.plugins[0].versions.map((v) => v.version)).toEqual([
      "3.0.0",
      "2.0.0",
      "1.2.0-beta.1",
      "1.1.0",
      "1.0.0",
    ]);
  });

  it("picks the newest compatible release", () => {
    const { index } = parseMarketplaceIndex(raw);
    expect(latestVersion(index.plugins[0])?.version).toBe("1.1.0");
    expect(latestVersion(index.plugins[0], 99)?.version).toBe("3.0.0");
  });

  it("only resolves references on the index origin", () => {
    const indexUrl = "https://acme.github.io/plugins/index.json";
    expect(resolveMarketplaceUrl(indexUrl, "packages/a.zip")).toBe(
      "https://acme.github.io/plugins/packages/a.zip",
    );
    expect(resolveMarketplaceUrl(indexUrl, "https://acme.github.io/other/a.zip")).toBe(
      "https://acme.github.io/other/a.zip",
    );
    expect(resolveMarketplaceUrl(indexUrl, "https://evil.example/a.zip")).toBeNull();
    expect(resolveMarketplaceUrl(indexUrl, "//evil.example/a.zip")).toBeNull();
  });
});
