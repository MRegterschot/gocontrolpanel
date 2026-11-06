import { readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import type { TemplateSources } from "../core/manialink/template-renderer";

// Loads every .hbs file below dir, keyed by its relative path without extension ("widgets/map-info/map-info")
export function loadTemplateSources(dir: string): TemplateSources {
  const sources: TemplateSources = {};

  const walk = (current: string) => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const path = join(current, entry.name);
      if (entry.isDirectory()) {
        walk(path);
      } else if (entry.name.endsWith(".hbs")) {
        const name = relative(dir, path).slice(0, -".hbs".length).split(sep).join("/");
        sources[name] = readFileSync(path, "utf8");
      }
    }
  };

  walk(dir);
  return sources;
}
