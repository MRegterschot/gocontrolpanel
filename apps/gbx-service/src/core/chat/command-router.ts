import type { Logger } from "../logger";

export type CommandHandler = (args: string[], login: string) => unknown;

export interface HelpProvider {
  pluginNames(): string[];
  helpText(pluginName: string): string;
}

export interface ParsedCommand {
  name: string;
  args: string[];
}

export function parseCommand(text: string): ParsedCommand | null {
  if (!text.startsWith("/")) return null;
  const [head, ...args] = text.split(" ");
  return { name: head.slice(1).toLowerCase(), args };
}

// Dispatches "/command args" chat messages to registered handlers
export class CommandRouter {
  private readonly handlers = new Map<string, Set<CommandHandler>>();

  constructor(
    private readonly log: Logger,
    private readonly reply: (login: string, message: string) => Promise<void>,
    private readonly help: () => { enabled: boolean; provider: HelpProvider },
  ) {}

  register(name: string, handler: CommandHandler): () => void {
    const key = name.toLowerCase();
    let set = this.handlers.get(key);
    if (!set) {
      set = new Set();
      this.handlers.set(key, set);
    }
    set.add(handler);
    return () => set.delete(handler);
  }

  // Returns true when the message was a command
  async dispatch(text: string, login: string): Promise<boolean> {
    const command = parseCommand(text);
    if (!command) return false;

    if (command.name === "help") {
      await this.handleHelp(command.args, login);
    }

    // Handlers run concurrently; one slow or failing handler never blocks the others
    await Promise.all(
      [...(this.handlers.get(command.name) ?? [])].map(async (handler) => {
        try {
          await handler(command.args, login);
        } catch (error) {
          this.log.error(
            { err: error, command: command.name, login },
            "Chat command handler failed",
          );
        }
      }),
    );

    return true;
  }

  private async handleHelp(args: string[], login: string): Promise<void> {
    const { enabled, provider } = this.help();
    if (!enabled) return;

    const text =
      args.length === 0
        ? "To get help for a specific plugin, use /help <plugin>. Available plugins: " +
          provider.pluginNames().join(", ")
        : provider.helpText(args[0]);

    await this.reply(login, text);
  }
}
