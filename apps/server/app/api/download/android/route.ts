import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Coolify: mount a persistent host directory at /data/apk.
// This APK lives outside the container image and survives redeployments.
const APK_PATH = "/data/apk/Invoice-Maker.apk";

export async function GET(request: NextRequest) {
  let info;
  try {
    info = await stat(APK_PATH);
    if (!info.isFile() || info.size === 0) throw new Error("Missing APK");
  } catch {
    return new Response("Android APK is not uploaded yet.", {
      status: 404,
      headers: { "Cache-Control": "no-store" }
    });
  }

  const size = info.size;
  const range = request.headers.get("range");
  let start = 0;
  let end = size - 1;
  let partial = false;

  if (range) {
    const matched = /^bytes=(\d*)-(\d*)$/.exec(range);
    if (!matched || (!matched[1] && !matched[2])) {
      return new Response(null, {
        status: 416,
        headers: { "Content-Range": `bytes */${size}` }
      });
    }
    if (!matched[1]) {
      const suffix = Number(matched[2]);
      if (!Number.isSafeInteger(suffix) || suffix <= 0) {
        return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
      }
      start = Math.max(0, size - suffix);
    } else {
      start = Number(matched[1]);
    }
    if (matched[1] && matched[2]) end = Number(matched[2]);
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start > end || start >= size) {
      return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
    }
    end = Math.min(end, size - 1);
    partial = true;
  }

  const headers = new Headers({
    "Content-Type": "application/vnd.android.package-archive",
    "Content-Disposition": 'attachment; filename="Invoice-Maker.apk"',
    "Content-Length": String(end - start + 1),
    "Accept-Ranges": "bytes",
    "Cache-Control": "public, max-age=300",
    "X-Content-Type-Options": "nosniff"
  });
  if (partial) headers.set("Content-Range", `bytes ${start}-${end}/${size}`);

  const stream = createReadStream(APK_PATH, { start, end });
  return new Response(Readable.toWeb(stream) as unknown as ReadableStream, {
    status: partial ? 206 : 200,
    headers
  });
}
