import { sendChatMessageAs } from "@/actions/gbx/server-only/advanced";
import {
  type ServerOptionChanges,
  updateServerOptionsAs,
} from "@/actions/gbx/server-only/server";
import "server-only";
import { z } from "zod/v4";
import { chatSafe } from "../text";
import { CodriverError, defineTool } from "../types";

const optionsInput = z.strictObject({
  name: z.string().min(1).max(60).optional(),
  comment: z.string().max(200).optional(),
  max_players: z.number().int().min(1).max(255).optional(),
  max_spectators: z.number().int().min(0).max(255).optional(),
});

function changesOf(input: z.output<typeof optionsInput>): ServerOptionChanges {
  const changes: ServerOptionChanges = {};
  if (input.name !== undefined) changes.Name = input.name;
  if (input.comment !== undefined) changes.Comment = input.comment;
  if (input.max_players !== undefined)
    changes.NextMaxPlayers = input.max_players;
  if (input.max_spectators !== undefined)
    changes.NextMaxSpectators = input.max_spectators;
  if (Object.keys(changes).length === 0) {
    throw new CodriverError(
      "Tell me what to change: the name, comment or player slots.",
    );
  }
  return changes;
}

function describe(input: z.output<typeof optionsInput>): string {
  const parts: string[] = [];
  if (input.name !== undefined)
    parts.push(`the name to "${chatSafe(input.name, 60)}"`);
  if (input.comment !== undefined)
    parts.push(`the comment to "${chatSafe(input.comment, 60)}"`);
  if (input.max_players !== undefined)
    parts.push(`max players to ${input.max_players}`);
  if (input.max_spectators !== undefined)
    parts.push(`max spectators to ${input.max_spectators}`);
  return parts.join(", ");
}

export const setServerSettings = defineTool({
  name: "set_server_settings",
  description:
    "Change the server name, comment, max players or max spectators. Not passwords.",
  category: "server",
  minRole: "admin",
  input: optionsInput,
  confirm(_ctx, input) {
    changesOf(input);
    return `Set ${describe(input)}?`;
  },
  async run(ctx, input) {
    await updateServerOptionsAs(ctx.actor, ctx.serverId, changesOf(input));
    return { reply: `Set ${describe(input)}.` };
  },
});

export const announce = defineTool({
  name: "announce",
  description: "Send a chat message to everyone on the server.",
  category: "server",
  minRole: "moderator",
  input: z.strictObject({ message: z.string().min(1).max(200) }),
  async run(ctx, input) {
    // Escaped, so the message can't carry Trackmania formatting or fake a system line
    await sendChatMessageAs(
      ctx.actor,
      ctx.serverId,
      chatSafe(input.message, 200),
    );
    return { reply: "Sent." };
  },
});

export const serverTools = [setServerSettings, announce];
