# US Geography Study App: Architecture and Implementation Plan

Status: **Draft for review (v2, open questions resolved)** · Author: Architect agent · Date: 2026-11-23

## 1. Goal

A friendly single page app (SPA) that helps a 5th grader practice US geography for an upcoming exam. The child picks a mode (**Regions**, **States** or **Capitals**). The app highlights part of a US map, offers four multiple choice answers, and gives immediate, encouraging feedback.

Non-goals for v1: accounts, a backend, multiple user profiles, typed-answer (free recall) questions, territories and Washington, D.C.

## 2. Requirements traceability

| # | Requirement | Where it is met |
|---|---|---|
| R1 | Display a map of the United States | `USMap` component, us-atlas Albers USA map with Alaska and Hawaii insets (§5) |
| R2 | Choose a mode: Regions, States, Capitals | Home screen mode cards, route `/quiz/:mode` (§6) |
| R3 | Highlight the area being asked about | `USMap` `highlight` prop, plus a pulsing callout ring for tiny states (§5.3) |
| R4 | Four multiple choice answers | `quizEngine.makeChoices()` always returns 4 unique options (§7) |
| R5 | Feedback on correct or wrong choice | `AnswerFeedback` component: color, icon, message, correct answer shown (§8) |
| R6 | Regions and colors as specified | `src/data/regions.ts`, validated by unit tests (§4) |
| R7 | Simple, friendly, fun feel | Design system and feedback rules (§8) |
| R8 | React SPA | Vite + React + TypeScript (§3) |
| R9 | localStorage only | Zustand `persist` middleware to `localStorage` (§9) |
| R10 | SDLC multi-agent workflow with cost-efficient models | §11 |
| R11 | All work done with WSL | All commands run in a WSL shell; Node installed inside WSL (§12) |

## 3. Technology choices

| Concern | Choice | Why |
|---|---|---|
| Build and dev server | **Vite 6+** with `@vitejs/plugin-react` | Fast, zero-config SPA build, plain static output |
| Language | **TypeScript** (strict) | Catches data mistakes (e.g. a misspelled region) at compile time |
| UI | **React 19** | Required |
| Styling | **Tailwind CSS v4** (`@tailwindcss/vite`) | Quick to build big, rounded, colorful UI. Region colors live in one theme file |
| State | **Zustand** with `persist` middleware | Tiny, no boilerplate, built-in localStorage persistence |
| Routing | **React Router v7** (`createHashRouter`) | Three screens only. Hash routing works on any static host and from `file://` with no server rewrites |
| Map rendering | **d3-geo** + **topojson-client** rendering into our own React `<svg>` | Full control over highlight, colors and click targets; no unmaintained wrapper library |
| Map data | **us-atlas** `states-albers-10m.json` (npm) | Derived from US Census Bureau cartographic boundaries (public domain), ISC-licensed package, already projected to Albers USA with Alaska and Hawaii insets, 975×610 viewBox |
| Celebration effect | **canvas-confetti** | One small dependency for a big "fun" payoff on correct answers and round completion |
| Font | **@fontsource/fredoka** (self-hosted) | Rounded, kid-friendly, readable, no CDN calls |
| Sound | Web Audio API (no library) | Short synthesized "ding" and soft "boop", mute toggle saved in settings |
| Unit and component tests | **Vitest** + **React Testing Library** + jsdom | Same config as Vite |
| End-to-end tests | **Playwright** | Validates full quiz flows in Chromium, plus a tablet viewport |
| Lint and format | ESLint (typescript-eslint, react-hooks) + Prettier | Consistent code across agents |

Libraries considered and rejected: `react-simple-maps` (stale, React 19 peer-dependency friction), Redux Toolkit (overkill), MUI or Chakra (heavy, and harder to make feel playful), Next.js (no server needed).

## 4. Domain data

### 4.1 Regions (`src/data/regions.ts`)

```ts
export type RegionId =
  | 'new-england' | 'mid-atlantic' | 'southern' | 'midwest'
  | 'southwest' | 'pacific' | 'mountain';

export interface Region {
  id: RegionId;
  name: string;      // "New England"
  color: string;     // fill when highlighted
  lightColor: string;// tint used for "context" shading
}
```

| Region | Spec color | Proposed hex | States (count) |
|---|---|---|---|
| New England | blue | `#3B82F6` | ME, NH, VT, MA, RI, CT (6) |
| Mid-Atlantic | deep purple (was dark red) | `#6D28D9` | NY, PA, NJ, DE, MD (5) |
| Southern | green | `#22C55E` | KY, WV, VA, AR, TN, NC, LA, MS, AL, GA, SC, FL (12) |
| Midwest | purple | `#A855F7` | ND, SD, NE, KS, MN, IA, MO, WI, IL, MI, IN, OH (12) |
| Southwest | orange | `#F97316` | AZ, NM, OK, TX (4) |
| Pacific | light red / pink | `#FB7185` | WA, OR, CA, AK, HI (5) |
| Mountain | brown | `#A16207` | ID, MT, WY, NV, UT, CO (6) |

Total: 50 states, each in exactly one region. A unit test enforces this and the counts above.

### 4.2 States (`src/data/states.ts`)

```ts
export interface StateInfo {
  fips: string;       // "06" (matches us-atlas feature id)
  abbr: string;       // "CA"
  name: string;       // "California"
  capital: string;    // "Sacramento"
  capitalLonLat: [number, number]; // for the capital star marker
  region: RegionId;
  tiny?: boolean;     // true for RI, DE, CT, NJ, MD, MA, NH, VT, HI → shows callout ring
}
```

FIPS 11 (D.C.) and territories are filtered out of the map's clickable/quizzable set; D.C. is drawn as part of the background only if present in the file.

Data tests: 50 entries, unique names/abbrs/capitals/FIPS, every FIPS exists in the TopoJSON, every capital point projects inside its own state shape (`d3.geoContains` on unprojected data or a projected bounding-box check).

## 5. Map component

### 5.1 Loading

`us-atlas/states-albers-10m.json` is imported as a static JSON asset (about 115 KB, about 35 KB gzipped). At module load we call `topojson.feature()` once and `topojson.mesh()` once for interior borders, then memoize the SVG path string for every state with `d3.geoPath()` (null projection, because the file is pre-projected). Render cost is then just 50 `<path>` elements.

### 5.2 API

```tsx
<USMap
  highlight={{ kind: 'region', regionId: 'midwest' }
          | { kind: 'state', fips: '17', showCapital?: boolean }
          | null}
  colorMode="highlight-only" | "regions" // "regions" tints every state by its region (study/legend view)
  onStateClick?={(fips) => void}         // reserved for a future "click the map" mode
/>
```

### 5.3 Visual rules

* Default state fill: soft gray-blue `#E2E8F0`, white borders, rounded line joins.
* **Regions mode:** every state in the target region is filled with the region color; others stay gray.
* **States mode:** target state filled with its region color (reinforces region learning). The rest of that region gets the region's light tint; all other states gray.
* **Capitals mode:** same as States mode, plus a gold star at the capital location (projected with `geoAlbersUsa().scale(1300).translate([487.5, 305])`, which matches the us-atlas projection).
* **Tiny states** (`tiny: true`): a pulsing ring (CSS animation, respects `prefers-reduced-motion`) is drawn around the state's centroid, so a 10-year-old can actually see Rhode Island or Delaware is highlighted.
* The SVG uses `viewBox="0 0 975 610"` and `width: 100%`, so it scales from phone to desktop.
* Accessibility: `role="img"` with an `aria-label` that does **not** reveal the answer ("Map of the United States with one area highlighted").

## 6. Screens and routing

Hash routes (`createHashRouter`):

| Route | Screen | Contents |
|---|---|---|
| `#/` | **Home** | Title and mascot, three big mode cards (Regions, States, Capitals) with icons, round length picker (10 / 20 / All), stars earned per mode, "Practice my mistakes" toggle, sound toggle |
| `#/quiz/:mode` | **Quiz** | Progress bar ("Question 3 of 10"), streak counter, prompt text, map, 4 answer buttons, feedback panel, Next button |
| `#/results/:mode` | **Results** | Score, stars (1 to 3), list of missed items with the correct answer, "Try again" and "Practice missed ones" buttons |
| `#/study` *(stretch)* | **Map legend / study view** | Map with all regions colored, tap a state to see name and capital |

Unknown routes redirect to `#/`. The quiz screen holds the active round in the Zustand store, so a refresh mid-round resumes where the child left off.

## 7. Quiz engine (pure functions, `src/quiz/engine.ts`)

All logic is framework-free and unit-tested in isolation.

```ts
type Mode = 'regions' | 'states' | 'capitals';

interface Question {
  id: string;            // "states:17"
  mode: Mode;
  targetKey: string;     // regionId or fips
  prompt: string;        // "Which state is highlighted?"
  choices: string[];     // 4 labels, shuffled
  answer: string;        // correct label
}

buildRound(mode, length, progress, rng): Question[]
makeChoices(mode, target, rng): string[]   // always 4 unique, includes answer
grade(question, choice): boolean
starsFor(score, total): 0 | 1 | 2 | 3       // ≥60% 1★, ≥80% 2★, 100% 3★
```

Prompts:

* Regions: "What region is highlighted?" → 4 region names.
* States: "What state is highlighted?" → 4 state names.
* Capitals: "What is the capital of **Illinois**?" (state named and highlighted) → 4 capital cities.

Distractor rules (keeps it fair but not trivial):

* Regions: 3 random other regions (only 7 exist).
* States: up to 2 distractors from the **same region**, the rest from anywhere. This teaches telling neighbors apart.
* Capitals: 1 distractor is the state's **largest well-known city** when it is not the capital (e.g. Chicago for Illinois, Los Angeles for California), stored as an optional `famousCity` field. The rest are capitals of states in the same region, then anywhere. This targets the classic mistake kids make.

Round selection:

* Items are sampled without repeats. "All" means every item once (7 regions, 50 states, 50 capitals).
* With "Practice my mistakes" on, items are weighted by miss history (a light Leitner system: each item has a box 0 to 3; wrong answer → box 0, right answer → box+1; lower boxes are drawn more often).
* The RNG is injectable (seeded in tests) so rounds are reproducible in tests.

## 8. UX and "fun" design rules

* Big, rounded buttons (min 56 px tall), Fredoka font, 18 px+ body text, bright but not neon palette, white cards on a soft sky-blue background.
* A friendly mascot (an original, simple SVG compass or star character drawn for this app) that reacts to answers.
* **Correct:** button turns green with a check, short ding, random praise ("Awesome!", "You got it!", "Geography genius!"), small confetti burst. A 5-in-a-row streak gives a bigger burst.
* **Wrong:** chosen button turns soft orange with a gentle shake, the correct button turns green, message "Nice try! That's **Delaware**." No harsh red X, no buzzer. The map stays highlighted so the child can connect the name to the shape.
* After answering, buttons lock and a big **Next** button appears (Enter or Space also advances).
* Keyboard: keys 1 to 4 pick answers. Feedback is announced through an `aria-live="polite"` region. Color is never the only signal (icons and text too).
* Respects `prefers-reduced-motion` (no shake, no confetti, no pulsing).
* Layout target: works on a laptop and an iPad in landscape and portrait; map above answers on narrow screens, side by side on wide screens.

## 9. Persistence (localStorage)

One Zustand store, persisted under the key `usgeo:v1` with a `version` and a `migrate` function so future changes don't wipe progress.

```ts
interface PersistedState {
  settings: { roundLength: 10 | 20 | 'all'; sound: boolean; practiceMistakes: boolean };
  progress: Record<string /* "states:17" */, { seen: number; correct: number; box: 0|1|2|3 }>;
  bestScores: Record<Mode, { stars: 0|1|2|3; bestPct: number; lastPlayed: string }>;
  activeRound: { mode: Mode; questions: Question[]; index: number; answers: (string|null)[] } | null;
}
```

* Storage access is wrapped so a full or blocked localStorage (private browsing) falls back to in-memory without crashing.
* A "Reset my progress" button in a small settings menu on Home (with a confirm step).

## 10. Project structure

```
us-regions-states-capitals-app/
├─ docs/ARCHITECTURE.md          ← this file
├─ index.html
├─ package.json
├─ vite.config.ts                ← also holds Vitest config
├─ playwright.config.ts
├─ src/
│  ├─ main.tsx                   ← router setup
│  ├─ index.css                  ← Tailwind import + theme tokens (region colors, fonts)
│  ├─ data/
│  │  ├─ regions.ts
│  │  ├─ states.ts
│  │  └─ data.test.ts
│  ├─ map/
│  │  ├─ geo.ts                  ← topojson → memoized path strings, centroids, capital points
│  │  ├─ USMap.tsx
│  │  └─ USMap.test.tsx
│  ├─ quiz/
│  │  ├─ engine.ts
│  │  ├─ engine.test.ts
│  │  └─ rng.ts
│  ├─ store/
│  │  ├─ useAppStore.ts
│  │  └─ useAppStore.test.ts
│  ├─ components/                ← AnswerButton, AnswerFeedback, ProgressBar, Mascot, ModeCard, Stars
│  ├─ screens/                   ← HomeScreen, QuizScreen, ResultsScreen
│  └─ lib/                       ← sound.ts, confetti.ts, praise.ts
└─ e2e/
   ├─ regions.spec.ts
   ├─ states.spec.ts
   ├─ capitals.spec.ts
   └─ persistence.spec.ts
```

## 11. SDLC multi-agent workflow

The main thread acts as **orchestrator**. Each role is a subagent with a model tier matched to the work, per the project owner's preference (higher tiers for planning and architecture, lower tiers for straightforward implementation from a plan).

| Role | Model tier | Responsibility | Input → Output |
|---|---|---|---|
| Architect | High (Opus) | This plan; resolves design questions mid-project | Requirements → `docs/ARCHITECTURE.md` |
| Implementer | Low (Haiku) for data, components and wiring; Sonnet for the map module and quiz engine | Builds one milestone ticket on its own branch, with tests | Ticket from §12 → branch + PR |
| PR reviewer | Medium (Sonnet) | Reviews each PR against this doc, the ticket's acceptance criteria and code quality; requests changes or approves | PR diff → review comments |
| QA / validator | Medium (Sonnet) | Runs `npm run lint`, `npm test`, `npm run e2e`; walks the §2 traceability table; checks child-friendliness on phone and tablet viewports with screenshots | Merged main → QA report |
| Defect fixer | Low (Haiku) | Fixes issues found by review or QA | Bug list → fix commits |

Flow per milestone:

1. Orchestrator hands the implementer a ticket (scope, files, acceptance criteria, all from this doc).
2. Implementer works on `feat/<milestone>` branch, all commands in WSL, and opens a PR.
3. Reviewer reviews. At most 2 review/fix loops before escalating to the architect.
4. CI-equivalent checks (lint, unit, e2e) must pass.
5. Mike merges the PR on GitHub (`mbetzel/us-regions-states-capitals-app`).
6. After the final milestone, QA runs a full requirements validation and writes `docs/QA-REPORT.md`.

Definition of done for every PR: TypeScript builds with no errors, lint clean, new logic has unit tests, no console errors in the browser, works at 375 px and 1280 px wide.

## 12. Implementation milestones

All commands run in WSL (Ubuntu), with Node 22 LTS installed inside WSL via `nvm`, and the repo living on the WSL filesystem (not `/mnt/c`) for fast installs and file watching.

| # | Milestone | Scope | Acceptance criteria |
|---|---|---|---|
| M0 | Scaffold | `npm create vite@latest` (react-ts), Tailwind v4, ESLint, Prettier, Vitest, RTL, Playwright, scripts `dev`, `build`, `preview`, `lint`, `test`, `e2e` | `npm run build`, `npm test`, `npm run e2e` all pass on a hello-world page |
| M1 | Data | `regions.ts`, `states.ts` (50 states, capitals, capital coordinates, famous cities, tiny flags) | Data tests pass: 50 states, counts per region match spec, all unique, FIPS match the atlas |
| M2 | Map | `geo.ts`, `USMap.tsx` with highlight modes, tiny-state callout ring, capital star | Component tests: correct states filled for a region, a state and a capital; visual check screenshot of all 7 regions |
| M3 | Quiz engine | `engine.ts`, `rng.ts` | Unit tests: always 4 unique choices containing the answer, distractor rules, no repeats in a round, "All" covers every item, weighting favors missed items, star thresholds |
| M4 | Store and persistence | Zustand store, persist, migrate, storage fallback | Tests: progress survives reload, corrupt or missing storage doesn't crash, reset clears everything |
| M5 | Screens and routing | Home, Quiz, Results, hash router, keyboard support | E2E: complete a 10-question round in each mode; results show correct score; refresh mid-round resumes |
| M6 | Fun and polish | Mascot, praise messages, confetti, sound with mute, animations, reduced motion, responsive layout | QA checklist in §8 passes on phone, tablet and desktop viewports |
| M7 | QA and validation | Full traceability walk, bug fixes, `docs/QA-REPORT.md`, README with "how to run" | Every row in §2 marked verified |
| M8 *(optional, later)* | Study view | `#/study` map legend. Deployment is out of scope for now: the app runs locally on Mike's PC (`npm run dev` or `npm run preview`) | Study view works locally |

Suggested order is linear; M2 and M3 can run in parallel after M1.

## 13. Risks and mitigations

* **Tiny states are hard to see and tap.** Callout ring (§5.3); answers are buttons, not map taps, so tapping precision doesn't matter in v1.
* **Alaska and Hawaii positions.** The Albers USA inset layout is standard in school maps, so it should match what the child sees in class.
* **Capital data mistakes.** Unit test checks each capital point falls inside its state; reviewer spot-checks the list.
* **Spec uses red for two regions.** Resolved: dark red for Mid-Atlantic, light red/pink for Pacific (§14).
* **localStorage cleared by the browser.** Only progress and stars are lost; the app still works.

## 14. Decisions (answered by Mike, 2026-11-23)

1. **Region colors.** Mid-Atlantic was first dark red (`#B91C1C`); on 2026-11-23 Mike changed it to purple, using a deep violet (`#6D28D9`) so it stays distinct from the brighter Midwest purple (`#A855F7`). Pacific is a lighter red/pink (`#FB7185`).
2. **Git hosting.** Code lives in the GitHub repo `mbetzel/us-regions-states-capitals-app`, which the local WSL project folder is already cloned from. Each milestone is a branch and a pull request reviewed by the reviewer agent and merged by Mike.
3. **Where it runs.** Locally on Mike's PC for now. No deployment work in v1.
4. **Region wording.** The label is "Southern", as in the spec.
