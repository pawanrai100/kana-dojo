# Speaking foundations — review release

This release adds a small, complete path from kana reading to guided conversations. It is a first release, not the entire long-term language curriculum.

## Included

- Six open beginner missions: introductions, asking for repetition, café orders, likes, shopping, and finding places.
- Each mission has three teaching cards, three listening/meaning checks, two guided conversation turns, and reflection.
- Normal/slow Japanese speech through the browser's available Japanese voice. If no voice is installed, a clear message and assisted written practice remain available.
- Optional microphone recording and playback. Audio stays in tab memory, is never uploaded or transcribed, stops after 30 seconds or when the tab is hidden, and releases microphone tracks on exit.
- Typed model matching plus explicitly self-assessed speaking. No automated pronunciation score, open-ended AI tutor, or claim of certified proficiency.
- Lesson reviews at 1, 3, 7, 14 and 30 days after successful due reviews. Help brings review back to one day; early repetition does not inflate the interval.
- Lesson progress is browser-local and separated by guest/account. Existing Supabase tables and kana storage schema are unchanged. Profile data export includes lesson progress; Reset all progress includes local lessons.
- Speech controls, memory tips, and confusing-pair explanations in character details; speech in round answer cards.
- A five-vowel, untimed starting preset for new learners and a visible speaking entry on the dashboard.
- Five primary navigation items on mobile; existing chart, stats, leaderboard and settings remain accessible through More.
- Early-finish results report accuracy over attempted questions, neutralize unreached cards, and use a mode-neutral next-round label.
- Changing practice settings after answering asks before restarting an unfinished round.

## Verification

Run `npm ci`, `npm test`, `npm run lint`, `npm run build`, and `npm run typecheck`.

The original baseline had 135 passing tests. The expanded suite adds tests for all six lesson journeys, wrong answers, assisted learning, persistence/account isolation, scheduling/data corruption, recording lifecycle, speech fallbacks, partial-round scoring, and 192 combinations of script/mode/timer/round length.

Browser checks cover desktop and 390px-wide layouts, navigation, character details, a complete lesson and persistence after reload. See the accompanying test report for final results and remaining verification limits.

## Rollback

Baseline commit: `b33f1b0c1a7f6f5ee6748b912317747b9d47c151`.

Local backup tag: `rollback/pre-speaking-2026-11-03`. A Git bundle of the baseline is supplied separately.

Before merging, the draft branch can simply be left unmerged. After deployment, use Vercel to promote the last known-good deployment. For a source rollback, revert the speaking-release commit(s) through a new pull request; avoid force-pushing or resetting a shared main branch.

There are no database migrations to reverse. Existing kana and account progress retains its format. Rolling back code leaves the new `kana-dojo:learning:v1:` entries unused, so learner data does not need to be deleted. Do not clear browser storage as a rollback step.

## Remaining release checks

Live Google/email login, password reset email delivery, database RLS execution, account imports, cloud conflict handling on two real devices, microphone hardware quality, installed Japanese voice quality, and physical iOS/Android keyboards require their configured services or devices. Unit tests and simulated media lifecycle tests do not replace these checks. Have a Japanese teacher review the speaking curriculum before treating it as professionally validated instruction.

Later work: human-recorded lesson audio, cloud-synced lesson progress, broader vocabulary/grammar lessons, varied scenario generation, and carefully evaluated voice feedback.
