import { buildOpenApiDocument } from "@/lib/public-api/openapi";
import { NextResponse } from "next/server";

// The document only changes with a deploy
export const dynamic = "force-static";

export function GET() {
  return NextResponse.json(buildOpenApiDocument());
}
