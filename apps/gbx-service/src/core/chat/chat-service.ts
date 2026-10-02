import type { ChatConfig, PlayerChat, PlayerInfo } from "@gcp/shared";
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
  constructor(
    private readonly gbx: GbxConnection,
    private readonly state: LiveState,
    private readonly log: Logger,
  ) {}

  // Broadcast, split into chunks the server accepts
  async send(message: string): Promise<void> {
    for (const chunk of splitChatMessage(message)) {
      await this.call("ChatSendServerMessage", chunk);
    }
  }

  async sendTo(login: string, message: string): Promise<void> {
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
