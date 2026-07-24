import { NextResponse } from "next/server";

export const runtime = "nodejs";

export function GET() {
  return NextResponse.json({
    status: "ok",
    service: "cell-world",
    phase: "foundation",
    timestamp: new Date().toISOString(),
  });
}
