import type { CodriverProgress } from "@gcp/shared";
import type { PlannedCall } from "./types";

export type ProgressListener = (progress: CodriverProgress) => void;

// Templated from tool names, never from model text
export function runningProgress(calls: PlannedCall[]): CodriverProgress {
  const names = calls.map((call) => call.tool.replaceAll("_", " "));
  return { stage: "running", text: `Running: ${names.join(", then ")}…` };
}

// Progress is a courtesy: a broken listener must never affect the request
export function notify(
  listener: ProgressListener | undefined,
  progress: CodriverProgress,
): void {
  try {
    listener?.(progress);
  } catch {
    // ignored on purpose
  }
}
