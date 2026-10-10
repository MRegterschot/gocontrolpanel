import { exclusiveKeywordHits } from "./router";
import type { PlannedCall, ToolCategory } from "./types";

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
  return uncoveredAreas(categories, calls, categoryOf).filter(
    (category) => exclusiveKeywordHits(text, category).length > 0,
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
