import type {
  ActionButton,
  PluginContext,
  PluginDefinition,
  PluginInstance,
  Widget,
  WidgetOptions,
  Window,
  WindowOptions,
} from "@tmcontrolpanel/plugin-sdk";

// Runs inside the QuickJS sandbox, before the plugin's own code. The host serializes it with
// Function.prototype.toString(), so it must not use anything from this module's scope.
// Everything crosses the boundary as JSON strings through __host_call / __host_async.
export function guestRuntime(global: any): void {
  "use strict";

  const hostCall: (method: string, args: string) => string = global.__host_call;
  const hostAsync: (id: number, method: string, args: string) => void = global.__host_async;
  const Handlebars = global.Handlebars;
  const layouts = global.__tmcpLayouts;
  delete global.__host_call;
  delete global.__host_async;
  delete global.Handlebars;
  delete global.__tmcpLayouts;

  const toError = (raw: any): Error => {
    const error = new Error(raw && typeof raw.message === "string" ? raw.message : "Host call failed");
    error.name = raw && typeof raw.name === "string" ? raw.name : "Error";
    return error;
  };

  const call = (method: string, ...args: unknown[]): any => {
    const result = JSON.parse(hostCall(method, JSON.stringify(args)));
    if (result.ok) return result.value;
    throw toError(result.error);
  };

  let nextCallId = 1;
  const pending = new Map<number, { resolve: (value: unknown) => void; reject: (error: Error) => void }>();
  const callAsync = (method: string, ...args: unknown[]): Promise<any> =>
    new Promise((resolve, reject) => {
      const id = nextCallId++;
      pending.set(id, { resolve, reject });
      try {
        hostAsync(id, method, JSON.stringify(args));
      } catch (error) {
        pending.delete(id);
        reject(error as Error);
      }
    });

  const describe = (error: unknown) =>
    error instanceof Error
      ? { name: error.name, message: error.message, stack: error.stack }
      : { name: "Error", message: String(error) };

  const report = (where: string, error: unknown) => {
    try {
      hostCall("error", JSON.stringify([where, describe(error)]));
    } catch {
      // Nothing left to tell
    }
  };

  // Plugin callbacks never throw into the host; failures and rejections are reported
  const invoke = (where: string, fn: (...args: any[]) => unknown, args: unknown[]) => {
    try {
      const result: any = fn(...args);
      if (result && typeof result.then === "function") {
        result.then(undefined, (error: unknown) => report(where, error));
      }
    } catch (error) {
      report(where, error);
    }
  };

  const info = call("init");
  const prefix: string = info.actionPrefix;

  // Templates render here, inside the sandbox, so a template can never reach the host
  const hb = Handlebars.create();
  hb.registerHelper(layouts(hb));
  const helpers: Record<string, (...args: any[]) => unknown> = {
    boolToNum: (value: boolean) => (value ? 1 : 0),
    eq: (a: unknown, b: unknown) => a === b,
    default: (value: unknown, fallback: unknown) => value || fallback,
    length: (array: unknown[]) => array.length,
    jsonLength: (json: string) => {
      try {
        return JSON.parse(json || "[]").length;
      } catch {
        return 0;
      }
    },
    bool: (value: unknown) => (value ? "True" : "False"),
    add: (a: number, b: number) => a + b,
    subtract: (a: number, b: number) => a - b,
    multiply: (a: number, b: number) => a * b,
    divide: (a: number, b: number) => a / b,
    // {{action "pick-" uid}} gives the full action name of this plugin
    action: (...args: unknown[]) => prefix + args.slice(0, -1).join(""),
    actionPrefix: () => prefix,
  };
  for (const name of Object.keys(helpers)) hb.registerHelper(name, helpers[name]);
  hb.registerHelper("range", function (this: unknown, from: number, to: number, options: any) {
    let out = "";
    for (let i = from; i < to; i++) out += options.fn({ i });
    return out;
  });

  // Precompiled by the host; evaluating the specs is cheap compared to parsing templates here
  const specs: Record<string, string> = info.templates;
  const compiled = new Map<string, (context: unknown) => string>();
  const evaluate = global.eval as (source: string) => unknown;
  for (const name of Object.keys(specs)) {
    const template = hb.template(evaluate(`(${specs[name]})`));
    hb.registerPartial(name, template);
    compiled.set(name, template);
  }
  const render = (name: string, context: unknown): string => {
    const template = compiled.get(name);
    if (!template) throw new Error(`Unknown template "${name}"`);
    return template(context);
  };

  type Entry = { label: string; fn: (...args: any[]) => unknown };
  const handlers = new Map<number, Entry>();
  let nextHandler = 1;
  const handler = (label: string, fn: unknown): number => {
    if (typeof fn !== "function") throw new TypeError(`${label}: handler must be a function`);
    const id = nextHandler++;
    handlers.set(id, { label, fn: fn as Entry["fn"] });
    return id;
  };

  let definition: PluginDefinition<any> | null = null;
  let instance: PluginInstance | null = null;

  global.__tmcpRegister = (value: PluginDefinition<any>) => {
    if (definition) throw new Error("definePlugin() was called more than once");
    if (!value || typeof value.create !== "function") {
      throw new TypeError("definePlugin() needs an object with a create(ctx) function");
    }
    definition = value;
  };

  const makePage = (kind: "widget" | "window", options: WidgetOptions | WindowOptions) => {
    if (!options || typeof options !== "object") throw new TypeError("Options are required");
    const onClose = kind === "window" ? (options as WindowOptions).onClose : undefined;
    const closeHandler = typeof onClose === "function" ? handler("window close", onClose) : null;
    const withUpdate = options.withUpdate !== false;
    const page = call("ui.create", kind, {
      id: options.id,
      login: options.login ?? null,
      withUpdate,
      closeHandler,
    });

    let position = options.position ?? { x: 0, y: 0 };
    let size = options.size ?? { x: 100, y: 80 };
    let title = options.title ?? "";
    let data = options.data;
    const hideWhileDriving = options.hideWhileDriving ?? false;
    const template = options.template;

    const contextFor = () => ({ id: page.id, position, size, title, hideWhileDriving, data });
    const updateXml = () =>
      withUpdate
        ? render(`${template}-update`, { id: `${page.id}-update`, title, data })
        : null;

    const result: Window = {
      id: page.id,
      display() {
        call("ui.show", page.handle, render(template, contextFor()), updateXml());
      },
      update() {
        if (withUpdate) call("ui.update", page.handle, updateXml());
      },
      hide() {
        call("ui.hide", page.handle);
      },
      destroy() {
        call("ui.destroy", page.handle);
      },
      close() {
        call("ui.destroy", page.handle);
        if (closeHandler !== null) {
          const entry = handlers.get(closeHandler);
          if (entry) invoke(entry.label, entry.fn, []);
        }
      },
      setData(value: unknown) {
        data = value;
      },
      setTitle(value: string) {
        title = String(value);
      },
      setPosition(value) {
        position = { x: Number(value.x), y: Number(value.y) };
      },
      setSize(value) {
        size = { x: Number(value.x), y: Number(value.y) };
      },
    };
    return kind === "window" ? Object.freeze(result) : Object.freeze(result as Widget);
  };

  const log = (level: string) => (message: string, data?: unknown) =>
    call("log", level, String(message), data === undefined ? null : data);

  const ctx: PluginContext<any> = Object.freeze({
    pluginId: info.pluginId,
    serverId: info.serverId,
    log: Object.freeze({
      debug: log("debug"),
      info: log("info"),
      warn: log("warn"),
      error: log("error"),
    }),

    config: () => call("config.get"),
    saveConfig: (config: unknown) => callAsync("config.save", config),
    serverName: () => call("serverName"),

    on(event: string, fn: (...args: any[]) => unknown) {
      call("on", event, handler(`event ${event}`, fn));
    },
    command(name: string, fn: (...args: any[]) => unknown) {
      call("command", name, handler(`command /${name}`, fn));
    },
    action(name: string, fn: (...args: any[]) => unknown) {
      const id = handler(`action ${name}`, fn);
      call("action", name, id);
      return () => {
        if (handlers.delete(id)) call("action.remove", id);
      };
    },
    setTimeout(fn: () => void, ms: number) {
      const id = handler("timer", fn);
      call("timer", id, Number(ms), false);
      return () => {
        if (handlers.delete(id)) call("timer.clear", id);
      };
    },
    setInterval(fn: () => void, ms: number) {
      const id = handler("interval", fn);
      call("timer", id, Number(ms), true);
      return () => {
        if (handlers.delete(id)) call("timer.clear", id);
      };
    },
    sleep: (ms: number) => callAsync("sleep", Number(ms)),

    live: Object.freeze({
      get liveInfo() {
        return call("live", "liveInfo");
      },
      get activePlayers() {
        return call("live", "activePlayers");
      },
      get activeMapUid() {
        return call("live", "activeMapUid");
      },
      get roundNumber() {
        return call("live", "roundNumber");
      },
      get isReverseCup() {
        return call("live", "isReverseCup");
      },
      findActivePlayer: (login: string) => call("live.findPlayer", login),
      reverseCupGetPlayerStatus: (login: string) => call("live.reverseCupStatus", login),
      reverseCupGetPointsRepartition: (playerCount: number) =>
        call("live.reverseCupRepartition", Number(playerCount)),
    }),
    players: Object.freeze({ get: (login: string) => callAsync("players.get", login) }),

    ui: Object.freeze({
      widget: (options: WidgetOptions) => makePage("widget", options) as Widget,
      window: (options: WindowOptions) => makePage("window", options) as Window,
      addButton: (button: ActionButton) => call("ui.addButton", button),
      removeButton: (name: string) => call("ui.removeButton", name),
    }),
    chat: Object.freeze({
      send: (message: string) => callAsync("chat.send", message),
      sendTo: (login: string, message: string) => callAsync("chat.sendTo", login, message),
    }),
    storage: Object.freeze({
      get: (key: string) => callAsync("storage.get", key),
      set: (key: string, value: unknown) => callAsync("storage.set", key, value),
      delete: (key: string) => callAsync("storage.delete", key),
      keys: (keyPrefix?: string) => callAsync("storage.keys", keyPrefix ?? ""),
    }),
    records: Object.freeze({
      local: (mapUid: string) => callAsync("records.local", mapUid),
      forPlayers: (mapUid: string, logins: string[]) =>
        callAsync("records.forPlayers", mapUid, logins),
    }),
    maps: Object.freeze({
      findByUid: (uid: string) => callAsync("maps.findByUid", uid),
      findByFileNames: (fileNames: string[]) => callAsync("maps.findByFileNames", fileNames),
    }),
    nadeo: Object.freeze({
      worldRecord: (mapUid: string) => callAsync("nadeo.worldRecord", mapUid),
      personalBests: (mapUid: string, accountIds: string[]) =>
        callAsync("nadeo.personalBests", mapUid, accountIds),
      accountNames: (accountIds: string[]) => callAsync("nadeo.accountNames", accountIds),
    }),
    notifyAdmins: (message: string, description?: string) =>
      callAsync("notifyAdmins", message, description ?? null),
    server: Object.freeze({
      setPaused: (paused: boolean) => callAsync("server.setPaused", paused),
      setScriptName: (script: string) => callAsync("server.setScriptName", script),
    }),
    gbx: Object.freeze({
      call: (method: string, ...params: unknown[]) => callAsync("gbx.call", method, params),
      callScript: (method: string, ...params: unknown[]) =>
        callAsync("gbx.callScript", method, params),
    }),
    http: Object.freeze({
      fetch: async (url: string, request?: unknown) => {
        const response = await callAsync("http.fetch", url, request ?? {});
        return Object.freeze({
          status: response.status,
          headers: response.headers,
          body: response.body,
          json: () => JSON.parse(response.body),
        });
      },
    }),
  }) as PluginContext<any>;

  const bridge = {
    create() {
      if (!definition) throw new Error("The plugin never called definePlugin()");
      const created = definition.create(ctx);
      instance = created && typeof created === "object" ? created : {};
    },
    // start, stop and onConfigUpdate; the host waits for a returned promise
    hook(name: "start" | "stop" | "onConfigUpdate") {
      const fn = instance ? instance[name] : undefined;
      return typeof fn === "function" ? fn.call(instance) : undefined;
    },
    dispatch(id: number, argsJson: string) {
      const entry = handlers.get(id);
      if (entry) invoke(entry.label, entry.fn, JSON.parse(argsJson));
    },
    timer(id: number, repeat: boolean) {
      const entry = handlers.get(id);
      if (!entry) return;
      if (!repeat) handlers.delete(id);
      invoke(entry.label, entry.fn, []);
    },
    settle(id: number, ok: boolean, json: string) {
      const entry = pending.get(id);
      if (!entry) return;
      pending.delete(id);
      const value = json === "" ? undefined : JSON.parse(json);
      if (ok) entry.resolve(value);
      else entry.reject(toError(value));
    },
  };

  Object.defineProperty(global, "__tmcp", { value: Object.freeze(bridge) });
}

// The script the sandbox evaluates. tsx (dev mode) compiles with keepNames, which wraps functions in
// __name() calls that refer to a helper outside guestRuntime; this scope supplies it.
export function guestRuntimeScript(source: string = guestRuntime.toString()): string {
  return `(function () {
  var __name = function (target, value) {
    try { Object.defineProperty(target, "name", { value: value, configurable: true }); } catch (e) {}
    return target;
  };
  return (${source});
})()(globalThis);`;
}
