import type { Metadata } from "next";
import { AdminComments } from "@/components/AdminComments";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const metadata: Metadata = {
  title: "Comment review",
  robots: { index: false, follow: false },
};

export default function AdminCommentsPage() {
  return <AdminComments />;
}
