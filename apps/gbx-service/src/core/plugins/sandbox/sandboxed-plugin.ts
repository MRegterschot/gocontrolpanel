import {
  coercePluginConfig,
  isHostAllowed,
  isPluginEvent,
  validatePluginConfig,
  type PlayerManialinkPageAnswer,
  type PluginConfig,
} from "@tmcp/shared";
import type { PluginPackage } from "@tmcp/shared/plugin-package";
import type {
  Clock,
  InstalledPackageRef,
  PluginHttpClient,
  PluginStorageRepository,
  ServerPluginRecord,
} from "../../ports";
import type { PluginContext, PluginDefinition, PluginInstance } from "../sdk";
import { allowedGbxMethods, isScriptCallAllowed } from "./gbx-policy";
import { guestRuntimeScript } from "./guest-runtime";
import {
  DEFAULT_SANDBOX_LIMITS,
  MinuteCounter,
  RATE_LIMITS,
  TokenBucket,
  type RateLimitName,
  type SandboxLimits,
} from "./limits";
import { checkManialink } from "./manialink-check";
import { describeError, GuestError, QuickJsVm, SandboxFault } from "./quickjs-vm";

export interface SandboxAssets {
  wasmModule: WebAssembly.Module;
  // handlebars/dist/handlebars.min.js
  handlebars: string;
  // handlebars-layouts, a CommonJS module
  layouts: string;
  // Layouts plugin templates may extend (manialink, widget, window, scripts/hide), precompiled
  baseTemplates: Record<string, string>;
}

export interface SandboxDependencies {
  assets: SandboxAssets;
  storage: PluginStorageRepository;
  http: PluginHttpClient;
  clock: Clock;
  limits?: SandboxLimits;
}

class HostError extends Error {
  constructor(name: string, message: string) {
    super(message);
    this.name = name;
  }
}

const capabilityError = (capability: string) =>
  new HostError("CapabilityError", `The plugin did not declare the "${capability}" capability`);
const invalid = (message: string) => new HostError("ValidationError", message);

const LOG_LEVELS = ["debug", "info", "warn", "error"] as const;
const LIVE_FIELDS = ["liveInfo", "activePlayers", "activeMapUid", "roundNumber", "isReverseCup"] as const;
const PAGE_ID = /^[A-Za-z0-9_-]{1,64}$/;
const ACTION_NAME = /^[A-Za-z0-9_\-.{}]{1,100}$/;
const STORAGE_KEY = /^[\x21-\x7e]+$/;
const HTTP_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"];
const BLOCKED_HEADERS = new Set([
  "host",
  "connection",
  "content-length",
  "transfer-encoding",
  "upgrade",
  "keep-alive",
  "te",
  "trailer",
  "expect",
  "proxy-authorization",
  "proxy-connection",
]);

interface Page {
  id: string;
  login: string | undefined;
  withUpdate: boolean;
  closeHandler: number | null;
}

function text(value: unknown, name: string, max: number): string {
  if (typeof value !== "string" || value.length === 0) throw invalid(`${name} must be text`);
  if (value.length > max) throw invalid(`${name} may be at most ${max} characters`);
  return value;
}

function textList(value: unknown, name: string, max: number): string[] {
  if (!Array.isArray(value) || value.length > max) {
    throw invalid(`${name} must be a list of at most ${max} items`);
  }
  return value.map((item, i) => text(item, `${name}[${i}]`, 200));
}

function jsonSize(value: unknown): number {
  return Buffer.byteLength(JSON.stringify(value ?? null), "utf8");
}

// Builds the definition PluginHost loads for an installed package
export function sandboxedDefinition(
  pkg: PluginPackage,
  // The package's templates, precompiled (see templates.ts)
  templates: Record<string, string>,
  record: ServerPluginRecord & { package: InstalledPackageRef },
  deps: SandboxDependencies,
): PluginDefinition<unknown> {
  return {
    id: pkg.manifest.slug,
    gamemodes: pkg.manifest.gamemodes,
    helpText: pkg.manifest.helpText,
    create: (ctx) => new SandboxedPlugin(ctx, pkg, templates, record, deps),
  };
}

// One sandboxed plugin on one server: a QuickJS instance plus the host side of every call
export class SandboxedPlugin implements PluginInstance {
  private vm: QuickJsVm | null = null;
  private faulted = false;
  private overCpu = false;
  private readonly limits: SandboxLimits;
  private readonly capabilities: Set<string>;
  private readonly gbxMethods: Set<string>;
  private readonly prefix: string;
  private readonly buckets: Record<RateLimitName, TokenBucket>;
  private readonly cpu: MinuteCounter;
  private readonly errors: MinuteCounter;
  private readonly rejections: MinuteCounter;
  private readonly pages = new Map<number, Page>();
  private readonly actions = new Map<number, () => void>();
  private readonly timers = new Map<number, () => void>();
  private readonly closeActions = new Set<string>();
  private readonly buttons = new Set<string>();
  private nextPage = 1;
  private handlers = 0;
  private pendingCalls = 0;
  private cachedConfig: PluginConfig | null = null;

  // plugins.id of the row; storage is keyed by it
  private readonly pluginRowId: string;

  constructor(
    private readonly ctx: PluginContext,
    private readonly pkg: PluginPackage,
    private readonly templates: Record<string, string>,
    record: ServerPluginRecord & { package: InstalledPackageRef },
    private readonly deps: SandboxDependencies,
  ) {
    this.limits = deps.limits ?? DEFAULT_SANDBOX_LIMITS;
    this.pluginRowId = record.pluginId;
    // Only what the manifest declares and the admin granted
    const granted = new Set(record.package.grantedCapabilities);
    this.capabilities = new Set(pkg.manifest.capabilities.filter((c) => granted.has(c)));
    this.gbxMethods = allowedGbxMethods([...this.capabilities]);
    this.prefix = `${pkg.manifest.slug}:`;
    const now = () => deps.clock.now();
    this.buckets = Object.fromEntries(
      Object.entries(RATE_LIMITS).map(([name, limit]) => [name, new TokenBucket(limit, now)]),
    ) as Record<RateLimitName, TokenBucket>;
    this.cpu = new MinuteCounter(now);
    this.errors = new MinuteCounter(now);
    this.rejections = new MinuteCounter(now);
  }

  async start(): Promise<void> {
    const { assets } = this.deps;
    const vm = await QuickJsVm.create({
      wasmModule: assets.wasmModule,
      memoryBytes: this.limits.memoryBytes,
      stackBytes: this.limits.stackBytes,
      // Real time, not the service clock: deadlines and CPU are about actual execution
      now: () => performance.now(),
      onHostCall: (method, args) => this.hostCall(method, args),
      onHostAsync: (id, method, args) => this.hostAsync(id, method, args),
      onCpu: (ms) => this.countCpu(ms),
    });
    this.vm = vm;

    try {
      const { loadMs } = this.limits;
      vm.evaluate(assets.handlebars, "handlebars.js", loadMs);
      vm.evaluate(
        `globalThis.__tmcpLayouts = (function (module, exports) {\n${assets.layouts}\nreturn module.exports;\n})({ exports: {} }, {});`,
        "handlebars-layouts.js",
        loadMs,
      );
      vm.evaluate(guestRuntimeScript(), "tmcp-runtime.js", loadMs);
      vm.evaluate(this.pkg.entry, this.pkg.manifest.entry, loadMs);
      vm.callBridge("create", [], loadMs);
      await this.runHook("start", loadMs);
    } catch (error) {
      this.teardown();
      if (error instanceof SandboxFault) this.fault(error.message);
      throw error instanceof GuestError ? new Error(`${error.name}: ${error.message}`) : error;
    }
  }

  async stop(): Promise<void> {
    if (this.vm && !this.faulted) {
      try {
        await this.runHook("stop", this.limits.entryMs);
      } catch (error) {
        this.ctx.log.warn({ err: describeError(error) }, "Plugin stop() failed");
      }
    }
    this.teardown();
  }

  async onConfigUpdate(): Promise<void> {
    this.cachedConfig = null;
    if (!this.vm || this.faulted) return;
    try {
      await this.runHook("onConfigUpdate", this.limits.entryMs);
    } catch (error) {
      this.handleFailure(error, "onConfigUpdate");
    }
  }

  private async runHook(name: "start" | "stop" | "onConfigUpdate", budgetMs: number) {
    const vm = this.vm;
    if (!vm) return;
    const result = vm.callBridge("hook", [name], budgetMs);
    this.checkCpu();
    if (!(result instanceof Promise)) return;

    const { clock } = this.deps;
    let handle: unknown;
    const timeout = new Promise<never>((_, reject) => {
      handle = clock.setTimeout(
        () => reject(new Error(`${name}() did not finish within ${this.limits.hookTimeoutMs / 1000} s`)),
        this.limits.hookTimeoutMs,
      );
    });
    try {
      await Promise.race([result, timeout]);
    } finally {
      clock.clearTimeout(handle);
    }
  }

  private teardown(): void {
    this.vm?.dispose();
    this.vm = null;
    for (const remove of this.actions.values()) remove();
    for (const cancel of this.timers.values()) cancel();
    this.actions.clear();
    this.timers.clear();
  }

  // Broke a limit: unload and turn the plugin off for this server
  private fault(reason: string): void {
    if (this.faulted) return;
    this.faulted = true;
    this.ctx.log.warn({ reason }, "Turning off sandboxed plugin");
    this.teardown();
    // Not awaited: turning it off unloads it, which waits for the current load to finish
    void this.ctx.disable(reason).catch((error) =>
      this.ctx.log.error({ err: error }, "Failed to turn off plugin"),
    );
  }

  private handleFailure(error: unknown, where: string): void {
    if (error instanceof SandboxFault) {
      this.fault(`${error.message} (${where})`);
    } else {
      this.ctx.log.error({ err: describeError(error), where }, "Sandbox call failed");
    }
  }

  private countCpu(ms: number): void {
    if (this.cpu.add(ms) > this.limits.cpuPerMinuteMs) this.overCpu = true;
  }

  private checkCpu(): void {
    if (this.overCpu) {
      this.fault(`The plugin used more than ${this.limits.cpuPerMinuteMs / 1000} s of CPU in a minute`);
    }
  }

  // Runs one entry into the guest; nothing it throws reaches the event bus
  private enter(where: string, fn: (vm: QuickJsVm) => void): void {
    const vm = this.vm;
    if (!vm || this.faulted) return;
    try {
      fn(vm);
    } catch (error) {
      this.handleFailure(error, where);
    }
    this.checkCpu();
  }

  private dispatch(handlerId: number, args: unknown[], where: string): void {
    let json: string;
    try {
      json = JSON.stringify(args);
    } catch (error) {
      this.ctx.log.error({ err: error, where }, "Event payload is not serializable");
      return;
    }
    this.enter(where, (vm) => vm.callBridge("dispatch", [handlerId, json], this.limits.entryMs));
  }

  private reject(kind: string): never {
    if (this.rejections.add() > this.limits.rejectionsPerMinute) {
      queueMicrotask(() => this.fault(`The plugin kept going over the ${kind} rate limit`));
    }
    throw new HostError("RateLimitError", `Too many ${kind} calls, slow down`);
  }

  private limit(name: RateLimitName): void {
    if (!this.buckets[name].take()) this.reject(name);
  }

  private require(capability: string): void {
    if (!this.capabilities.has(capability)) throw capabilityError(capability);
  }

  private config(): PluginConfig {
    if (!this.cachedConfig) {
      const raw = this.ctx.config();
      const schema = this.pkg.manifest.configSchema;
      if (schema) {
        const { data, issues } = coercePluginConfig(schema, raw);
        if (issues.length > 0) this.ctx.log.warn({ issues }, "Stored config does not match the schema");
        this.cachedConfig = data;
      } else {
        this.cachedConfig =
          raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as PluginConfig) : {};
      }
    }
    return structuredClone(this.cachedConfig);
  }

  private hostCall(method: string, argsJson: string): unknown {
    if (argsJson.length > this.limits.maxArgBytes) throw invalid("The arguments are too large");
    const args = JSON.parse(argsJson) as unknown[];
    const fn = this.sync[method];
    if (!fn) throw new HostError("Error", `Unknown host call "${method}"`);
    return fn(...args);
  }

  private hostAsync(id: number, method: string, argsJson: string): void {
    const settle = (ok: boolean, value: unknown) =>
      this.enter(`settle ${method}`, (vm) =>
        vm.callBridge(
          "settle",
          [id, ok, value === undefined ? "" : JSON.stringify(value)],
          this.limits.entryMs,
        ),
      );

    // Settled after the current entry returns, never from inside it
    let work: () => Promise<unknown>;
    if (this.pendingCalls >= this.limits.maxPendingCalls) {
      work = async () => {
        throw new HostError("LimitError", "Too many calls in flight");
      };
    } else if (argsJson.length > this.limits.maxArgBytes) {
      work = async () => {
        throw invalid("The arguments are too large");
      };
    } else {
      const fn = this.async[method];
      work = fn
        ? () => fn(...(JSON.parse(argsJson) as unknown[]))
        : async () => {
            throw new HostError("Error", `Unknown host call "${method}"`);
          };
    }

    this.pendingCalls++;
    Promise.resolve()
      .then(work)
      .then(
        (value) => settle(true, value ?? null),
        (error) => settle(false, describeError(error)),
      )
      .finally(() => {
        this.pendingCalls--;
      });
  }

  private addHandler(): void {
    if (++this.handlers > this.limits.maxHandlers) {
      throw new HostError("LimitError", `At most ${this.limits.maxHandlers} handlers`);
    }
  }

  private page(handle: unknown): Page {
    const page = this.pages.get(Number(handle));
    if (!page) throw invalid("Unknown page");
    return page;
  }

  private showPage(page: Page, part: "main" | "update", xml: unknown): void {
    const id = part === "main" ? page.id : `${page.id}-update`;
    const issue = checkManialink(xml, id, this.limits.maxManialinkBytes);
    if (issue) throw invalid(issue);
    this.ctx.ui.page.display(id, xml as string, page.login);
  }

  private toAnswer(answer: PlayerManialinkPageAnswer) {
    return {
      login: answer.Login,
      action: answer.Answer.startsWith(this.prefix)
        ? answer.Answer.slice(this.prefix.length)
        : answer.Answer,
      entries: Object.fromEntries((answer.Entries ?? []).map((e) => [e.Name, e.Value])),
    };
  }

  private readonly sync: Record<string, (...args: any[]) => unknown> = {
    init: () => ({
      pluginId: this.pkg.manifest.slug,
      serverId: this.ctx.serverId,
      actionPrefix: this.prefix,
      templates: { ...this.deps.assets.baseTemplates, ...this.templates },
    }),

    log: (level: unknown, message: unknown, data: unknown) => {
      const lvl = LOG_LEVELS.includes(level as never) ? (level as (typeof LOG_LEVELS)[number]) : "info";
      const msg = String(message).slice(0, this.limits.maxLogBytes);
      const extra = data !== null && jsonSize(data) <= this.limits.maxLogBytes ? { data } : {};
      this.ctx.log[lvl]({ ...extra, source: "plugin" }, msg);
    },

    error: (where: unknown, error: unknown) => {
      const count = this.errors.add();
      if (count <= 20) this.ctx.log.warn({ where, err: error }, "Plugin code threw");
      if (count > this.limits.errorsPerMinute) {
        queueMicrotask(() =>
          this.fault(`The plugin kept failing (${String(where)}: ${String((error as any)?.message)})`),
        );
      }
    },

    "config.get": () => this.config(),
    serverName: () => this.ctx.serverName(),

    on: (event: unknown, id: unknown) => {
      if (typeof event !== "string" || !isPluginEvent(event)) {
        throw invalid(`Unknown event "${String(event)}"`);
      }
      this.addHandler();
      const handlerId = Number(id);
      this.ctx.on(event, (...args: unknown[]) =>
        this.dispatch(handlerId, args, `event ${event}`),
      );
    },

    command: (name: unknown, id: unknown) => {
      if (typeof name !== "string" || !this.pkg.manifest.commands.includes(name)) {
        throw invalid(`/${String(name)} is not one of the commands in the manifest`);
      }
      this.addHandler();
      const handlerId = Number(id);
      this.ctx.command(name, (args, login) =>
        this.dispatch(handlerId, [args, login], `command /${name}`),
      );
    },

    action: (name: unknown, id: unknown) => {
      if (typeof name !== "string" || !ACTION_NAME.test(name)) {
        throw invalid("Action names use letters, digits, - _ . and {param}");
      }
      this.addHandler();
      const handlerId = Number(id);
      const remove = this.ctx.action(`${this.prefix}${name}`, (answer, params) =>
        this.dispatch(handlerId, [this.toAnswer(answer), params], `action ${name}`),
      );
      this.actions.set(handlerId, remove);
    },

    "action.remove": (id: unknown) => {
      this.actions.get(Number(id))?.();
      this.actions.delete(Number(id));
    },

    timer: (id: unknown, ms: unknown, repeat: unknown) => {
      const delay = Number(ms);
      if (!Number.isFinite(delay) || delay < 0 || delay > 86_400_000) {
        throw invalid("Timer delays must be between 0 and 24 hours");
      }
      if (this.timers.size >= this.limits.maxTimers) {
        throw new HostError("LimitError", `At most ${this.limits.maxTimers} timers`);
      }
      const handlerId = Number(id);
      const interval = repeat === true;
      const wait = interval ? Math.max(100, delay) : delay;
      // The service clock instead of ctx.setTimeout: an interval re-arms itself and must not add
      // a cleanup entry every time. teardown() cancels whatever is left.
      const { clock } = this.deps;
      const arm = () => {
        const handle = clock.setTimeout(() => {
          if (interval) arm();
          else this.timers.delete(handlerId);
          this.enter("timer", (vm) => vm.callBridge("timer", [handlerId, interval], this.limits.entryMs));
        }, wait);
        this.timers.set(handlerId, () => clock.clearTimeout(handle));
      };
      arm();
    },

    "timer.clear": (id: unknown) => {
      this.timers.get(Number(id))?.();
      this.timers.delete(Number(id));
    },

    live: (field: unknown) => {
      if (!LIVE_FIELDS.includes(field as never)) throw invalid(`Unknown live field "${String(field)}"`);
      return this.ctx.live[field as (typeof LIVE_FIELDS)[number]];
    },

    "live.findPlayer": (login: unknown) =>
      this.ctx.live.findActivePlayer(text(login, "login", 100)) ?? null,

    "live.reverseCupStatus": (login: unknown) =>
      this.ctx.live.reverseCupGetPlayerStatus(text(login, "login", 100)),

    "live.reverseCupRepartition": (count: unknown) => {
      const players = Number(count);
      if (!Number.isInteger(players) || players < 0 || players > 1000) {
        throw invalid("The player count must be a whole number");
      }
      return this.ctx.live.reverseCupGetPointsRepartition(players);
    },

    "ui.create": (kind: unknown, options: any) => {
      this.require("ui");
      if (this.pages.size >= this.limits.maxPages) {
        throw new HostError("LimitError", `At most ${this.limits.maxPages} widgets and windows`);
      }
      const id = options?.id;
      if (typeof id !== "string" || !PAGE_ID.test(id)) {
        throw invalid("Widget ids use 1-64 letters, digits, - and _");
      }
      const login = options.login === null || options.login === undefined
        ? undefined
        : text(options.login, "login", 100);
      if (kind === "window" && !login) throw invalid("A window needs the login of its player");

      const page: Page = {
        id: `plg.${this.pkg.manifest.slug}.${id}`,
        login,
        withUpdate: options.withUpdate !== false,
        closeHandler: typeof options.closeHandler === "number" ? options.closeHandler : null,
      };
      const handle = this.nextPage++;
      this.pages.set(handle, page);

      // The window layout's close button sends close-window-<id>
      const closeAction = `close-window-${page.id}`;
      if (kind === "window" && !this.closeActions.has(closeAction)) {
        this.closeActions.add(closeAction);
        this.ctx.action(closeAction, (answer) => {
          for (const [, open] of this.pages) {
            if (open.id !== page.id || open.login !== answer.Login) continue;
            this.ctx.ui.page.destroy(open.id, open.login);
            if (open.withUpdate) this.ctx.ui.page.destroy(`${open.id}-update`, open.login);
            if (open.closeHandler !== null) this.dispatch(open.closeHandler, [], "window close");
          }
        });
      }
      return { handle, id: page.id };
    },

    "ui.show": (handle: unknown, xml: unknown, updateXml: unknown) => {
      this.require("ui");
      this.limit("ui");
      const page = this.page(handle);
      this.showPage(page, "main", xml);
      if (page.withUpdate && updateXml !== null) this.showPage(page, "update", updateXml);
    },

    "ui.update": (handle: unknown, updateXml: unknown) => {
      this.require("ui");
      this.limit("ui");
      const page = this.page(handle);
      if (page.withUpdate) this.showPage(page, "update", updateXml);
    },

    "ui.hide": (handle: unknown) => {
      this.require("ui");
      const page = this.page(handle);
      this.ctx.ui.page.hide(page.id, page.login);
      if (page.withUpdate) this.ctx.ui.page.hide(`${page.id}-update`, page.login);
    },

    "ui.destroy": (handle: unknown) => {
      this.require("ui");
      const page = this.page(handle);
      this.ctx.ui.page.destroy(page.id, page.login);
      if (page.withUpdate) this.ctx.ui.page.destroy(`${page.id}-update`, page.login);
    },

    "ui.addButton": (button: any) => {
      this.require("ui");
      this.limit("ui");
      const name = text(button?.name, "name", 40);
      const action = button?.action === undefined ? undefined : text(button.action, "action", 100);
      this.buttons.add(name);
      this.ctx.ui.addAction({
        name: `${this.prefix}${name}`,
        icon: text(button?.icon, "icon", 200),
        type: button?.type === "image" ? "image" : "text",
        action: action === undefined ? undefined : `${this.prefix}${action}`,
      });
    },

    "ui.removeButton": (name: unknown) => {
      this.require("ui");
      const key = text(name, "name", 40);
      if (this.buttons.delete(key)) this.ctx.ui.removeAction(`${this.prefix}${key}`);
    },
  };

  private readonly async: Record<string, (...args: any[]) => Promise<unknown>> = {
    "config.save": async (config: unknown) => {
      const schema = this.pkg.manifest.configSchema;
      let data: PluginConfig;
      if (schema) {
        const result = validatePluginConfig(schema, config);
        if (!result.success) {
          throw invalid(result.issues.map((i) => `${i.path}: ${i.message}`).join("; "));
        }
        data = result.data;
      } else {
        if (!config || typeof config !== "object" || Array.isArray(config)) {
          throw invalid("The config must be an object");
        }
        if (jsonSize(config) > 64 * 1024) throw invalid("The config may be at most 64 KB");
        data = config as PluginConfig;
      }
      await this.ctx.saveConfig(data);
      this.cachedConfig = null;
    },

    sleep: async (ms: unknown) => {
      const delay = Number(ms);
      if (!Number.isFinite(delay) || delay < 0 || delay > 86_400_000) {
        throw invalid("sleep() takes 0 to 24 hours");
      }
      await this.ctx.sleep(delay);
    },

    "players.get": async (login: unknown) => this.ctx.players.get(text(login, "login", 100)),

    "chat.send": async (message: unknown) => {
      this.require("chat:send");
      this.limit("chat");
      await this.ctx.chat.send(text(message, "message", 1000));
    },

    "chat.sendTo": async (login: unknown, message: unknown) => {
      this.require("chat:send");
      this.limit("chat");
      await this.ctx.chat.sendTo(text(login, "login", 100), text(message, "message", 1000));
    },

    "storage.get": async (key: unknown) => {
      this.require("storage");
      return (await this.deps.storage.get(this.ctx.serverId, this.pluginRowId, this.storageKey(key))) ?? null;
    },

    "storage.set": async (key: unknown, value: unknown) => {
      this.require("storage");
      this.limit("storageWrite");
      const storageKey = this.storageKey(key);
      const size = jsonSize(value);
      const { storage } = this.limits;
      if (size > storage.maxValueBytes) {
        throw new HostError("LimitError", `A value may be at most ${storage.maxValueBytes / 1024} KB`);
      }
      const { serverId } = this.ctx;
      const pluginId = this.pluginRowId;
      const [usage, previous] = await Promise.all([
        this.deps.storage.usage(serverId, pluginId),
        this.deps.storage.sizeOf(serverId, pluginId, storageKey),
      ]);
      if (previous === 0 && usage.keys >= storage.maxKeys) {
        throw new HostError("LimitError", `At most ${storage.maxKeys} keys`);
      }
      if (usage.bytes - previous + size > storage.maxBytes) {
        throw new HostError("LimitError", `Storage is limited to ${storage.maxBytes / 1024} KB`);
      }
      await this.deps.storage.set(serverId, pluginId, storageKey, value ?? null, size);
    },

    "storage.delete": async (key: unknown) => {
      this.require("storage");
      this.limit("storageWrite");
      await this.deps.storage.delete(this.ctx.serverId, this.pluginRowId, this.storageKey(key));
    },

    "storage.keys": async (prefix: unknown) => {
      this.require("storage");
      const value = typeof prefix === "string" ? prefix.slice(0, this.limits.storage.maxKeyLength) : "";
      return this.deps.storage.keys(this.ctx.serverId, this.pluginRowId, value, this.limits.storage.maxKeys);
    },

    "records.local": async (mapUid: unknown) => {
      this.require("records:read");
      return this.ctx.records.local(text(mapUid, "mapUid", 100));
    },

    "records.forPlayers": async (mapUid: unknown, logins: unknown) => {
      this.require("records:read");
      return this.ctx.records.forPlayers(text(mapUid, "mapUid", 100), textList(logins, "logins", 500));
    },

    "maps.findByUid": async (uid: unknown) => {
      this.require("maps:read");
      const map = await this.ctx.maps.findByUid(text(uid, "uid", 100));
      return map ? publicMap(map) : null;
    },

    "maps.findByFileNames": async (fileNames: unknown) => {
      this.require("maps:read");
      const maps = await this.ctx.maps.findByFileNames(textList(fileNames, "fileNames", 500));
      return maps.map(publicMap);
    },

    "nadeo.worldRecord": async (mapUid: unknown) => {
      this.require("nadeo:read");
      this.limit("nadeo");
      return this.ctx.nadeo.getWorldRecord(text(mapUid, "mapUid", 100));
    },

    "nadeo.personalBests": async (mapUid: unknown, accountIds: unknown) => {
      this.require("nadeo:read");
      this.limit("nadeo");
      const bests = await this.ctx.nadeo.getPersonalBests(
        text(mapUid, "mapUid", 100),
        textList(accountIds, "accountIds", 100),
      );
      return Object.fromEntries(bests);
    },

    "nadeo.accountNames": async (accountIds: unknown) => {
      this.require("nadeo:read");
      this.limit("nadeo");
      return this.ctx.nadeo.getAccountNames(textList(accountIds, "accountIds", 100));
    },

    notifyAdmins: async (message: unknown, description: unknown) => {
      this.require("notifications");
      this.limit("notify");
      await this.ctx.notifyAdmins(
        text(message, "message", 300),
        description === null || description === undefined ? undefined : text(description, "description", 1000),
      );
    },

    "server.setPaused": async (paused: unknown) => {
      this.require("mode:control");
      if (typeof paused !== "boolean") throw invalid("paused must be true or false");
      await this.ctx.server.setPaused(paused);
    },

    "server.setScriptName": async (script: unknown) => {
      this.require("mode:control");
      await this.ctx.server.setScriptName(text(script, "script", 200));
    },

    "gbx.call": async (method: unknown, params: unknown) => {
      this.limit("gbx");
      const name = text(method, "method", 100);
      if (!this.gbxMethods.has(name)) {
        throw new HostError("CapabilityError", `The plugin may not call ${name}`);
      }
      if (!Array.isArray(params) || params.length > 100) throw invalid("Too many parameters");
      return this.ctx.gbx.call(name, ...params);
    },

    "gbx.callScript": async (method: unknown, params: unknown) => {
      this.limit("gbx");
      const name = text(method, "method", 100);
      if (!isScriptCallAllowed(name, [...this.capabilities])) {
        throw new HostError("CapabilityError", `${name} needs the "mode:control" capability`);
      }
      return this.ctx.gbx.callScript(name, ...textList(params ?? [], "params", 50));
    },

    "http.fetch": async (url: unknown, request: any) => {
      this.limit("http");
      return this.deps.http.fetch(this.httpRequest(url, request ?? {}));
    },
  };

  private storageKey(key: unknown): string {
    const max = this.limits.storage.maxKeyLength;
    if (typeof key !== "string" || key.length === 0 || key.length > max || !STORAGE_KEY.test(key)) {
      throw invalid(`Keys are 1-${max} printable characters without spaces`);
    }
    return key;
  }

  private httpRequest(rawUrl: unknown, request: any) {
    let url: URL;
    try {
      url = new URL(text(rawUrl, "url", 2000));
    } catch (error) {
      if (error instanceof HostError) throw error;
      throw invalid("Invalid URL");
    }
    if (url.protocol !== "https:") throw invalid("Only https:// URLs are allowed");
    if (url.username || url.password) throw invalid("URLs may not contain credentials");
    if (url.port && url.port !== "443") throw invalid("Only the default HTTPS port is allowed");
    if (!isHostAllowed(url.hostname, [...this.capabilities])) {
      throw new HostError("CapabilityError", `The plugin did not declare "http:${url.hostname}"`);
    }

    const method = String(request.method ?? "GET").toUpperCase();
    if (!HTTP_METHODS.includes(method)) throw invalid(`Unsupported method ${method}`);

    const headers: Record<string, string> = {};
    const rawHeaders = request.headers ?? {};
    if (typeof rawHeaders !== "object" || Array.isArray(rawHeaders)) throw invalid("headers must be an object");
    const entries = Object.entries(rawHeaders);
    if (entries.length > 30) throw invalid("At most 30 headers");
    for (const [name, value] of entries) {
      const key = name.toLowerCase();
      if (!/^[a-z0-9!#$%&'*+.^_`|~-]{1,100}$/.test(key) || BLOCKED_HEADERS.has(key) || key.startsWith("proxy-")) {
        throw invalid(`Header ${name} is not allowed`);
      }
      headers[key] = text(value, `header ${name}`, 4000);
    }

    const body = request.body === undefined || request.body === null ? undefined : String(request.body);
    const { http } = this.limits;
    if (body !== undefined && Buffer.byteLength(body, "utf8") > http.maxRequestBytes) {
      throw invalid(`Request bodies may be at most ${http.maxRequestBytes / 1024} KB`);
    }
    const timeout = Number(request.timeoutMs ?? http.timeoutMs);

    return {
      url: url.toString(),
      method,
      headers,
      body,
      timeoutMs: Number.isFinite(timeout) ? Math.min(Math.max(timeout, 1000), http.maxTimeoutMs) : http.timeoutMs,
      maxResponseBytes: http.maxResponseBytes,
    };
  }
}

function publicMap(map: {
  uid: string;
  name: string;
  fileName: string;
  author: string;
  authorNickname: string;
  thumbnailUrl: string | null;
}) {
  return {
    uid: map.uid,
    name: map.name,
    fileName: map.fileName,
    author: map.author,
    authorNickname: map.authorNickname,
    thumbnailUrl: map.thumbnailUrl,
  };
}
