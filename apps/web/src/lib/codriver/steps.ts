import "server-only";
import type { Turn } from "./conversation";
import { notify } from "./progress";
import {
  type CodriverOptions,
  type CodriverOutcome,
  type CodriverRequest,
  runCodriver,
} from "./runner";
import type { PlannedCall } from "./types";

export { MAX_REQUEST_LENGTH } from "./text";
export const MAX_STEPS = 6;

// "Do X. Then do Y, then Z" -> three steps. Only "then" after punctuation or "and" splits,
// so "if X then Y" inside one sentence stays whole.
const boundary =
  /(?:(?<=[.!?;,])\s*(?:and\s+)?|\s+and\s+)(?:then|after that|afterwards)\b[\s,:]*/gi;

export function splitSteps(text: string): string[] {
  return text
    .split(boundary)
    .map((step) => step.trim().replace(/\s*[,;]$/, ""))
    .filter((step) => /\w/.test(step));
}

// Where a stepped request stands: what ran, and what runs after a confirmation
export interface StepsProgress {
  // Numbered replies of the steps that ran
  done: string[];
  // Earlier steps as turns, so later steps can refer to what they made
  turns: Turn[];
}

export interface PendingSteps extends StepsProgress {
  // The step waiting for confirmation, and the ones after it
  step: string;
  steps: string[];
}

export interface StepsOutcome extends CodriverOutcome {
  // Every call that ran or is waiting, for the request history
  allCalls: PlannedCall[];
  // Set with needs_confirmation when steps remain
  pending?: PendingSteps;
}

export function stoppedNote(remaining: number, next: number): string {
  if (remaining <= 0) return "";
  return remaining === 1
    ? `Stopped, so step ${next} didn't run.`
    : `Stopped, so steps ${next}-${next + remaining - 1} didn't run.`;
}

// Runs each step as its own request, in order, and stops at the first that doesn't finish
export async function runSteps(
  request: CodriverRequest,
  options: CodriverOptions,
  steps: string[],
  progress: StepsProgress = { done: [], turns: [] },
): Promise<StepsOutcome> {
  const done = [...progress.done];
  const turns = [...progress.turns];
  const usage: CodriverOutcome["usage"] = [];
  const allCalls: PlannedCall[] = [];
  const total = done.length + steps.length;

  for (let index = 0; index < steps.length; index++) {
    const number = done.length + 1;
    const outcome = await runCodriver(
      {
        ...request,
        text: steps[index],
        history: [...(request.history ?? []), ...turns],
        onProgress: (update) =>
          notify(request.onProgress, {
            ...update,
            text: `Step ${number}/${total}: ${update.text}`,
          }),
      },
      // One reply per step; the templated ones name exactly what was made
      { ...options, compose: false },
    );
    usage.push(...outcome.usage);
    allCalls.push(...outcome.calls);
    const line = `${number}. ${outcome.reply}`;

    if (outcome.status === "done" || outcome.status === "planned") {
      done.push(line);
      turns.push({ request: steps[index], reply: outcome.reply });
      continue;
    }
    if (outcome.status === "needs_confirmation") {
      return {
        ...outcome,
        reply: [...done, line].join("\n"),
        usage,
        allCalls,
        pending: {
          done,
          turns,
          step: steps[index],
          steps: steps.slice(index + 1),
        },
      };
    }
    const note = stoppedNote(steps.length - index - 1, number + 1);
    return {
      ...outcome,
      reply: [...done, line, note].filter(Boolean).join("\n"),
      calls: allCalls,
      usage,
      allCalls,
    };
  }

  return {
    status: options.dryRun ? "planned" : "done",
    reply: done.join("\n"),
    calls: allCalls,
    usage,
    fastPath: false,
    allCalls,
  };
}
