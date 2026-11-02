import { loadChapter } from "@/lib/bible/api-bible";
import { scriptureHeaders } from "@/lib/bible/notice";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const bookId = url.searchParams.get("bookId") ?? "";
  const chapter = Number(url.searchParams.get("chapter"));
  const result = await loadChapter(bookId, chapter);
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
  return Response.json({ ok: true, chapter: result.data }, { status: 200, headers: scriptureHeaders() });
}
