"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/account/supabase";
import { reviewComment } from "@/lib/devotion/comment-filter";
import type { PublicComment } from "@/lib/devotion/comment-types";
import { MASCOTS, type MascotId } from "@/lib/game/types";

type Load =
  | { status: "loading" }
  | { status: "signed-out" }
  | { status: "unavailable" }
  | { status: "ready"; canPost: boolean; comments: PublicComment[] };

async function authHeader(): Promise<string | null> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? `Bearer ${token}` : null;
}

export function DevotionComments({
  open,
  devotionId,
  devotionDate,
  onClose,
  onCount,
}: {
  open: boolean;
  devotionId: string;
  devotionDate: string;
  onClose: () => void;
  onCount: (count: number | null) => void;
}) {
  const [load, setLoad] = useState<Load>({ status: "loading" });
  const [draft, setDraft] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!open) return;
    let active = true;
    setLoad({ status: "loading" });
    setMessage(null);
    void (async () => {
      const headers: Record<string, string> = {};
      const auth = await authHeader();
      if (auth) headers.Authorization = auth;
      try {
        const response = await fetch(`/api/devotion/comments?date=${encodeURIComponent(devotionDate)}`, {
          headers,
          cache: "no-store",
        });
        const body = (await response.json()) as {
          signedIn?: boolean;
          available?: boolean;
          canPost?: boolean;
          comments?: PublicComment[];
        };
        if (!active) return;
        if (body.signedIn === false || response.status === 401) {
          onCount(null);
          setLoad({ status: "signed-out" });
          return;
        }
        if (body.available === false) {
          onCount(null);
          setLoad({ status: "unavailable" });
          return;
        }
        const comments = Array.isArray(body.comments) ? body.comments : [];
        onCount(comments.length);
        setLoad({ status: "ready", canPost: body.canPost === true, comments });
      } catch {
        if (!active) return;
        onCount(null);
        setLoad({ status: "unavailable" });
      }
    })();
    return () => {
      active = false;
    };
  }, [devotionDate, onCount, open]);

  if (!open) return null;

  async function reload() {
    const headers: Record<string, string> = {};
    const auth = await authHeader();
    if (auth) headers.Authorization = auth;
    const response = await fetch(`/api/devotion/comments?date=${encodeURIComponent(devotionDate)}`, {
      headers,
      cache: "no-store",
    });
    const body = (await response.json()) as { available?: boolean; canPost?: boolean; comments?: PublicComment[] };
    if (body.available === false) {
      onCount(null);
      setLoad({ status: "unavailable" });
      return;
    }
    const comments = Array.isArray(body.comments) ? body.comments : [];
    onCount(comments.length);
    setLoad({ status: "ready", canPost: body.canPost === true, comments });
  }

  async function send() {
    const review = reviewComment(draft);
    if (!review.ok) {
      setMessage(review.message);
      return;
    }
    setSending(true);
    setMessage(null);
    try {
      const auth = await authHeader();
      const response = await fetch("/api/devotion/comments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(auth ? { Authorization: auth } : {}),
        },
        body: JSON.stringify({ devotionId, devotionDate, body: review.body }),
      });
      const body = (await response.json()) as { message?: string; available?: boolean };
      if (body.available === false) {
        setLoad({ status: "unavailable" });
        return;
      }
      if (!response.ok) {
        setMessage(body.message ?? "Please try that comment again.");
        return;
      }
      setDraft("");
      await reload();
    } catch {
      setMessage("Please try that comment again.");
    } finally {
      setSending(false);
    }
  }

  async function change(action: "delete" | "report", id: string) {
    const auth = await authHeader();
    if (!auth) return;
    await fetch("/api/devotion/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: auth },
      body: JSON.stringify({ action, id }),
    });
    await reload();
  }

  const comments = load.status === "ready" ? load.comments : [];

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/50 sm:items-center" data-testid="comment-sheet">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="devotion-comments-title"
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-card p-5 text-ink sm:rounded-3xl"
      >
        <div className="flex items-center justify-between gap-3">
          <h2 id="devotion-comments-title" className="text-2xl font-semibold text-grove-deep">
            Comments
          </h2>
          <button type="button" onClick={onClose} className="rounded-2xl border border-line px-4 text-base">
            Close
          </button>
        </div>
        {load.status === "loading" ? <p className="mt-4 text-lg text-ink-soft">Opening comments…</p> : null}
        {load.status === "signed-out" ? (
          <p className="mt-4 text-lg">Sign in to see comments.</p>
        ) : null}
        {load.status === "unavailable" ? (
          <p className="mt-4 text-lg">Comments are not available on this copy yet.</p>
        ) : null}
        {load.status === "ready" ? (
          <div className="mt-4 grid gap-4">
            {comments.length === 0 ? <p className="text-lg text-ink-soft">No comments yet.</p> : null}
            <ul className="grid gap-3">
              {comments.map((comment) => (
                <li key={comment.id} className="rounded-2xl border border-line px-3 py-3" data-testid="devotion-comment">
                  <p className="flex items-center gap-2 text-base font-semibold">
                    <span aria-hidden="true">{MASCOTS[comment.mascot as MascotId]?.emoji ?? "🦁"}</span>
                    {comment.username}
                  </p>
                  <p className="mt-1 text-lg">{comment.body}</p>
                  <div className="mt-2 flex gap-2">
                    {comment.mine ? (
                      <button type="button" className="text-base text-ink-soft underline" onClick={() => void change("delete", comment.id)}>
                        Delete
                      </button>
                    ) : (
                      <button type="button" className="text-base text-ink-soft underline" onClick={() => void change("report", comment.id)}>
                        Report
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
            {load.canPost ? (
              <form
                className="grid gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  void send();
                }}
              >
                <label className="text-base text-ink-soft" htmlFor="devotion-comment-body">
                  Write a comment
                </label>
                <textarea
                  id="devotion-comment-body"
                  value={draft}
                  maxLength={280}
                  rows={3}
                  onChange={(event) => {
                    setDraft(event.target.value);
                    setMessage(null);
                  }}
                  className="rounded-2xl border border-line bg-card px-3 py-2 text-lg"
                />
                {message ? (
                  <p role="status" data-testid="comment-rejected" className="text-base text-ink">
                    {message}
                  </p>
                ) : null}
                <button type="submit" disabled={sending} className="rounded-2xl bg-grove px-4 text-lg font-semibold text-white">
                  Post
                </button>
              </form>
            ) : (
              <p className="text-base text-ink-soft">Writing comments is not available on this account.</p>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
