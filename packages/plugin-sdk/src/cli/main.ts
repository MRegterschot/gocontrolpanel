import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseArgs } from "node:util";
import { describeCapability } from "@gcp/shared";
import { PluginPackageError, readPluginPackage, type PluginPackage } from "@gcp/shared/plugin-package";
import { buildPlugin } from "./build";
import { initPlugin } from "./init";
import { packPlugin } from "./pack";
import { CliError } from "./project";
import { buildRegistry } from "./registry";

const HELP = `tmcp-plugin <command>

  init <dir> [--slug <slug>] [--name <name>]   Create a plugin project
  build [dir] [--minify]                        Bundle src/ into dist/
  pack [dir] [--minify] [--out <dir>]           Build, check and zip the plugin
  validate <file.zip>                           Check a package the way a panel does
  registry [--registry <dir>] [--out <dir>] [--check]
                                                Build the marketplace site from a registry repo
`;

function summary(pkg: PluginPackage): string {
  const { manifest } = pkg;
  const capabilities = manifest.capabilities.length
    ? manifest.capabilities.map((c) => `\n    ${c}: ${describeCapability(c).description}`).join("")
    : " none";
  return [
    `${manifest.name} (${manifest.slug}) ${manifest.version}, SDK ${manifest.sdk}`,
    `  sha256: ${pkg.sha256}`,
    `  size: ${(pkg.size / 1024).toFixed(1)} KB`,
    `  templates: ${Object.keys(pkg.templates).join(", ") || "none"}`,
    `  commands: ${manifest.commands.map((c) => `/${c}`).join(", ") || "none"}`,
    `  capabilities:${capabilities}`,
  ].join("\n");
}

async function main(argv: string[]): Promise<number> {
  const [command, ...rest] = argv;
  const { values, positionals } = parseArgs({
    args: rest,
    allowPositionals: true,
    options: {
      slug: { type: "string" },
      name: { type: "string" },
      minify: { type: "boolean" },
      out: { type: "string" },
      registry: { type: "string" },
      check: { type: "boolean" },
    },
  });

  switch (command) {
    case "init": {
      if (!positionals[0]) throw new CliError("Usage: tmcp-plugin init <dir>");
      const files = initPlugin(positionals[0], { slug: values.slug, name: values.name });
      console.log(`Created ${files.length} files in ${resolve(positionals[0])}`);
      return 0;
    }
    case "build": {
      const result = await buildPlugin(resolve(positionals[0] ?? "."), { minify: values.minify });
      console.log(`Built ${result.file} (${(result.bytes / 1024).toFixed(1)} KB)`);
      return 0;
    }
    case "pack": {
      const result = await packPlugin(resolve(positionals[0] ?? "."), {
        minify: values.minify,
        outDir: values.out ? resolve(values.out) : undefined,
      });
      console.log(`Packed ${result.file}\n${summary(result.pkg)}`);
      console.log(
        `\nRegistry entry (plugins/${result.pkg.manifest.slug}/versions/${result.pkg.manifest.version}.json):\n${JSON.stringify(
          {
            url: "https://github.com/<you>/<repo>/releases/download/<tag>/" +
              `${result.pkg.manifest.slug}-${result.pkg.manifest.version}.zip`,
            sha256: result.pkg.sha256,
            publishedAt: new Date().toISOString(),
          },
          null,
          2,
        )}`,
      );
      return 0;
    }
    case "validate": {
      if (!positionals[0]) throw new CliError("Usage: tmcp-plugin validate <file.zip>");
      try {
        const pkg = readPluginPackage(new Uint8Array(readFileSync(resolve(positionals[0]))));
        console.log(`Valid package\n${summary(pkg)}`);
        return 0;
      } catch (error) {
        if (error instanceof PluginPackageError) {
          console.error(`Invalid package:\n  ${error.issues.join("\n  ")}`);
          return 1;
        }
        throw error;
      }
    }
    case "registry": {
      const { index, errors } = await buildRegistry({
        registry: resolve(values.registry ?? "."),
        out: resolve(values.out ?? "site"),
        check: values.check,
      });
      if (errors.length > 0) {
        console.error(`${errors.length} problem(s):\n  ${errors.join("\n  ")}`);
        return 1;
      }
      const versions = index.plugins.reduce((total, plugin) => total + plugin.versions.length, 0);
      console.log(
        `${values.check ? "Checked" : "Built"} ${index.plugins.length} plugins, ${versions} versions`,
      );
      return 0;
    }
    default:
      console.log(HELP);
      return command && command !== "help" ? 1 : 0;
  }
}

main(process.argv.slice(2)).then(
  (code) => process.exit(code),
  (error) => {
    console.error(error instanceof CliError ? error.message : error);
    process.exit(1);
  },
);
