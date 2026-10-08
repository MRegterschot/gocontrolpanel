import {
  name as appName,
  version as appVersion,
} from "../../../../../package.json";
import type { Logger } from "../logger";
import { SYSTEM_COMMAND_HELP } from "./system-commands";

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
    private readonly systemCommand?: (
      name: string,
      login: string,
      args: string[],
    ) => Promise<boolean>,
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

    // Native commands work without plugins and cannot be overridden by one.
    if (command.name === "version") {
      await this.reply(login, `${appName} v${appVersion}`);
      return true;
    }

    if (command.name === "help") {
      await this.handleHelp(command.args, login);
      return true;
    }

    if (await this.systemCommand?.(command.name, login, command.args))
      return true;

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
        ? "Native commands: /version, " +
          Object.keys(SYSTEM_COMMAND_HELP)
            .map((name) => `/${name}`)
            .join(", ") +
          ". To get help for a specific plugin, use /help <plugin>. Available plugins: " +
          provider.pluginNames().join(", ")
        : args[0].toLowerCase() === "version"
          ? "/version: shows the control panel app version."
          : Object.hasOwn(SYSTEM_COMMAND_HELP, args[0].toLowerCase())
            ? `/${args[0].toLowerCase()}: ${SYSTEM_COMMAND_HELP[args[0].toLowerCase()]}.`
            : provider.helpText(args[0]);

    await this.reply(login, text);
  }
}
