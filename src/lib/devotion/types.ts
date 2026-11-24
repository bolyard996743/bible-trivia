export type DailyDevotionView = {
  id: string;
  /** America/Chicago calendar date, YYYY-MM-DD. The same for every player that day. */
  date: string;
  /** Visible reference, such as "Joshua 1:8 NKJV". */
  label: string;
  imageSrc: string;
  imageAlt: string;
  bibleHref: string;
  /** NKJV wording from API.Bible. Null when that fetch did not succeed. */
  text: string | null;
  copyright: string | null;
  fumsToken: string | null;
};
