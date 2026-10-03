import type { ChatConfig, ChatConfigResult } from "@gcp/shared";

export interface ChatConfigDeps<T> {
  // Database write
  save: (data: Partial<ChatConfig>) => Promise<T>;
  // Live server, through the GBX service
  apply: (config: ChatConfig) => Promise<ChatConfigResult>;
  // Lets the service read the stored config itself
  notifyUpdated: () => Promise<void>;
  log: { warn: (obj: object, msg: string) => void };
}

export interface SavedChatConfig<T> {
  server: T;
  applied: ChatConfig;
  // The game server refused part of the config
  error?: string;
}

// The database is the source of truth, so it is written first: a service that is down
// (or a game server that is offline) must not block saving, and the service reads the
// stored config again on every connect.
export async function saveChatConfig<T>(
  config: ChatConfig,
  deps: ChatConfigDeps<T>,
): Promise<SavedChatConfig<T>> {
  let server = await deps.save(config);

  let result: ChatConfigResult | null = null;
  try {
    result = await deps.apply(config);
  } catch (error) {
    deps.log.warn(
      { error },
      "Chat config saved, but the GBX service could not apply it right away",
    );
    await deps.notifyUpdated();
  }

  // The game server refused manual routing, so don't keep it switched on
  if (result && result.applied.manualRouting !== config.manualRouting) {
    server = await deps.save({ manualRouting: result.applied.manualRouting });
  }

  return { server, applied: result?.applied ?? config, error: result?.error };
}
