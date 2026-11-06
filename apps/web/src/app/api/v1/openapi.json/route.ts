import { buildOpenApiDocument } from "@/lib/public-api/openapi";
import { NextResponse } from "next/server";

// The document only changes with a deploy; just the server URL depends on the request
let document: ReturnType<typeof buildOpenApiDocument> | undefined;

// The origin seen by the caller, so imports into Bruno, Postman or Insomnia work behind a proxy
function origin(request: Request): string {
  const url = new URL(request.url);
  const first = (value: string | null) => value?.split(",")[0].trim();
  const host = first(request.headers.get("x-forwarded-host")) ?? url.host;
  const proto =
    first(request.headers.get("x-forwarded-proto")) ??
    url.protocol.slice(0, -1);
  return `${proto}://${host}`;
}

export function GET(request: Request) {
  document ??= buildOpenApiDocument();
  return NextResponse.json({
    ...document,
    servers: [{ url: `${origin(request)}/api/v1` }],
  });
}
