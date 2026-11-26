// @vitest-environment happy-dom
import { createElement, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BOLYARD_GARAGE_LABEL, BOLYARD_GARAGE_URL, SiteFooter } from "@/components/SiteFooter";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children?: ReactNode }) =>
    createElement("a", { ...props, href }, children),
}));

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

afterEach(() => {
  act(() => root?.unmount());
  root = null;
  document.body.innerHTML = "";
});

describe("Bolyard Garage tab", () => {
  it("sits beside Donate and opens the external page in a new tab", () => {
    const footer = render(createElement(SiteFooter));
    const donate = footer.querySelector("[data-testid=footer-donate]");
    const link = footer.querySelector("[data-testid=footer-bolyard-garage]");

    expect(donate?.getAttribute("href")).toBe("/donate");
    expect(donate?.textContent).toBe("Donate");
    expect(donate?.getAttribute("target")).toBeNull();
    expect(donate?.nextElementSibling).toBe(link);

    expect(link?.tagName).toBe("A");
    expect(link?.getAttribute("href")).toBe(BOLYARD_GARAGE_URL);
    expect(link?.getAttribute("href")).toBe("https://www.soundon.global/bio/bolyardgarage");
    expect(link?.getAttribute("target")).toBe("_blank");
    expect(link?.getAttribute("rel")).toBe("noopener noreferrer");
    expect(link?.getAttribute("aria-label")).toBe("Bolyard Garage (opens in a new tab)");
    expect(link?.textContent).toContain(BOLYARD_GARAGE_LABEL);
    expect(link?.textContent).toContain("Music");
    expect(link?.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
    expect(link?.className).toContain("tap");
    expect(link?.className).toContain("min-w-11");
  });
});
