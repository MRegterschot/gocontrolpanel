import { uploadFilesAs } from "@/actions/filemanager/server-only/files";
import { actorFromSession, actorHasPermission } from "@/lib/actor";
import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { getErrorMessage } from "@/lib/utils";
import { serverPermissions } from "@tmcontrolpanel/shared";
import { NextRequest, NextResponse } from "next/server";

// File uploads can be large, so they come here instead of through a Server Action: the session,
// role and origin are checked before the body is read, and only this route accepts big bodies.
const MAX_UPLOAD_BYTES = 1024 * 1024 * 1024;

const respond = (body: { data?: unknown; error?: string }, status: number) =>
  NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });

// A cookie-authenticated POST must come from the panel's own pages
function sameOrigin(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return false;
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ serverId: string }> },
) {
  const session = await auth();
  if (!session) return respond({ error: "Unauthorized" }, 401);

  const { serverId } = await params;
  const actor = actorFromSession(session);
  if (
    !sameOrigin(req) ||
    !actorHasPermission(actor, serverPermissions.admin, serverId)
  ) {
    return respond({ error: "Unauthorized" }, 403);
  }

  const length = Number(req.headers.get("content-length"));
  if (!length || length > MAX_UPLOAD_BYTES) {
    return respond({ error: "Upload is too large" }, 413);
  }

  try {
    const data = await uploadFilesAs(actor, serverId, await req.formData());
    return respond({ data }, 200);
  } catch (error) {
    logger.error(
      { meta: { type: "api", module: "files", function: "upload" }, error },
      "File upload failed",
    );
    return respond({ error: getErrorMessage(error) }, 400);
  }
}
