import { auth, hasPermission } from "@/lib/auth";
import {
  codriverChatPermissions,
  panelChatActor,
} from "@/lib/codriver/panel-access";
import { panelChatSchema, runPanelChat } from "@/lib/codriver/panel-chat";
import { codriverEventStream } from "@/lib/codriver/stream";
import { getErrorMessage } from "@/lib/utils";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function failure(error: string, code: string, status: number) {
  return NextResponse.json(
    { data: undefined, error, code },
    { status, headers: { "Cache-Control": "private, no-store" } },
  );
}

// Panel chat as a stream: progress events while Codriver works, then the reply.
// It runs the same checks as the sendCodriverMessage Server Action.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ serverId: string }> },
) {
  const session = await auth();
  if (!session) return failure("Unauthorized", "Unauthorized", 401);

  const { serverId } = await params;
  const allowed = await hasPermission(
    codriverChatPermissions.map((permission) =>
      permission.replace(":id:", `:${serverId}:`),
    ),
  );
  if (!allowed) return failure("Unauthorized", "Unauthorized", 403);

  const body = panelChatSchema.safeParse(await req.json().catch(() => null));
  if (!body.success) return failure("Invalid request", "ValidationError", 400);

  let actor;
  try {
    actor = await panelChatActor(session, serverId);
  } catch (error) {
    const code = error instanceof Error ? error.name : "Unauthorized";
    return failure(
      getErrorMessage(error),
      code,
      code === "ServerNotFound" ? 404 : 403,
    );
  }

  return codriverEventStream(
    (onProgress) => runPanelChat(actor, serverId, body.data, onProgress),
    req.signal,
  );
}
