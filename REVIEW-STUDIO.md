# Study studio preview — November 4, 2026

Production is unchanged. Review the draft branch `feat/speaking-foundations` in PR #2 before merging anything.

## Tour

Open `/study`. Its ten activity links work as bookmarks (for example `/study#grammar`).

| Area | Working experience |
| --- | --- |
| My plan | Choose 5, 10 or 20 minutes; see due items, study review activity, conversation completion and saved-word counts; follow a three-step plan. |
| Vocabulary | 48 words across six topics, kana readings, Japanese example sentences and translations, search, bookmarks, forward/reverse recall and due-word review. |
| Grammar | Eight explained patterns with sentence-building exercises, wrong-answer feedback and assisted completion. |
| First kanji | 12 recognition cards, example-word readings, speech and self-rated recall. This is not handwriting instruction. |
| Sounds | Four contrasts teaching long vowels, small っ, small ょ and ー; listening questions, fallback text and optional self-recording. |
| Shadowing | All 36 mission phrases, normal/slow playback, hideable script, optional romaji, recording/playback and self-assessment. |
| Roleplay | 12 short scripted conversations with typed sample checking, model help and spoken self-checks. |
| AI tutor | Complete UI and server integration, OFF until explicitly configured. No simulated AI replies. |
| Notebook | Notes, saved vocabulary, portable JSON export/import with explicit merge review, optional manual cloud merge. |
| Feature status | An honest inventory of working features, dependencies and unfinished specialist work. |

`/learn` now has 12 guided missions (36 phrase cards, 24 exchanges), adding routines, plans, train tickets, restaurants, weather and conversation repair to the original six. Existing kana/Tower/profile/account pages remain available. Dashboard module links now open the new activities.

## Data and service behavior

Study data uses a separate per-user/guest `kana-dojo:study:v1:` storage namespace. Existing kana formats are unchanged. Imports validate the envelope, bound data size, reject unknown IDs and merge newer reviews rather than deleting unrelated progress. Review spacing is 1, 3, 7, 14 and 30 days; early successes do not inflate intervals. Notes/preferences follow the more recently updated copy; saved words are combined. Export before merging if both note versions are needed.

Profile export includes study data. Settings reset includes local studio data and explains that a separate cloud backup remains. Study file export is available to guests. Portable study backups do not contain microphone recordings or AI chats.

Cloud integration is optional. Apply `supabase/study-preview.sql` ONLY to a separate preview database, configure its public URL/key for the preview deployment, and set `NEXT_PUBLIC_STUDY_CLOUD_ENABLED=true`. The SQL creates an isolated table with own-user RLS. Manual cloud merge uses a revision comparison; conflicts preserve the local copy and ask for retry. The migration has NOT been applied or live-RLS-tested. No production database was changed. This is manual merge, not automatic background sync.

For an optional AI preview, configure server-only `TUTOR_ENABLED=true`, `OPENAI_API_KEY`, an accessible `OPENAI_TUTOR_MODEL`, and a comma-separated `TUTOR_PREVIEW_USER_IDS` allowlist (up to 20 accounts). Do not put secrets in NEXT_PUBLIC variables. Requests require a verified Supabase user, same-origin JSON, bounded alternating dialogue and an approved account. The endpoint has a 25-second provider timeout, ten requests per minute per user/process and bounded output. Set provider project spending limits; replace the per-process guard with a durable shared quota before public availability. No paid provider requests were made during development.

Tutor messages go to OpenAI only after explicit UI consent and Send; recordings never do. Responses API requests use `store:false`, which does not eliminate all provider retention. See the privacy page. Technical reference: https://developers.openai.com/api/docs/guides/text .

## What this does not claim

Human-recorded audio, validated pronunciation/pitch scoring, live voice AI, teacher-reviewed content, handwriting stroke assessment and a full intermediate course are not implemented. The preview labels these accurately. Browser speech is synthesized and requires an available Japanese voice. Matching typed sample answers is not a general Japanese grammar grader. Speaking is self-assessed.

## Verification

409 automated tests pass across 28 files. This includes the original application tests, all 12 full lesson journeys, all 12 roleplays, every grammar pattern, kanji progression, sound fallbacks, review scheduling, corrupted imports, portable merge, mocked cloud conflict/error handling, recorder lifecycle, and tutor authentication/input/timeout/rate-limit checks. Vitest now explicitly includes both `.test.ts` and `.test.tsx`.

Typecheck passes. Lint has no errors and only two pre-existing warnings in Tower/stats. Browser review verifies grammar submission, vocabulary recall completion, notebook persistence, mobile no-horizontal-overflow, navigation and service-unavailable states. Final CI/deployment results are recorded in the accompanying delivery report.

Real provider responses, live database RLS, two-device cloud merge, email/Google login, physical microphone/voice quality, iOS/Android keyboards and assistive-technology behavior still need their configured services/devices. Automated mocks are not claims of end-to-end service verification. Japanese content needs teacher review.

## Rollback

Keep PR #2 unmerged to leave production unchanged. The initial speaking-only release is commit `efaa4cd888ff967b2e4cb48e85dedcd94af4121b`. The original production baseline is `b33f1b0c1a7f6f5ee6748b912317747b9d47c151`, preserved in `backup/pre-speaking-2026-11-03` and the supplied Git bundle. Revert preview commits through a new commit; do not reset or force-push shared main. If ever deployed, promote a known-good Vercel deployment first. Optional new local-storage keys can remain unused on rollback. No production migrations require reversal.
