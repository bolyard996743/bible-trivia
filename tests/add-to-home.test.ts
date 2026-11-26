// @vitest-environment happy-dom
import { act, createElement, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AddToHomeBanner, AddToHomeSettings } from "@/components/AddToHomeScreen";
import { resetInstallCapture } from "@/lib/installCapture";
import { INSTALL_DISMISS_KEY } from "@/lib/installPlatform";

const IOS_SAFARI =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";
const IOS_CHROME =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/126.0.6478.108 Mobile/15E148 Safari/604.1";
const ANDROID_CHROME =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.6478.122 Mobile Safari/537.36";
const SAMSUNG =
  "Mozilla/5.0 (Linux; Android 14; SAMSUNG SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/25.0 Chrome/120.0.0.0 Mobile Safari/537.36";
const DESKTOP =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

let root: Root | null = null;

function setDevice(userAgent: string, options?: { standalone?: boolean; navigatorStandalone?: boolean }) {
  Object.defineProperty(navigator, "userAgent", { configurable: true, value: userAgent });
  Object.defineProperty(navigator, "maxTouchPoints", { configurable: true, value: 0 });
  Object.defineProperty(navigator, "standalone", {
    configurable: true,
    value: Boolean(options?.navigatorStandalone),
  });
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: (query: string) => ({
      matches: Boolean(options?.standalone) && query.includes("display-mode: standalone"),
      media: query,
      addEventListener() {},
      removeEventListener() {},
      addListener() {},
      removeListener() {},
      onchange: null,
      dispatchEvent() {
        return false;
      },
    }),
  });
}

function mount(node: ReactNode) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root?.render(node);
  });
  return container;
}

function installPrompt(outcome: "accepted" | "dismissed" = "dismissed") {
  const prompt = vi.fn(async () => {});
  const event = new Event("beforeinstallprompt", { cancelable: true });
  Object.assign(event, {
    prompt,
    userChoice: Promise.resolve({ outcome, platform: "web" }),
  });
  act(() => {
    window.dispatchEvent(event);
  });
  return { event, prompt };
}

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  resetInstallCapture();
  window.localStorage.clear();
  setDevice(DESKTOP);
});

afterEach(() => {
  act(() => root?.unmount());
  root = null;
  document.body.innerHTML = "";
  resetInstallCapture();
  window.localStorage.clear();
});

describe("Add to Home Screen banner", () => {
  it("renders nothing until the device is known", () => {
    expect(renderToStaticMarkup(createElement(AddToHomeBanner))).toBe("");
  });

  it("shows the iOS Safari steps and remembers Not now", () => {
    setDevice(IOS_SAFARI);
    const view = mount(createElement(AddToHomeBanner));
    const banner = view.querySelector("[data-testid=add-to-home-banner]");
    expect(banner?.textContent).toContain("Tap the Share button.");
    expect(banner?.textContent).toContain("Tap Add to Home Screen.");
    expect(banner?.textContent).toContain("Tap Add.");
    const dismiss = view.querySelector("[data-testid=add-to-home-dismiss]");
    if (!(dismiss instanceof HTMLButtonElement)) throw new Error("missing dismiss");
    act(() => {
      dismiss.click();
    });
    expect(view.querySelector("[data-testid=add-to-home-banner]")).toBeNull();
    expect(window.localStorage.getItem(INSTALL_DISMISS_KEY)).toBe("1");

    act(() => root?.unmount());
    root = null;
    document.body.innerHTML = "";
    const again = mount(createElement(AddToHomeBanner));
    expect(again.querySelector("[data-testid=add-to-home-banner]")).toBeNull();
  });

  it("still dismisses when storage is blocked", () => {
    setDevice(IOS_SAFARI);
    const realStorage = window.localStorage;
    const blocked = {
      getItem() {
        throw new Error("blocked");
      },
      setItem() {
        throw new Error("blocked");
      },
      removeItem() {
        throw new Error("blocked");
      },
      clear() {},
      key() {
        return null;
      },
      length: 0,
    };
    Object.defineProperty(window, "localStorage", { configurable: true, value: blocked });
    try {
      const view = mount(createElement(AddToHomeBanner));
      const dismiss = view.querySelector("[data-testid=add-to-home-dismiss]");
      if (!(dismiss instanceof HTMLButtonElement)) throw new Error("missing dismiss");
      expect(() => {
        act(() => {
          dismiss.click();
        });
      }).not.toThrow();
      expect(view.querySelector("[data-testid=add-to-home-banner]")).toBeNull();
    } finally {
      Object.defineProperty(window, "localStorage", { configurable: true, value: realStorage });
    }
  });

  it("asks iOS Chrome to open Safari and copies the link", async () => {
    setDevice(IOS_CHROME);
    const writeText = vi.fn(async () => {});
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    const view = mount(createElement(AddToHomeBanner));
    expect(view.textContent).toContain("open it in Safari first");
    const button = view.querySelector("[data-testid=copy-safari-link]");
    if (!(button instanceof HTMLButtonElement)) throw new Error("missing copy");
    await act(async () => {
      button.click();
    });
    expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/`);
    expect(view.textContent).toContain("Copied. Open Safari and paste the link.");
  });

  it("shows the link when the clipboard is blocked", async () => {
    setDevice(IOS_CHROME);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async () => {
          throw new Error("denied");
        },
      },
    });
    const view = mount(createElement(AddToHomeBanner));
    const button = view.querySelector("[data-testid=copy-safari-link]");
    if (!(button instanceof HTMLButtonElement)) throw new Error("missing copy");
    await act(async () => {
      button.click();
    });
    const fallback = view.querySelector("[data-testid=safari-link-fallback]");
    expect(fallback).toBeTruthy();
    expect(view.textContent).not.toContain("Copied.");
  });

  it("offers Install app on Android Chrome when the browser prompt is ready", async () => {
    setDevice(ANDROID_CHROME);
    const view = mount(createElement(AddToHomeBanner));
    expect(view.textContent).toContain("Tap the Chrome menu");
    const { prompt } = installPrompt("accepted");
    const button = view.querySelector("[data-testid=install-app-button]");
    if (!(button instanceof HTMLButtonElement)) throw new Error("missing install");
    await act(async () => {
      button.click();
    });
    expect(prompt).toHaveBeenCalled();
    expect(view.querySelector("[data-testid=add-to-home-banner]")).toBeNull();
  });

  it("shows Samsung Internet menu steps when no prompt is available", () => {
    setDevice(SAMSUNG);
    const view = mount(createElement(AddToHomeBanner));
    expect(view.textContent).toContain("Add page to");
    expect(view.textContent).toContain("Home screen");
    expect(view.querySelector("[data-testid=install-app-button]")).toBeNull();
  });

  it("hides the banner on desktop until the browser offers to install", () => {
    setDevice(DESKTOP);
    const view = mount(createElement(AddToHomeBanner));
    expect(view.querySelector("[data-testid=add-to-home-banner]")).toBeNull();
    installPrompt();
    expect(view.querySelector("[data-testid=install-app-button]")).toBeTruthy();
    expect(view.textContent).toContain("Visit this page on your phone");
  });

  it("hides the banner when the app is already installed", () => {
    setDevice(IOS_SAFARI, { standalone: true });
    const view = mount(createElement(AddToHomeBanner));
    expect(view.querySelector("[data-testid=add-to-home-banner]")).toBeNull();
  });
});

describe("Add to Home Screen settings", () => {
  it("keeps an entry that opens a labelled guide and closes with Escape", () => {
    setDevice(IOS_SAFARI);
    const view = mount(createElement(AddToHomeSettings));
    expect(renderToStaticMarkup(createElement(AddToHomeSettings))).toContain("Add to Home Screen");
    const open = view.querySelector("[data-testid=add-to-home-open]");
    if (!(open instanceof HTMLButtonElement)) throw new Error("missing settings entry");
    open.focus();
    act(() => {
      open.click();
    });
    const dialog = document.querySelector("[data-testid=add-to-home-dialog]");
    expect(dialog?.getAttribute("role")).toBe("dialog");
    expect(dialog?.getAttribute("aria-modal")).toBe("true");
    expect(dialog?.getAttribute("aria-labelledby")).toBe("add-to-home-title");
    expect(document.getElementById("add-to-home-title")?.textContent).toBe("Add to Home Screen");
    expect(document.activeElement).toBe(dialog);
    expect(dialog?.textContent).toContain("Tap the Share button.");
    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    });
    expect(document.querySelector("[data-testid=add-to-home-dialog]")).toBeNull();
    expect(document.activeElement).toBe(open);
  });

  it("says the app is already installed", () => {
    setDevice(ANDROID_CHROME, { navigatorStandalone: true });
    const view = mount(createElement(AddToHomeSettings));
    expect(view.textContent).toContain("Noble Bereans is already on your home screen.");
    const open = view.querySelector("[data-testid=add-to-home-open]");
    if (!(open instanceof HTMLButtonElement)) throw new Error("missing settings entry");
    act(() => {
      open.click();
    });
    expect(document.querySelector("[data-testid=add-to-home-dialog]")?.textContent).toContain(
      "Noble Bereans is already on your home screen.",
    );
  });

  it("uses a gentle note on desktop", () => {
    setDevice(DESKTOP);
    const view = mount(createElement(AddToHomeSettings));
    const open = view.querySelector("[data-testid=add-to-home-open]");
    if (!(open instanceof HTMLButtonElement)) throw new Error("missing settings entry");
    act(() => {
      open.click();
    });
    expect(document.body.textContent).toContain("Visit this page on your phone");
    expect(document.body.textContent).toContain("install option");
  });
});
