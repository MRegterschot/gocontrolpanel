import { describe, expect, it } from "vitest";
import {
  CHAT_MESSAGE_MAX_LENGTH,
  formatMessage,
  formatTemplate,
  splitChatMessage,
} from "../../src/core/chat/format";

describe("chat formatting", () => {
  it("fills message placeholders", () => {
    expect(formatMessage("[{nickName}|{login}] {message}", "abc", "Nick", "hi")).toBe("[Nick|abc] hi");
  });

  it("fills arbitrary template variables", () => {
    expect(formatTemplate(" {count} map(s) {action} ", { count: 2, action: "added" })).toBe(
      "2 map(s) added",
    );
  });
});

describe("splitChatMessage", () => {
  it("keeps short messages intact and drops empty ones", () => {
    expect(splitChatMessage("  hello ")).toEqual(["hello"]);
    expect(splitChatMessage("   ")).toEqual([]);
  });

  it("splits on spaces under the limit", () => {
    const chunks = splitChatMessage("aaaa bbbb cccc", 9);
    expect(chunks).toEqual(["aaaa bbbb", "cccc"]);
  });

  it("hard-splits words longer than the limit", () => {
    expect(splitChatMessage("abcdefghij", 4)).toEqual(["abcd", "efgh", "ij"]);
  });

  it("never produces chunks above the server limit", () => {
    const chunks = splitChatMessage("word ".repeat(1000));
    expect(chunks.every((chunk) => chunk.length <= CHAT_MESSAGE_MAX_LENGTH)).toBe(true);
  });
});
