import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ findFirst: vi.fn(), update: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/dbclient", () => ({
  getClient: () => ({
    codriverRequests: { findFirst: mocks.findFirst, update: mocks.update },
  }),
}));

import {
  FEEDBACK_MAX,
  parseFeedback,
  saveFeedback,
} from "@/lib/codriver/feedback";

const base = { serverId: "s", login: "abc", source: "game" as const };

beforeEach(() => vi.resetAllMocks());

describe("parseFeedback", () => {
  it("recognises the command and returns its text", () => {
    expect(parseFeedback("/feedback wrong map")).toBe("wrong map");
    expect(parseFeedback("  /Feedback   spaced  ")).toBe("spaced");
    expect(parseFeedback("/feedback")).toBe("");
  });

  it("ignores other messages", () => {
    expect(parseFeedback("feedback wrong map")).toBeNull();
    expect(parseFeedback("/feedbackish")).toBeNull();
    expect(parseFeedback("skip")).toBeNull();
  });
});

describe("saveFeedback", () => {
  it("adds the note to the player's latest request on this server and source", async () => {
    mocks.findFirst.mockResolvedValue({
      id: "r1",
      text: "play a snow map",
      feedback: null,
    });
    const result = await saveFeedback({ ...base, text: "wrong map" });
    expect(mocks.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { serverId: "s", login: "abc", source: "game" },
      }),
    );
    expect(mocks.update).toHaveBeenCalledWith({
      where: { id: "r1" },
      data: { feedback: "wrong map", feedbackAt: expect.any(Date) },
    });
    expect(result).toEqual({
      saved: true,
      reply: 'Thanks, I added your feedback to "play a snow map".',
    });
  });

  it("appends to earlier feedback on the same request", async () => {
    mocks.findFirst.mockResolvedValue({
      id: "r1",
      text: "x",
      feedback: "first",
    });
    await saveFeedback({ ...base, text: "second" });
    expect(mocks.update.mock.calls[0][0].data.feedback).toBe("first\nsecond");
  });

  it("explains itself when there is nothing to comment on", async () => {
    mocks.findFirst.mockResolvedValue(null);
    const result = await saveFeedback({ ...base, text: "hi" });
    expect(result.saved).toBe(false);
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("rejects empty and overlong feedback without touching the database", async () => {
    expect((await saveFeedback({ ...base, text: "  " })).saved).toBe(false);
    expect(
      (await saveFeedback({ ...base, text: "x".repeat(FEEDBACK_MAX + 1) }))
        .saved,
    ).toBe(false);
    expect(mocks.findFirst).not.toHaveBeenCalled();
  });
});
