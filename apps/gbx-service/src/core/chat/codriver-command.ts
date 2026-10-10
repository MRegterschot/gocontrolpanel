import type { Logger } from "../logger";
import { CodriverDrafts, MAX_DRAFT_LENGTH } from "./codriver-drafts";

export { MAX_DRAFT_LENGTH };

export const CODRIVER_COMMANDS: ReadonlySet<string> = new Set([
  "co",
  "ai",
  "co+",
  "ai+",
  "feedback",
]);

export const CODRIVER_HELP: Record<string, string> = {
  co: "asks Codriver, the AI assistant, e.g. /co play a random snow map (also /ai); /co alone opens the Codriver window",
  "co+":
    "adds a part to a long Codriver request; the next /co sends it all, e.g. /co+ create a cup script. Then load the BNL campaign",
  feedback:
    "adds a note to your latest Codriver request, e.g. /feedback that was the wrong map",
};

export interface CodriverAnswer {
  reply: string;
  // Such as "done" or "needs_confirmation"; missing from older panels
  status?: string;
}

// Asks the panel, which runs Codriver; returns the reply for the player
export interface CodriverClient {
  // onProgress gets short status lines while the request runs
  ask(
    serverId: string,
    login: string,
    text: string,
    onProgress?: (text: string) => void,
  ): Promise<CodriverAnswer>;
  // Forgets the player's conversation and open question
  clear(serverId: string, login: string): Promise<void>;
}

interface Options {
  serverId: string;
  // null when the panel URL and token are not configured
  client: CodriverClient | null;
  log: Logger;
  reply(login: string, message: string): Promise<void>;
  // A short "working on it" note when the answer takes longer than this
  thinkingDelayMs?: number;
  // Shared with the Codriver window; the command keeps its own when absent
  drafts?: CodriverDrafts;
  // For tests
  now?: () => number;
  // Opens the Codriver window for a bare /co
  open?: (login: string) => void;
}

const prefix = "$<$f80Codriver$>: ";
// Status lines per request (per step of a long one), so a slow one doesn't flood the chat
const MAX_NOTES = 3;

// /co and /ai: forwards the request to the panel, one at a time per player
export class CodriverCommand {
  private readonly inFlight = new Set<string>();
  private readonly drafts: CodriverDrafts;

  constructor(private readonly options: Options) {
    this.drafts =
      options.drafts ?? new CodriverDrafts(() => options.now?.() ?? Date.now());
  }

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
    const draft = this.drafts.get(login);

    if (name.endsWith("+")) {
      if (!typed) {
        await say(
          "Add a part of your request, e.g. /co+ then load the campaign.",
        );
        return true;
      }
      const next = this.drafts.append(login, typed);
      if (next === null) {
        await say(
          `That makes your request longer than ${MAX_DRAFT_LENGTH} characters. Send it with /co, or split it.`,
        );
        return true;
      }
      await say(
        `$i+ ${typed.replace(/\$/g, "$$$$")}$z Added (${next.length}/${MAX_DRAFT_LENGTH}). Send /co to run it, or /co+ to add more.`,
      );
      return true;
    }

    if (!typed && !isFeedback && !draft) {
      if (this.options.open) {
        this.options.open(login);
        return true;
      }
      await say("Ask me something, for example /co help.");
      return true;
    }
    // The panel recognises feedback by its prefix, the same way in game and in the panel chat
    const text = isFeedback
      ? `/feedback ${typed}`.trim()
      : [draft, typed].filter(Boolean).join(" ");
    if (this.inFlight.has(login)) {
      await say("Still working on your last request.");
      return true;
    }

    this.inFlight.add(login);
    if (!isFeedback) this.drafts.clear(login);
    // The game hides /commands, so show the player what they asked
    if (typed) say(`$i> ${typed.replace(/\$/g, "$$$$")}`).catch(() => {});
    // Fast requests stay quiet; slow ones get a few status lines, never repeated
    let latest: string | null = null;
    let lastSent: string | null = null;
    let sent = 0;
    let step: string | undefined;
    let waited = false;
    const note = (message: string) => {
      // "Step 2/5: ..." starts a new budget of status lines
      const current = /^Step (\d+)\//.exec(message)?.[1];
      if (current !== step) {
        step = current;
        sent = 0;
      }
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
      const { reply: answer } = await client.ask(
        serverId,
        login,
        text,
        (progress) => {
          latest = progress;
          if (waited) note(progress);
        },
      );
      // A request in steps answers with one line per step
      for (const line of answer.split("\n")) if (line.trim()) await say(line);
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
