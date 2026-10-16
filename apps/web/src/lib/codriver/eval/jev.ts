import { isDeepStrictEqual } from "node:util";
import { parseFastPath } from "../fast-path";
import { askJev, wantsJevFastPath } from "../jev";
import type { JevClassifier } from "../model";
import { routeRequest } from "../router";
import { type CodriverTool, hasRole, type ToolCategory } from "../types";
import { costMicros } from "../usage";
import type { EvalCase } from "./grader";

const covers = (route: ToolCategory[], needed: ToolCategory[]) =>
  needed.every((category) => route.includes(category));

// Routing and fast-path check for one case, without planner calls
export async function evaluateJevCase(
  test: EvalCase,
  classifier: JevClassifier,
  tools: CodriverTool[],
) {
  const needed =
    test.expected.kind === "calls"
      ? [
          ...new Set(
            test.expected.calls.flatMap((call) => {
              const tool = tools.find((t) => t.name === call.tool);
              return tool ? [tool.category] : [];
            }),
          ),
        ]
      : [];
  const keyword = routeRequest(test.text);
  const exact = parseFastPath(test.text);
  const askFast = !exact && wantsJevFastPath(test.text);
  // Jev routes every case here, so its routes can be compared with the keywords' on all of them
  const decision = await askJev(classifier, test.text, {
    route: true,
    fast: askFast,
  });
  const jevRoute = decision.categories ?? [];
  // What the runner would offer: keywords first, Jev only on a keyword miss
  const combined =
    keyword.fallback && decision.categories
      ? decision.categories
      : keyword.categories;

  const expectedCalls =
    test.expected.kind === "calls" ? test.expected.calls : null;
  const fastCorrect =
    !!decision.fast &&
    expectedCalls?.length === 1 &&
    expectedCalls[0].tool === decision.fast.tool &&
    isDeepStrictEqual(expectedCalls[0].input, decision.fast.input);

  // A refusal the role check still enforces is not a false positive
  const fastTool = tools.find((t) => t.name === decision.fast?.tool);
  const roleRefuses =
    test.expected.kind === "refusal" &&
    !!fastTool &&
    !hasRole(test.role, fastTool.minRole);

  return {
    id: test.id,
    needed,
    keywordFallback: keyword.fallback,
    keywordCovers: covers(keyword.categories, needed),
    jevRoute,
    jevCovers: covers(jevRoute, needed),
    combinedCovers: covers(combined, needed),
    routeProbabilities: decision.routeProbabilities,
    fastAsked: askFast,
    fast: decision.fast,
    fastOption: decision.fastOption,
    fastProbability: decision.fastProbability,
    // A command chosen where the case expects something else
    fastFalsePositive: !!decision.fast && !fastCorrect && !roleRefuses,
    costMicros: decision.usage ? costMicros([decision.usage]) : 0,
  };
}
