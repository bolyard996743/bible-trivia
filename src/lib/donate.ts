import {
  FAITHFUL_SEARCHER_DONATE_URL,
  GIVE_AS_LED_DONATE_URL,
  LAMP_LIGHTER_DONATE_URL,
  NOBLE_BEREAN_DONATE_URL,
  PILLAR_SUPPORTER_DONATE_URL,
  isLiveDonateUrl,
} from "@/lib/donate-links";

export const DONATE_DISCLOSURE =
  "Noble Bereans is run by Bolyard Garage. We're working toward nonprofit status but aren't approved yet, so gifts aren't tax-deductible right now. Every gift helps keep the game free and growing. Thank you!";

export type DonateVerseCopy = {
  /** Reference passed to the scripture loader, such as "Psalm 119:105". */
  reference: string;
  /** Player-facing reference, including the translation. */
  label: string;
  /** NKJV wording used when the scripture loader has no text. */
  fallbackText: string;
};

export type DonateTier = {
  id: string;
  amountLabel: string;
  name: string;
  description: string;
  href: string | null;
  verse: DonateVerseCopy | null;
};

export type ShownVerse = {
  text: string;
  copyright: string;
  fumsToken: string | null;
};

export const DONATE_TIERS: readonly DonateTier[] = [
  {
    id: "lamp-lighter",
    amountLabel: "$5",
    name: "Lamp Lighter",
    description: "Helps keep the lamp burning",
    href: LAMP_LIGHTER_DONATE_URL,
    verse: {
      reference: "Psalm 119:105",
      label: "Psalm 119:105 (NKJV)",
      fallbackText: "Your word is a lamp to my feet And a light to my path.",
    },
  },
  {
    id: "faithful-searcher",
    amountLabel: "$10",
    name: "Faithful Searcher",
    description: "Supports daily Bible study for players",
    href: FAITHFUL_SEARCHER_DONATE_URL,
    verse: null,
  },
  {
    id: "noble-berean",
    amountLabel: "$25",
    name: "Noble Berean",
    description: "Helps add new badges and questions",
    href: NOBLE_BEREAN_DONATE_URL,
    verse: null,
  },
  {
    id: "pillar-supporter",
    amountLabel: "$50",
    name: "Pillar Supporter",
    description: "Helps keep the game free for everyone",
    href: PILLAR_SUPPORTER_DONATE_URL,
    verse: null,
  },
  {
    id: "give-as-led",
    amountLabel: "Custom",
    name: "Give as You're Led",
    description: "Any amount is a blessing",
    href: GIVE_AS_LED_DONATE_URL,
    verse: {
      reference: "2 Corinthians 9:7",
      label: "2 Corinthians 9:7 (NKJV)",
      fallbackText:
        "So let each one give as he purposes in his heart, not grudgingly or of necessity; for God loves a cheerful giver.",
    },
  },
];

/** Cards with a real payment link. A null or empty href stays in the list and stays off the page. */
export function liveDonateTiers(tiers: readonly DonateTier[] = DONATE_TIERS): DonateTier[] {
  return tiers.filter((tier) => isLiveDonateUrl(tier.href));
}
