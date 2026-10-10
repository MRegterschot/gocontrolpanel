import { describe, expect, it, vi } from "vitest";
import {
  CODRIVER_HELP,
  CodriverCommand,
  type CodriverAnswer,
  type CodriverClient,
} from "../../src/core/chat/codriver-command";
import { CommandRouter } from "../../src/core/chat/command-router";
import { silentLogger } from "../fakes/logger";

function setup(
  client: Partial<CodriverClient> | null,
  thinkingDelayMs = 1000,
  now?: () => number,
) {
  const reply = vi.fn(async () => {});
  const command = new CodriverCommand({
    serverId: "server-a",
    client: client && { ask: vi.fn(), clear: vi.fn(), ...client },
    log: silentLogger,
    reply,
    thinkingDelayMs,
    now,
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
    const ask = vi.fn(async () => ({ reply: "Queued Winter 01." }));
    const { command, reply } = setup({ ask });

    expect(await command.dispatch("co", ["play", "winter", "01"], "abc")).toBe(
      true,
    );

    expect(ask).toHaveBeenCalledWith(
      "server-a",
      "abc",
      "play winter 01",
      expect.any(Function),
    );
    expect(reply).toHaveBeenCalledWith(
      "abc",
      expect.stringContaining("Queued Winter 01."),
    );
  });

  it("shows the player their own request, with formatting escaped", async () => {
    const { command, reply } = setup({
      ask: vi.fn(async () => ({ reply: "Done." })),
    });
    await command.dispatch("co", ["load", "$f00red"], "abc");
    expect(reply).toHaveBeenNthCalledWith(
      1,
      "abc",
      expect.stringContaining("> load $$f00red"),
    );
  });

  it("forwards /feedback as a prefixed message, even without text", async () => {
    const ask = vi.fn(async () => ({ reply: "Thanks." }));
    const { command } = setup({ ask });
    expect(await command.dispatch("feedback", ["wrong", "map"], "abc")).toBe(
      true,
    );
    expect(ask).toHaveBeenLastCalledWith(
      "server-a",
      "abc",
      "/feedback wrong map",
      expect.any(Function),
    );
    await command.dispatch("feedback", [], "abc");
    expect(ask).toHaveBeenLastCalledWith(
      "server-a",
      "abc",
      "/feedback",
      expect.any(Function),
    );
  });

  it("answers /ai the same way", async () => {
    const ask = vi.fn(async () => ({ reply: "ok" }));
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
    let finish!: (value: CodriverAnswer) => void;
    const ask = vi.fn(
      () => new Promise<CodriverAnswer>((resolve) => (finish = resolve)),
    );
    const { command, reply } = setup({ ask });

    const first = command.dispatch("co", ["skip"], "abc");
    await command.dispatch("co", ["restart"], "abc");
    expect(reply).toHaveBeenCalledWith(
      "abc",
      expect.stringContaining("Still working"),
    );

    finish({ reply: "Skipping." });
    await first;
    expect(ask).toHaveBeenCalledOnce();
  });

  it("shows a working note for slow answers", async () => {
    vi.useFakeTimers();
    let finish!: (value: CodriverAnswer) => void;
    const { command, reply } = setup({
      ask: () => new Promise<CodriverAnswer>((resolve) => (finish = resolve)),
    });

    const pending = command.dispatch("co", ["play", "a", "snow", "map"], "abc");
    await vi.advanceTimersByTimeAsync(1000);
    expect(reply).toHaveBeenCalledWith("abc", expect.stringContaining("On it"));

    finish({ reply: "Queued." });
    await pending;
    vi.useRealTimers();
  });

  it("passes slow progress lines on once, skipping repeats and early ones", async () => {
    vi.useFakeTimers();
    let finish!: (value: CodriverAnswer) => void;
    let progress!: (text: string) => void;
    const { command, reply } = setup({
      ask: (_s, _l, _t, onProgress) =>
        new Promise<CodriverAnswer>((resolve) => {
          finish = resolve;
          progress = onProgress!;
        }),
    });

    const pending = command.dispatch("co", ["skip"], "abc");
    progress("Working out what to do…");
    // Only the echo of the request so far
    expect(reply).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(1000);
    expect(reply).toHaveBeenLastCalledWith(
      "abc",
      expect.stringContaining("Working out what to do"),
    );

    progress("Working out what to do…");
    progress("Running: skip map…");
    progress("Running: skip map…");
    expect(reply).toHaveBeenCalledTimes(3);
    expect(reply).toHaveBeenLastCalledWith(
      "abc",
      expect.stringContaining("Running: skip map"),
    );

    finish({ reply: "Skipping." });
    await pending;
    vi.useRealTimers();
  });

  it("collects /co+ parts and sends them with the next /co", async () => {
    const ask = vi.fn(async () => ({ reply: "Done." }));
    const { command, reply } = setup({ ask });

    await command.dispatch("co+", ["create", "a", "cup", "script."], "abc");
    await command.dispatch("ai+", ["Then", "load", "BNL."], "abc");
    expect(ask).not.toHaveBeenCalled();
    expect(reply).toHaveBeenLastCalledWith(
      "abc",
      expect.stringContaining("Added (35/1200)"),
    );

    await command.dispatch("co", ["Then", "go", "to", "the", "lobby."], "abc");
    expect(ask).toHaveBeenCalledWith(
      "server-a",
      "abc",
      "create a cup script. Then load BNL. Then go to the lobby.",
      expect.any(Function),
    );
    // The draft is used up
    await command.dispatch("co", ["status"], "abc");
    expect(ask).toHaveBeenLastCalledWith(
      "server-a",
      "abc",
      "status",
      expect.any(Function),
    );
  });

  it("sends a draft with an empty /co and drops it when it expires", async () => {
    let time = 0;
    const ask = vi.fn(async () => ({ reply: "Done." }));
    const { command, reply } = setup({ ask }, 1000, () => time);

    await command.dispatch("co+", ["skip"], "abc");
    await command.dispatch("co", [], "abc");
    expect(ask).toHaveBeenLastCalledWith(
      "server-a",
      "abc",
      "skip",
      expect.any(Function),
    );

    await command.dispatch("co+", ["restart"], "abc");
    time = 5 * 60_000 + 1;
    await command.dispatch("co", [], "abc");
    expect(ask).toHaveBeenCalledTimes(1);
    expect(reply).toHaveBeenLastCalledWith(
      "abc",
      expect.stringContaining("Ask me something"),
    );
  });

  it("refuses a draft longer than the panel accepts", async () => {
    const { command, reply } = setup({ ask: vi.fn() });
    await command.dispatch("co+", ["x".repeat(1201)], "abc");
    expect(reply).toHaveBeenLastCalledWith(
      "abc",
      expect.stringContaining("longer than 1200"),
    );
  });

  it("says each step's reply on its own line", async () => {
    const { command, reply } = setup({
      ask: async () => ({
        reply: "1. Created a.Script.txt.\n2. Ran /lobby of Match.",
      }),
    });
    await command.dispatch("co", ["do", "it"], "abc");
    expect(reply).toHaveBeenNthCalledWith(
      2,
      "abc",
      expect.stringContaining("1. Created a.Script.txt."),
    );
    expect(reply).toHaveBeenNthCalledWith(
      3,
      "abc",
      expect.stringContaining("2. Ran /lobby of Match."),
    );
  });

  it("gives each step of a long request its own status lines", async () => {
    vi.useFakeTimers();
    let finish!: (value: CodriverAnswer) => void;
    let progress!: (text: string) => void;
    const { command, reply } = setup({
      ask: (_s, _l, _t, onProgress) =>
        new Promise<CodriverAnswer>((resolve) => {
          finish = resolve;
          progress = onProgress!;
        }),
    });
    const pending = command.dispatch("co", ["steps"], "abc");
    await vi.advanceTimersByTimeAsync(1000);
    for (const step of [1, 2])
      for (const stage of ["a", "b", "c", "d"])
        progress(`Step ${step}/2: ${stage}`);
    const notes = reply.mock.calls
      .map((call) => (call as unknown as [string, string])[1])
      .filter((text) => text.includes("Step"));
    expect(notes).toHaveLength(6);
    finish({ reply: "Done." });
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
    const ask = vi.fn(async () => ({ reply: "ok" }));
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
    expect(ask).toHaveBeenCalledWith(
      "server-a",
      "abc",
      "cup mode please",
      expect.any(Function),
    );
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
