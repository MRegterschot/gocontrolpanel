import type { ChatConfig, PointsBody } from "@tmcontrolpanel/shared";
import { AppError, errorMessage } from "../errors";
import { isPassthroughAllowed } from "../gbx/allowlist";
import { encodePassthroughParams } from "../gbx/params";
import type { ServerRuntime } from "../server/server-runtime";

type PointsType = PointsBody["type"];

// Errors from the dedicated server (XML-RPC faults) surface as GbxCallFailed
export async function gbxOperation<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError("GbxCallFailed", errorMessage(error), { cause: error });
  }
}

function assertAllowed(method: string) {
  if (!isPassthroughAllowed(method)) {
    throw new AppError(
      "MethodNotAllowed",
      `Method ${method} is not allowed through the passthrough`,
    );
  }
}

interface GbxCallArgs {
  method: string;
  params: unknown[];
}

// Everything the internal API can ask of one server runtime. Args are validated by the caller
// and must survive JSON, because in cluster mode they cross Redis to the owning worker.
export const runtimeOps = {
  status: async (r: ServerRuntime) => r.status(),
  snapshot: async (r: ServerRuntime) => r.snapshot(),
  reconnect: async (r: ServerRuntime) => ({ connected: await r.reconnect() }),
  stopReconnect: async (r: ServerRuntime) => {
    r.stopReconnect();
    return null;
  },
  disconnect: async (r: ServerRuntime) => {
    await r.disconnect();
    return null;
  },
  resendManialinks: async (r: ServerRuntime) => {
    await r.manialinks.resendAll();
    return null;
  },
  reloadPlugins: async (r: ServerRuntime) => {
    await r.reloadPlugins();
    return null;
  },
  pluginEvent: async (
    r: ServerRuntime,
    a: { source: string; name: string; payload: unknown },
  ) => {
    r.emitPluginEvent({ plugin: a.source, name: a.name, payload: a.payload });
    return null;
  },
  command: async (
    r: ServerRuntime,
    a: { command: string; params: string[]; login: string },
  ) => r.executeCommand(a.command, a.params, a.login),
  pluginCommand: async (
    r: ServerRuntime,
    a: { pluginId: string; command: string; args: string[]; login: string },
  ) => ({
    handled: await r.runPluginCommand(a.pluginId, a.command, a.args, a.login),
  }),
  disablePlugin: async (
    r: ServerRuntime,
    a: { pluginId: string; name: string; reason: string },
  ) => {
    await r.disablePlugin(a.pluginId, a.name, a.reason);
    return null;
  },
  gbxCall: async (r: ServerRuntime, a: GbxCallArgs) => {
    assertAllowed(a.method);
    return gbxOperation(() =>
      r.gbx.call(a.method, ...encodePassthroughParams(a.method, a.params)),
    );
  },
  gbxMulticall: async (r: ServerRuntime, a: { calls: GbxCallArgs[] }) => {
    a.calls.forEach((call) => assertAllowed(call.method));
    return gbxOperation(() =>
      r.gbx.multicall(
        a.calls.map((call) => [
          call.method,
          ...encodePassthroughParams(call.method, call.params),
        ]),
      ),
    );
  },
  chat: async (r: ServerRuntime, a: { message: string; login?: string }) => {
    await gbxOperation(() => r.commands.sendChat(a.message, a.login));
    return null;
  },
  chatConfig: async (r: ServerRuntime, a: ChatConfig) =>
    r.commands.applyChatConfig(a),
  script: async (r: ServerRuntime, a: { script: string }) => {
    await gbxOperation(() => r.commands.setScriptName(a.script));
    return null;
  },
  loadMatchSettings: async (r: ServerRuntime, a: { filename: string }) => {
    await gbxOperation(() => r.commands.loadMatchSettings(a.filename));
    return null;
  },
  scriptSettings: async (
    r: ServerRuntime,
    a: { settings: Record<string, unknown> },
  ) => {
    await gbxOperation(() => r.commands.setScriptSettings(a.settings as never));
    return null;
  },
  pause: async (r: ServerRuntime, a: { paused: boolean }) => {
    await gbxOperation(() => r.commands.setPaused(a.paused));
    return null;
  },
  addMaps: async (r: ServerRuntime, a: { filenames: string[] }) =>
    gbxOperation(() => r.commands.addMaps(a.filenames)),
  removeMaps: async (r: ServerRuntime, a: { filenames: string[] }) =>
    gbxOperation(() => r.commands.removeMaps(a.filenames)),
  reorderMaps: async (r: ServerRuntime, a: { filenames: string[] }) =>
    gbxOperation(() => r.commands.reorderMaps(a.filenames)),
  playerPoints: async (
    r: ServerRuntime,
    a: { login: string; type: PointsType; points: number },
  ) => {
    await gbxOperation(() =>
      r.commands.setPlayerPoints(a.login, a.type, a.points),
    );
    return null;
  },
  teamPoints: async (
    r: ServerRuntime,
    a: { teamId: number; type: PointsType; points: number },
  ) => {
    await gbxOperation(() =>
      r.commands.setTeamPoints(a.teamId, a.type, a.points),
    );
    return null;
  },
} satisfies Record<
  string,
  (runtime: ServerRuntime, args: never) => Promise<unknown>
>;

export type RuntimeOps = typeof runtimeOps;
export type RuntimeOpName = keyof RuntimeOps;
export type OpArgs<K extends RuntimeOpName> = Parameters<RuntimeOps[K]>[1];
export type OpResult<K extends RuntimeOpName> = Awaited<
  ReturnType<RuntimeOps[K]>
>;

// Ops that may wait on the dedicated server or plugins for a long time
const longOps = new Set<string>([
  "reconnect",
  "command",
  "pluginCommand",
  "gbxCall",
  "gbxMulticall",
  "addMaps",
  "removeMaps",
  "reorderMaps",
  "loadMatchSettings",
  "reloadPlugins",
]);

export const opTimeoutMs = (op: string) => (longOps.has(op) ? 120_000 : 15_000);

export const isRuntimeOp = (op: string): op is RuntimeOpName =>
  Object.hasOwn(runtimeOps, op);

export function runOp(
  runtime: ServerRuntime,
  op: string,
  args: unknown,
): Promise<unknown> {
  if (!isRuntimeOp(op))
    return Promise.reject(
      new AppError("BadRequest", `Unknown operation ${op}`),
    );
  return (runtimeOps[op] as (r: ServerRuntime, a: unknown) => Promise<unknown>)(
    runtime,
    args,
  );
}
