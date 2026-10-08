import {
  CUSTOM_EVENT_NAME,
  MAX_CUSTOM_EVENT_BYTES,
  type PluginCustomEvent,
} from "@gcp/shared";
import type { ChatService } from "../chat/chat-service";
import type { CommandRouter } from "../chat/command-router";
import { CleanupStack, TypedEventBus } from "../events";
import type { GbxConnection } from "../gbx/connection";
import type { LiveState } from "../live/live-state";
import type { Logger } from "../logger";
import type { ActionRouter } from "../manialink/action-router";
import type { ActionGroup } from "../manialink/components/action-group";
import { Manialink, type ManialinkDeps } from "../manialink/components/manialink";
import { Window } from "../manialink/components/window";
import type { ManialinkService } from "../manialink/manialink-service";
import type {
  Clock,
  NadeoRecordsProvider,
  NotificationRepository,
  RecordRepository,
  ServerPluginRecord,
  ServerRepository,
} from "../ports";
import type { MapCatalog } from "../server/map-catalog";
import type { MapList } from "../server/map-list";
import { fetchPlayerInfo } from "../server/players";
import type { ServerCommands } from "../server/server-commands";
import type { ServerEventMap } from "../server/server-events";
import type { ScopedContext } from "./plugin-host";
import type { PluginContext, PluginDefinition } from "./sdk";

// Runtime services shared by every plugin of one server
export interface PluginServices {
  serverId: string;
  serverName(): string | null;
  log: Logger;
  state: LiveState;
  bus: TypedEventBus<ServerEventMap>;
  gbx: GbxConnection;
  chat: ChatService;
  commands: CommandRouter;
  serverCommands: ServerCommands;
  actions: ActionRouter;
  manialinkDeps: ManialinkDeps;
  actionGroup: ActionGroup;
  mapList: MapList;
  catalog: MapCatalog;
  records: RecordRepository;
  servers: ServerRepository;
  notifications: NotificationRepository;
  nadeo: NadeoRecordsProvider;
  clock: Clock;
  manialinks: ManialinkService;
  disablePlugin(pluginId: string, name: string, reason: string): Promise<void>;
}

function parseConfig(
  definition: PluginDefinition<unknown>,
  raw: unknown,
  log: Logger,
): unknown {
  if (!definition.configSchema) return raw ?? null;

  const result = definition.configSchema.safeParse(raw ?? {});
  if (result.success) return result.data;

  // Keep running on the raw value so a config written by an older form never disables a plugin
  log.warn({ issues: result.error.issues }, "Plugin config does not match its schema");
  return raw ?? null;
}

export function createPluginContext(
  services: PluginServices,
  definition: PluginDefinition<unknown>,
  record: ServerPluginRecord,
): ScopedContext {
  const cleanup = new CleanupStack();
  const log = services.log.child({ pluginId: definition.id });
  const pages = new Set<string>();
  const pageKey = (id: string, login?: string) => `${login ?? ""}\u0000${id}`;
  let config = parseConfig(definition, record.config, log);
  let disposed = false;

  const ctx: PluginContext<unknown> = {
    pluginId: definition.id,
    serverId: services.serverId,
    log,
    live: services.state,
    gbx: services.gbx,
    chat: services.chat,
    mapList: services.mapList,
    nadeo: services.nadeo,

    config: () => config,
    serverName: services.serverName,

    async saveConfig(next) {
      await services.servers.updatePluginConfig(services.serverId, record.pluginId, next);
      config = next;
      const stored = services.state.plugins.find((p) => p.pluginId === record.pluginId);
      if (stored) stored.config = next;
    },

    on(event, handler) {
      cleanup.add(services.bus.on(event, handler));
    },
    emit(name, payload) {
      if (!CUSTOM_EVENT_NAME.test(name)) {
        throw new Error("Event names use 1-64 letters, digits, - _ and .");
      }
      // A JSON copy, so listeners never share objects with the emitter
      const json = JSON.stringify(payload ?? null);
      if (Buffer.byteLength(json, "utf8") > MAX_CUSTOM_EVENT_BYTES) {
        throw new Error(`Event payloads may be at most ${MAX_CUSTOM_EVENT_BYTES / 1024} KB`);
      }
      const event: PluginCustomEvent = { plugin: definition.id, name, payload: JSON.parse(json) };
      // Later, so a listener never runs inside the emitter's call
      queueMicrotask(() => {
        if (!disposed) services.bus.emit("pluginEvent", event);
      });
    },
    command(name, handler) {
      cleanup.add(services.commands.register(name, handler));
    },
    action(pattern, handler) {
      const remove = services.actions.register(pattern, handler);
      cleanup.add(remove);
      return remove;
    },
    setTimeout(fn, ms) {
      const handle = services.clock.setTimeout(fn, ms);
      const cancel = () => services.clock.clearTimeout(handle);
      cleanup.add(cancel);
      return cancel;
    },
    sleep: (ms) => services.clock.sleep(ms),

    ui: {
      widget(options) {
        const widget = new Manialink(services.manialinkDeps, options);
        cleanup.add(() => widget.destroy());
        return widget;
      },
      window(options) {
        const window = new Window(services.manialinkDeps, options);
        cleanup.add(() => window.destroy());
        return window;
      },
      addAction(button) {
        services.actionGroup.add(button);
        cleanup.add(() => services.actionGroup.remove(button.name));
      },
      removeAction(name) {
        services.actionGroup.remove(name);
      },
      page: {
        display(id, xml, login) {
          if (!pages.has(pageKey(id, login))) {
            pages.add(pageKey(id, login));
            cleanup.add(() => {
              if (pages.delete(pageKey(id, login))) services.manialinks.destroy(id, login);
            });
          }
          services.manialinks.display(id, xml, login);
        },
        hide(id, login) {
          services.manialinks.hide(id, login);
        },
        destroy(id, login) {
          pages.delete(pageKey(id, login));
          services.manialinks.destroy(id, login);
        },
      },
    },

    players: {
      get: async (login) =>
        services.state.findActivePlayer(login) ??
        (await fetchPlayerInfo(services.gbx, login)),
    },
    maps: {
      findByUid: (uid) => services.catalog.findByUid(uid),
      findByFileNames: (fileNames) => services.catalog.findByFileNames(fileNames),
    },
    records: {
      local: (mapUid) => services.records.findLocalRecord(services.serverId, mapUid),
      forPlayers: (mapUid, logins) =>
        services.records.findPlayerRecords(services.serverId, mapUid, logins),
    },
    disable: (reason) => services.disablePlugin(record.pluginId, definition.id, reason),
    async notifyAdmins(message, description) {
      const notifications = await services.notifications.createForServerAdmins({
        serverId: services.serverId,
        type: "adminCommand",
        message,
        description,
      });
      services.bus.emit("adminCommand", notifications);
      return notifications;
    },
    server: {
      setScriptName: async (script) => {
        await services.gbx.call("SetScriptName", script);
      },
      setPaused: (paused) => services.serverCommands.setPaused(paused),
    },
  };

  return {
    ctx,
    setConfig(next) {
      config = parseConfig(definition, next, log);
    },
    dispose: () => {
      disposed = true;
      return cleanup.dispose();
    },
  };
}
