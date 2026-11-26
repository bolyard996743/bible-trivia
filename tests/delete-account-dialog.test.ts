// @vitest-environment happy-dom
import { act, createElement, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ACCOUNT_DELETED_HREF,
  ACCOUNT_DELETED_MESSAGE,
  DELETE_ACCOUNT_PROMPT,
  DELETE_ACCOUNT_UNAVAILABLE,
} from "@/lib/account/delete-account-copy";
import { STORAGE_KEY } from "@/lib/storage";

const push = vi.hoisted(() => vi.fn());
const deleteMyAccount = vi.hoisted(() => vi.fn());
const signOut = vi.hoisted(() => vi.fn(async () => undefined));
const getSession = vi.hoisted(() =>
  vi.fn(async () => ({
    data: { session: { access_token: "session-token", user: { id: "real-user" } } },
  })),
);

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: push }),
}));

vi.mock("@/app/account/delete-account", () => ({
  deleteMyAccount: (...args: unknown[]) => deleteMyAccount(...args),
}));

vi.mock("@/lib/account/supabase", () => ({
  getSupabaseBrowserClient: () => ({
    auth: { getSession },
  }),
  signOut: () => signOut(),
}));

vi.mock("@/lib/use-profile", () => ({
  useProfile: () => ({ state: null, ready: true, save: () => undefined }),
}));

import { DeleteAccountDialog } from "@/components/DeleteAccountDialog";
import { DeleteAccountControl } from "@/components/DeleteAccountControl";
import { HomeClient } from "@/components/HomeClient";

let root: Root | null = null;

function render(node: ReactNode) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root?.render(node);
  });
  return container;
}

function type(node: Element | null | undefined) {
  if (!(node instanceof HTMLElement)) throw new Error("missing element");
  return node;
}

afterEach(() => {
  act(() => root?.unmount());
  root = null;
  document.body.innerHTML = "";
  deleteMyAccount.mockReset();
  signOut.mockClear();
  push.mockReset();
  window.localStorage.clear();
});

describe("delete account dialog", () => {
  it("asks with the exact warning and closes on No, Escape, and an outside click", () => {
    const onYes = vi.fn();
    const onNo = vi.fn();
    render(createElement(DeleteAccountDialog, { pending: false, error: null, onYes, onNo }));
    const dialog = type(document.querySelector("[data-testid=delete-account-dialog]"));
    expect(dialog.getAttribute("role")).toBe("alertdialog");
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(dialog.textContent).toContain(DELETE_ACCOUNT_PROMPT);
    expect(document.activeElement).toBe(document.querySelector("[data-testid=delete-account-no]"));

    type(document.querySelector("[data-testid=delete-account-no]")).click();
    expect(onNo).toHaveBeenCalledTimes(1);
    expect(onYes).not.toHaveBeenCalled();

    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    expect(onNo).toHaveBeenCalledTimes(2);

    type(document.querySelector("[data-testid=delete-account-backdrop]")).click();
    expect(onNo).toHaveBeenCalledTimes(3);

    type(dialog).click();
    expect(onNo).toHaveBeenCalledTimes(3);

    const yes = type(document.querySelector("[data-testid=delete-account-yes]"));
    yes.focus();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", bubbles: true }));
    expect(document.activeElement).toBe(document.querySelector("[data-testid=delete-account-no]"));
  });

  it("disables both buttons while the request is running", () => {
    const onYes = vi.fn();
    const onNo = vi.fn();
    render(createElement(DeleteAccountDialog, { pending: true, error: null, onYes, onNo }));
    const yes = type(document.querySelector("[data-testid=delete-account-yes]")) as HTMLButtonElement;
    const no = type(document.querySelector("[data-testid=delete-account-no]")) as HTMLButtonElement;
    expect(yes.disabled).toBe(true);
    expect(no.disabled).toBe(true);
    expect(yes.getBoundingClientRect).toBeTypeOf("function");
    yes.click();
    no.click();
    type(document.querySelector("[data-testid=delete-account-backdrop]")).click();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    expect(onYes).not.toHaveBeenCalled();
    expect(onNo).not.toHaveBeenCalled();
  });
});

describe("delete account control", () => {
  function open() {
    render(createElement(DeleteAccountControl));
    act(() => {
      type(document.querySelector("[data-testid=delete-account]")).click();
    });
  }

  it("shows a kind message when deletion fails and never the raw error", async () => {
    deleteMyAccount.mockRejectedValue(new Error("SUPER_SECRET_DB connection reset"));
    open();
    await act(async () => {
      type(document.querySelector("[data-testid=delete-account-yes]")).click();
    });
    const alert = type(document.querySelector("[data-testid=delete-account-error]"));
    expect(alert.textContent).toBe(DELETE_ACCOUNT_UNAVAILABLE);
    expect(document.body.textContent).not.toContain("SUPER_SECRET_DB");
    expect(push).not.toHaveBeenCalled();
    const yes = type(document.querySelector("[data-testid=delete-account-yes]")) as HTMLButtonElement;
    expect(yes.disabled).toBe(false);
  });

  it("disables the buttons until the request settles", async () => {
    let finish: (value: { ok: false; message: string }) => void = () => undefined;
    deleteMyAccount.mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    open();
    act(() => {
      type(document.querySelector("[data-testid=delete-account-yes]")).click();
    });
    const yes = type(document.querySelector("[data-testid=delete-account-yes]")) as HTMLButtonElement;
    const no = type(document.querySelector("[data-testid=delete-account-no]")) as HTMLButtonElement;
    expect(yes.disabled).toBe(true);
    expect(no.disabled).toBe(true);
    await act(async () => {
      finish({ ok: false, message: DELETE_ACCOUNT_UNAVAILABLE });
    });
    expect(yes.disabled).toBe(false);
  });

  it("clears local progress, signs out, and opens Home after Yes", async () => {
    window.localStorage.setItem(STORAGE_KEY, "{\"progress\":1}");
    window.localStorage.setItem("bible-trivia-pending-carry-email", "ada@example.com");
    deleteMyAccount.mockResolvedValue({ ok: true });
    open();
    await act(async () => {
      type(document.querySelector("[data-testid=delete-account-yes]")).click();
    });
    expect(deleteMyAccount).toHaveBeenCalledWith({ accessToken: "session-token", userId: "real-user" });
    expect(signOut).toHaveBeenCalled();
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(window.localStorage.getItem("bible-trivia-pending-carry-email")).toBeNull();
    expect(push).toHaveBeenCalledWith(ACCOUNT_DELETED_HREF);
  });
});

describe("home after deletion", () => {
  it("shows the confirmation instead of sending the player away", () => {
    render(
      createElement(HomeClient, {
        questions: [],
        lines: [],
        accountDeleted: true,
      }),
    );
    const note = type(document.querySelector("[data-testid=account-deleted]"));
    expect(note.textContent).toContain(ACCOUNT_DELETED_MESSAGE);
    expect(push).not.toHaveBeenCalled();
  });
});
