import { DEFAULT_THEME, type ManialinkTheme } from "@gcp/shared";
import Handlebars from "handlebars";
import layouts from "handlebars-layouts";

export type TemplateSources = Record<string, string>;

function registerHelpers(hbs: typeof Handlebars) {
  hbs.registerHelper("boolToNum", (value: boolean) => (value ? 1 : 0));
  hbs.registerHelper("eq", (a: unknown, b: unknown) => a === b);
  hbs.registerHelper("default", (value: unknown, fallback: unknown) => value || fallback);
  hbs.registerHelper("length", (array: unknown[]) => array.length);
  hbs.registerHelper("jsonLength", (json: string) => {
    try {
      return JSON.parse(json || "[]").length;
    } catch {
      return 0;
    }
  });
  hbs.registerHelper("bool", (value: unknown) => (value ? "True" : "False"));
  hbs.registerHelper(layouts(hbs));
  hbs.registerHelper(
    "range",
    function (from: number, to: number, options: Handlebars.HelperOptions) {
      let out = "";
      for (let i = from; i < to; i++) out += options.fn({ i });
      return out;
    },
  );
  // Same helpers as the plugin sandbox, without a prefix: service pages use plain action names
  hbs.registerHelper("action", (...args: unknown[]) => args.slice(0, -1).join(""));
  hbs.registerHelper("actionPrefix", () => "");
  hbs.registerHelper("add", (a: number, b: number) => a + b);
  hbs.registerHelper("subtract", (a: number, b: number) => a - b);
  hbs.registerHelper("multiply", (a: number, b: number) => a * b);
  hbs.registerHelper("divide", (a: number, b: number) => a / b);
}

// Compiles manialink templates at runtime; every template is also a partial so layouts can extend it
export class TemplateRenderer {
  private readonly hbs = Handlebars.create();
  private readonly templates = new Map<string, Handlebars.TemplateDelegate>();

  constructor(
    sources: TemplateSources,
    private readonly theme: ManialinkTheme = DEFAULT_THEME,
  ) {
    registerHelpers(this.hbs);
    for (const [name, source] of Object.entries(sources)) {
      this.hbs.registerPartial(name, source);
      this.templates.set(name, this.hbs.compile(source));
    }
  }

  has(name: string): boolean {
    return this.templates.has(name);
  }

  names(): string[] {
    return [...this.templates.keys()].sort();
  }

  render(name: string, context: unknown, theme: ManialinkTheme = this.theme): string {
    const template = this.templates.get(name);
    if (!template) throw new Error(`Unknown manialink template "${name}"`);
    return template(context, { data: { theme } });
  }
}
