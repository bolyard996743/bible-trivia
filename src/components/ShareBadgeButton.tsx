"use client";

import { useState } from "react";
import { downloadFile, presentBadgeShare, renderBadgeShareFile, shareCardLine } from "@/lib/share/badge-card";

export function ShareBadgeButton({ name, topic, slug }: { name: string; topic: string; slug: string }) {
  const [preview, setPreview] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const line = shareCardLine(name);

  async function share() {
    if (busy) return;
    setBusy(true);
    setNote(null);
    try {
      const file = await renderBadgeShareFile(name, topic, slug);
      if (!file) {
        setNote("This browser can't make the image.");
        return;
      }
      const url = URL.createObjectURL(file);
      setPreview((current) => {
        if (current) URL.revokeObjectURL(current);
        return url;
      });
      const nav = typeof navigator === "undefined" ? null : navigator;
      const result = await presentBadgeShare({
        file,
        text: line,
        canShare: nav?.canShare ? (data) => nav.canShare!(data) : undefined,
        share: nav?.share ? (data) => nav.share!(data) : undefined,
        download: downloadFile,
      });
      if (result === "downloaded") setNote("Image saved.");
      if (result === "failed") setNote("The image is here if you want to save it.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid w-full min-w-0 justify-items-center gap-3">
      <button
        type="button"
        data-testid="share-badge"
        onClick={() => void share()}
        className="min-h-12 w-full rounded-2xl border border-grove bg-card px-4 text-lg font-semibold text-grove-deep"
      >
        Share
      </button>
      {preview ? (
        // The card is a blob generated on this device. next/image cannot optimize it.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={preview} alt={line} data-testid="share-card" className="h-auto w-full max-w-full rounded-2xl border border-line" />
      ) : null}
      {note ? <p className="text-base text-ink-soft">{note}</p> : null}
    </div>
  );
}
