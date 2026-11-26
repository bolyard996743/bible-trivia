// @vitest-environment happy-dom
import { createElement, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NKJV_COPYRIGHT } from "@/lib/bible/notice";
import {
  CONTACT_EMAIL,
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
    expect(LEGAL_EFFECTIVE).toBe("November 26, 2026");
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
    expect(privacy).toContain("sign in, open Settings, scroll to the bottom, and tap Delete account");
    expect(privacy).toContain("tap Yes to confirm");
    expect(privacy).toContain("deleted permanently");
    expect(privacy).toContain("clearing this site's data in the browser");
    expect(privacy).toContain("which days you played");
    expect(privacy).toContain("daily streak");
    expect(privacy).toContain("The weekly board does not use it");
    expect(privacy).toContain("points earned this week");
    expect(privacy).toContain("a place in the list");
    expect(privacy).toContain("Guests and children keep the days they played on this device only");
    expect(privacy).toContain("The daily question record keeps the day");
    expect(privacy).toContain("stays on this device, even when you are signed in");
    expect(privacy).toContain("A share picture is drawn on this device");
    expect(privacy).toContain("We do not post it");
    expect(privacy).toContain("My Verses lives on this device only");
    expect(privacy).toContain("verse references shown after a miss");
    expect(privacy).toContain("does not keep the question, the answer, or the verse text");
    expect(privacy).toContain("vibration");
    expect(privacy).toContain("not part of your score");
    expect(privacy).toContain("Add to Home Screen does not keep pages or progress for use offline");
    expect(privacy).toContain("Nothing about that look is stored or sent");
    expect(privacy).toContain("There is no advertising. We do not sell your information. Optional gifts are on the Donate page.");
    expect(privacy).toContain("Bolyard Garage");
    expect(privacy).toContain("aren't tax-deductible right now");
    expect(privacy).toContain("Payment is handled by Stripe, on Stripe's own site. We never see or store card numbers.");
    expect(privacy).toContain("The game stays free.");
    expect(privacy).toContain(CONTACT_EMAIL);
    expect(privacy).not.toContain("There is no shop");
    expect(privacy).not.toContain("TODO");
    expect(privacy).not.toContain("does not yet have a button");
    expect(privacy).not.toContain("we sell");
  });

  it("keeps the terms to what the game does", () => {
    const terms = `${TERMS_INTRO} ${joined(TERMS_SECTIONS)}`;
    expect(terms).toContain("November 26, 2026");
    expect(terms).toContain("under 13");
    expect(terms).toContain("API.Bible");
    expect(terms).toContain(NKJV_COPYRIGHT);
    expect(terms).toContain("Privacy");
    expect(terms).toContain("you can delete your account in Settings");
    expect(terms).toContain("There is no advertising. We do not sell your information. Optional gifts are on the Donate page.");
    expect(terms).toContain("Bolyard Garage");
    expect(terms).toContain("Payment is handled by Stripe, on Stripe's own site. We never see or store card numbers.");
    expect(terms).toContain("The game stays free.");
    expect(terms).toContain(CONTACT_EMAIL);
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
    expect(privacy.textContent).toContain("Effective November 26, 2026");
    expect(privacy.textContent).toContain(CONTACT_EMAIL);
    expect(privacy.querySelector('a[href="/terms"]')).not.toBeNull();
    act(() => root?.unmount());

    const footer = render(createElement(SiteFooter));
    expect(footer.querySelector("[data-testid=site-footer]")).not.toBeNull();
    for (const link of FOOTER_LINKS) {
      expect(footer.querySelector(`a[href="${link.href}"]`)?.textContent).toBe(link.label);
    }
  });
});
