# Bible Trivia

A small, playable Bible trivia demo. It teaches from Scripture: a missed question stops the game, shows a verse and a short explanation, then asks that same question again. Progress stays in this browser. There are no accounts and no external services.

The sample questions are placeholders (`review.status` is `draft`). The verses are short quotations from the New King James Version.

## Run it

```bash
npm install
npx playwright install chromium
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). On a phone, tablet, or desktop the layout stays one column with large tap targets.

To check the production build, lint, and tests:

```bash
npm run build
npm run lint
npm test
npm run test:e2e
```

`npm run build` validates every content file before Next.js builds. A bad file fails the build. `npm test` runs the same check plus the game-logic tests. Playwright covers the wrong-answer, teach, and re-ask flow at a phone size and a desktop size.

You can add the site to your home screen. After a production build, pages you have already opened keep working offline.

## How a round works

1. Choose an age group (child, teen, adult, or older) and a guide: Judah the Lion, Agnes the Lamb, Shalom the Dove, Zion the Eagle, or Hunter the Great Fish.
2. Take a placement quiz of 10 questions. Only the first try counts. The score picks a starting cycle and tier. The results screen always says: everyone starts in a different place.
3. From home, follow your private Knowledge Path: Seed, Sprout, Rooted, Growing, Established, Fruitful, Deep Roots. You also see the current cycle, section, and first-try streak.
4. Play. A wrong answer brings your guide’s words, one to three verses, and a guiding explanation for your age group (adult if that wording is missing). The explanation points you toward the verse. It does not state the correct choice, and the choices are not highlighted. Press **I’m ready** and the same question returns with the choices in a new order. After two misses, a longer explanation appears, still without giving the choice away. A correct answer after a retry shows the one-sentence takeaway, which may state the answer. The next question waits until this one is correct.
5. Leaderboards are not in this demo. That screen says they are coming.
6. The Bible tab is a placeholder. It does not show Bible text. Reading, highlights, and notes are still to come.

The main navigation (Home, Play, Bible, Leaderboards, Settings) stays on the page on a phone, a tablet, and a desktop.

Sound plays `public/audio/<mascot>/<line-id>.mp3` when that file is in the project, and when a line names `audio_file`. A missing recording stays silent. The words are always on screen. Turn sound off from the header or from Settings. There are no mascot animations. Hunter never says outright that he swallowed Jonah.

Season totals are stored apart from the Knowledge Path and are not shown as a rank.

## Add content

Questions live in `content/questions/<cycle>-<book>-<batch>.json`. Mascot lines live in `content/mascots/<mascot>-<batch>.json`. One JSON file per batch, UTF-8, format version 1. IDs are stable and never reused.

A question needs an adult prompt, four choices (or two for true/false), an answer id, one to three verses, an adult explanation, and a takeaway. Each verse needs `translation: "NKJV"` and a short, accurate quotation. The verse may contain the answer, because the player should find it in Scripture. Explanations must guide, not reveal: `explanation` (every age variant) and `extended_explanation` must not state the correct choice or contain that choice's text. Do not write "the correct answer is" or highlight a choice. The `takeaway`, shown only after a correct retry, may state it. Child, teen, and older wording is optional and must not change the biblical fact. Mark unfinished work with `review.status` of `draft`.

Mascot moments are: welcome, mascot_selected, placement_intro, placement_result, wrong_intro, retry_prompt, correct, correct_after_retry, streak, section_complete, cycle_complete, level_up, leaderboard_reassurance, daily_return, encouragement_general. Give each moment at least two lines, including one with audience `all`. The app picks a line for the player’s age and falls back to `all`. Set `audio_file` to something like `audio/judah/judah-wrong-001.mp3` when a recording exists, or leave it `null` and drop the mp3 at `public/audio/<mascot>/<line-id>.mp3`.

Check a batch before you rely on it:

```bash
npm run validate-content
```

The validator uses Zod. It also runs inside `npm test` and `npm run build`.

## Bible tab

`BibleProvider` in `src/lib/bible/types.ts` is the scripture source: `listBooks`, `getChapter(bookId, chapter)`, and `getPassage(ref)`. `getBibleProvider()` in `src/lib/bible/index.ts` is the only place that picks an implementation. Today it returns a local placeholder with the book list and reference parsing, and with no verse text and no network call. A later API.Bible NKJV provider can replace that return value without changing the screen.

Highlights and notes, when they are saved, use `createVerseMarkStore` in `src/lib/bible/marks.ts`. Each mark stores a book id, chapter, verse range, optional color, the player's note, and timestamps. It does not store verse wording. The key is `bible-trivia-marks-v1` in localStorage, separate from game progress.
