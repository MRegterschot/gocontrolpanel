import type { GameModeType } from "@gcp/shared";
import type { HelpProvider } from "../chat/command-router";
import type { Logger } from "../logger";
import type { ServerPluginRecord } from "../ports";
import type { PluginContext, PluginDefinition, PluginInstance } from "./sdk";

export interface ScopedContext {
  ctx: PluginContext<unknown>;
  setConfig(config: unknown): void;
  dispose(): Promise<void>;
}

export type ContextFactory = (
  definition: PluginDefinition<unknown>,
  record: ServerPluginRecord,
) => ScopedContext;

interface LoadedPlugin {
  definition: PluginDefinition<unknown>;
  instance: PluginInstance;
  scope: ScopedContext;
  configJson: string;
}

const DEFAULT_HELP = "No help text provided for this plugin.";

// Loads/unloads plugins so the running set matches the DB rows and the current game mode
export class PluginHost implements HelpProvider {
  private readonly definitions: Map<string, PluginDefinition<unknown>>;
  private readonly loaded = new Map<string, LoadedPlugin>();
  // Serializes sync/reload calls; they can arrive concurrently (mode change + config update)
  private queue: Promise<void> = Promise.resolve();

  constructor(
    definitions: PluginDefinition<any>[],
    private readonly createContext: ContextFactory,
    private readonly log: Logger,
  ) {
    this.definitions = new Map(definitions.map((d) => [d.id, d]));
  }

  pluginNames(): string[] {
    return [...this.definitions.keys()];
  }

  helpText(pluginName: string): string {
    const definition = this.definitions.get(pluginName);
    if (!definition) return "Plugin not found.";
    return definition.helpText ?? DEFAULT_HELP;
  }

  loadedIds(): string[] {
    return [...this.loaded.keys()];
  }

  sync(
    records: ServerPluginRecord[],
    mode: GameModeType | "",
    updateConfigs = true,
  ): Promise<void> {
    return this.enqueue(() => this.reconcile(records, mode, updateConfigs));
  }

  // Full restart of every plugin that should be running
  reload(records: ServerPluginRecord[], mode: GameModeType | ""): Promise<void> {
    return this.enqueue(async () => {
      await this.unloadEverything();
      await this.reconcile(records, mode, false);
    });
  }

  unloadAll(): Promise<void> {
    return this.enqueue(() => this.unloadEverything());
  }

  private enqueue(task: () => Promise<void>): Promise<void> {
    const run = this.queue.then(task, task);
    this.queue = run.catch(() => undefined);
    return run;
  }

  private async reconcile(
    records: ServerPluginRecord[],
    mode: GameModeType | "",
    updateConfigs: boolean,
  ): Promise<void> {
    for (const definition of this.definitions.values()) {
      const record = records.find((r) => r.name === definition.id);
      const gamemodes = definition.gamemodes ?? [];
      const shouldRun =
        !!record?.enabled &&
        (gamemodes.length === 0 || (mode !== "" && gamemodes.includes(mode)));
      const current = this.loaded.get(definition.id);

      if (shouldRun && !current) {
        await this.load(definition, record!);
      } else if (!shouldRun && current) {
        await this.unload(definition.id);
      } else if (shouldRun && current && updateConfigs) {
        await this.updateConfig(current, record!);
      }
    }
  }

  private async load(
    definition: PluginDefinition<unknown>,
    record: ServerPluginRecord,
  ): Promise<void> {
    const scope = this.createContext(definition, record);
    try {
      const instance = definition.create(scope.ctx);
      this.loaded.set(definition.id, {
        definition,
        instance,
        scope,
        configJson: JSON.stringify(record.config ?? null),
      });
      await instance.start?.();
      this.log.info({ pluginId: definition.id }, "Loaded plugin");
    } catch (error) {
      this.log.error({ err: error, pluginId: definition.id }, "Failed to load plugin");
      this.loaded.delete(definition.id);
      await this.safeDispose(definition.id, scope);
    }
  }

  private async unload(id: string): Promise<void> {
    const plugin = this.loaded.get(id);
    if (!plugin) return;
    this.loaded.delete(id);

    try {
      await plugin.instance.stop?.();
    } catch (error) {
      this.log.error({ err: error, pluginId: id }, "Plugin stop failed");
    }
    await this.safeDispose(id, plugin.scope);
    this.log.info({ pluginId: id }, "Unloaded plugin");
  }

  private async unloadEverything(): Promise<void> {
    for (const id of [...this.loaded.keys()]) {
      await this.unload(id);
    }
  }

  private async updateConfig(plugin: LoadedPlugin, record: ServerPluginRecord): Promise<void> {
    const configJson = JSON.stringify(record.config ?? null);
    if (configJson === plugin.configJson) return;

    plugin.configJson = configJson;
    plugin.scope.setConfig(record.config);
    try {
      await plugin.instance.onConfigUpdate?.();
    } catch (error) {
      this.log.error(
        { err: error, pluginId: plugin.definition.id },
        "Plugin config update failed",
      );
    }
  }

  private async safeDispose(id: string, scope: ScopedContext): Promise<void> {
    try {
      await scope.dispose();
    } catch (error) {
      this.log.error({ err: error, pluginId: id }, "Failed to clean up plugin");
    }
  }
}
