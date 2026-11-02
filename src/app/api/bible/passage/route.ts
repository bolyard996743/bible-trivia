import { loadPassage } from "@/lib/bible/api-bible";
import { scriptureHeaders } from "@/lib/bible/notice";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const ref = url.searchParams.get("ref") ?? "";
  const result = await loadPassage(ref);
  if (!result.ok) {
    return Response.json(
      {
        ok: false,
        message: result.message,
        ...(result.upstreamStatus ? { upstreamStatus: result.upstreamStatus } : {}),
      },
      { status: result.status, headers: scriptureHeaders() },
    );
  }
  return Response.json({ ok: true, passage: result.data }, { status: 200, headers: scriptureHeaders() });
}
