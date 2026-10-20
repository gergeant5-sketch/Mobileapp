import { NextResponse } from "next/server";
import { Client } from "pg";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ ok: false, database: "not-configured" }, { status: 503 });
  }
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 3500
  });
  try {
    await client.connect();
    await client.query("SELECT 1");
    return NextResponse.json({ ok: true, database: "connected" }, {
      headers: { "Cache-Control": "no-store" }
    });
  } catch {
    return NextResponse.json({ ok: false, database: "unavailable" }, { status: 503 });
  } finally {
    await client.end().catch(() => {});
  }
}
