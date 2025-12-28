import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    SPACETIME_URI: process.env.SPACETIME_URI ?? null,
    SPACETIME_MODULE: process.env.SPACETIME_MODULE ?? null,
  });
}
