import { getClient } from "@/lib/dbclient";
import "server-only";
import { chatSafe } from "./text";

export const FEEDBACK_MAX = 250;
const TOTAL_MAX = 1000;
const command = /^\/feedback(?:\s+([\s\S]*))?$/i;

// The text after /feedback, or null when the message is not that command
export function parseFeedback(message: string): string | null {
  const match = command.exec(message.trim());
  return match ? (match[1] ?? "").trim() : null;
}

// Adds a note to the player's latest request on this server and source
export async function saveFeedback(input: {
  serverId: string;
  login: string;
  source: "game" | "panel" | "cli";
  text: string;
}): Promise<{ saved: boolean; reply: string }> {
  const { serverId, login, source } = input;
  const text = input.text.trim();
  if (!text) {
    return {
      saved: false,
      reply:
        "Tell me what to note, for example /feedback that was the wrong map.",
    };
  }
  if (text.length > FEEDBACK_MAX) {
    return {
      saved: false,
      reply: `Keep feedback under ${FEEDBACK_MAX} characters.`,
    };
  }

  const db = getClient();
  const latest = await db.codriverRequests.findFirst({
    where: { serverId, login, source },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: { id: true, text: true, feedback: true },
  });
  if (!latest) {
    return {
      saved: false,
      reply:
        "You haven't asked Codriver anything yet, so there is nothing to comment on.",
    };
  }

  await db.codriverRequests.update({
    where: { id: latest.id },
    data: {
      feedback: (latest.feedback ? `${latest.feedback}\n${text}` : text).slice(
        0,
        TOTAL_MAX,
      ),
      feedbackAt: new Date(),
    },
  });
  return {
    saved: true,
    reply: `Thanks, I added your feedback to "${chatSafe(latest.text, 40)}".`,
  };
}
