import type {
  JevAnswer,
  JevClassifier,
  JevQuestion,
  ModelUsage,
} from "./model";
import { normalize } from "./text";
import type { PlannedCall, ToolCategory } from "./types";

// Asked only when the keyword router found nothing
const categoryQuestions: Record<ToolCategory, string> = {
  maps: "Does this request ask to find, add, queue, skip, restart or change maps, tracks, campaigns, clubs or map packs?",
  mode: "Does this request ask to change the game mode, its settings (points, time limits, rounds, warmup), pause the match or generate a game mode script?",
  players:
    "Does this request ask to kick, ban, blacklist, spectate, set points for, or manage the guest list of a player?",
  plugins:
    "Does this request ask to enable, disable, configure or reload a panel plugin, or set up a match through a plugin?",
  server:
    "Does this request ask to change the server name, description, player slots or other server settings, or to announce a message to everyone?",
  info: "Does this request ask a question about the server, the current map, mode, settings, records, players online, or what Codriver can do?",
};

// Argument-free commands; options with an argument fix it, such as pause versus unpause
const fastOptions: Record<string, { description: string; call: PlannedCall }> =
  {
    skip_map: {
      description: "Skip to the next map",
      call: { tool: "skip_map", input: {} },
    },
    restart_map: {
      description: "Restart the current map",
      call: { tool: "restart_map", input: {} },
    },
    pause: {
      description: "Pause the match",
      call: { tool: "pause_match", input: { paused: true } },
    },
    unpause: {
      description: "Resume a paused match",
      call: { tool: "pause_match", input: { paused: false } },
    },
    clear_jukebox: {
      description: "Remove every map from the queue (jukebox)",
      call: { tool: "clear_jukebox", input: {} },
    },
    server_state: {
      description:
        "Show the server status: current mode, map, players and queue",
      call: { tool: "get_server_state", input: {} },
    },
    mode_settings: {
      description: "Show the settings of the current game mode",
      call: { tool: "get_mode_settings", input: {} },
    },
    list_plugins: {
      description: "List the installed plugins and whether they are enabled",
      call: { tool: "list_plugins", input: {} },
    },
    reload_plugins: {
      description: "Reload all plugins",
      call: { tool: "reload_plugins", input: {} },
    },
    help: {
      description: "Explain what Codriver can do",
      call: { tool: "codriver_help", input: {} },
    },
  };
const OTHER = "other";

// Server-changing commands run without a model, so a false positive must be rare
export const JEV_FAST_THRESHOLD = 0.9;
export const JEV_ROUTE_THRESHOLD = 0.5;
// Longer requests usually carry arguments that need the planner
const MAX_FAST_WORDS = 8;

const ROUTE_PREFIX = "route_";
const FAST_KEY = "command";
const EXPLICIT_KEY = "explicit";
// An order, unlike a question or a wish, may skip the confirmation of tools that allow it
export const JEV_EXPLICIT_THRESHOLD = 0.9;

export function wantsJevFastPath(text: string): boolean {
  const words = normalize(text).split(" ").filter(Boolean);
  return (
    words.length > 0 &&
    words.length <= MAX_FAST_WORDS &&
    !words.some((word) => ["and", "then", "also"].includes(word))
  );
}

export interface JevDecision {
  // Categories above the threshold, or null when Jev did not route
  categories: ToolCategory[] | null;
  routeProbabilities?: Partial<Record<ToolCategory, number>>;
  fast: PlannedCall | null;
  fastOption?: string;
  fastProbability?: number;
  // The player gave an order rather than asking or wishing; only set with `fast`
  explicit: boolean;
  usage: ModelUsage | null;
}

// One Jev call answers both the route and the command questions, so it adds latency once
export async function askJev(
  classifier: JevClassifier,
  text: string,
  want: { route: boolean; fast: boolean },
  signal?: AbortSignal,
): Promise<JevDecision> {
  const questions: Record<string, JevQuestion> = {};
  if (want.route) {
    for (const [category, instructions] of Object.entries(categoryQuestions)) {
      questions[ROUTE_PREFIX + category] = { type: "noul", instructions };
    }
  }
  if (want.fast) {
    questions[FAST_KEY] = {
      type: "choice",
      instructions:
        "Which single command does this chat request to a Trackmania server assistant ask for?",
      criteria: {
        ...Object.fromEntries(
          Object.entries(fastOptions).map(([key, option]) => [
            key,
            option.description,
          ]),
        ),
        [OTHER]:
          "Anything else, including requests that name a map, player, plugin, setting or value, ask several things, or are not a command",
      },
    };
    questions[EXPLICIT_KEY] = {
      type: "noul",
      instructions:
        "Is the player ordering this to happen right now, as an imperative?",
      criteria: {
        true: "A direct order, such as 'skip', 'next map please' or 'restart this map'",
        false:
          "A question, suggestion, wish or remark, such as 'should we skip?', 'can we restart?', 'this map is boring' or 'maybe skip it'",
      },
    };
  }
  if (Object.keys(questions).length === 0) {
    return { categories: null, fast: null, explicit: false, usage: null };
  }

  const { answers, usage } = await classifier.decide(text, questions, signal);
  const decision: JevDecision = {
    categories: null,
    fast: null,
    explicit: false,
    usage,
  };

  if (want.route) {
    const probabilities: Partial<Record<ToolCategory, number>> = {};
    for (const category of Object.keys(categoryQuestions) as ToolCategory[]) {
      const answer = answers[ROUTE_PREFIX + category];
      if (answer?.type === "noul") probabilities[category] = answer.noul;
    }
    const passed = (Object.keys(probabilities) as ToolCategory[]).filter(
      (category) => probabilities[category]! >= JEV_ROUTE_THRESHOLD,
    );
    decision.routeProbabilities = probabilities;
    decision.categories = passed.length > 0 ? passed : null;
  }

  if (want.fast) {
    const answer: JevAnswer | undefined = answers[FAST_KEY];
    if (answer?.type === "choice") {
      const probability = answer.probabilities[answer.choice] ?? 0;
      decision.fastOption = answer.choice;
      decision.fastProbability = probability;
      const option = fastOptions[answer.choice];
      if (option && probability >= JEV_FAST_THRESHOLD)
        decision.fast = option.call;
    }
    const explicit = answers[EXPLICIT_KEY];
    decision.explicit =
      !!decision.fast &&
      explicit?.type === "noul" &&
      explicit.noul >= JEV_EXPLICIT_THRESHOLD;
  }
  return decision;
}
