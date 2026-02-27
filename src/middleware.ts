import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  if (req.method === "POST") {
    console.log("POST", {
      url: req.url,
      headers: Object.fromEntries(req.headers.entries()),
      cookies: req.cookies.getAll(),
      userAgent: req.headers.get("user-agent"),
    })
  }
  return NextResponse.next();
}