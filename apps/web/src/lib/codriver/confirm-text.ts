import { chatSafe } from "./text";
import type { CodriverTool } from "./types";

export const quote = (text: string, max = 40) => `"${chatSafe(text, max)}"`;

// The default maps tools replace the map list and play at once unless asked to queue
export function loadPhrase(what: string, queue?: boolean): string {
  return queue
    ? `Add ${what} to the queue`
    : `Load ${what} now, replacing the current map list`;
}

const capitalize = (text: string) =>
  text.charAt(0).toUpperCase() + text.slice(1);

// The question for a changing tool that has no prompt of its own, in plain words
export function confirmQuestion(tool: CodriverTool, input: unknown): string {
  if (tool.summary) return `${capitalize(tool.summary(input))}?`;

  const args = Object.entries((input ?? {}) as Record<string, unknown>)
    .filter(
      ([, value]) => value !== undefined && value !== null && value !== "",
    )
    .map(
      ([key, value]) =>
        `${key.replace(/_/g, " ")}: ${chatSafe(Array.isArray(value) ? value.join(", ") : String(value), 60)}`,
    );
  const name = capitalize(tool.name.replace(/_/g, " "));
  return args.length > 0 ? `${name} (${args.join(", ")})?` : `${name}?`;
}
