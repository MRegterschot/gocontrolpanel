import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn() },
  getLogger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
}));
vi.mock("@/lib/dbclient", () => ({ getClient: () => ({}) }));
vi.mock("@/lib/codriver/state", () => ({ getLiveState: vi.fn() }));
vi.mock("@/lib/codriver/events", () => ({ emitAction: vi.fn() }));

import { confirmQuestion } from "@/lib/codriver/confirm-text";
import { codriverTools } from "@/lib/codriver/registry";
import { defineTool } from "@/lib/codriver/types";
import { z } from "zod/v4";

const tool = (name: string) => codriverTools.find((t) => t.name === name)!;

describe("confirmation wording", () => {
  it("describes a club campaign in plain words", () => {
    expect(
      confirmQuestion(tool("add_club_campaign"), {
        campaign: "red bull faster 2026",
        club: "red bull faster",
      }),
    ).toBe(
      'Load the campaign "red bull faster 2026" from the club "red bull faster" now, replacing the current map list?',
    );
  });

  it("says when maps are only queued", () => {
    expect(
      confirmQuestion(tool("add_campaign"), {
        name: "Summer 2025",
        queue: true,
      }),
    ).toBe('Add the campaign "Summer 2025" to the queue?');
  });

  it("reads other changing tools naturally", () => {
    expect(confirmQuestion(tool("pause_match"), { paused: true })).toBe(
      "Pause the match?",
    );
    expect(
      confirmQuestion(tool("set_plugin_enabled"), {
        plugin: "live round",
        enabled: false,
      }),
    ).toBe('Turn off the plugin "live round"?');
    expect(confirmQuestion(tool("announce"), { message: "gg" })).toBe(
      'Announce "gg" to everyone?',
    );
  });

  it("falls back to readable text, not JSON, without a summary", () => {
    const plain = defineTool({
      name: "do_thing",
      description: "x",
      category: "server",
      minRole: "admin",
      input: z.strictObject({
        big_value: z.number(),
        tags: z.array(z.string()),
      }),
      run: vi.fn(),
    });
    expect(confirmQuestion(plain, { big_value: 5, tags: ["a", "b"] })).toBe(
      "Do thing (big value: 5, tags: a, b)?",
    );
    expect(confirmQuestion(plain, {})).toBe("Do thing?");
  });

  it("keeps formatting codes out of names", () => {
    expect(
      confirmQuestion(tool("queue_server_map"), { query: "$f00Red$z" }),
    ).toBe('Queue the map "Red"?');
  });

  it("gives every changing tool without a prompt of its own a summary", () => {
    const missing = codriverTools
      .filter((t) => !t.readOnly && !t.confirm && !t.summary)
      .map((t) => t.name);
    expect(missing).toEqual([]);
  });
});
