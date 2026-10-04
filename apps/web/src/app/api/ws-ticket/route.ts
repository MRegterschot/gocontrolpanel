import { auth } from "@/lib/auth";
import config from "@/lib/config";
import { logger } from "@/lib/logger";
import { sessionClaimsSchema, signWsTicket } from "@gcp/shared";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Short-lived ticket the browser presents when opening a socket on the GBX service
export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const claims = sessionClaimsSchema.safeParse(session.user);
  if (!claims.success) {
    const meta = { type: "api", module: "ws-ticket", function: "GET" };
    logger.error(
      { meta, error: claims.error },
      "Session does not match ticket claims",
    );
    return NextResponse.json({ error: "Invalid session" }, { status: 500 });
  }

  const ticket = await signWsTicket(
    claims.data,
    config.GBX_SERVICE.WS_TICKET_SECRET,
  );

  return NextResponse.json(
    { ticket, url: config.GBX_SERVICE.WS_URL },
    { headers: { "Cache-Control": "no-store" } },
  );
}
