import { availableParallelism, loadavg } from "node:os";
import type { GbxConnection } from "../gbx/connection";
import type { LiveState } from "../live/live-state";
import type { Logger } from "../logger";
import type { Clock } from "../ports";

export const SYSTEM_COMMAND_HELP: Record<string, string> = {
  uptime: "shows service uptime and server connection duration",
  status: "shows connection state, game mode, and player count",
  plugins: "lists installed plugins, versions, and enabled/running state",
  ping: "measures the dedicated server XML-RPC response time",
  sysinfo:
    "shows runtime, memory usage, and host CPU load (server admins only)",
  diagnostics:
    "checks database, Redis, and GBX connectivity (server admins only)",
};

export interface SystemCommandServices {
  isAdmin(serverId: string, login: string): Promise<boolean>;
  checkDatabase(): Promise<void>;
  checkRedis(): Promise<void>;
}

interface Options {
  serverId: string;
  state: LiveState;
  gbx: GbxConnection;
  clock: Clock;
  log: Logger;
  reply(login: string, message: string): Promise<void>;
  connected(): boolean;
  connectedAt(): number | null;
  loadedPlugins(): string[];
  services?: SystemCommandServices;
  serviceUptime?: () => number;
}

export function formatDuration(ms: number): string {
  let seconds = Math.max(0, Math.floor(ms / 1000));
  const parts: string[] = [];
  for (const [unit, size] of [
    ["d", 86400],
    ["h", 3600],
    ["m", 60],
    ["s", 1],
  ] as const) {
    const value = Math.floor(seconds / size);
    seconds %= size;
    if (value || unit === "s") parts.push(`${value}${unit}`);
  }
  return parts.join(" ");
}

export class SystemCommands {
  constructor(private readonly options: Options) {}

  async dispatch(name: string, login: string): Promise<boolean> {
    if (!Object.hasOwn(SYSTEM_COMMAND_HELP, name)) return false;
    const { state, reply, clock } = this.options;
    try {
      if (name === "sysinfo" || name === "diagnostics") {
        if (
          !this.options.services ||
          !(await this.timed(() =>
            this.options.services!.isAdmin(this.options.serverId, login),
          ))
        ) {
          await reply(login, `/${name} is only available to server admins.`);
          return true;
        }
      }
      switch (name) {
        case "uptime": {
          const connectedAt = this.options.connectedAt();
          const service = formatDuration(
            (this.options.serviceUptime ?? process.uptime)() * 1000,
          );
          const connection =
            connectedAt === null
              ? "disconnected"
              : formatDuration(clock.now() - connectedAt);
          await reply(
            login,
            `Service uptime: ${service}. Server connection: ${connection}.`,
          );
          break;
        }
        case "status": {
          const spectators = state.activePlayers.filter(
            (player) => player.spectatorStatus % 10 !== 0,
          ).length;
          await reply(
            login,
            `Connection: ${this.options.connected() ? "connected" : "disconnected"}. Mode: ${state.liveInfo.type || state.liveInfo.mode || "unknown"}. Players: ${state.activePlayers.length - spectators}. Spectators: ${spectators}.`,
          );
          break;
        }
        case "plugins": {
          const loaded = new Set(this.options.loadedPlugins());
          const plugins = [...state.plugins].sort((a, b) =>
            a.name.localeCompare(b.name),
          );
          if (!plugins.length)
            await reply(login, "No plugins installed on this server.");
          for (const plugin of plugins) {
            const version = plugin.package?.version ?? "builtin";
            const status = !plugin.enabled
              ? "disabled"
              : loaded.has(plugin.name)
                ? "enabled, running"
                : "enabled, not running";
            await reply(login, `${plugin.name} ${version}: ${status}.`);
          }
          break;
        }
        case "ping": {
          const start = clock.now();
          await this.timed(() => this.options.gbx.call("GetVersion"));
          await reply(
            login,
            `Dedicated server XML-RPC response time: ${Math.max(0, clock.now() - start)} ms.`,
          );
          break;
        }
        case "sysinfo": {
          const memory = process.memoryUsage();
          await reply(
            login,
            `Runtime: Node ${process.version} (${process.platform}/${process.arch}). Memory: RSS ${(memory.rss / 1048576).toFixed(1)} MiB, heap ${(memory.heapUsed / 1048576).toFixed(1)} MiB. CPUs: ${availableParallelism()}. Host CPU load (1m): ${loadavg()[0].toFixed(2)}.`,
          );
          break;
        }
        case "diagnostics": {
          const services = this.options.services!;
          const results = await Promise.all([
            this.probe("Database", () => services.checkDatabase()),
            this.probe("Redis", () => services.checkRedis()),
            this.probe("GBX", () => this.options.gbx.call("GetVersion")),
          ]);
          await reply(login, results.join(". ") + ".");
          break;
        }
      }
    } catch (error) {
      this.options.log.error(
        { err: error, command: name, login },
        "Native command failed",
      );
      await reply(login, `Could not complete /${name}. Try again later.`);
    }
    return true;
  }

  private async probe(
    name: string,
    check: () => Promise<unknown>,
  ): Promise<string> {
    const start = this.options.clock.now();
    try {
      await this.timed(check);
      return `${name}: OK (${Math.max(0, this.options.clock.now() - start)} ms)`;
    } catch (error) {
      this.options.log.warn(
        { err: error, check: name },
        "System diagnostic failed",
      );
      return `${name}: unavailable`;
    }
  }

  private async timed<T>(check: () => Promise<T>): Promise<T> {
    let timer: unknown;
    const timeout = new Promise<never>((_, reject) => {
      timer = this.options.clock.setTimeout(
        () => reject(new Error("System check timed out")),
        3000,
      );
    });
    try {
      return await Promise.race([Promise.resolve().then(check), timeout]);
    } finally {
      this.options.clock.clearTimeout(timer);
    }
  }
}
