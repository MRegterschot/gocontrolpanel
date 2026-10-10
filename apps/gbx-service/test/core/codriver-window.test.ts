import { describe, expect, it, vi } from "vitest";
import type {
  CodriverAnswer,
  CodriverClient,
} from "../../src/core/chat/codriver-command";
import {
  CODRIVER_WINDOW_ID,
  layoutMessages,
  LINE_POOL,
  scriptText,
  SPEAKER_POOL,
  updateScript,
  wrapText,
} from "../../src/core/chat/codriver-window";
import { createHarness, player, type Harness } from "../fakes/harness";

// Tags outside the script must open and close in order
function expectWellFormed(xml: string) {
  const markup = xml.replace(/<script>[\s\S]*?<\/script>/g, "");
  const stack: string[] = [];
  for (const [tag, closing, name, selfClosing] of markup.matchAll(
    /<(\/?)([a-z]+)\b[^>]*?(\/?)>/gi,
  )) {
    if (tag.startsWith("<?")) continue;
    if (selfClosing) continue;
    if (closing) expect(stack.pop(), tag).toBe(name);
    else stack.push(name);
  }
  expect(stack).toEqual([]);
}

// Pages with this id sent to the player that aren't the empty page that hides one
function pages(h: Harness, id: string, login: string): string[] {
  return h.session.sent
    .filter(
      (call) =>
        call.method === "SendDisplayManialinkPageToLogin" &&
        call.params[0] === login &&
        String(call.params[1]).includes(`id="${id}"`) &&
        /<(frame|script)/.test(String(call.params[1])),
    )
    .map((call) => String(call.params[1]));
}

// The window itself, sent once when it opens
function mainXml(h: Harness, login = "abc"): string {
  return pages(h, CODRIVER_WINDOW_ID, login).at(-1) ?? "";
}

// The data page sent on every change
function updateXml(h: Harness, login = "abc"): string {
  return pages(h, `${CODRIVER_WINDOW_ID}-update`, login).at(-1) ?? "";
}

async function setup(ask: CodriverClient["ask"]) {
  const client = { ask: vi.fn(ask), clear: vi.fn(async () => {}) };
  const h = await createHarness({ codriver: client, players: [player("abc")] });
  return { h, client };
}

describe("Codriver window layout", () => {
  it("wraps at spaces and splits words longer than a line", () => {
    expect(wrapText("one two three", 7)).toEqual(["one two", "three"]);
    expect(wrapText("abcdefghij x", 4)).toEqual(["abcd", "efgh", "ij x"]);
    expect(wrapText("1. a\n2. b", 20)).toEqual(["1. a", "2. b"]);
  });

  it("lays out every recent message for the log to scroll through", () => {
    const messages = Array.from({ length: 20 }, (_, i) => ({
      speaker: i % 2 ? ("Codriver" as const) : ("You" as const),
      text: `message ${i}`,
    }));
    const { shown, height } = layoutMessages(messages, 100);
    expect(shown).toHaveLength(20);
    expect(shown[0].lines[0].text).toBe("message 0");
    const last = shown.at(-1)!;
    expect(height).toBe(-last.y + last.height);
    // Your messages are indented like in the panel
    expect(shown.find((m) => m.mine)?.x).toBeGreaterThan(0);
  });

  it("keeps within the pools, dropping the oldest messages first", () => {
    const many = Array.from({ length: SPEAKER_POOL + 5 }, (_, i) => ({
      speaker: "Codriver" as const,
      text: `message ${i}`,
    }));
    const { shown } = layoutMessages(many, 100);
    expect(shown).toHaveLength(SPEAKER_POOL);
    expect(shown.at(-1)?.lines[0].text).toBe(`message ${SPEAKER_POOL + 4}`);

    const long = layoutMessages(
      [
        { speaker: "You", text: "older" },
        { speaker: "Codriver", text: "word ".repeat(2000) },
      ],
      100,
    );
    expect(long.shown).toHaveLength(1);
    expect(long.shown[0].lines).toHaveLength(LINE_POOL);
    expect(long.shown[0].lines[0].text).toBe("…");
  });
});

describe("Codriver window update script", () => {
  it("writes text as ManiaScript literals that are safe in the XML comment", () => {
    expect(scriptText('say "hi" \\ $f00 a--b-->')).toBe(
      '"say \\"hi\\" \\\\ $$f00 a-" ^ "-b-" ^ "->"',
    );
  });

  it("fills the pools and the bars", () => {
    const { shown } = layoutMessages(
      [
        { speaker: "You", text: "status" },
        { speaker: "Codriver", text: "1. a\n2. b" },
      ],
      106,
    );
    const script = updateScript({
      version: 3,
      clearEntry: 1,
      scrollEnd: 2,
      messages: shown,
      logHeight: 40,
      contentHeight: 25.5,
      empty: false,
      busy: true,
      progress: "Step 1/2: Working…",
      progressY: -50,
      confirm: false,
      confirmY: -56,
      draft: "",
    });
    expect(script).toContain('CodriverSpeakerTexts.add("You");');
    expect(script).toContain('CodriverLineTexts.add("2. b");');
    // Only your messages get a bubble
    expect(script.match(/CodriverBubblePos.add/g)).toHaveLength(1);
    expect(script).toContain("CodriverProgressY = -50.;");
    expect(script).toContain("CodriverBusy = True;");
    expect(script).toContain("CodriverClearEntry = 1;");
    expect(script).toContain("CodriverLogHeight = 40.;");
    expect(script).toContain("CodriverContentHeight = 25.5;");
    expect(script).toContain("CodriverScrollEnd = 2;");
    expect(script.trim().endsWith("CodriverUpdate = 3;")).toBe(true);
    expect(script).not.toMatch(/--/);
  });
});

describe("Codriver window", () => {
  it("adds a button and opens from it or from a bare /co", async () => {
    const { h } = await setup(async () => ({ reply: "ok" }));
    const button = h.session.sent.find(
      (call) =>
        call.method === "SendDisplayManialinkPage" &&
        String(call.params[0]).includes('action="codriver-open"'),
    );
    expect(button).toBeDefined();

    await h.click("abc", "codriver-open");
    const xml = mainXml(h);
    expect(xml).toContain("Codriver");
    expect(xml).toContain('name="codriver-entry"');
    expect(xml).toContain('id="codriver-line-29"');
    expectWellFormed(xml);
    expect(updateXml(h)).toContain("CodriverEmpty = True;");

    await h.click("abc", "close-window-codriver-window");
    await h.chat("abc", "/co");
    expect(pages(h, CODRIVER_WINDOW_ID, "abc")).toHaveLength(2);
  });

  it("sends only update pages while a request runs, then offers confirmation", async () => {
    let finish!: (answer: CodriverAnswer) => void;
    let progress!: (text: string) => void;
    const { h, client } = await setup(
      (_s, _l, _t, onProgress) =>
        new Promise<CodriverAnswer>((resolve) => {
          finish = resolve;
          progress = onProgress!;
        }),
    );
    await h.click("abc", "codriver-open");
    await h.click("abc", "codriver-send", [
      { Name: "codriver-entry", Value: "set the points limit to 100 & $f00go" },
    ]);
    expect(client.ask).toHaveBeenCalledWith(
      "server-1",
      "abc",
      "set the points limit to 100 & $f00go",
      expect.any(Function),
    );
    let update = updateXml(h);
    expect(update).toContain('"set the points limit to 100 & $$f00go"');
    expect(update).toContain('CodriverProgress = "Codriver is thinking…";');
    expect(update).toContain("CodriverBusy = True;");
    // The text Send took gets cleared from the field
    expect(update).toContain("CodriverClearEntry = 1;");

    const scrolled = /CodriverScrollEnd = (\d+);/.exec(update)![1];
    progress("Step 1/2: Working out what to do…");
    expect(updateXml(h)).toContain("Step 1/2: Working out what to do");
    // Progress leaves the scroll position alone; only new messages scroll down
    expect(updateXml(h)).toContain(`CodriverScrollEnd = ${scrolled};`);

    // Sending again while busy does nothing
    await h.click("abc", "codriver-send", [
      { Name: "codriver-entry", Value: "skip" },
    ]);
    expect(client.ask).toHaveBeenCalledTimes(1);

    finish({
      reply:
        "Set S_PointsLimit 100 for Cup? Costs $$5. Reply /co yes or /co no.",
      status: "needs_confirmation",
    });
    await vi.waitFor(() =>
      expect(updateXml(h)).toContain("CodriverConfirm = True;"),
    );
    update = updateXml(h);
    expect(update).toContain("Costs $$5. Confirm or cancel below.");
    expect(update).toContain("CodriverBusy = False;");
    expect(update).toContain(`CodriverScrollEnd = ${Number(scrolled) + 1};`);
    // The window itself was never sent again, so typed text and focus survive
    expect(pages(h, CODRIVER_WINDOW_ID, "abc")).toHaveLength(1);

    client.ask.mockResolvedValue({
      reply: "Set S_PointsLimit 100.",
      status: "done",
    });
    await h.click("abc", "codriver-confirm");
    expect(client.ask).toHaveBeenLastCalledWith(
      "server-1",
      "abc",
      "yes",
      expect.any(Function),
    );
    await vi.waitFor(() =>
      expect(updateXml(h)).toContain("Set S_PointsLimit 100."),
    );
    expect(updateXml(h)).toContain("CodriverConfirm = False;");
  });

  it("shows a /co+ draft and sends it with the text field", async () => {
    const { h, client } = await setup(async () => ({ reply: "Done." }));
    await h.click("abc", "codriver-open");
    const part = "x".repeat(250);
    await h.chat("abc", `/co+ ${part}`);
    await h.chat("abc", "/co+ then go to the lobby");
    expect(updateXml(h)).toContain('CodriverDraft = "Draft (271/1200): …');
    expect(client.ask).not.toHaveBeenCalled();

    await h.click("abc", "codriver-send", [
      { Name: "codriver-entry", Value: "and restart" },
    ]);
    expect(client.ask).toHaveBeenCalledWith(
      "server-1",
      "abc",
      `${part} then go to the lobby and restart`,
      expect.any(Function),
    );
    await vi.waitFor(() => expect(updateXml(h)).toContain("Done."));
    expect(updateXml(h)).toContain('CodriverDraft = "";');

    await h.chat("abc", "/co+ skip");
    await h.click("abc", "codriver-discard");
    expect(updateXml(h)).toContain('CodriverDraft = "";');
  });

  it("sends a long request from the text field in one go", async () => {
    const { h, client } = await setup(async () => ({ reply: "Done." }));
    await h.click("abc", "codriver-open");
    const long = "word ".repeat(150).trim();
    await h.click("abc", "codriver-send", [
      { Name: "codriver-entry", Value: long },
    ]);
    expect(client.ask).toHaveBeenCalledWith(
      "server-1",
      "abc",
      long,
      expect.any(Function),
    );
    await h.click("abc", "codriver-send", [
      { Name: "codriver-entry", Value: "x".repeat(1201) },
    ]);
    await vi.waitFor(() =>
      expect(updateXml(h)).toContain("Keep it under 1200 characters."),
    );
    expect(client.ask).toHaveBeenCalledTimes(1);
  });

  it("clears the conversation in the window and on the panel", async () => {
    const { h, client } = await setup(async () => ({ reply: "Skipping." }));
    await h.click("abc", "codriver-open");
    await h.click("abc", "codriver-send", [
      { Name: "codriver-entry", Value: "skip" },
    ]);
    await vi.waitFor(() => expect(updateXml(h)).toContain("Skipping."));
    await h.click("abc", "codriver-clear");
    expect(client.clear).toHaveBeenCalledWith("server-1", "abc");
    expect(updateXml(h)).not.toContain("Skipping.");
    expect(updateXml(h)).toContain("CodriverEmpty = True;");
  });

  it("keeps each player's conversation to themselves", async () => {
    const { h } = await setup(async () => ({ reply: "Skipping." }));
    await h.click("abc", "codriver-open");
    await h.click("other", "codriver-open");
    await h.click("abc", "codriver-send", [
      { Name: "codriver-entry", Value: "skip" },
    ]);
    await vi.waitFor(() => expect(updateXml(h)).toContain("Skipping."));
    expect(updateXml(h, "other")).not.toContain("Skipping.");
  });
});
