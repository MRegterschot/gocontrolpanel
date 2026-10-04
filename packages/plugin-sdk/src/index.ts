import type { PluginDefinition } from "./types";

export * from "./helpers";
export * from "./types";

// Registers the plugin with the sandbox it is loaded into. Bundle the plugin so this call runs
// when the script is evaluated (tmcp-plugin build does that).
export function definePlugin<Config = Record<string, unknown>>(
  definition: PluginDefinition<Config>,
): PluginDefinition<Config> {
  const register = (globalThis as { __tmcpRegister?: (definition: unknown) => void })
    .__tmcpRegister;
  if (typeof register === "function") register(definition);
  return definition;
}
