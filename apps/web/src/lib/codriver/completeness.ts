import { exclusiveKeywordHits } from "./router";
import { normalize } from "./text";
import type { PlannedCall, ToolCategory } from "./types";

// Arguments that carry what the player said, not a name, so their words still count
const freeTextArguments = new Set(["message", "reason"]);

// The request without the names the plan used ("red bull faster" is a club, not the red team)
function withoutNames(text: string, calls: PlannedCall[]): string {
  const names = calls
    .flatMap((call) =>
      Object.entries((call.input ?? {}) as Record<string, unknown>)
        .filter(([key]) => !freeTextArguments.has(key))
        .map(([, value]) => value),
    )
    .filter((value): value is string => typeof value === "string")
    .map(normalize)
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);
  return names.reduce(
    (rest, name) => rest.replace(new RegExp(`\\b${name}\\b`, "g"), " "),
    normalize(text),
  );
}

type AreasOf = (tool: string) => ToolCategory | ToolCategory[] | undefined;

// Areas the request mentions that none of the planned calls touch
export function uncoveredAreas(
  categories: ToolCategory[],
  calls: PlannedCall[],
  categoryOf: AreasOf,
): ToolCategory[] {
  const covered = new Set(calls.flatMap((call) => categoryOf(call.tool)));
  return categories.filter(
    (category) => category !== "info" && !covered.has(category),
  );
}

// Uncovered areas the request clearly asked about, by words only that area uses
export function missedAreas(
  text: string,
  categories: ToolCategory[],
  calls: PlannedCall[],
  categoryOf: AreasOf,
): ToolCategory[] {
  const rest = withoutNames(text, calls);
  return uncoveredAreas(categories, calls, categoryOf).filter(
    (category) => exclusiveKeywordHits(rest, category).length > 0,
  );
}

// A plan that skipped such an area without the model saying why probably lost a part
export function looksIncomplete(
  text: string,
  categories: ToolCategory[],
  calls: PlannedCall[],
  modelText: string,
  categoryOf: AreasOf,
): boolean {
  return (
    !modelText.trim() &&
    missedAreas(text, categories, calls, categoryOf).length > 0
  );
}
