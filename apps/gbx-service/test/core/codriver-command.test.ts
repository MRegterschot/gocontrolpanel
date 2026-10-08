import { describe, expect, it, vi } from "vitest";
import {
  CODRIVER_HELP,
  CodriverCommand,
  type CodriverClient,
} from "../../src/core/chat/codriver-command";
import { CommandRouter } from "../../src/core/chat/command-router";
import { silentLogger } from "../fakes/logger";

function setup(client: CodriverClient | null, thinkingDelayMs = 1000) {
  const reply = vi.fn(async () => {});
  const command = new CodriverCommand({
    serverId: "server-a",
    client,
    log: silentLogger,
    reply,
    thinkingDelayMs,
  });
  return { command, reply };
}

describe("CodriverCommand", () => {
  it("ignores other commands", async () => {
    const { command, reply } = setup({ ask: vi.fn() });
    expect(await command.dispatch("admin", ["x"], "abc")).toBe(false);
    expect(reply).not.toHaveBeenCalled();
  });

  it("forwards the request text and replies with the answer", async () => {
    const ask = vi.fn(async () => "Queued Winter 01.");
    const { command, reply } = setup({ ask });

    expect(await command.dispatch("co", ["play", "winter", "01"], "abc")).toBe(
      true,
    );

    expect(ask).toHaveBeenCalledWith("server-a", "abc", "play winter 01");
    expect(reply).toHaveBeenCalledWith(
      "abc",
      expect.stringContaining("Queued Winter 01."),
    );
  });

  it("answers /ai the same way", async () => {
    const ask = vi.fn(async () => "ok");
    const { command } = setup({ ask });
    await command.dispatch("ai", ["status"], "abc");
    expect(ask).toHaveBeenCalledOnce();
  });

  it("says when Codriver is not configured", async () => {
    const { command, reply } = setup(null);
    await command.dispatch("co", ["status"], "abc");
    expect(reply).toHaveBeenCalledWith(
      "abc",
      expect.stringContaining("not set up"),
    );
  });

  it("asks for a request when the text is empty", async () => {
    const ask = vi.fn();
    const { command, reply } = setup({ ask });
    await command.dispatch("co", [""], "abc");
    expect(ask).not.toHaveBeenCalled();
    expect(reply).toHaveBeenCalledWith(
      "abc",
      expect.stringContaining("/co help"),
    );
  });

  it("handles one request per player at a time", async () => {
    let finish!: (value: string) => void;
    const ask = vi.fn(
      () => new Promise<string>((resolve) => (finish = resolve)),
    );
    const { command, reply } = setup({ ask });

    const first = command.dispatch("co", ["skip"], "abc");
    await command.dispatch("co", ["restart"], "abc");
    expect(reply).toHaveBeenCalledWith(
      "abc",
      expect.stringContaining("Still working"),
    );

    finish("Skipping.");
    await first;
    expect(ask).toHaveBeenCalledOnce();
  });

  it("shows a working note for slow answers", async () => {
    vi.useFakeTimers();
    let finish!: (value: string) => void;
    const { command, reply } = setup({
      ask: () => new Promise<string>((resolve) => (finish = resolve)),
    });

    const pending = command.dispatch("co", ["play", "a", "snow", "map"], "abc");
    await vi.advanceTimersByTimeAsync(1000);
    expect(reply).toHaveBeenCalledWith("abc", expect.stringContaining("On it"));

    finish("Queued.");
    await pending;
    vi.useRealTimers();
  });

  it("replies with a generic message when the panel fails", async () => {
    const { command, reply } = setup({
      ask: async () => {
        throw new Error("status 500");
      },
    });
    await command.dispatch("co", ["skip"], "abc");
    expect(reply).toHaveBeenLastCalledWith(
      "abc",
      expect.stringContaining("unavailable"),
    );
  });

  it("gets the command arguments from the router", async () => {
    const ask = vi.fn(async () => "ok");
    const { command } = setup({ ask });
    const router = new CommandRouter(
      silentLogger,
      async () => {},
      () => ({
        enabled: false,
        provider: { pluginNames: () => [], helpText: () => "" },
      }),
      (name, login, args) => command.dispatch(name, args, login),
    );

    await router.dispatch("/co cup mode please", "abc");
    expect(ask).toHaveBeenCalledWith("server-a", "abc", "cup mode please");
  });
});

describe("/help", () => {
  it("lists /co only when Codriver is set up", async () => {
    const reply = vi.fn(async () => {});
    const provider = { pluginNames: () => [], helpText: () => "" };
    const withCodriver = new CommandRouter(
      silentLogger,
      reply,
      () => ({ enabled: true, provider }),
      undefined,
      () => CODRIVER_HELP,
    );
    await withCodriver.dispatch("/help", "abc");
    expect(reply).toHaveBeenLastCalledWith(
      "abc",
      expect.stringContaining("/co"),
    );
    await withCodriver.dispatch("/help co", "abc");
    expect(reply).toHaveBeenLastCalledWith(
      "abc",
      expect.stringContaining("asks Codriver"),
    );

    const without = new CommandRouter(silentLogger, reply, () => ({
      enabled: true,
      provider,
    }));
    await without.dispatch("/help", "abc");
    expect(reply).toHaveBeenLastCalledWith(
      "abc",
      expect.not.stringContaining("/co"),
    );
  });
});
