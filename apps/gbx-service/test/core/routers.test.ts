import { describe, expect, it, vi } from "vitest";
import { CommandRouter, parseCommand } from "../../src/core/chat/command-router";
import { ActionRouter, compileActionPattern } from "../../src/core/manialink/action-router";
import { silentLogger } from "../fakes/logger";

const answer = (Answer: string, Login = "abc") => ({ PlayerUid: 1, Login, Answer, Entries: [] });

describe("ActionRouter", () => {
  it("compiles patterns with escaped literals", () => {
    const { regex, keys } = compileActionPattern("a.b-{uid}");
    expect(keys).toEqual(["uid"]);
    expect(regex!.test("a.b-123")).toBe(true);
    expect(regex!.test("axb-123")).toBe(false);
  });

  it("dispatches exact and pattern routes with params", async () => {
    const router = new ActionRouter(silentLogger);
    const exact = vi.fn();
    const pattern = vi.fn();
    router.register("ecm", exact);
    router.register("match-pickban-action-{uid}", pattern);

    await router.dispatch(answer("ecm"));
    await router.dispatch(answer("match-pickban-action-xyz"));

    expect(exact).toHaveBeenCalledTimes(1);
    expect(pattern).toHaveBeenCalledWith(answer("match-pickban-action-xyz"), { uid: "xyz" });
  });

  it("stops calling a handler after unregistering", async () => {
    const router = new ActionRouter(silentLogger);
    const handler = vi.fn();
    const remove = router.register("x", handler);
    remove();
    await router.dispatch(answer("x"));
    expect(handler).not.toHaveBeenCalled();
  });

  it("isolates failing handlers", async () => {
    const router = new ActionRouter(silentLogger);
    const ok = vi.fn();
    router.register("x", () => {
      throw new Error("boom");
    });
    router.register("x", ok);
    await router.dispatch(answer("x"));
    expect(ok).toHaveBeenCalled();
  });
});

describe("CommandRouter", () => {
  const helpProvider = {
    pluginNames: () => ["match", "ecm"],
    helpText: (name: string) => `help for ${name}`,
  };

  it("parses commands case-insensitively", () => {
    expect(parseCommand("/PickBan a b")).toEqual({ name: "pickban", args: ["a", "b"] });
    expect(parseCommand("hello")).toBeNull();
  });

  it("dispatches to registered handlers", async () => {
    const router = new CommandRouter(silentLogger, async () => {}, () => ({ enabled: true, provider: helpProvider }));
    const handler = vi.fn();
    router.register("admin", handler);

    expect(await router.dispatch("/admin need help", "abc")).toBe(true);
    expect(handler).toHaveBeenCalledWith(["need", "help"], "abc");
    expect(await router.dispatch("not a command", "abc")).toBe(false);
  });

  it("answers /help when enabled", async () => {
    const reply = vi.fn(async () => {});
    let enabled = true;
    const router = new CommandRouter(silentLogger, reply, () => ({ enabled, provider: helpProvider }));

    await router.dispatch("/help", "abc");
    expect(reply).toHaveBeenLastCalledWith("abc", expect.stringContaining("match, ecm"));

    await router.dispatch("/help ecm", "abc");
    expect(reply).toHaveBeenLastCalledWith("abc", "help for ecm");

    enabled = false;
    reply.mockClear();
    await router.dispatch("/help", "abc");
    expect(reply).not.toHaveBeenCalled();
  });
});
