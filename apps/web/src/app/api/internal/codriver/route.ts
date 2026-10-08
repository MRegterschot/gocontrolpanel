import { handleCodriverMessage } from "@/lib/codriver/handle";
import config from "@/lib/config";
import { getClient } from "@/lib/dbclient";
import { MIN_SECRET_LENGTH } from "@gcp/shared";
import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { z } from "zod";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  serverId: z.string().min(1).max(64),
  login: z.string().min(1).max(64),
  // The runner rejects anything over its own limit with a reply the player sees
  text: z.string().max(1000),
});

function validToken(header: string | null, token: string): boolean {
  const [scheme, value] = (header ?? "").split(" ");
  if (scheme !== "Bearer" || !value) return false;
  const left = Buffer.from(value);
  const right = Buffer.from(token);
  return left.length === right.length && timingSafeEqual(left, right);
}

// Chat messages for Codriver, forwarded by the GBX service. The login comes from the dedicated
// server, which has authenticated the player; roles are always looked up here.
export async function POST(request: Request) {
  const token = config.CODRIVER.INTERNAL_TOKEN;
  // Off unless a token of the same strength as the other service secrets is set
  if (token.length < MIN_SECRET_LENGTH) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!validToken(request.headers.get("authorization"), token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = bodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const server = await getClient().servers.findFirst({
    where: { id: body.data.serverId, deletedAt: null },
    select: { id: true },
  });
  if (!server) {
    return NextResponse.json({ error: "Server not found" }, { status: 404 });
  }

  const reply = await handleCodriverMessage(body.data);
  return NextResponse.json(
    { data: { reply } },
    { headers: { "Cache-Control": "no-store" } },
  );
}
