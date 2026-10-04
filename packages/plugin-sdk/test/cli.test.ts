import { createPluginPackage, readPluginPackage, sha256Hex } from "@tmcp/shared/plugin-package";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { buildRegistry, initPlugin, packPlugin } from "../src/cli";

const EXAMPLE = fileURLToPath(new URL("../examples/hello", import.meta.url));
const dirs: string[] = [];

function temp(): string {
  const dir = mkdtempSync(join(tmpdir(), "tmcp-sdk-"));
  dirs.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe("pack", () => {
  it("packs the example into a valid, reproducible package", async () => {
    const out = temp();
    const first = await packPlugin(EXAMPLE, { outDir: out });
    expect(first.file).toBe(join(out, "hello-1.0.0.zip"));
    expect(first.pkg.manifest.capabilities).toEqual(["ui", "chat:send", "storage"]);
    expect(first.pkg.entry).toContain('ctx.command("hello"');
    expect(first.pkg.entry).toContain("__tmcpRegister");
    expect(Object.keys(first.pkg.templates)).toEqual(["widgets/greeting"]);
    expect(first.pkg.readme).toContain("# Hello");

    const second = await packPlugin(EXAMPLE, { outDir: temp() });
    expect(second.pkg.sha256).toBe(first.pkg.sha256);
  });

  it("scaffolds a project that packs without installing anything", async () => {
    const dir = join(temp(), "my-plugin");
    expect(initPlugin(dir)).toContain("tmcp-plugin.json");
    const result = await packPlugin(dir);
    expect(result.pkg.manifest.slug).toBe("my-plugin");
    expect(result.pkg.manifest.name).toBe("My Plugin");
    expect(existsSync(join(dir, "dist", "my-plugin-0.1.0.zip"))).toBe(true);
  });

  it("refuses names that can't be slugs", () => {
    expect(() => initPlugin(join(temp(), "match"))).toThrow(/can't be a plugin slug/);
  });
});

function pluginZip(slug: string, version: string): Uint8Array {
  return createPluginPackage({
    "tmcp-plugin.json": JSON.stringify({
      slug,
      name: slug.toUpperCase(),
      version,
      sdk: 1,
      description: `${slug} ${version}`,
      author: "Tests",
      capabilities: ["ui"],
      gamemodes: ["rounds"],
    }),
    "index.js": "globalThis.__tmcpRegister({ create() { return {}; } });",
    "README.md": `# ${slug} ${version}`,
  });
}

function addVersion(registry: string, slug: string, version: string, entry: Record<string, unknown> = {}) {
  const bytes = pluginZip(slug, version);
  const dir = join(registry, "plugins", slug, "versions");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, `${slug}-${version}.zip`), bytes);
  writeFileSync(
    join(dir, `${version}.json`),
    JSON.stringify({
      url: `${slug}-${version}.zip`,
      sha256: sha256Hex(bytes),
      publishedAt: "2026-10-01T12:00:00Z",
      ...entry,
    }),
  );
}

describe("registry", () => {
  it("builds the index and mirrors packages", async () => {
    const registry = temp();
    const out = temp();
    writeFileSync(
      join(registry, "registry.json"),
      JSON.stringify({ name: "Test plugins", repository: "https://github.com/acme/plugins" }),
    );
    addVersion(registry, "alpha", "1.0.0");
    addVersion(registry, "alpha", "1.1.0", { yanked: true, yankReason: "Broken" });
    addVersion(registry, "beta", "0.1.0", { changelog: "First" });
    mkdirSync(join(registry, "plugins", "alpha"), { recursive: true });
    writeFileSync(join(registry, "plugins", "alpha", "plugin.json"), JSON.stringify({ tags: ["fun"] }));

    const { index, errors } = await buildRegistry({
      registry,
      out,
      now: () => new Date("2026-10-04T00:00:00Z"),
    });
    expect(errors).toEqual([]);
    expect(index.plugins.map((p) => p.slug)).toEqual(["alpha", "beta"]);

    const alpha = index.plugins[0];
    expect(alpha).toMatchObject({
      name: "ALPHA",
      description: "alpha 1.0.0",
      tags: ["fun"],
      readme: "packages/alpha/README.md",
    });
    expect(alpha.versions.map((v) => [v.version, v.yanked])).toEqual([
      ["1.1.0", true],
      ["1.0.0", false],
    ]);
    expect(alpha.versions[1]).toMatchObject({
      url: "packages/alpha/alpha-1.0.0.zip",
      capabilities: ["ui"],
      gamemodes: ["rounds"],
    });

    const written = JSON.parse(readFileSync(join(out, "index.json"), "utf8"));
    expect(written.plugins).toHaveLength(2);
    const mirrored = new Uint8Array(readFileSync(join(out, "packages/alpha/alpha-1.0.0.zip")));
    expect(readPluginPackage(mirrored).manifest.version).toBe("1.0.0");
    expect(readFileSync(join(out, "packages/alpha/README.md"), "utf8")).toBe("# alpha 1.0.0");
  });

  it("reports packages that don't match their entry and writes nothing", async () => {
    const registry = temp();
    const out = temp();
    addVersion(registry, "alpha", "1.0.0", { sha256: "0".repeat(64) });
    addVersion(registry, "beta", "1.0.0");
    // The file claims 2.0.0 but holds the 1.0.0 package
    writeFileSync(
      join(registry, "plugins", "beta", "versions", "2.0.0.json"),
      readFileSync(join(registry, "plugins", "beta", "versions", "1.0.0.json")),
    );
    mkdirSync(join(registry, "plugins", "server", "versions"), { recursive: true });

    const { errors } = await buildRegistry({ registry, out });
    expect(errors.join("\n")).toMatch(/alpha\/versions\/1.0.0.json: sha256 is [a-f0-9]{64}, the file says 0{64}/);
    expect(errors.join("\n")).toMatch(/beta\/versions\/2.0.0.json: the package is version 1.0.0, not 2.0.0/);
    expect(errors.join("\n")).toMatch(/plugins\/server: not a valid plugin slug/);
    expect(existsSync(join(out, "index.json"))).toBe(false);
  });

  it("only downloads https URLs", async () => {
    const registry = temp();
    addVersion(registry, "alpha", "1.0.0", { url: "http://example.com/a.zip" });
    const { errors } = await buildRegistry({ registry, out: temp(), check: true });
    expect(errors[0]).toMatch(/only https:\/\/ URLs/);
  });
});
