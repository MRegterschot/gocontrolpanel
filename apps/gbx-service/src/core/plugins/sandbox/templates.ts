import Handlebars from "handlebars";

// Handlebars parses templates slowly inside QuickJS (pick & ban's takes longer than a plugin call
// may run), so templates are compiled to JavaScript here and only executed in the sandbox. A
// hostile template can't gain anything from this: the generated code runs in the sandbox too.
export function precompileTemplates(sources: Record<string, string>): Record<string, string> {
  const specs: Record<string, string> = {};
  for (const [name, source] of Object.entries(sources)) {
    try {
      specs[name] = Handlebars.precompile(source) as string;
    } catch (error) {
      throw new Error(
        `Template ${name} doesn't compile: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
  return specs;
}
