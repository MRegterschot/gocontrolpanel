import type { Logger } from "../logger";

export const CODRIVER_COMMANDS: ReadonlySet<string> = new Set([
  "co",
  "ai",
  "feedback",
]);

export const CODRIVER_HELP: Record<string, string> = {
  co: "asks Codriver, the AI assistant, e.g. /co play a random snow map (also /ai)",
  feedback:
    "adds a note to your latest Codriver request, e.g. /feedback that was the wrong map",
};

// Asks the panel, which runs Codriver; returns the reply for the player
export interface CodriverClient {
  // onProgress gets short status lines while the request runs
  ask(
    serverId: string,
    login: string,
    text: string,
    onProgress?: (text: string) => void,
  ): Promise<string>;
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
// Status lines per request, so a slow one doesn't flood the chat
const MAX_NOTES = 3;

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
    const isFeedback = name === "feedback";
    const typed = args.join(" ").trim();
    if (!typed && !isFeedback) {
      await say("Ask me something, for example /co help.");
      return true;
    }
    // The panel recognises feedback by its prefix, the same way in game and in the panel chat
    const text = isFeedback ? `/feedback ${typed}`.trim() : typed;
    if (this.inFlight.has(login)) {
      await say("Still working on your last request.");
      return true;
    }

    this.inFlight.add(login);
    // The game hides /commands, so show the player what they asked
    say(`$i> ${typed.replace(/\$/g, "$$$$")}`).catch(() => {});
    // Fast requests stay quiet; slow ones get a few status lines, never repeated
    let latest: string | null = null;
    let lastSent: string | null = null;
    let sent = 0;
    let waited = false;
    const note = (message: string) => {
      if (sent >= MAX_NOTES || message === lastSent) return;
      sent++;
      lastSent = message;
      say(message).catch(() => {});
    };
    const timer = setTimeout(() => {
      waited = true;
      note(latest ?? "On it...");
    }, this.options.thinkingDelayMs ?? 1500);
    try {
      const answer = await client.ask(serverId, login, text, (progress) => {
        latest = progress;
        if (waited) note(progress);
      });
      await say(answer);
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
