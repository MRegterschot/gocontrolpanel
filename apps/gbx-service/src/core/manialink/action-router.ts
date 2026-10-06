import type { PlayerManialinkPageAnswer } from "@gcp/shared";
import type { Logger } from "../logger";

export type ActionHandler = (
  answer: PlayerManialinkPageAnswer,
  params: Record<string, string>,
) => unknown;

interface Route {
  pattern: string;
  regex: RegExp | null;
  keys: string[];
  handlers: Set<ActionHandler>;
}

function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// "match-pickban-action-{uid}" -> /^match-pickban-action-([^/]+)$/ with keys ["uid"]
export function compileActionPattern(pattern: string): {
  regex: RegExp | null;
  keys: string[];
} {
  const keys: string[] = [];
  const parts = pattern.split(/(\{[^}]+\})/);
  if (parts.length === 1) return { regex: null, keys };

  const source = parts
    .map((part) => {
      const match = /^\{([^}]+)\}$/.exec(part);
      if (!match) return escapeRegex(part);
      keys.push(match[1]);
      return "([^/]+)";
    })
    .join("");

  return { regex: new RegExp(`^${source}$`), keys };
}

// Routes manialink page answers (button actions) to handlers by exact name or pattern
export class ActionRouter {
  private readonly routes = new Map<string, Route>();

  constructor(private readonly log: Logger) {}

  register(pattern: string, handler: ActionHandler): () => void {
    let route = this.routes.get(pattern);
    if (!route) {
      route = { pattern, ...compileActionPattern(pattern), handlers: new Set() };
      this.routes.set(pattern, route);
    }
    route.handlers.add(handler);
    const target = route;
    return () => target.handlers.delete(handler);
  }

  async dispatch(answer: PlayerManialinkPageAnswer): Promise<void> {
    const running: Promise<void>[] = [];

    for (const route of [...this.routes.values()]) {
      let params: Record<string, string> | null = null;

      if (route.pattern === answer.Answer) {
        params = {};
      } else if (route.regex) {
        const match = route.regex.exec(answer.Answer);
        if (match) {
          params = Object.fromEntries(
            route.keys.map((key, i) => [key, match[i + 1]]),
          );
        }
      }

      if (!params) continue;

      for (const handler of [...route.handlers]) {
        const matched = params;
        running.push(
          (async () => {
            try {
              await handler(answer, matched);
            } catch (error) {
              this.log.error(
                { err: error, action: answer.Answer, login: answer.Login },
                "Manialink action handler failed",
              );
            }
          })(),
        );
      }
    }

    await Promise.all(running);
  }
}
