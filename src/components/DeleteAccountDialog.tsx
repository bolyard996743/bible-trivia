"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { DELETE_ACCOUNT_PROMPT } from "@/lib/account/delete-account-copy";

const TITLE_ID = "delete-account-title";
const BODY_ID = "delete-account-body";

export function DeleteAccountDialog({
  pending,
  error,
  onYes,
  onNo,
}: {
  pending: boolean;
  error: string | null;
  onYes: () => void;
  onNo: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const noRef = useRef<HTMLButtonElement>(null);
  const onNoRef = useRef(onNo);
  onNoRef.current = onNo;

  useEffect(() => {
    const previous = document.activeElement;
    return () => {
      if (previous instanceof HTMLElement) previous.focus();
    };
  }, []);

  useEffect(() => {
    if (pending) dialogRef.current?.focus();
    else noRef.current?.focus();
  }, [pending]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        if (pending) return;
        event.preventDefault();
        onNoRef.current();
        return;
      }
      if (event.key !== "Tab") return;
      const root = dialogRef.current;
      if (!root) return;
      const focusable = [
        ...root.querySelectorAll<HTMLElement>("button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled])"),
      ];
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
  }, [pending]);

  const dialog = (
    <div
      className="delete-account-backdrop"
      data-testid="delete-account-backdrop"
      onClick={() => {
        if (!pending) onNo();
      }}
    >
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={TITLE_ID}
        aria-describedby={BODY_ID}
        tabIndex={-1}
        data-testid="delete-account-dialog"
        className="delete-account-dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id={TITLE_ID} className="text-2xl font-semibold text-grove-deep">
          Delete account
        </h2>
        <p id={BODY_ID} className="text-lg text-ink">
          {DELETE_ACCOUNT_PROMPT}
        </p>
        {error ? (
          <p role="alert" className="text-lg text-ink" data-testid="delete-account-error">
            {error}
          </p>
        ) : null}
        <div className="delete-account-actions">
          <button
            ref={noRef}
            type="button"
            data-testid="delete-account-no"
            disabled={pending}
            onClick={() => {
              if (!pending) onNo();
            }}
            className="rounded-2xl border border-line bg-parchment px-4 text-lg text-ink disabled:opacity-50"
          >
            No
          </button>
          <button
            type="button"
            data-testid="delete-account-yes"
            disabled={pending}
            onClick={() => {
              if (!pending) onYes();
            }}
            className="delete-account rounded-2xl px-4 text-lg font-semibold disabled:opacity-50"
          >
            Yes
          </button>
        </div>
      </div>
    </div>
  );

  if (typeof document === "undefined") return dialog;
  return createPortal(dialog, document.body);
}
