# Kana Dojo

An endless, timed hiragana reading game. Read real Japanese words and random kana combos, type the romaji, beat the clock. Built to grow into a full Japanese learning platform.

Next.js 16 (App Router) + TypeScript + Tailwind CSS v4 + shadcn-style components + Lucide icons. No database, API key or account needed. Progress lives in `localStorage`.

## Run it locally

Needs Node 20.9+ (22 recommended).

```bash
npm install
npm run dev        # http://localhost:3000
```

Other scripts:

```bash
npm test           # vitest unit tests (quiz generation, grading, filtering, progress)
npm run typecheck  # tsc --noEmit
npm run lint       # eslint
npm run build      # production build
npm start          # serve the production build
```

## Deploy free on Vercel

1. Push the project to a GitHub repo (`git init`, commit, push).
2. Go to vercel.com, sign in with GitHub, click **Add New → Project**, pick the repo.
3. Leave every setting on its default (Vercel detects Next.js) and click **Deploy**.
4. Every push to `main` redeploys automatically. No environment variables needed.

CLI alternative: `npm i -g vercel && vercel` from the project folder.

## Accounts and cloud sync

Optional. With no Supabase keys the site runs guest-only, exactly as before. Setup steps: **[SETUP-ACCOUNTS.md](SETUP-ACCOUNTS.md)**.

- Login, signup, Google sign in, email verification, password reset: `/login`, `/signup`, `/forgot-password`, `/reset-password`, plus `/auth/callback` and `/auth/confirm` for email and Google links.
- `/profile`: avatar, username, stats, password change, sign out (this device or everywhere), data download.
- Guest progress stays under the original `localStorage` keys. After signing in, users are asked once whether to add it to their account (a backup is kept).
- Each signed in user gets their own local copy (`kana-dojo:v1:u:<id>:...`) that syncs to one `user_progress` row. Saves happen locally first, then upload about 1.5 s later. It works offline and catches up when back online.
- Two devices editing at once can't overwrite each other: every save carries a `rev` number, and a stale save is rejected, merged and retried (`src/lib/sync/`).
- Database rules live in `supabase/migrations/`. Row Level Security limits every user to their own rows. `supabase/tests/` has the SQL tests used to check it.

Where things live:

| Path | What |
| --- | --- |
| `src/lib/supabase/` | client setup, public key guard, safe redirects |
| `src/lib/sync/` | merge rules, sync engine, Supabase storage adapter (all unit tested) |
| `src/features/auth/` | auth provider (session + sync), login/signup/password forms |
| `src/features/profile/` | profile page |
| `src/store/app-store.ts` | per-user local storage, guest import |

## How the game works

- **Rounds** of 5/10/15/20 questions, forever. After grading you always get **Next N Words →**, whatever you scored. **Skip Round** gives fresh questions any time.
- **Modes:** Mixed (about half real words, half random combos), Real words only, Random combos (2–7 kana, readings derived from the kana table).
- **Per-word timer.** Each question's time is computed in `src/lib/quiz/timer.ts` from its length, lookalike characters (ぬ/め, ね/れ/わ...), characters you're weak on, characters you've never seen, and whether it's a nonsense combo. The pace setting scales it (Relaxed ×1.6, Normal, Fast ×0.7), and Zen turns timers off. The clock pauses when the tab is hidden.
- **Timed flow:** one question is live at a time. Enter locks it in and moves on; running out of time locks whatever you typed. Answers stay hidden until the round is graded.
- **Scoring:** base points by difficulty, up to +50% speed bonus, combo multiplier up to ×2. XP and levels with rank titles. Stars per round, sakura petals for a perfect one.
- **Grading** accepts standard variants (shi/si, chi/ti, tsu/tu, fu/hu, wo/o for を, n/nn/n' for ん), ignores case, spaces and dashes, and is IME-safe. An edit-distance alignment works out *which* kana you misread, so a wrong word doesn't punish characters you read correctly.
- **Adaptive:** characters you miss get weighted up, unseen characters come first, and random combos draw from a shuffled "deck" of enabled characters so all 46 appear before repeats pile up. Real words cycle through the pool without repeats, then reshuffle while holding back the most recent ones.
- **Mastery** is derived, never stored: correct reads in 3+ separate rounds, 80%+ on the last 5 tries, and the latest read correct. One miss pulls it back.
- **Coverage** only counts characters that actually appeared in a question.

### Keyboard

| Key | Action |
| --- | --- |
| Enter | Lock in / next answer. Enter on the last one grades the round |
| Shift+Enter | Skip round (when shortcuts are on) |
| Enter or N | Next round after grading (when shortcuts are on) |

## Folder structure

```
src/
  app/                         routes only, thin wrappers
    layout.tsx                 fonts, no-flash theme script, app shell
    page.tsx                   dashboard
    practice/ chart/ progress/ settings/
    globals.css                design tokens (light + dark) and animations
  components/
    ui/                        shadcn-style primitives (button, card, dialog, switch, misc)
    layout/                    app shell (sidebar + mobile tab bar), theme sync, page header
  features/                    one folder per product area
    dashboard/
    hiragana/practice/         the game: practice-game, question-card, round-summary, petals
    hiragana/chart/            interactive chart + character detail dialog
    progress/                  stats page, svg charts, session list
    settings/
  lib/                         pure logic, no React, fully unit-tested
    kana/                      character data (types.ts, hiragana.ts)
    vocab/                     word lists (hiragana-words.ts)
    quiz/                      generate.ts, validate.ts, grade.ts, timer.ts, adaptive.ts, session.ts
    game/                      scoring.ts (points, combos, stars, xp)
    progress/                  types, update.ts (fold a round in), stats.ts (derived numbers), sanitize.ts
    settings/                  types, defaults, sanitize
    storage/                   local.ts, the Repository interface over localStorage
    modules.ts                 nav + "coming soon" module registry
    sound.ts                   webaudio sound effects
  store/app-store.ts           single external store (useSyncExternalStore), all actions
```

## Where to add things later

| Feature | Where |
| --- | --- |
| **Dakuten / handakuten / small kana** | Add a new `KanaSet` next to `HIRAGANA_BASIC_SET` in `lib/kana/hiragana.ts`. Small kana combos (きゃ) need `splitKana` to group digraphs. Words go in `lib/vocab/`. Then widen `resolveEnabled` in `lib/quiz/generate.ts`, which is the single gate that enforces the v1 basic-46 rule. |
| **Katakana** | `lib/kana/katakana.ts` with the same `KanaChar` shape (`script: "katakana"`), a vocab file, and a `features/katakana/` folder reusing the practice components. Flip it to live in `lib/modules.ts`. |
| **Kanji / JLPT vocab** | Extend `VocabWord` in `lib/vocab/types.ts` (it already has an optional `jlpt` field), add data files, and a new feature folder. |
| **Spaced repetition / flashcards** | Per-item stats already exist (`CharStat`, `WordStat` in `lib/progress/types.ts`). Add due dates there and a scheduler in `lib/quiz/`. Weighting lives in `lib/quiz/adaptive.ts`. |
| **Audio / listening** | Add `audioUrl` to `VocabWord`; play it from `question-card.tsx`. |
| **Accounts + cloud sync** | Implement the `Repository<T>` interface from `lib/storage/local.ts` against your API (Supabase, a Next.js route handler, etc.) and swap it in `store/app-store.ts`. Nothing else talks to storage. |
| **AI lessons** | A route handler under `app/api/` plus a feature folder. The quiz engine takes any `VocabWord[]` via `GenerateInput.vocab`. |
| **Timer tuning** | `lib/quiz/timer.ts` (`BASE_SEC`, `PER_KANA_SEC`, `PACE_MULT`). |
| **Scoring / levels** | `lib/game/scoring.ts` and `levelInfo` in `lib/progress/stats.ts`. |

Stored data is versioned under the `kana-dojo:v1:` prefix and every read goes through a sanitizer, so corrupted or old data falls back to safe defaults instead of crashing. Bump the prefix if you ever change the shape incompatibly.

## Tests

`src/**/*.test.ts` covers:

- the 46-character table and that every excluded kana (が, ぱ, ゃ, っ...) is rejected
- every vocab entry uses only basic kana, ids are unique, homographs merge
- answer checking, accepted variants, ん handling, and per-kana miss detection
- round generation for every mode and size, length ranges, character filtering, the too-few-words message, no repeats across rounds, pool reshuffling, 46/46 coverage, weak-character weighting, and difficulty-based timers
- progress totals, mastery needing multiple rounds and dropping on a miss, streaks, sessions, skipped rounds
- recovery from junk `localStorage` data
