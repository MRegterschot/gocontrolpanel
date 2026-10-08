import type { Logger } from "../logger";

export const CODRIVER_COMMANDS: ReadonlySet<string> = new Set(["co", "ai"]);

export const CODRIVER_HELP: Record<string, string> = {
  co: "asks Codriver, the AI assistant, e.g. /co play a random snow map (also /ai)",
};

// Asks the panel, which runs Codriver; returns the reply for the player
export interface CodriverClient {
  ask(serverId: string, login: string, text: string): Promise<string>;
}

interface Options {
  serverId: string;
  // null when the panel URL and token are not configured
  client: CodriverClient | null;
  log: Logger;
  reply(login: string, message: string): Promise<void>;
  // A short "working on it" note when the answer takes longer than this
  thinkingDelayMs?: number;
}

const prefix = "$<$f80Codriver$>: ";

// /co and /ai: forwards the request to the panel, one at a time per player
export class CodriverCommand {
  private readonly inFlight = new Set<string>();

  constructor(private readonly options: Options) {}

  // Returns false for other commands
  async dispatch(
    name: string,
    args: string[],
    login: string,
  ): Promise<boolean> {
    if (!CODRIVER_COMMANDS.has(name)) return false;
    const { client, reply, log, serverId } = this.options;
    const say = (message: string) => reply(login, prefix + message);

    if (!client) {
      await say("Codriver is not set up on this panel.");
      return true;
    }
    const text = args.join(" ").trim();
    if (!text) {
      await say("Ask me something, for example /co help.");
      return true;
    }
    if (this.inFlight.has(login)) {
      await say("Still working on your last request.");
      return true;
    }

    this.inFlight.add(login);
    const timer = setTimeout(() => {
      say("On it...").catch(() => {});
    }, this.options.thinkingDelayMs ?? 1500);
    try {
      await say(await client.ask(serverId, login, text));
    } catch (error) {
      log.warn({ err: error, login }, "Codriver request failed");
      await say("Codriver is unavailable right now.");
    } finally {
      clearTimeout(timer);
      this.inFlight.delete(login);
    }
    return true;
  }
}
