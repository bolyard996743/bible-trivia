// @vitest-environment happy-dom
import { createElement, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NKJV_COPYRIGHT } from "@/lib/bible/notice";
import {
  FOOTER_LINKS,
  LEGAL_EFFECTIVE,
  PRIVACY_SECTIONS,
  TERMS_INTRO,
  TERMS_SECTIONS,
} from "@/lib/legal";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children?: ReactNode }) =>
    createElement("a", { ...props, href }, children),
}));

import { SiteFooter } from "@/components/SiteFooter";
import { LegalDocument } from "@/components/LegalDocument";

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

function joined(sections: { heading: string; paragraphs: string[] }[]): string {
  return sections.flatMap((section) => [section.heading, ...section.paragraphs]).join(" ");
}

describe("legal pages", () => {
  it("covers the data the app actually keeps", () => {
    const privacy = joined(PRIVACY_SECTIONS);
    expect(LEGAL_EFFECTIVE).toBe("November 2026");
    expect(privacy).toContain("email");
    expect(privacy).toContain("username");
    expect(privacy).toContain("display name");
    expect(privacy).toContain("birth date");
    expect(privacy).toContain("birth month and year");
    expect(privacy).toContain("mastered");
    expect(privacy).toContain("like");
    expect(privacy).toContain("comment");
    expect(privacy).toContain("Supabase");
    expect(privacy).toContain("API.Bible");
    expect(privacy).toContain(NKJV_COPYRIGHT);
    expect(privacy).toContain("under 13");
    expect(privacy).toContain("cannot create an account");
    expect(privacy).toContain("stays on this device");
    expect(privacy).toContain("TODO for the owner");
    expect(privacy).not.toContain("we sell");
  });

  it("keeps the terms to what the game does", () => {
    const terms = `${TERMS_INTRO} ${joined(TERMS_SECTIONS)}`;
    expect(terms).toContain("November 2026");
    expect(terms).toContain("under 13");
    expect(terms).toContain("API.Bible");
    expect(terms).toContain(NKJV_COPYRIGHT);
    expect(terms).toContain("Privacy");
    expect(terms).not.toMatch(/attorney|warranty|arbitration/i);
  });

  it("renders privacy and terms with a footer on every page", () => {
    const privacy = render(
      createElement(LegalDocument, {
        title: "Privacy",
        intro: "A short note.",
        sections: PRIVACY_SECTIONS,
        testId: "privacy-page",
      }),
    );
    expect(privacy.querySelector("[data-testid=privacy-page] h1")?.textContent).toBe("Privacy");
    expect(privacy.textContent).toContain("Effective November 2026");
    expect(privacy.querySelector('a[href="/terms"]')).not.toBeNull();
    act(() => root?.unmount());

    const footer = render(createElement(SiteFooter));
    expect(footer.querySelector("[data-testid=site-footer]")).not.toBeNull();
    for (const link of FOOTER_LINKS) {
      expect(footer.querySelector(`a[href="${link.href}"]`)?.textContent).toBe(link.label);
    }
  });
});
