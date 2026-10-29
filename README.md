# Lamp & Path

A small, playable Lamp & Path demo, named from Psalm 119:105. It teaches from Scripture: a missed question stops the game, shows a verse and a short explanation, then asks that same question again. Progress stays in this browser until a player creates an account.

The sample questions are placeholders (`review.status` is `draft`). The verses are short quotations from the New King James Version.

## Run it

```bash
npm install
npx playwright install chromium
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) while developing. The deployed app is [https://lamp-and-path.vercel.app](https://lamp-and-path.vercel.app). Preview URLs look like `https://lamp-and-path-git-*.vercel.app`. Source is [bolyard996743/lamp-and-path](https://github.com/bolyard996743/lamp-and-path); GitHub redirects the previous repository name. On a phone, tablet, or desktop the layout stays one column with large tap targets.

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

1. Enter a birthday. The app stores that date on this device and derives the audience (child, teen, adult, or older) from it, then you choose a guide: Judah the Lion, Agnes the Lamb, Shalom the Dove, Zion the Eagle, or Hunter the Great Fish.
2. Take the placement quiz (13 questions, foundation through expert). Only the first try counts. The score is a ratio, so the same bands work for this longer quiz. It picks a starting cycle and tier. The results screen always says: everyone starts in a different place. The chosen guide's lines for that question are shown as text. Recordings are not included yet.
3. From home, follow your private Knowledge Path: Seed, Sprout, Rooted, Growing, Established, Fruitful, Deep Roots. You also see the current cycle, section, and first-try streak.
4. Play. A wrong answer brings your guide’s words, one to three verses, and a guiding explanation for your age group (adult if that wording is missing). The explanation points you toward the verse. It does not state the correct choice, and the choices are not highlighted. Press **I’m ready** and the same question returns with the choices in a new order. After two misses, a longer explanation appears, still without giving the choice away. A correct answer after a retry shows the one-sentence takeaway, which may state the answer. The next question waits until this one is correct.
5. Leaderboards score mastered questions. Signed out, the board is read-only and your points stay on this device. With an account, your username is listed.
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

## Accounts

Copy `.env.example` to `.env.local` and set `NEXT_PUBLIC_SUPABASE_ANON_KEY` from the Supabase dashboard (Project Settings → API → anon public key). `NEXT_PUBLIC_SUPABASE_URL` is already filled in for this project. Leave both unset and the app stays in guest mode: progress remains in this browser, and nothing tries to reach Supabase.

```bash
# later, when you are ready to create the tables. This repo does not apply them for you.
supabase link --project-ref wmopoyxwghddtkbmrfyy
supabase db push
```

Sign-up confirmation and password reset send the player to `/auth/callback` on the origin they are using (`window.location.origin`). A build without a browser uses `https://$VERCEL_URL`, and otherwise [https://lamp-and-path.vercel.app](https://lamp-and-path.vercel.app). In the Supabase Auth settings, allow `http://localhost:3000/auth/callback` and `https://lamp-and-path.vercel.app/auth/callback`, plus any preview host you use. That dashboard change is not made from this repo.

The first screen asks for a birthday with a month, day, and year, and it does not suggest an age. The birth date is stored on this device only. A date under 13 keeps the child audience, has no account, and sends nothing to the server. That first answer stays if they leave and come back. When the stored date computes to 13 or older, the app asks once about creating an account, with Not now remembered. Age 13 and older can create an account or play on this device. Playing without an account shows a warning first: progress stays on this device and cannot be moved unless they create an account later. Settings shows Create account only while signed out. Sign-up or sign-in asks before moving this device's questions, placement, and mentor into the account. Sign-up saves `birth_date` on their own profile row. The audience is derived from that date when the row is read and whenever it is saved, so it moves as they age. The database rejects a birth date under 13. A signed-in player who has no birth date is asked once. Password reset is an email link. Google is not connected.

A username is 3–20 letters, numbers, or underscores. It is unique ignoring case, checked for profanity and for email, phone, or web-address shapes, and it cannot be changed after it is saved. The database trigger rejects a username update. The username is the leaderboard name.

Leaderboard points are the sum of mastered questions by tier: foundation 1, intermediate 2, advanced 3, expert 4. Signed-in players see the top 15 and a window of 10 above, themselves, and 4 below. Those reads return username, points, and rank only. Signed-out players of any age are not listed and submit nothing. They see the same read-only window around their on-device point total, with `You: N points (just on this device)` underneath. That request sends only the point number.

On sign-in, if this device already has progress, the account page asks before uploading. The merge keeps every mastered question, the higher miss count, the further cycle and tier, and both sets of notes.

The browser uses the anon key only. There is no service-role key in this app. Row-level security is on `profiles`, `question_progress`, and `verse_marks`. Each policy allows a row only when `(select auth.uid())` is that row's `user_id`. `verse_marks` stores a book id, chapter, verse range, color, note, and timestamps. It does not store verse wording. The Knowledge Path is not a separate table: it is derived from the saved cycle and tier.

`getPlayerRepository()` is what the screens save through. It is the local repository until a signed-in teen, adult, or older player is syncing; then it writes the device copy first and the account second.

`npm test` reads the migration and checks that row-level security is enabled and that every policy uses `auth.uid()`. `supabase/tests/rls.test.sql` is the same check in pgTAP. Run it with `supabase test db` once the Supabase CLI and a local database are available. They are not required to play or to run the app tests.

## Bible tab

`BibleProvider` in `src/lib/bible/types.ts` is the scripture source: `listBooks`, `getChapter(bookId, chapter)`, and `getPassage(ref)`. `getBibleProvider()` in `src/lib/bible/index.ts` is the only place that picks an implementation. Today it returns a local placeholder with the book list and reference parsing, and with no verse text and no network call. A later API.Bible NKJV provider can replace that return value without changing the screen.

Highlights and notes, when they are saved, use `createVerseMarkStore` in `src/lib/bible/marks.ts`. Each mark stores a book id, chapter, verse range, optional color, the player's note, and timestamps. It does not store verse wording. The key is `bible-trivia-marks-v1` in localStorage, separate from game progress.
