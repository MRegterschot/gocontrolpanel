import { logAudit } from "@/actions/database/server-only/audit-logs";
import { actorFromSession, actorHasPermission } from "@/lib/actor";
import { auth } from "@/lib/auth";
import { fileManagerFetch, getFileManager } from "@/lib/managers/file-manager";
import { serverPermissions } from "@gcp/shared";
import { NextRequest, NextResponse } from "next/server";

const fail = (error: string, status: number) =>
  NextResponse.json({ error }, { status });

// Streams the file manager's file or zip to the browser; a raw response, not the JSON envelope
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ serverId: string }> },
) {
  const session = await auth();
  if (!session) return fail("Unauthorized", 401);

  const { serverId } = await params;
  const actor = actorFromSession(session);
  if (!actorHasPermission(actor, serverPermissions.admin, serverId)) {
    return fail("Unauthorized", 403);
  }

  const paths = req.nextUrl.searchParams.getAll("path");
  if (paths.length === 0) return fail("No paths provided", 400);

  const fileManager = await getFileManager(serverId);
  if (!fileManager?.health) {
    return fail("Could not connect to file manager", 503);
  }

  const query = new URLSearchParams(paths.map((path) => ["path", path]));
  const res = await fileManagerFetch(`${fileManager.url}/download?${query}`, {
    headers: { Authorization: `Bearer ${fileManager.password}` },
  });

  await logAudit(
    actor.userId,
    serverId,
    "server.files.download",
    paths,
    res.ok ? undefined : "Failed to download items",
  );

  if (!res.ok || !res.body) {
    return fail(
      res.status === 404 ? "Path not found" : "Failed to download items",
      res.status === 404 ? 404 : 502,
    );
  }

  return new NextResponse(res.body, {
    headers: {
      // Never rendered as a page on the panel's origin
      "Content-Type": "application/octet-stream",
      "Content-Disposition": attachment(res.headers.get("Content-Disposition")),
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
    },
  });
}

// Keeps the file manager's file name but always downloads
function attachment(disposition: string | null): string {
  const filename = disposition?.match(/filename\*?=[^;]+/i)?.[0];
  return filename ? `attachment; ${filename}` : "attachment";
}
