import type { ChatConfig, PlayerChat, PlayerInfo } from "@gcp/shared";
import { AsyncLocalStorage } from "node:async_hooks";
import type { GbxConnection } from "../gbx/connection";
import type { LiveState } from "../live/live-state";
import type { Logger } from "../logger";
import { formatMessage, formatTemplate, splitChatMessage } from "./format";

export type AnnouncementKey = keyof Pick<
  ChatConfig,
  | "scriptNameChangeMessage"
  | "matchSettingsLoadedMessage"
  | "scriptSettingsSavedMessage"
  | "mapListChangeMessage"
>;

export class ChatService {
  private readonly commandOutput = new AsyncLocalStorage<{
    login: string;
    messages: string[];
    characters: number;
    truncated: boolean;
    active: boolean;
  }>();

  async captureCommand<T>(login: string, run: () => Promise<T>) {
    const output = {
      login,
      messages: [] as string[],
      characters: 0,
      truncated: false,
      active: true,
    };
    return this.commandOutput.run(output, async () => {
      try {
        const result = await run();
        return {
          result,
          messages: [...output.messages],
          messagesTruncated: output.truncated,
        };
      } finally {
        output.active = false;
      }
    });
  }

  private capture(message: string, login?: string): void {
    const output = this.commandOutput.getStore();
    if (
      !output?.active ||
      (login !== undefined && !login.split(",").includes(output.login))
    )
      return;
    const remaining = 16384 - output.characters;
    if (remaining <= 0 || output.messages.length >= 100) {
      output.truncated = true;
      return;
    }
    output.messages.push(message.slice(0, remaining));
    output.characters += Math.min(message.length, remaining);
    if (message.length > remaining) output.truncated = true;
  }

  constructor(
    private readonly gbx: GbxConnection,
    private readonly state: LiveState,
    private readonly log: Logger,
  ) {}

  // Broadcast, split into chunks the server accepts
  async send(message: string): Promise<void> {
    this.capture(message);
    for (const chunk of splitChatMessage(message)) {
      await this.call("ChatSendServerMessage", chunk);
    }
  }

  async sendTo(login: string, message: string): Promise<void> {
    this.capture(message, login);
    for (const chunk of splitChatMessage(message)) {
      await this.call("ChatSendServerMessageToLogin", chunk, login);
    }
  }

  // Sends the configured template for an admin action, if one is set
  async announce(
    key: AnnouncementKey,
    variables: Record<string, string | number> = {},
  ): Promise<void> {
    const template = this.state.chat?.[key];
    if (!template) return;
    await this.send(formatTemplate(template, variables));
  }

  async announcePlayerConnect(player: PlayerInfo): Promise<void> {
    const format = this.state.chat?.connectMessage;
    if (!format) return;
    await this.send(formatMessage(format, player.login, player.nickName, ""));
  }

  async announcePlayerDisconnect(player: PlayerInfo): Promise<void> {
    const format = this.state.chat?.disconnectMessage;
    if (!format) return;
    await this.send(formatMessage(format, player.login, player.nickName, ""));
  }

  // Manual chat routing: the server only shows messages we forward or re-send
  async routePlayerMessage(chat: PlayerChat, nickName: string): Promise<void> {
    const config = this.state.chat;
    if (!config?.manualRouting) return;

    if (!config.messageFormat) {
      await this.call("ChatForwardToLogin", chat.Text, chat.Login, "");
      return;
    }

    await this.send(
      formatMessage(config.messageFormat, chat.Login, nickName, chat.Text),
    );
  }

  private async call(method: string, ...params: unknown[]): Promise<void> {
    try {
      await this.gbx.call(method, ...params);
    } catch (error) {
      this.log.error({ err: error, method }, "Failed to send chat message");
    }
  }
}
