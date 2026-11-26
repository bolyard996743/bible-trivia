export const LEGAL_EFFECTIVE = "November 26, 2026";

/**
 * TODO: Replace this placeholder with the real contact address before these pages are treated as final.
 */
export const CONTACT_EMAIL = "CONTACT_EMAIL_PLACEHOLDER@example.com";

export type LegalSection = {
  heading: string;
  paragraphs: string[];
};

export const PRIVACY_INTRO =
  "Noble Bereans is a Bible learning game. This page says what the app keeps, why it keeps it, and where it lives. It is written in ordinary language.";

export const PRIVACY_SECTIONS: LegalSection[] = [
  {
    heading: "An account",
    paragraphs: [
      "If you create an account, we keep your email address so you can sign in, and so we can send a confirmation message or a password reset.",
      "Your password is stored by Supabase Auth so you can sign in. The app never shows it back to you.",
      "You choose a username. That name is the display name on the leaderboard and next to devotion comments. It cannot be changed later. Your email is not shown there.",
      "We ask for your birth date: the month, the day, and the year. We use it to tell whether an account is allowed, and to choose teaching words for your age. For comments, we also keep a birth month and year. That month and year are not shown on the leaderboard or next to comments.",
      "We also keep the guide you pick and whether sound is on.",
    ],
  },
  {
    heading: "Game progress",
    paragraphs: [
      "For an account, we keep where you are on the path, which questions you have mastered, how many times you missed a question, your streak of right answers, and your points.",
      "If you are signed in, the account also keeps which days you played. That list is there for your daily streak. The weekly board does not use it. The weekly board adds up points earned this week.",
      "The all-time board and the weekly board show a username, points, and a place in the list. They do not show an email, a birth date, or an age.",
      "Guests and children keep the days they played on this device only. They are not listed on the boards, and their points stay on this device.",
    ],
  },
  {
    heading: "The daily question",
    paragraphs: [
      "The daily streak and the daily question are kept with your progress on this device.",
      "The daily question record keeps the day, which question it was, whether the answer was right, and the verse references. It does not keep the wording of the question, the answer, or the verse text. That record stays on this device, even when you are signed in.",
      "A share picture is drawn on this device when you choose Share. We do not post it. The app you pick receives the picture and a short line about the badge. If that app cannot take it, the picture can be saved on this device instead.",
    ],
  },
  {
    heading: "My Verses",
    paragraphs: [
      "My Verses lives on this device only. It keeps the verse references shown after a miss. It does not keep the question, the answer, or the verse text.",
      "Opening one asks API.Bible for the wording, in the way the Scripture section describes.",
      "Clearing this site's data in the browser removes the list.",
    ],
  },
  {
    heading: "On this device",
    paragraphs: [
      "You can turn vibration on or off. That choice stays on this device. It is not part of your score, and it is not saved on an account.",
      "A glow can grow when answers in a row are right, and a ring can fill as you answer questions during the week. Those counts stay on this device. They are only for the display. They are not part of your score, and they do not change the boards.",
      "Sound on or off is kept with the guide you pick. On an account, that setting is saved with the account. It is not part of your score.",
    ],
  },
  {
    heading: "Add to Home Screen",
    paragraphs: [
      "Add to Home Screen does not keep pages or progress for use offline.",
      "If you dismiss the banner, that choice stays on this device.",
      "To show the right steps, the site looks at the browser only. Nothing about that look is stored or sent.",
    ],
  },
  {
    heading: "Devotion likes and comments",
    paragraphs: [
      "A like stores which day's devotion you liked. It does not store the verse.",
      "A comment stores the words you write and which devotion they belong to. It does not store the verse. Other people can read a comment that is still visible, along with your username.",
      "If you report a comment, we store that you reported it. One report hides that comment.",
    ],
  },
  {
    heading: "Bible highlights and notes",
    paragraphs: [
      "A highlight or note stores the book, the chapter, the verse numbers, a color, and your own words. It does not store a copy of the verse.",
    ],
  },
  {
    heading: "Where it is stored",
    paragraphs: [
      "Account information is stored with Supabase, in their hosted database and their sign-in service. The website itself is hosted on Vercel.",
      "Without an account, progress, the birth date, the guide, the sound setting, highlights, and notes stay in this browser. They are not uploaded unless you later create an account and choose to move the progress on this device.",
    ],
  },
  {
    heading: "Scripture",
    paragraphs: [
      "Verse wording is requested from API.Bible. Scripture quotations marked NKJV are taken from the New King James Version®. Copyright © 1982 by Thomas Nelson. Used by permission. All rights reserved.",
      "When a passage is shown, the app reports that display to API.Bible. If you are signed in, that report can include your account id. It does not include your email, your notes, or the words of a comment.",
      "A short-lived copy of a chapter may be kept on our server so the same chapter is not requested again and again. Highlights and notes still store the reference and your words, not the verse.",
    ],
  },
  {
    heading: "Children under 13",
    paragraphs: [
      "Children under 13 cannot create an account. Their progress stays on this device. We do not make a profile for them in Supabase.",
    ],
  },
  {
    heading: "Asking for deletion",
    paragraphs: [
      "To delete an account, sign in, open Settings, scroll to the bottom, and tap Delete account. Then tap Yes to confirm. The account and its data are deleted permanently.",
      "Progress that lives only on this device can be removed by clearing this site's data in the browser.",
    ],
  },
  {
    heading: "What this app does not do",
    paragraphs: [
      "There is no advertising. We do not sell your information. Optional gifts are on the Donate page.",
      "Noble Bereans is run by Bolyard Garage. We're working toward nonprofit status but aren't approved yet, so gifts aren't tax-deductible right now.",
      "Payment is handled by Stripe, on Stripe's own site. We never see or store card numbers.",
      "A gift is optional. It does not change your points, your progress, or what you can play. The game stays free.",
    ],
  },
  {
    heading: "Contact",
    paragraphs: [`You can write to us at ${CONTACT_EMAIL}.`],
  },
];

export const TERMS_INTRO =
  `These terms are a plain description of how Noble Bereans is meant to be used. The effective date is ${LEGAL_EFFECTIVE}.`;

export const TERMS_SECTIONS: LegalSection[] = [
  {
    heading: "A place to learn",
    paragraphs: [
      "Noble Bereans is a free game for learning the Bible. You can play on this device, or, if you are 13 or older, you can create an account so your progress can move with you.",
    ],
  },
  {
    heading: "Accounts",
    paragraphs: [
      "An account needs an email, a password, a username, and a birth date. Children under 13 cannot create an account. Guest progress stays on the device.",
      "Your username is shown on the leaderboard and next to comments. Choose one you are glad for other players to see. It cannot be changed later.",
      "If you are signed in, you can delete your account in Settings.",
    ],
  },
  {
    heading: "Kindness in comments",
    paragraphs: [
      "Comments are for encouragement about the day's devotion. Be kind. A reported comment is hidden. Commenting can be closed on an account that is unkind.",
      "Do not put your email address, phone number, or another person's private information in a comment.",
    ],
  },
  {
    heading: "Scripture",
    paragraphs: [
      "The verse text is the New King James Version, brought in through API.Bible. Scripture quotations marked NKJV are taken from the New King James Version®. Copyright © 1982 by Thomas Nelson. Used by permission. All rights reserved.",
      "The app shows a verse so you can find the answer yourself. A miss does not reveal the choice.",
    ],
  },
  {
    heading: "Your information",
    paragraphs: [
      "The Privacy page says what is collected, why, and that it is stored with Supabase. Please read it before you create an account.",
    ],
  },
  {
    heading: "Gifts",
    paragraphs: [
      "There is no advertising. We do not sell your information. Optional gifts are on the Donate page.",
      "Noble Bereans is run by Bolyard Garage. We're working toward nonprofit status but aren't approved yet, so gifts aren't tax-deductible right now.",
      "Payment is handled by Stripe, on Stripe's own site. We never see or store card numbers.",
      "A gift is optional. It does not change your points, your progress, or what you can play. The game stays free.",
    ],
  },
  {
    heading: "Changes",
    paragraphs: [
      "These pages can be updated. The date at the top of each page is the effective date.",
    ],
  },
  {
    heading: "Contact",
    paragraphs: [`You can write to us at ${CONTACT_EMAIL}.`],
  },
];

export const FOOTER_LINKS = [
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
] as const;
