import { createPluginPackage } from "@tmcontrolpanel/shared/plugin-package";
import { describe, expect, it } from "vitest";
import { ChatService } from "../../src/core/chat/chat-service";
import { LiveState } from "../../src/core/live/live-state";
import { FakeGbxSession } from "../fakes/fake-gbx";
import { createHarness, player } from "../fakes/harness";
import { silentLogger } from "../fakes/logger";

function setup() {
  const session = new FakeGbxSession();
  const chat = new ChatService(session, new LiveState(), silentLogger);
  return { chat, session };
}

describe("command output capture", () => {
  it("returns command metadata and immediate sandboxed plugin replies", async () => {
    const bytes = createPluginPackage({
      "tmcp-plugin.json": JSON.stringify({
        slug: "test-plugin",
        name: "Test plugin",
        version: "1.0.0",
        sdk: 1,
        description: "Test",
        author: "Tests",
        commands: ["reply"],
        capabilities: ["chat:send"],
      }),
      "index.js": `globalThis.__tmcpRegister({ create(ctx) {
        ctx.command("reply", (args, login) => ctx.chat.sendTo(login, args[0]));
        return {};
      } });`,
    });
    const h = await createHarness({
      packages: [{ bytes }],
      players: [player("p1")],
    });
    const result = await h.runtime.executeCommand(
      "reply",
      ["Plugin reply"],
      "p1",
    );
    expect(result).toMatchObject({
      command: "reply",
      login: "p1",
      handled: true,
      source: "plugin",
      messages: ["Plugin reply"],
      messagesTruncated: false,
      outputComplete: false,
    });
  });

  it("captures broadcasts and replies to the caller while preserving chat delivery", async () => {
    const { chat, session } = setup();
    const output = await chat.captureCommand("caller", async () => {
      await chat.send("Public reply");
      await chat.sendTo("caller", "$f00Private reply");
      await chat.sendTo("someone-else", "Private to another player");
      return 42;
    });
    expect(output).toEqual({
      result: 42,
      messages: ["Public reply", "$f00Private reply"],
      messagesTruncated: false,
    });
    expect(session.callsTo("ChatSendServerMessageToLogin")).toHaveLength(2);
  });

  it("isolates concurrent commands, unrelated chat, and other servers", async () => {
    const { chat } = setup();
    const otherServer = setup().chat;
    let resume!: () => void;
    const gate = new Promise<void>((resolve) => {
      resume = resolve;
    });
    const first = chat.captureCommand("caller", async () => {
      await gate;
      await chat.send("First command");
      await otherServer.send("Other server");
    });
    const second = chat.captureCommand("caller", async () => {
      await chat.send("Second command");
    });
    await chat.send("Unrelated callback");
    resume();
    expect((await first).messages).toEqual(["First command"]);
    expect((await second).messages).toEqual(["Second command"]);
  });

  it("stops collecting after dispatch without mutating the returned output", async () => {
    const { chat } = setup();
    let resume!: () => void;
    const gate = new Promise<void>((resolve) => {
      resume = resolve;
    });
    let late!: Promise<void>;
    const output = await chat.captureCommand("caller", async () => {
      late = gate.then(() => chat.send("Late reply"));
      await chat.send("Immediate reply");
    });
    resume();
    await late;
    expect(output.messages).toEqual(["Immediate reply"]);
  });

  it("limits output characters and message count", async () => {
    const { chat } = setup();
    const long = await chat.captureCommand("caller", () =>
      chat.send("x".repeat(20000)),
    );
    expect(long.messages.join("")).toHaveLength(16384);
    expect(long.messagesTruncated).toBe(true);
    const many = await chat.captureCommand("caller", async () => {
      for (let i = 0; i < 101; i++) await chat.send("reply");
    });
    expect(many.messages).toHaveLength(100);
    expect(many.messagesTruncated).toBe(true);
  });
});
