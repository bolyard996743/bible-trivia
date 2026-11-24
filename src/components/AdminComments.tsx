"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/account/supabase";
import type { AdminComment } from "@/lib/devotion/comment-types";
import { MASCOTS, type MascotId } from "@/lib/game/types";

type Load =
  | { status: "loading" }
  | { status: "denied" }
  | { status: "unavailable" }
  | { status: "ready"; comments: AdminComment[] };

async function authHeader(): Promise<string | null> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? `Bearer ${token}` : null;
}

export function AdminComments() {
  const [load, setLoad] = useState<Load>({ status: "loading" });
  const [message, setMessage] = useState<string | null>(null);

  async function loadComments() {
    const headers: Record<string, string> = {};
    const auth = await authHeader();
    if (auth) headers.Authorization = auth;
    const response = await fetch("/api/admin/comments", { headers, cache: "no-store" });
    if (response.status === 401) {
      setLoad({ status: "denied" });
      return;
    }
    const body = (await response.json()) as { available?: boolean; comments?: AdminComment[] };
    if (body.available === false) {
      setLoad({ status: "unavailable" });
      return;
    }
    setLoad({ status: "ready", comments: Array.isArray(body.comments) ? body.comments : [] });
  }

  useEffect(() => {
    let active = true;
    void loadComments().catch(() => {
      if (active) setLoad({ status: "unavailable" });
    });
    return () => {
      active = false;
    };
  }, []);

  async function act(action: "remove" | "restore" | "ban" | "unban", comment: AdminComment) {
    setMessage(null);
    const auth = await authHeader();
    const response = await fetch("/api/admin/comments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(auth ? { Authorization: auth } : {}),
      },
      body: JSON.stringify({ action, commentId: comment.id, userId: comment.userId }),
    });
    if (!response.ok) {
      setMessage("Please try that again.");
      return;
    }
    await loadComments();
  }

  const reported = load.status === "ready" ? load.comments.filter((comment) => comment.hidden || comment.reports > 0) : [];
  const recent = load.status === "ready" ? load.comments : [];

  return (
    <section className="grid gap-6" data-testid="admin-comments">
      <h1 className="text-3xl font-semibold text-grove-deep">Comment review</h1>
      {load.status === "loading" ? <p className="text-lg text-ink-soft">Opening…</p> : null}
      {load.status === "denied" ? <p className="text-lg">Sign in with a review account to see comments.</p> : null}
      {load.status === "unavailable" ? <p className="text-lg">Comment review is not available on this copy yet.</p> : null}
      {message ? <p className="text-lg">{message}</p> : null}
      {load.status === "ready" ? (
        <>
          <CommentList title="Reported" comments={reported} onAct={act} />
          <CommentList title="Recent" comments={recent} onAct={act} />
        </>
      ) : null}
    </section>
  );
}

function CommentList({
  title,
  comments,
  onAct,
}: {
  title: string;
  comments: AdminComment[];
  onAct: (action: "remove" | "restore" | "ban" | "unban", comment: AdminComment) => Promise<void>;
}) {
  return (
    <div className="grid gap-3">
      <h2 className="text-2xl font-semibold text-grove-deep">{title}</h2>
      {comments.length === 0 ? <p className="text-lg text-ink-soft">None right now.</p> : null}
      <ul className="grid gap-3">
        {comments.map((comment) => (
          <li key={`${title}-${comment.id}`} className="rounded-3xl border border-line bg-card p-4" data-testid="admin-comment">
            <p className="flex items-center gap-2 text-base font-semibold">
              <span aria-hidden="true">{MASCOTS[comment.mascot as MascotId]?.emoji ?? "🦁"}</span>
              {comment.username}
            </p>
            <p className="mt-1 text-lg">{comment.body}</p>
            <p className="mt-1 text-base text-ink-soft">
              {comment.reports} reports{comment.hidden ? " · hidden" : ""}
              {comment.removed ? " · removed" : ""}
              {comment.banned ? " · banned" : ""}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {comment.removed ? (
                <button type="button" className="rounded-2xl border border-line px-4" onClick={() => void onAct("restore", comment)}>
                  Restore
                </button>
              ) : (
                <button type="button" className="rounded-2xl border border-line px-4" onClick={() => void onAct("remove", comment)}>
                  Remove
                </button>
              )}
              {comment.banned ? (
                <button type="button" className="rounded-2xl border border-line px-4" onClick={() => void onAct("unban", comment)}>
                  Unban
                </button>
              ) : (
                <button type="button" className="rounded-2xl border border-line px-4" onClick={() => void onAct("ban", comment)}>
                  Ban
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
