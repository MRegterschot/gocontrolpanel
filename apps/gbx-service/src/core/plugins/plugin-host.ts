import type { GameModeType } from "@tmcp/shared";
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

// Definition of an installed (marketplace or uploaded) package; null when it can't run
export type PackageResolver = (
  record: ServerPluginRecord,
) => Promise<PluginDefinition<unknown> | null>;

interface LoadedPlugin {
  definition: PluginDefinition<unknown>;
  instance: PluginInstance;
  scope: ScopedContext;
  configJson: string;
  // Changes when another version is installed or the granted capabilities change
  key: string;
}

interface DesiredPlugin {
  definition: PluginDefinition<unknown>;
  record: ServerPluginRecord;
  key: string;
}

const DEFAULT_HELP = "No help text provided for this plugin.";
const BUILTIN_KEY = "builtin";

function packageKey(record: ServerPluginRecord): string {
  const ref = record.package!;
  return `${ref.sha256}:${[...ref.grantedCapabilities].sort().join(",")}`;
}

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
    private readonly resolvePackage: PackageResolver = async () => null,
  ) {
    this.definitions = new Map(definitions.map((d) => [d.id, d]));
  }

  pluginNames(): string[] {
    const installed = [...this.loaded.keys()].filter((name) => !this.definitions.has(name));
    return [...this.definitions.keys(), ...installed.sort()];
  }

  helpText(pluginName: string): string {
    const definition = this.definitions.get(pluginName) ?? this.loaded.get(pluginName)?.definition;
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

  private runsInMode(definition: PluginDefinition<unknown>, mode: GameModeType | ""): boolean {
    const gamemodes = definition.gamemodes ?? [];
    return gamemodes.length === 0 || (mode !== "" && gamemodes.includes(mode));
  }

  // Built-ins in their fixed order (widgets layer the same way), installed packages after them
  private async desired(
    records: ServerPluginRecord[],
    mode: GameModeType | "",
  ): Promise<Map<string, DesiredPlugin>> {
    const desired = new Map<string, DesiredPlugin>();

    for (const definition of this.definitions.values()) {
      const record = records.find((r) => r.name === definition.id && !r.package);
      if (record?.enabled && this.runsInMode(definition, mode)) {
        desired.set(definition.id, { definition, record, key: BUILTIN_KEY });
      }
    }

    const packaged = records
      .filter((r) => r.package && r.enabled && !this.definitions.has(r.name))
      .sort((a, b) => a.name.localeCompare(b.name));
    for (const record of packaged) {
      const key = packageKey(record);
      const current = this.loaded.get(record.name);
      let definition: PluginDefinition<unknown> | null;
      if (current?.key === key) {
        definition = current.definition;
      } else {
        try {
          definition = await this.resolvePackage(record);
        } catch (error) {
          this.log.error({ err: error, pluginId: record.name }, "Failed to read plugin package");
          continue;
        }
      }
      if (definition && this.runsInMode(definition, mode)) {
        desired.set(record.name, { definition, record, key });
      }
    }

    return desired;
  }

  private async reconcile(
    records: ServerPluginRecord[],
    mode: GameModeType | "",
    updateConfigs: boolean,
  ): Promise<void> {
    const desired = await this.desired(records, mode);

    for (const [id, plugin] of [...this.loaded]) {
      const wanted = desired.get(id);
      if (!wanted || wanted.key !== plugin.key) await this.unload(id);
    }

    for (const [id, wanted] of desired) {
      const current = this.loaded.get(id);
      if (!current) {
        await this.load(wanted);
      } else if (updateConfigs) {
        await this.updateConfig(current, wanted.record);
      }
    }
  }

  private async load({ definition, record, key }: DesiredPlugin): Promise<void> {
    const scope = this.createContext(definition, record);
    try {
      const instance = definition.create(scope.ctx);
      this.loaded.set(definition.id, {
        definition,
        instance,
        scope,
        configJson: JSON.stringify(record.config ?? null),
        key,
      });
      await instance.start?.();
      this.log.info(
        { pluginId: definition.id, version: record.package?.version },
        "Loaded plugin",
      );
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
