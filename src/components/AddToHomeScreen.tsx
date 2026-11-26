"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  clearInstallPrompt,
  currentInstallPrompt,
  installWasAccepted,
  markInstallAccepted,
  subscribeInstallCapture,
  type InstallPromptEvent,
} from "@/lib/installCapture";
import {
  detectInstallPlatform,
  readInstallBannerDismissed,
  writeInstallBannerDismissed,
  type InstallPlatform,
} from "@/lib/installPlatform";

type InstallSurface = {
  ready: boolean;
  platform: InstallPlatform;
  promptEvent: InstallPromptEvent | null;
  installed: boolean;
};

function readSignals(): { platform: InstallPlatform; installed: boolean } {
  let userAgent = "";
  let maxTouchPoints = 0;
  let navigatorStandalone = false;
  let displayModeStandalone = false;
  try {
    userAgent = navigator.userAgent;
    maxTouchPoints = navigator.maxTouchPoints ?? 0;
    navigatorStandalone = Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
  } catch {
    userAgent = "";
  }
  try {
    displayModeStandalone =
      typeof window.matchMedia === "function" && window.matchMedia("(display-mode: standalone)").matches;
  } catch {
    displayModeStandalone = false;
  }
  const platform = detectInstallPlatform({
    userAgent,
    maxTouchPoints,
    navigatorStandalone,
    displayModeStandalone,
  });
  return { platform, installed: installWasAccepted() || platform === "standalone" };
}

export function useInstallSurface(): InstallSurface {
  const [ready, setReady] = useState(false);
  const [platform, setPlatform] = useState<InstallPlatform>("other");
  const [promptEvent, setPromptEvent] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const read = () => {
      const next = readSignals();
      setPlatform(next.platform);
      setInstalled(next.installed);
      setPromptEvent(next.installed ? null : currentInstallPrompt());
      setReady(true);
    };
    read();
    return subscribeInstallCapture(read);
  }, []);

  return {
    ready,
    platform: installed ? "standalone" : platform,
    promptEvent: installed ? null : promptEvent,
    installed,
  };
}

function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-8 w-8 shrink-0 text-grove-deep">
      <rect x="5" y="11" width="14" height="9" rx="2" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 13V3.2" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M8.2 6.5 12 2.8l3.8 3.7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PlusSquareIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-8 w-8 shrink-0 text-grove-deep">
      <rect x="4" y="4" width="16" height="16" rx="3" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 8v8M8 12h8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function AddChip() {
  return (
    <span
      aria-hidden="true"
      className="inline-flex h-8 shrink-0 items-center rounded-lg border border-grove px-2 text-sm font-semibold text-grove-deep"
    >
      Add
    </span>
  );
}

function pageLink(): string {
  try {
    return `${window.location.origin}/`;
  } catch {
    return "/";
  }
}

async function runInstallPrompt(event: InstallPromptEvent): Promise<void> {
  try {
    await event.prompt();
    const choice = await event.userChoice;
    if (choice.outcome === "accepted") {
      markInstallAccepted();
      return;
    }
  } catch {
    // The browser would not show the prompt. Fall back to the menu steps.
  }
  clearInstallPrompt();
}

export function InstallGuideBody({ surface }: { surface: InstallSurface }) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const link = surface.ready ? pageLink() : "/";
  const canPrompt = Boolean(surface.promptEvent);

  async function copyLink() {
    try {
      const clipboard = navigator.clipboard;
      if (!clipboard?.writeText) throw new Error("unavailable");
      await clipboard.writeText(pageLink());
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
  }

  if (!surface.ready) {
    return <p className="text-lg text-ink-soft">One moment…</p>;
  }

  if (surface.installed || surface.platform === "standalone") {
    return (
      <p className="text-lg text-ink" data-testid="already-installed">
        Noble Bereans is already on your home screen.
      </p>
    );
  }

  if (surface.platform === "ios-safari") {
    return (
      <div className="grid gap-3" data-testid="ios-safari-steps">
        <p className="text-lg text-ink">Your phone can keep Noble Bereans on the home screen.</p>
        <ol className="grid gap-3">
          <li className="flex min-w-0 items-center gap-3 text-lg text-ink">
            <ShareIcon />
            <span className="min-w-0">Tap the Share button.</span>
          </li>
          <li className="flex min-w-0 items-center gap-3 text-lg text-ink">
            <PlusSquareIcon />
            <span className="min-w-0">Tap Add to Home Screen.</span>
          </li>
          <li className="flex min-w-0 items-center gap-3 text-lg text-ink">
            <AddChip />
            <span className="min-w-0">Tap Add.</span>
          </li>
        </ol>
      </div>
    );
  }

  if (surface.platform === "ios-other") {
    return (
      <div className="grid gap-3" data-testid="ios-other-guide">
        <p className="text-lg text-ink">To add this page to your home screen, open it in Safari first.</p>
        <button
          type="button"
          data-testid="copy-safari-link"
          onClick={() => void copyLink()}
          className="min-h-12 rounded-2xl bg-grove px-4 text-lg font-semibold text-white"
        >
          Copy link
        </button>
        <p className="text-lg text-ink">Then in Safari, tap Share, tap Add to Home Screen, and tap Add.</p>
        <p className="text-lg text-ink" aria-live="polite">
          {copyState === "copied" ? "Copied. Open Safari and paste the link." : ""}
        </p>
        {copyState === "failed" ? (
          <input
            readOnly
            value={link}
            aria-label="Page link"
            data-testid="safari-link-fallback"
            className="w-full min-w-0 rounded-xl border border-line bg-parchment px-3 py-2 text-base text-ink"
            onFocus={(event) => event.currentTarget.select()}
          />
        ) : null}
      </div>
    );
  }

  if (canPrompt && (surface.platform === "android-chrome" || surface.platform === "samsung" || surface.platform === "other")) {
    return (
      <div className="grid gap-3" data-testid="install-prompt">
        {surface.platform === "other" ? (
          <p className="text-lg text-ink" data-testid="desktop-install-note">
            Visit this page on your phone to add it to your home screen. If your browser offers an install option, you can use that too.
          </p>
        ) : (
          <p className="text-lg text-ink">You can add Noble Bereans to your home screen.</p>
        )}
        <button
          type="button"
          data-testid="install-app-button"
          onClick={() => {
            const event = surface.promptEvent;
            if (event) void runInstallPrompt(event);
          }}
          className="min-h-12 rounded-2xl bg-grove px-4 text-lg font-semibold text-white"
        >
          Install app
        </button>
      </div>
    );
  }

  if (surface.platform === "android-chrome") {
    return (
      <div className="grid gap-3" data-testid="android-menu-steps">
        <p className="text-lg text-ink">You can add Noble Bereans to your home screen.</p>
        <p className="text-lg text-ink">Tap the Chrome menu (⋮). Then tap Add to Home screen or Install app.</p>
      </div>
    );
  }

  if (surface.platform === "samsung") {
    return (
      <div className="grid gap-3" data-testid="samsung-steps">
        <p className="text-lg text-ink">You can add Noble Bereans to your home screen.</p>
        <p className="text-lg text-ink">Tap the menu (☰). Then tap Add page to, then Home screen.</p>
      </div>
    );
  }

  return (
    <p className="text-lg text-ink" data-testid="desktop-install-note">
      Visit this page on your phone to add it to your home screen. If your browser offers an install option, you can use that too.
    </p>
  );
}

const FOCUSABLE = "button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled])";

export function InstallGuideDialog({ surface, onClose }: { surface: InstallSurface; onClose: () => void }) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const previous = document.activeElement;
    dialogRef.current?.focus();
    return () => {
      if (previous instanceof HTMLElement) previous.focus();
    };
  }, []);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab") return;
      const root = dialogRef.current;
      if (!root) return;
      const focusable = [...root.querySelectorAll<HTMLElement>(FOCUSABLE)];
      if (focusable.length === 0) {
        event.preventDefault();
        root.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      const outside = !(active instanceof Node) || !root.contains(active);
      if (event.shiftKey && (active === first || outside)) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && (active === last || outside)) {
        event.preventDefault();
        first?.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="install-guide-backdrop" data-testid="add-to-home-backdrop" onClick={() => onCloseRef.current()}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-to-home-title"
        tabIndex={-1}
        data-testid="add-to-home-dialog"
        className="install-guide-dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="add-to-home-title" className="text-2xl font-semibold text-grove-deep">
          Add to Home Screen
        </h2>
        <InstallGuideBody surface={surface} />
        <button
          type="button"
          data-testid="add-to-home-close"
          onClick={() => onCloseRef.current()}
          className="min-h-12 justify-self-start rounded-2xl border border-line bg-parchment px-4 text-lg text-ink"
        >
          Close
        </button>
      </div>
    </div>,
    document.body,
  );
}

function bannerVisible(surface: InstallSurface, dismissed: boolean): boolean {
  if (!surface.ready || dismissed || surface.installed) return false;
  if (surface.platform === "standalone") return false;
  if (surface.platform === "other") return Boolean(surface.promptEvent);
  return true;
}

export function AddToHomeBanner() {
  const surface = useInstallSurface();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try {
      setDismissed(readInstallBannerDismissed(window.localStorage));
    } catch {
      setDismissed(false);
    }
  }, []);

  if (!bannerVisible(surface, dismissed)) return null;

  function dismiss() {
    try {
      writeInstallBannerDismissed(window.localStorage);
    } catch {
      // The helper already swallows storage failures. Hide the card for this visit either way.
    }
    setDismissed(true);
  }

  return (
    <section aria-label="Add to Home Screen" data-testid="add-to-home-banner" className="grid gap-3 rounded-3xl border border-line bg-card p-4">
      <h2 className="text-xl font-semibold text-grove-deep">Add to Home Screen</h2>
      <InstallGuideBody surface={surface} />
      <button
        type="button"
        data-testid="add-to-home-dismiss"
        onClick={dismiss}
        className="min-h-12 justify-self-start rounded-2xl border border-line bg-parchment px-4 text-lg text-ink"
      >
        Not now
      </button>
    </section>
  );
}

export function AddToHomeSettings() {
  const surface = useInstallSurface();
  const [open, setOpen] = useState(false);

  return (
    <section data-testid="add-to-home-settings" className="grid gap-3 rounded-3xl border border-line bg-card p-4">
      <h2 className="text-xl font-semibold text-grove-deep">Add to Home Screen</h2>
      {surface.ready && surface.installed ? (
        <p className="text-lg text-ink" data-testid="settings-already-installed">
          Noble Bereans is already on your home screen.
        </p>
      ) : (
        <p className="text-lg text-ink">Open Noble Bereans from your home screen, like an app.</p>
      )}
      <button
        type="button"
        data-testid="add-to-home-open"
        onClick={() => setOpen(true)}
        className="min-h-12 rounded-2xl border border-grove px-4 text-lg text-grove-deep"
      >
        Show me how
      </button>
      {open ? <InstallGuideDialog surface={surface} onClose={() => setOpen(false)} /> : null}
    </section>
  );
}
