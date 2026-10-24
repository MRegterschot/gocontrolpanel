import type { CommandResult } from "@gcp/shared";
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
  // Which plugin registered a handler, so the panel can run one plugin's command
  private readonly owners = new WeakMap<CommandHandler, string>();

  constructor(
    private readonly log: Logger,
    private readonly reply: (login: string, message: string) => Promise<void>,
    private readonly help: () => { enabled: boolean; provider: HelpProvider },
    private readonly systemCommand?: (
      name: string,
      login: string,
      args: string[],
    ) => Promise<boolean>,
    // Native commands that are only there when configured, such as Codriver's /co
    private readonly extraHelp: () => Record<string, string> = () => ({}),
  ) {}

  register(name: string, handler: CommandHandler, owner?: string): () => void {
    const key = name.toLowerCase();
    let set = this.handlers.get(key);
    if (!set) {
      set = new Set();
      this.handlers.set(key, set);
    }
    // A wrapper, so one function registered by two owners stays two handlers
    const entry: CommandHandler = (args, login) => handler(args, login);
    if (owner) this.owners.set(entry, owner);
    set.add(entry);
    return () => set.delete(entry);
  }

  // Runs one owner's handlers for a command as `login`; false when it has none
  async runAs(
    owner: string,
    name: string,
    args: string[],
    login: string,
  ): Promise<boolean> {
    const handlers = [...(this.handlers.get(name.toLowerCase()) ?? [])].filter(
      (handler) => this.owners.get(handler) === owner,
    );
    await Promise.all(handlers.map((handler) => handler(args, login)));
    return handlers.length > 0;
  }

  // Returns true when the message was a command
  async dispatch(text: string, login: string): Promise<boolean> {
    const command = parseCommand(text);
    if (!command) return false;

    await this.execute(command.name, command.args, login);
    return true;
  }

  // Structured invocation preserves arguments containing spaces; false for unknown commands.
  async execute(name: string, args: string[], login: string): Promise<boolean> {
    return (await this.executeDetailed(name, args, login)).handled;
  }

  async executeDetailed(
    name: string,
    args: string[],
    login: string,
  ): Promise<Pick<CommandResult, "handled" | "source">> {
    const command = { name: name.toLowerCase(), args };

    // Native commands work without plugins and cannot be overridden by one.
    if (command.name === "version") {
      await this.reply(login, `${appName} v${appVersion}`);
      return { handled: true, source: "builtin" };
    }

    if (command.name === "help") {
      await this.handleHelp(command.args, login);
      return { handled: true, source: "builtin" };
    }

    if (await this.systemCommand?.(command.name, login, command.args))
      return { handled: true, source: "builtin" };

    // Handlers run concurrently; one slow or failing handler never blocks the others
    const handlers = [...(this.handlers.get(command.name) ?? [])];
    await Promise.all(
      handlers.map(async (handler) => {
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

    return {
      handled: handlers.length > 0,
      source: handlers.length ? "plugin" : null,
    };
  }

  private async handleHelp(args: string[], login: string): Promise<void> {
    const { enabled, provider } = this.help();
    if (!enabled) return;

    const native = { ...SYSTEM_COMMAND_HELP, ...this.extraHelp() };
    const text =
      args.length === 0
        ? "Native commands: /version, " +
          Object.keys(native)
            .map((name) => `/${name}`)
            .join(", ") +
          ". To get help for a specific plugin, use /help <plugin>. Available plugins: " +
          provider.pluginNames().join(", ")
        : args[0].toLowerCase() === "version"
          ? "/version: shows the control panel app version."
          : Object.hasOwn(native, args[0].toLowerCase())
            ? `/${args[0].toLowerCase()}: ${native[args[0].toLowerCase()]}.`
            : provider.helpText(args[0]);

    await this.reply(login, text);
  }
}
