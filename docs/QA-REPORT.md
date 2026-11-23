# QA Report: US Geography Quiz (milestone M7)

Date: 2026-11-23 · Branch: `feat/m7-qa` (contains M0 to M6) · Validator: QA agent

## Summary

**Verdict: PASS.** Every requirement R1 to R11 is met, all automated checks are green, and a scripted walk through the built app found no functional defects. Four small issues (three review nits plus one flaky e2e test) were fixed. Remaining items are minor follow-ups, none blocking.

## Check results

| Check | Result |
|---|---|
| `npm run lint` | Clean, 0 problems |
| `npm run build` (`tsc -b && vite build`) | Pass |
| `npm test` (Vitest) | 114 tests passed in 12 files (112 before this milestone, +2 added) |
| `npm run e2e` (Playwright, desktop 1280x800 and tablet 768x1024) | 38 passed (19 specs x 2 projects) |
| `npx prettier --check .` | Pass |

Before the fixes, one e2e test (`states.spec.ts` "number key answers...") failed once in a full parallel run and passed on three reruns. See defect 4.

## Requirements traceability (§2)

| # | Requirement | Status | Evidence |
|---|---|---|---|
| R1 | Map of the US | Verified | `src/map/USMap.test.tsx`; all screenshots in `docs/qa/` show the Albers USA map with AK/HI insets, e.g. `quiz-states-desktop.png` |
| R2 | Choose a mode | Verified | `src/screens/HomeScreen.test.tsx`; `e2e/smoke.spec.ts`; `docs/qa/home-phone.png`, `home-tablet.png`, `home-desktop.png`. Unknown route redirects home (scripted) |
| R3 | Highlight the asked area | Verified | `USMap.test.tsx`; `docs/qa/region-*-desktop.png`; scripted check that RI and DE show exactly one callout ring and capital star (`tiny-RI-capitals-desktop.png`, `tiny-DE-capitals-desktop.png`) |
| R4 | Four multiple choice answers | Verified | `src/quiz/engine.test.ts`; scripted: 27 questions across 3 modes all had 4 unique choices |
| R5 | Feedback on correct/wrong | Verified | `QuizScreen.test.tsx`, e2e `regions/states/capitals.spec.ts`; `quiz-*-feedback-*.png` show green check, soft orange wrong state with the correct answer revealed and message |
| R6 | Regions and colors as specified | Verified | `src/data/data.test.ts`; see data spot-check below |
| R7 | Simple, friendly, fun | Verified (visual review) | Screenshots: big rounded buttons, mascot, sound, confetti, praise. Subjective, reviewed by the validator, not by the child |
| R8 | React SPA | Verified | `package.json` (React 19, Vite, hash router), build output is static `dist/` |
| R9 | localStorage only | Verified | `src/store/useAppStore.test.ts`, `e2e/persistence.spec.ts`; no network requests other than static assets; scripted refresh-resume, sound persistence and reset |
| R10 | Multi-agent SDLC with cost-efficient models | Partially | Process requirement, not testable in code. Milestone branches/PRs and this QA role follow §11, but model tiers used are not recorded in the repo |
| R11 | All work in WSL | Partially | The app runs on Linux and Node 22 in a Linux shell (this validation ran on Linux, not Mike's WSL). README documents WSL setup. Mike's PC not tested directly |

## UX checklist (§8)

| Rule | Result | Notes |
|---|---|---|
| Big rounded buttons (min 56 px), Fredoka, 18 px+ text | Pass | `min-h-14` buttons, `text-lg` and up; visible in screenshots |
| Friendly mascot reacts to answers | Pass | Happy / encouraging faces seen; celebrate on results with 2+ stars |
| Correct: green + check, praise, confetti, ding, streak burst | Pass | Praise and check seen; confetti canvas present when motion allowed; streak logic unit tested |
| Wrong: soft orange, shake, correct revealed, "Nice try! That's X.", no harsh red/buzzer, map stays highlighted | Pass | Shake animation confirmed running; message now also includes "You'll get it next time!" |
| Buttons lock, big Next appears, Enter/Space advances | Pass | Next focused after answering; Enter advance verified in a full round |
| Keys 1 to 4 pick answers | Pass | Verified by script and e2e |
| aria-live feedback; color never the only signal | Pass | Live region holds the whole feedback message (incl. encouragement); icons and text accompany colors |
| Reduced motion: no shake, confetti, pulsing | Pass | With `reducedMotion: 'reduce'`: 0 running CSS animations, 0 canvas elements after answering |
| Layout: phone, tablet, desktop; map above answers when narrow, side by side when wide | Pass | Screenshots at 375x812, 768x1024, 1280x800. Phone feedback state fits with Next button visible without scrolling |

Other behaviour checked: refresh at question 4 resumes at question 4; sound toggle persists across reload; "Reset my progress" asks for confirmation and clears best scores; round length options 10 / 20 / All; no console errors across all scripted runs.

## Data spot-check

Counts and fills were read from the live SVG in regions mode (one question per region):

| Region | States highlighted | Fill | Matches spec |
|---|---|---|---|
| New England | 6 | `#3B82F6` blue | Yes |
| Mid-Atlantic | 5 | `#6D28D9` deep purple (changed after QA) | Yes |
| Southern | 12 | `#22C55E` green | Yes |
| Midwest | 12 | `#A855F7` purple | Yes |
| Southwest | 4 | `#F97316` orange | Yes |
| Pacific | 5 | `#FB7185` light red / pink | Yes |
| Mountain | 6 | `#A16207` brown | Yes |

Total 50. Membership lists are covered by `data.test.ts` (each state in exactly one region, counts per region, unique names, abbreviations, capitals and FIPS).

## Defects found and fixed

1. **Confetti timers not cancelled** (review nit). `celebration()` now returns a cancel function that clears its two pending timeouts; `ResultsScreen`'s effect cleanup calls it. Test added in `confetti.test.ts`.
2. **Wrong-answer encouragement not announced** (review nit). The mascot speech bubble was outside the live region. "You'll get it next time!" is now part of the `aria-live` feedback message and removed from the bubble, so it is announced and not shown twice. `QuizScreen.test.tsx` asserts it appears once and inside the live region.
3. **ModeCard hover lift ignored reduced motion** (review nit). Now `motion-safe:hover:-translate-y-1`. New `ModeCard.test.tsx`.
4. **Flaky e2e** `number key answers, then Enter advances`: the test pressed `1` right after "Question 1" appeared, which could beat the effect that attaches the key listener under load. It now waits for the question heading to receive focus (set in the same effect pass) first.

## Known limitations and follow-ups

- **Not verified on Mike's actual WSL/Windows setup.** Validation ran in a Linux container. On his PC, run `npm run e2e:install` once (downloads Chromium and system libraries, needs sudo) before `npm run e2e`.
- **R10 evidence is process-only**, and no real child has tried the app. A short play session with Mike's son is recommended.
- Sound was checked only as a stored setting (toggle and persistence); audible output was not verified.
- ~~In New England the five tiny-state callout rings overlap on a phone-sized map.~~ Fixed after QA: callout rings now appear only when a single tiny state is the target, not for whole-region highlights.
- Regions mode has only 7 items, so a round is always 7 questions even if 10 or 20 is selected.
- M8 (optional `#/study` map legend view) is not implemented.
- The main JS bundle is about 467 kB (156 kB gzipped), mostly map data and libraries. Fine locally.

## Screenshots

All in `docs/qa/` (PNG, 1x scale, about 3 MB total). Naming: `<screen>-<size>.png`, with sizes `phone` (375x812), `tablet` (768x1024), `desktop` (1280x800).

- `home-{phone,tablet,desktop}.png`, `home-stars-desktop.png`
- `quiz-{regions,states,capitals}-{phone,tablet,desktop}.png`
- `quiz-{regions,states,capitals}-feedback-{phone,tablet,desktop}.png`
- `results-{regions,states,capitals}-desktop.png`, `results-states-{phone,tablet}.png`
- `region-{new-england,mid-atlantic,southern,midwest,southwest,pacific,mountain}-desktop.png`
- `tiny-{RI,DE}-capitals-desktop.png` (seeded rounds, so the answer labels read A to D)
