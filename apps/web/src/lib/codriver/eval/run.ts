import { guestActor, type Actor } from "@/lib/actor";
import { sessionClaimsSchema } from "@gcp/shared";
import type { CodriverModel } from "../model";
import { scriptForMode } from "../modes";
import { runCodriver } from "../runner";
import { costMicros } from "../usage";
import { grade, type EvalCase } from "./grader";

const serverId = "codriver-eval";
export function evalActor(role: EvalCase["role"]): Actor {
  if (role === "guest") return guestActor("eval-player");
  return {
    userId: "eval-user",
    login: "eval-player",
    displayName: "Eval Player",
    claims: sessionClaimsSchema.parse({
      id: "eval-user",
      admin: false,
      login: "eval-player",
      servers: [
        {
          id: serverId,
          name: "Evaluation",
          role: role[0].toUpperCase() + role.slice(1),
        },
      ],
    }),
  };
}

export async function evaluateCase(
  test: EvalCase,
  model: CodriverModel,
  modelName: string,
) {
  const started = performance.now();
  const script = scriptForMode(test.state.mode)!;
  const outcome = await runCodriver(
    { serverId, actor: evalActor(test.role), text: test.text },
    {
      model,
      primaryModel: modelName,
      escalationModel: null,
      dryRun: true,
      getState: async () => ({
        script,
        nextScript: script,
        map: {
          uid: "fixture",
          name: test.state.map,
          author: "fixture",
          fileName: "fixture.Map.Gbx",
        },
        players: Array.from({ length: test.state.players }, (_, index) => ({
          login: `fixture-${index}`,
          nickName: `Player ${index}`,
          spectator: false,
        })),
      }),
    },
  );
  return {
    id: test.id,
    ...grade(test, outcome),
    latencyMs: Math.round(performance.now() - started),
    costMicros: costMicros(outcome.usage),
    fastPath: outcome.fastPath,
    usage: outcome.usage,
    actual: {
      status: outcome.status,
      calls: outcome.calls,
      reply: outcome.reply,
    },
  };
}
