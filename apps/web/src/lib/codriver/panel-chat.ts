import type { Actor } from "@/lib/actor";
import type { CodriverChatReply } from "@/types/codriver";
import "server-only";
import { z } from "zod";
import { handleCodriverRequest } from "./handle";
import type { ProgressListener } from "./progress";

export const panelChatSchema = z.object({
  text: z.string().trim().min(1).max(300),
  confirmationId: z.string().uuid().optional(),
});

// One panel chat message, shared by the Server Action and the streaming route
export async function runPanelChat(
  actor: Actor,
  serverId: string,
  input: z.infer<typeof panelChatSchema>,
  onProgress?: ProgressListener,
): Promise<CodriverChatReply> {
  const result = await handleCodriverRequest(
    {
      serverId,
      login: actor.login,
      text: input.text,
      source: "panel",
      confirmationId: input.confirmationId,
      onProgress,
    },
    undefined,
    actor,
  );
  return {
    ...result,
    reply: result.reply.replace(
      " Reply /co yes or /co no.",
      " Confirm or cancel below.",
    ),
  };
}
