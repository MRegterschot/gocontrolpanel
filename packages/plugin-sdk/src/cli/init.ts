import { existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import {
  isFirstPartySlug,
  isReservedSlug,
  MANIFEST_FILE,
  PLUGIN_SDK_VERSION,
  PLUGIN_SLUG,
} from "@gcp/shared";
import { CliError } from "./project";

// Scaffolds a plugin project with a widget, a command and a config field
export function initPlugin(target: string, options: { slug?: string; name?: string } = {}): string[] {
  const dir = resolve(target);
  if (existsSync(dir) && readdirSync(dir).length > 0) {
    throw new CliError(`${dir} is not empty`);
  }

  const slug = options.slug ?? basename(dir).toLowerCase().replace(/[^a-z0-9-]+/g, "-");
  if (!PLUGIN_SLUG.test(slug) || isReservedSlug(slug) || isFirstPartySlug(slug) || slug.includes("--")) {
    throw new CliError(
      `"${slug}" can't be a plugin slug: 3-40 lowercase letters, digits and dashes, not a reserved or first-party name. Pass --slug.`,
    );
  }
  const name = options.name ?? slug.replace(/(^|-)(\w)/g, (_, dash: string, c: string) => `${dash ? " " : ""}${c.toUpperCase()}`);

  const files: Record<string, string> = {
    [MANIFEST_FILE]: `${JSON.stringify(
      {
        slug,
        name,
        version: "0.1.0",
        sdk: PLUGIN_SDK_VERSION,
        description: `${name} for GoControlPanel.`,
        author: "Your name",
        license: "MIT",
        commands: [slug],
        capabilities: ["ui", "chat:send"],
        configSchema: {
          type: "object",
          properties: {
            message: {
              type: "string",
              title: "Message",
              description: "Shown in the widget and sent by the command.",
              default: "Hello from my plugin",
              maxLength: 100,
            },
          },
        },
        helpText: `/${slug} - says hello`,
      },
      null,
      2,
    )}\n`,
    "src/index.ts": `import { definePlugin } from "@tmcontrolpanel/plugin-sdk";

interface Config {
  message: string;
}

export default definePlugin<Config>({
  create(ctx) {
    const widget = ctx.ui.widget({
      id: "main",
      template: "widgets/main",
      withUpdate: false,
      position: { x: -158, y: 40 },
    });

    const render = () => {
      widget.setData({ message: ctx.config().message });
      widget.display();
    };

    ctx.command("${slug}", (_args, login) => ctx.chat.sendTo(login, ctx.config().message));
    ctx.action("hello", (answer) => ctx.chat.sendTo(answer.login, ctx.config().message));

    return {
      start: render,
      onConfigUpdate: render,
    };
  },
});
`,
    "templates/widgets/main.hbs": `{{#extend "widget"}}
{{#content "widget"}}
<frame pos="0 0">
  <quad pos="0 0" z-index="0" size="50 8" bgcolor="{{ @theme.quad.background }}" opacity="0.85" />
  <label pos="2 -4" z-index="1" size="46 6" text="{{ data.message }}" valign="center" textsize="1.5" textcolor="{{ @theme.label.foreground }}" action="{{action "hello"}}" />
</frame>
{{/content}}
{{/extend}}
`,
    "README.md": `# ${name}

A GoControlPanel plugin.

\`\`\`bash
npm install
npm run pack      # dist/${slug}-0.1.0.zip
\`\`\`

Upload the zip on the Plugins page of your panel to try it on your own servers, or submit it to the
marketplace with a pull request to the plugin registry.
`,
    "package.json": `${JSON.stringify(
      {
        name: slug,
        private: true,
        type: "module",
        scripts: { build: "tmcp-plugin build", pack: "tmcp-plugin pack" },
        devDependencies: { "@tmcontrolpanel/plugin-sdk": "^0.1.0", typescript: "^5" },
      },
      null,
      2,
    )}\n`,
    "tsconfig.json": `${JSON.stringify(
      {
        compilerOptions: {
          target: "ES2022",
          module: "ESNext",
          moduleResolution: "bundler",
          strict: true,
          noEmit: true,
          skipLibCheck: true,
          types: [],
        },
        include: ["src"],
      },
      null,
      2,
    )}\n`,
    ".gitignore": "node_modules\ndist\n",
  };

  for (const [path, content] of Object.entries(files)) {
    const file = join(dir, path);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, content);
  }
  return Object.keys(files);
}
