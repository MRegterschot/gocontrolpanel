import type { PlayerManialinkPageAnswer } from "@tmcontrolpanel/shared";
import type { Logger } from "../logger";
import type { ActionGroup } from "../manialink/components/action-group";
import type { ManialinkDeps } from "../manialink/components/manialink";
import { Window } from "../manialink/components/window";
import type { CodriverClient } from "./codriver-command";
import { type CodriverDrafts, MAX_DRAFT_LENGTH } from "./codriver-drafts";

export const CODRIVER_WINDOW_ID = "codriver-window";
const ENTRY = "codriver-entry";
const SIZE = { x: 110, y: 72 };
const PADDING = 2;
const MAX_MESSAGES = 50;

// Text metrics at textsize 1, kept on the safe side so lines never get clipped
const CHAR_WIDTH = 1.25;
const LINE_HEIGHT = 3.3;
const SPEAKER_HEIGHT = 3;
const BUBBLE_PADDING = 1.5;
const MESSAGE_GAP = 1.5;
// Room for the input row, the draft and confirmation bars, and the progress line
const ROW = 7;
// The text box shows three lines; long requests wrap inside it
const INPUT_HEIGHT = 10;
const PROGRESS = 5;
// "You" messages are indented like in the panel chat
const INDENT = 8;
// The end of a draft shown above the input
const DRAFT_PREVIEW = 60;

// Fontawesome comments icon, as the action group's text buttons use
const ICON = "";

type Speaker = "You" | "Codriver";

export interface Message {
  speaker: Speaker;
  // Plain text; formatting is escaped when it is shown
  text: string;
}

interface PlayerChat {
  login: string;
  messages: Message[];
  busy: boolean;
  // The player pressed Cancel and the request is winding down
  stopping: boolean;
  progress: string | null;
  confirm: boolean;
  window: Window | null;
  // Tells the window's script that new data arrived
  version: number;
  // Raised when the text field should be emptied, after Send took its text
  clearEntry: number;
  // Raised with every new message, so the log scrolls down to it
  scrollEnd: number;
}

export interface MessageLayout {
  mine: boolean;
  speaker: Speaker;
  x: number;
  y: number;
  width: number;
  height: number;
  lines: { y: number; text: string }[];
}

// Keeps float noise such as 15.899999999999999 out of the XML
const round = (value: number) => Math.round(value * 100) / 100;

// Player and reply text never sets formatting in the window
const escapeFormatting = (text: string) => text.replace(/\$/g, "$$$$");

// Wraps text into lines of at most `max` characters, at spaces where it can
export function wrapText(text: string, max: number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split("\n")) {
    let line = "";
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      let rest = word;
      while (rest.length > max) {
        if (line) lines.push(line);
        lines.push(rest.slice(0, max));
        line = "";
        rest = rest.slice(max);
      }
      if (!line) line = rest;
      else if (line.length + 1 + rest.length <= max) line += ` ${rest}`;
      else {
        lines.push(line);
        line = rest;
      }
    }
    lines.push(line);
  }
  return lines;
}

// Controls the window has for messages; the log holds as many recent ones as they cover
export const SPEAKER_POOL = 30;
export const LINE_POOL = 120;

// The newest messages the pools can hold, laid out from the top of the scrolling log
export function layoutMessages(
  messages: Message[],
  width: number,
): { shown: MessageLayout[]; height: number } {
  const picked: {
    message: Message;
    mine: boolean;
    bubbleWidth: number;
    lines: string[];
  }[] = [];
  let lineCount = 0;
  for (
    let i = messages.length - 1;
    i >= 0 && picked.length < SPEAKER_POOL;
    i--
  ) {
    const message = messages[i];
    const mine = message.speaker === "You";
    const bubbleWidth = mine ? width - INDENT : width;
    let lines = wrapText(
      message.text,
      Math.max(10, Math.floor((bubbleWidth - 2 * BUBBLE_PADDING) / CHAR_WIDTH)),
    );
    const room = LINE_POOL - lineCount;
    if (room <= 0) break;
    // Keep the end of a message too long for the lines left, as a chat scrolled down would
    if (lines.length > room)
      lines = ["…", ...lines.slice(1 - room)].slice(0, room);
    lineCount += lines.length;
    picked.unshift({ message, mine, bubbleWidth, lines });
  }

  let y = 0;
  const shown = picked.map(({ message, mine, bubbleWidth, lines }) => {
    const bubbleHeight =
      SPEAKER_HEIGHT + lines.length * LINE_HEIGHT + 2 * BUBBLE_PADDING;
    const layout: MessageLayout = {
      mine,
      speaker: message.speaker,
      x: mine ? INDENT : 0,
      y: round(-y),
      width: bubbleWidth,
      height: round(bubbleHeight),
      lines: lines.map((line, index) => ({
        y: round(
          -(
            BUBBLE_PADDING +
            SPEAKER_HEIGHT +
            index * LINE_HEIGHT +
            LINE_HEIGHT / 2
          ),
        ),
        text: line,
      })),
    };
    y += bubbleHeight + MESSAGE_GAP;
    return layout;
  });
  return { shown, height: round(Math.max(0, y - MESSAGE_GAP)) };
}

// A ManiaScript Real, which needs a decimal point
function real(value: number): string {
  const text = String(round(value));
  return text.includes(".") ? text : `${text}.`;
}

const vec = (x: number, y: number) => `<${real(x)}, ${real(y)}>`;

// A ManiaScript Text literal that is also safe inside the script's XML comment
export function scriptText(text: string): string {
  const escaped = escapeFormatting(text)
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n")
    .replace(/-(?=-)/g, '-" ^ "');
  return `"${escaped}"`;
}

interface UpdateState {
  version: number;
  clearEntry: number;
  // Raised when a message was added, so the log scrolls to the newest
  scrollEnd: number;
  messages: MessageLayout[];
  logHeight: number;
  contentHeight: number;
  empty: boolean;
  busy: boolean;
  progress: string;
  progressY: number;
  confirm: boolean;
  confirmY: number;
  draft: string;
}

// The update page's script: it fills the variables the window's script shows
export function updateScript(state: UpdateState): string {
  const lines: string[] = [];
  const set = (name: string, value: string) =>
    lines.push(`${name} = ${value};`);
  const add = (name: string, value: string) =>
    lines.push(`${name}.add(${value});`);
  for (const name of [
    "CodriverSpeakerTexts",
    "CodriverSpeakerPos",
    "CodriverSpeakerWidths",
    "CodriverBubblePos",
    "CodriverBubbleSizes",
    "CodriverLineTexts",
    "CodriverLinePos",
    "CodriverLineWidths",
  ])
    lines.push(`${name}.clear();`);

  // The layout keeps within the pools; this only guards against a bad layout
  let speakers = 0;
  let lineCount = 0;
  for (const message of state.messages) {
    if (++speakers > SPEAKER_POOL) break;
    add("CodriverSpeakerTexts", scriptText(message.speaker));
    add("CodriverSpeakerPos", vec(message.x + 1.5, message.y - 3));
    add("CodriverSpeakerWidths", real(message.width - 3));
    if (message.mine) {
      add("CodriverBubblePos", vec(message.x, message.y));
      add("CodriverBubbleSizes", vec(message.width, message.height));
    }
    for (const line of message.lines) {
      if (++lineCount > LINE_POOL) break;
      add("CodriverLineTexts", scriptText(line.text));
      add("CodriverLinePos", vec(message.x + 1.5, message.y + line.y));
      add("CodriverLineWidths", real(message.width - 3));
    }
  }
  set("CodriverLogHeight", real(state.logHeight));
  set("CodriverContentHeight", real(state.contentHeight));
  set("CodriverScrollEnd", String(state.scrollEnd));
  set("CodriverEmpty", state.empty ? "True" : "False");
  set("CodriverBusy", state.busy ? "True" : "False");
  set("CodriverProgress", scriptText(state.progress));
  set("CodriverProgressY", real(state.progressY));
  set("CodriverConfirm", state.confirm ? "True" : "False");
  set("CodriverConfirmY", real(state.confirmY));
  set("CodriverDraft", scriptText(state.draft));
  set("CodriverClearEntry", String(state.clearEntry));
  set("CodriverUpdate", String(state.version));
  // Indented to sit in the update page's main()
  return lines.join("\n  ");
}

interface Options {
  serverId: string;
  client: CodriverClient;
  deps: ManialinkDeps;
  actionGroup: ActionGroup;
  // Shared with /co+ in chat
  drafts: CodriverDrafts;
  log: Logger;
}

// In-game chat with Codriver, like the panel's: conversation, progress, confirmation buttons
export class CodriverWindows {
  private readonly players = new Map<string, PlayerChat>();

  constructor(private readonly options: Options) {
    const { actions } = options.deps;
    const on = (
      name: string,
      handler: (login: string, answer: PlayerManialinkPageAnswer) => unknown,
    ) => actions.register(name, (answer) => handler(answer.Login, answer));
    const entry = (answer: PlayerManialinkPageAnswer) =>
      answer.Entries?.find((field) => field.Name === ENTRY)?.Value ?? "";
    on("codriver-open", (login) => this.open(login));
    on("codriver-send", (login, answer) =>
      this.sendDraft(login, entry(answer)),
    );
    on("codriver-discard", (login) => options.drafts.clear(login));
    // /co+ in chat changes the draft an open window shows
    options.drafts.onChange((login) => {
      const chat = this.players.get(login);
      if (chat) this.render(chat);
    });
    on("codriver-confirm", (login) => this.send(login, "yes"));
    on("codriver-cancel", (login) => this.send(login, "no"));
    on("codriver-stop", (login) => this.stop(login));
    on("codriver-clear", (login) => this.clear(login));
  }

  // The button in the top-left action group; shown again after every (re)connect
  showButton(): void {
    this.options.actionGroup.add({
      name: "codriver",
      icon: ICON,
      type: "text",
      action: "codriver-open",
    });
  }

  open(login: string): void {
    const chat = this.chat(login);
    if (chat.window) return;
    chat.window = new Window(this.options.deps, {
      id: CODRIVER_WINDOW_ID,
      template: "codriver-window",
      login,
      title: "Codriver",
      size: SIZE,
      data: this.data(chat),
      onClose: () => {
        chat.window = null;
      },
    });
    chat.window.display();
  }

  // Sends the draft with what is in the text field
  async sendDraft(login: string, typed: string): Promise<void> {
    const chat = this.chat(login);
    if (chat.busy) return;
    const text = [this.options.drafts.get(login), typed.trim()]
      .filter(Boolean)
      .join(" ");
    if (!text) return;
    chat.clearEntry++;
    this.options.drafts.clear(login);
    await this.send(login, text);
  }

  async send(login: string, typed: string): Promise<void> {
    const chat = this.chat(login);
    const text = typed.trim();
    if (!text || chat.busy) return;
    if (text.length > MAX_DRAFT_LENGTH) {
      this.add(
        chat,
        "Codriver",
        `Keep it under ${MAX_DRAFT_LENGTH} characters.`,
      );
      this.render(chat);
      return;
    }

    this.add(chat, "You", text);
    chat.busy = true;
    chat.stopping = false;
    chat.progress = null;
    chat.confirm = false;
    this.render(chat);
    try {
      const answer = await this.options.client.ask(
        this.options.serverId,
        login,
        text,
        (progress) => {
          // Keep saying "Cancelling…" until the request itself ends
          if (!chat.stopping) chat.progress = progress;
          this.render(chat);
        },
      );
      chat.confirm = answer.status === "needs_confirmation";
      // Chat replies come with $ doubled for the chat; the window escapes on its own
      this.add(
        chat,
        "Codriver",
        answer.reply
          .replace(/\$\$/g, "$")
          .replace(" Reply /co yes or /co no.", " Confirm or cancel below."),
      );
    } catch (error) {
      this.options.log.warn({ err: error, login }, "Codriver request failed");
      this.add(chat, "Codriver", "Codriver is unavailable right now.");
    } finally {
      chat.busy = false;
      chat.progress = null;
      this.render(chat);
    }
  }

  // Asks the panel to stop the request in flight; that request then answers "Request cancelled."
  async stop(login: string): Promise<void> {
    const chat = this.chat(login);
    if (!chat.busy || chat.stopping) return;
    chat.stopping = true;
    chat.progress = "Cancelling…";
    this.render(chat);
    try {
      await this.options.client.ask(this.options.serverId, login, "cancel");
    } catch (error) {
      this.options.log.warn({ err: error, login }, "Codriver cancel failed");
    }
  }

  async clear(login: string): Promise<void> {
    const chat = this.chat(login);
    if (chat.busy) return;
    chat.messages = [];
    chat.confirm = false;
    this.render(chat);
    try {
      await this.options.client.clear(this.options.serverId, login);
    } catch (error) {
      this.options.log.warn({ err: error, login }, "Clearing Codriver failed");
      this.add(chat, "Codriver", "Could not clear what Codriver remembers.");
      this.render(chat);
    }
  }

  // A player left; their window is gone with them
  forget(login: string): void {
    this.players.get(login)?.window?.destroy();
    this.players.delete(login);
  }

  // The connection dropped; every window is gone
  reset(): void {
    for (const login of [...this.players.keys()]) this.forget(login);
  }

  private chat(login: string): PlayerChat {
    let chat = this.players.get(login);
    if (!chat) {
      chat = {
        login,
        version: 0,
        clearEntry: 0,
        scrollEnd: 0,
        messages: [],
        busy: false,
        stopping: false,
        progress: null,
        confirm: false,
        window: null,
      };
      this.players.set(login, chat);
    }
    return chat;
  }

  private add(chat: PlayerChat, speaker: Speaker, text: string): void {
    chat.messages = [...chat.messages, { speaker, text }].slice(-MAX_MESSAGES);
    chat.scrollEnd++;
  }

  private render(chat: PlayerChat): void {
    if (!chat.window) return;
    chat.window.setData(this.data(chat));
    // Only the update page: the window keeps what the player is typing
    chat.window.update();
  }

  private data(chat: PlayerChat) {
    const width = SIZE.x - 2 * PADDING;
    const height = SIZE.y - 2 * PADDING;
    const confirm = chat.confirm && !chat.busy;
    const draft = this.options.drafts.get(chat.login);
    // Bars stack up from the text box at the bottom
    const bars = (draft ? 1 : 0) + (confirm ? 1 : 0);
    const inputY = -(height - INPUT_HEIGHT);
    const rowY = (index: number) =>
      index === 0 ? inputY : inputY + index * ROW;
    const logHeight =
      height - INPUT_HEIGHT - 2 - bars * ROW - (chat.busy ? PROGRESS : 0);
    const { shown, height: contentHeight } = layoutMessages(
      chat.messages,
      width,
    );
    chat.version++;
    return {
      width,
      inputY,
      inputHeight: INPUT_HEIGHT,
      draftY: rowY(1),
      speakers: SPEAKER_POOL,
      lines: LINE_POOL,
      bubbles: SPEAKER_POOL,
      script: updateScript({
        version: chat.version,
        clearEntry: chat.clearEntry,
        scrollEnd: chat.scrollEnd,
        messages: shown,
        logHeight,
        contentHeight,
        empty: chat.messages.length === 0,
        busy: chat.busy,
        progress: chat.progress ?? "Codriver is thinking…",
        progressY: -logHeight - 1,
        confirm,
        confirmY: rowY(draft ? 2 : 1),
        draft: draft
          ? `Draft (${draft.length}/${MAX_DRAFT_LENGTH}): ${
              draft.length > DRAFT_PREVIEW
                ? `…${draft.slice(-DRAFT_PREVIEW)}`
                : draft
            }`
          : "",
      }),
    };
  }
}
