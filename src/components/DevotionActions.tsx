"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useSignedIn } from "@/lib/account/use-access";
import { readDevotionLikes, writeDevotionLike } from "@/lib/devotion/likes-client";
import { likeTap } from "@/lib/devotion/likes";
import { devotionSharePayload, shareDevotion, type SharePayload } from "@/lib/devotion/share";

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-7 w-7" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8">
      <path d="M12 20s-7-4.4-7-9a4 4 0 0 1 7-2 4 4 0 0 1 7 2c0 4.6-7 9-7 9z" strokeLinejoin="round" />
    </svg>
  );
}

function CommentIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M5 6.5h14v9H8l-3 3z" strokeLinejoin="round" />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M14 5h5v5M19 5l-8 8M16 13.5V19H5V8h5.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

async function copyWithFallback(value: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }
  const area = document.createElement("textarea");
  area.value = value;
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.left = "-9999px";
  document.body.appendChild(area);
  area.select();
  const ok = document.execCommand("copy");
  area.remove();
  if (!ok) throw new Error("copy failed");
}

export function DevotionActions({
  devotionId,
  devotionDate,
  referenceLabel,
}: {
  devotionId: string;
  devotionDate: string;
  referenceLabel: string;
}) {
  const auth = useSignedIn();
  const [liked, setLiked] = useState(false);
  const [count, setCount] = useState<number | null>(null);
  const [needsSignIn, setNeedsSignIn] = useState(false);
  const [copied, setCopied] = useState(false);
  const busy = useRef(false);
  const copyTimer = useRef<number | null>(null);

  useEffect(() => {
    let active = true;
    void readDevotionLikes(devotionDate).then((result) => {
      if (!active) return;
      if (!result.available) {
        setCount(null);
        return;
      }
      setCount(result.count);
      setLiked(result.liked);
    });
    return () => {
      active = false;
    };
  }, [devotionDate]);

  useEffect(() => {
    return () => {
      if (copyTimer.current !== null) window.clearTimeout(copyTimer.current);
    };
  }, []);

  async function onLike() {
    if (!auth.ready || busy.current) return;
    const decision = likeTap({ signedIn: Boolean(auth.email), liked, count });
    if (decision.type === "prompt-sign-in") {
      setNeedsSignIn(true);
      return;
    }
    setNeedsSignIn(false);
    const previous = { liked, count };
    setLiked(decision.next.liked);
    setCount(decision.next.count);
    if (!devotionId) {
      setLiked(previous.liked);
      setCount(previous.count);
      return;
    }
    busy.current = true;
    try {
      const ok = await writeDevotionLike({ devotionId, devotionDate, like: decision.next.liked });
      if (!ok) {
        setLiked(previous.liked);
        setCount(previous.count);
        const again = await readDevotionLikes(devotionDate);
        if (!again.available) setCount(null);
      }
    } catch {
      setLiked(previous.liked);
      setCount(previous.count);
    } finally {
      busy.current = false;
    }
  }

  async function onShare() {
    const payload = devotionSharePayload({
      referenceLabel,
      url: `${window.location.origin}/home`,
    });
    const share =
      typeof navigator.share === "function" ? (data: SharePayload) => navigator.share(data) : undefined;
    let result: "shared" | "copied" | "dismissed" | "failed" = "failed";
    try {
      result = await shareDevotion(payload, { share, writeText: copyWithFallback });
    } catch {
      result = "failed";
    }
    if (result !== "copied") return;
    setCopied(true);
    if (copyTimer.current !== null) window.clearTimeout(copyTimer.current);
    copyTimer.current = window.setTimeout(() => setCopied(false), 3000);
  }

  const likeLabel =
    count === null
      ? liked
        ? "Unlike this devotion"
        : "Like this devotion"
      : liked
        ? `Unlike this devotion, ${count} likes`
        : `Like this devotion, ${count} likes`;

  return (
    <div className="mt-4">
      <div className="grid grid-cols-3 items-start">
        <div className="flex justify-center">
          <button
            type="button"
            data-testid="devotion-like"
            aria-pressed={liked}
            aria-label={likeLabel}
            onClick={() => {
              void onLike();
            }}
            className="flex flex-col items-center gap-1 rounded-2xl px-3 text-white"
          >
            <HeartIcon filled={liked} />
            {count !== null ? (
              <span data-testid="devotion-like-count" className="text-sm tabular-nums">
                {count}
              </span>
            ) : null}
          </button>
        </div>
        <div className="flex justify-center">
          <button
            type="button"
            data-testid="devotion-comment"
            disabled
            aria-label="Comments coming soon"
            className="flex flex-col items-center gap-1 rounded-2xl px-3 text-white/90 disabled:opacity-100"
          >
            <CommentIcon />
            <span data-testid="devotion-comment-count" className="text-sm">
              Coming soon
            </span>
          </button>
        </div>
        <div className="flex justify-center">
          <button
            type="button"
            data-testid="devotion-share"
            aria-label="Share this devotion"
            onClick={() => {
              void onShare();
            }}
            className="flex flex-col items-center rounded-2xl px-3 text-white"
          >
            <ShareIcon />
          </button>
        </div>
      </div>
      {needsSignIn ? (
        <p role="status" data-testid="like-sign-in" className="mt-3 text-center text-sm text-white">
          <Link href="/account?mode=sign-in" className="underline">
            Sign in
          </Link>{" "}
          to like this verse.
        </p>
      ) : null}
      {copied ? (
        <p role="status" data-testid="link-copied" className="mt-3 text-center text-sm text-white">
          Link copied
        </p>
      ) : null}
    </div>
  );
}
