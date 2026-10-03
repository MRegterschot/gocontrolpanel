import { ServerError } from "@/types/responses";
import type { GbxClient } from "./gbx-service";

// Largest multicall the GBX service accepts
export const MAX_CALLS_PER_MULTICALL = 100;

// Calls one method for many argument sets in as few round trips as possible.
// An entry the dedicated server rejected (a fault inside the multicall) is null.
export async function callEach<T = any>(
  client: Pick<GbxClient, "multicall">,
  method: string,
  argsList: unknown[][],
): Promise<(T | null)[]> {
  const results: (T | null)[] = [];

  for (let i = 0; i < argsList.length; i += MAX_CALLS_PER_MULTICALL) {
    const chunk = argsList.slice(i, i + MAX_CALLS_PER_MULTICALL);
    const answers = await client.multicall<(T | null | undefined)[]>(
      chunk.map((args) => [method, ...args]),
    );

    // A short answer would silently turn the missing entries into "unknown"
    if (!Array.isArray(answers) || answers.length !== chunk.length) {
      throw new ServerError(
        `GBX multicall returned ${Array.isArray(answers) ? answers.length : "no"} results for ${chunk.length} calls`,
        "GbxMulticallError",
      );
    }
    results.push(...answers.map((answer) => answer ?? null));
  }

  return results;
}
