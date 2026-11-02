import { NKJV_COPYRIGHT } from "@/lib/bible/notice";

/** Copyright and API.Bible attribution. Render this wherever NKJV text is shown. */
export function ScriptureNotice({ copyright }: { copyright: string }) {
  const includesNkjv = /thomas nelson/i.test(copyright) && /new king james/i.test(copyright);
  return (
    <footer data-testid="scripture-notice" className="mt-3 grid gap-1 text-base text-ink-soft">
      {copyright ? <p>{copyright}</p> : null}
      {includesNkjv ? null : <p>{NKJV_COPYRIGHT}</p>}
      <p>
        Scripture from{" "}
        <a href="https://api.bible" rel="noreferrer" className="underline">
          API.Bible
        </a>
        .
      </p>
    </footer>
  );
}
