import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { mockupsEnabled } from "@/lib/mockup/gate";

export function middleware(request: NextRequest) {
  if (!request.nextUrl.pathname.startsWith("/mockup")) return NextResponse.next();
  if (mockupsEnabled()) return NextResponse.next();
  return new NextResponse("Not Found", {
    status: 404,
    headers: { "content-type": "text/plain; charset=utf-8", "x-robots-tag": "noindex" },
  });
}

export const config = {
  matcher: ["/mockup", "/mockup/:path*"],
};
