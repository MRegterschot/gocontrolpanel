import type { ChatConfig, ChatConfigResult } from "@gcp/shared";
import { describe, expect, it, vi } from "vitest";
import { saveChatConfig } from "../src/lib/chat-config";

const config: ChatConfig = {
  manualRouting: true,
  messageFormat: "<{nickName}> {message}",
  connectMessage: "Welcome {nickName}",
  disconnectMessage: null,
  scriptNameChangeMessage: null,
  matchSettingsLoadedMessage: null,
  scriptSettingsSavedMessage: null,
  mapListChangeMessage: null,
};

function setup(apply: (config: ChatConfig) => Promise<ChatConfigResult>) {
  const order: string[] = [];
  const deps = {
    save: vi.fn(async (data: Partial<ChatConfig>) => {
      order.push("save");
      return { saved: data };
    }),
    apply: vi.fn(async (c: ChatConfig) => {
      order.push("apply");
      return apply(c);
    }),
    notifyUpdated: vi.fn(async () => {
      order.push("notify");
    }),
    log: { warn: vi.fn() },
  };
  return { deps, order };
}

describe("saveChatConfig", () => {
  it("writes the database first, then applies the config", async () => {
    const { deps, order } = setup(async (c) => ({ applied: c }));

    const result = await saveChatConfig(config, deps);

    expect(order).toEqual(["save", "apply"]);
    expect(deps.save).toHaveBeenCalledWith(config);
    expect(result).toEqual({ server: { saved: config }, applied: config, error: undefined });
    expect(deps.notifyUpdated).not.toHaveBeenCalled();
  });

  it("still saves when the GBX service cannot be reached, and tells it to catch up", async () => {
    const { deps, order } = setup(async () => {
      throw new Error("GBX service is unavailable");
    });

    const result = await saveChatConfig(config, deps);

    expect(order).toEqual(["save", "apply", "notify"]);
    expect(result).toEqual({ server: { saved: config }, applied: config, error: undefined });
    expect(deps.log.warn).toHaveBeenCalledTimes(1);
  });

  it("does not touch the service when the database write fails", async () => {
    const { deps } = setup(async (c) => ({ applied: c }));
    deps.save.mockRejectedValueOnce(new Error("db down"));

    await expect(saveChatConfig(config, deps)).rejects.toThrow("db down");

    expect(deps.apply).not.toHaveBeenCalled();
    expect(deps.notifyUpdated).not.toHaveBeenCalled();
  });

  it("switches manual routing off again when the game server refuses it", async () => {
    const { deps, order } = setup(async (c) => ({
      applied: { ...c, manualRouting: false },
      error: "routing already taken",
    }));

    const result = await saveChatConfig(config, deps);

    expect(order).toEqual(["save", "apply", "save"]);
    expect(deps.save).toHaveBeenLastCalledWith({ manualRouting: false });
    expect(result.error).toBe("routing already taken");
    expect(result.applied.manualRouting).toBe(false);
    expect(deps.notifyUpdated).not.toHaveBeenCalled();
  });

  it("keeps manual routing as requested for an offline game server", async () => {
    // The service reports an offline server as applied, without an error
    const { deps } = setup(async (c) => ({ applied: c }));

    const result = await saveChatConfig(config, deps);

    expect(deps.save).toHaveBeenCalledTimes(1);
    expect(result.applied.manualRouting).toBe(true);
  });

  it("reports a failing second write instead of treating it as a service outage", async () => {
    const { deps } = setup(async (c) => ({
      applied: { ...c, manualRouting: false },
      error: "refused",
    }));
    deps.save.mockResolvedValueOnce({ saved: config }).mockRejectedValueOnce(new Error("db down"));

    await expect(saveChatConfig(config, deps)).rejects.toThrow("db down");
    expect(deps.notifyUpdated).not.toHaveBeenCalled();
  });
});
