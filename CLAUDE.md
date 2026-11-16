# Lumo – working guide for AI models

Read this fully before touching anything. It was written from a complete read of the code at commit `df3139f` (2026-11-09) and checked by running the build, the tests and the app on 2026-11-13. If the code and this file disagree, the code wins: fix this file in the same change.

## 1. What this project is

Lumo is a German-language AI study companion for students with ADHD ("KI-Lernbegleiter für neurodivergente Studierende"). The user uploads study material (pasted text, TXT, PDF). Lumo splits it into learning blocks, teaches each block with short cards, makes the user explain things in their own words, grades the explanation, and schedules flashcards for later review.

Every product decision is ADHD-driven: one clear next step, no shame, no pressure, no red, short text, a warm mascot. Comments in the code often cite the research behind a decision. Treat those decisions as requirements, not decoration.

It is a beta product with real users. The owner is a solo founder, not a full-time engineer. Explain things in plain language.

## 2. How it is built

| Layer | Tech | Where |
|---|---|---|
| Frontend | React 18 SPA, plain JavaScript (JSX), Vite 8, PWA via `vite-plugin-pwa` | `src/` |
| Backend | Node 22, Express 5, ES modules | `server/` |
| AI | `@anthropic-ai/sdk`, model constant `MODEL` in `server/index.js`, streaming + JSON-schema structured output | `server/index.js`, `server/prompts.js` |
| Database | SQLite via `better-sqlite3`, one JSON blob of app state per anonymous user | `server/db.js` |
| Spaced repetition | FSRS-6 via `ts-fsrs` | `src/utils/fsrs.js` |
| Tests | Node's built-in `node:test` (no Jest, no Vitest) | `tests/`, `server/db.test.js`, `src/utils/fsrs.test.js` |
| CI | GitHub Actions on every push: `npm ci` → `npm test` → `npm run build` → server smoke test | `.github/workflows/ci.yml` |

There is **no TypeScript, no router, no state library, no CSS framework, no component library, no linter config**. Do not add any of them unless asked.

**Dev:** two processes. Vite on port 5173 serves the frontend and proxies `/api` to Express on port 3001.
**Production:** one process. Express serves `/api/*` and the built `dist/` from the same origin.

### Data flow

1. `src/App.jsx` holds all global state in one `useReducer` (`src/state/appReducer.js`). The current screen is `state.screen`. There are no URLs.
2. Screens call the backend only through `src/api/lumo.js` (`lumoApi.*`). Every call is a POST that returns `{ data }`.
3. Each backend route validates the body (`server/validation.js`), calls `askLumo()` with a system prompt and a JSON schema from `server/prompts.js`, and returns the parsed JSON.
4. State is saved in three layers, local first:
   - `localStorage` key `lumo_project`: written synchronously on every change.
   - IndexedDB (`lumo_db` / `lumo_v2`): written 300 ms debounced. Primary store.
   - Server SQLite via `POST /api/state`: 2 s debounced, **only if** `localStorage.lumo_cookie_consent === 'accepted'`.
5. The user is anonymous. An httpOnly cookie `lumo_uid` holds a random session token; only its SHA-256 hash is stored. The server creates a session (and sets the cookie) **only on `/api/state*`**, which the client calls only after consent. Every other route reads an existing cookie but never sets one, so `req.userId` can be `null` there. Any new client call to a sync route must be guarded by the consent check (`tests/cookie-consent.test.js`).

### One learning session (`src/screens/session/SessionScreen.jsx`)

`FOCUS_RITUAL` (mood check, optional breathing) → `ELABORATION` (what do you already know?) → `CARDS` (`CardLearningPhase`: read, answer, feedback, self-rating, in-session repeat, final recall) → `CHECK` (explain the whole block; AI grades it) → `COMPLETE` (block is marked done **here**, on entering) → `LERNZETTEL` → optional `CONCEPT_MAP` → `SESSION_SUMMARY`.

Side path from cards: "frei nachfragen" → `DEPTH_CHOICE` → `EXPLAIN` (chat) → `CHECK`.

### Value vocabularies (use these exact strings)

- Block `status`: `'not-started' | 'in-progress' | 'completed'`
- Block `confidence`: `'sicher' | 'unsicher' | 'grosse_luecken' | null`
- `difficulty`: `'leicht' | 'mittel' | 'schwer'`
- `goalType`: `'exam' | 'homework' | 'understand'`
- `learningStyle`: `'examples' | 'connections' | 'stepbystep' | 'analogies'`
- `mood`: `FocusRitualPhase.jsx` sends `'focused' | 'tired' | 'stressed' | 'overwhelmed' | 'good'`. `toSessionMood()` in `src/utils/sessionMood.js` translates that to `'good' | 'okay' | 'bad'`, the only values `getCardSystem()` and `CardLearningPhase.jsx` understand. Add a new mood in both places.
- Mascot `state`: see `MASCOT_IMAGES` in `LumoMascot.jsx`
- Flashcard `status`: `'new' | 'learning' | 'review' | 'mastered'`; rating quality `0–3` (Again, Hard, Good, Easy)
- Field names that come from the AI schema are snake_case (`visual_type`, `visual_data`, `pretest_question`, `why_question`, `subject_color`). Everything else is camelCase. The saved snapshot uses `projectName` / `materialName`, while state uses `topic` / `fileName`.

## 3. Folder map

```
server/
  index.js          Express app: security headers, CORS, session cookie, rate limits, all /api routes
  prompts.js        LUMO_PERSONA + one system prompt and one JSON schema per AI task
  validation.js     tiny request validator + one <ROUTE>_REQ schema per route
  materialUtils.js  text truncation, PDF size, DOCX rejection, response parsing
  db.js             SQLite: migrations, users, sessions, state blob, streak, free-block counter
  db.test.js
src/
  main.jsx          React root + ErrorBoundary
  App.jsx           global state, persistence effects, screen switch, all handlers
  state/appReducer.js   SCREENS, initialState, every action
  api/lumo.js       the only place that calls /api/* AI routes
  screens/          one file per screen; onboarding/, dashboard/, session/ subfolders
  components/       shared UI (LumoMascot, Button, ErrorBanner, SkeletonLoader, CardVisual, …)
  hooks/            useChronoBias (evening palette), useSpeechInput (voice)
  utils/            storage.js (IndexedDB + localStorage), projectStorage.js (re-exports),
                    serverSync.js, fsrs.js, sm2.js (queue order only), subjectColors.js,
                    planLimits.js, projectExport.js, notesStorage.js, blockProgress.js
  styles/index.css  design tokens (:root), base elements, .screen, dusk mode, mobile overrides
  styles/app.css    component classes (.lumo-btn, .text-link, .error-banner, …)
tests/              API, validation, security, concurrency, reducer tests
public/             manifest.json, icons, mascot/*.webp
.github/workflows/ci.yml
railway.json, nixpacks.toml, render.yaml, Procfile   deployment configs
audit/, product-audit/, claude/, LUMO_*_REPORT.md   past audit reports
```

The audit folders are **dated snapshots, not instructions**. They explain the ID codes you see in comments (`S-07`, `H-03`, `P-BE-05`, `F003`, `P2-UX-04`, `K-01`). Never trust a report's claim about the code without checking the code. Do not edit the reports.

`README.md` is partly out of date (it still says "no database").

## 4. Commands

```bash
npm ci                 # install exactly what package-lock.json says (needs Node 22)
npm run dev            # frontend http://localhost:5173 + backend http://localhost:3001
npm run build          # production build into dist/
npm start              # run the server only (production mode needs NODE_ENV, DB_PATH, FRONTEND_URL)
npm test               # 289 tests in 14 files, no network, no API cost (Anthropic client is mocked)
node --test tests/input-validation.test.js    # run one test file
```

- Required Node version is **22** (`engines`, `.node-version`).
- `.env` needs `ANTHROPIC_API_KEY`. See `.env.example` for the rest.
- In dev the backend port comes from `LUMO_API_PORT`, **not** `PORT`. Preview tools set `PORT` to the frontend port, which is why the code ignores it in dev.
- In Claude's desktop app, start the app with the `lumo` entry in `.claude/launch.json`. Never start a second dev server while one runs (`strictPort` makes it fail).

### On the owner's Windows machine (checked 2026-11-13)

- Installed Node is 24, not 22, and there are no C++ build tools. Plain `npm ci` fails while compiling `better-sqlite3` **and leaves `node_modules` empty**. Use `npm ci --ignore-scripts`. Build, dev server and SQLite worked after that.
- `npm test` passes completely with `npm ci --ignore-scripts`.
- Work is often done in cloud sessions and pushed to GitHub, so this folder can be far behind. **Run `git fetch` and `git status -sb` before reading or changing anything.** If it says "behind", say so and fast-forward first.

## 5. Coding rules

**Language**
- UI text: German, informal "du". Use `–` (en dash), `…` (with a space before it), `„…"` quotes, `→` on forward buttons.
- Code comments: German, and they explain **why**, often with a finding ID or a source. Match that. Identifiers: English.
- Commits: `feat: …`, `fix: …`, `perf: …`, `docs: …`, `design: …`; add the finding ID in brackets when there is one, e.g. `fix(P2-BUG-01): …`.

**JavaScript / React**
- ES modules everywhere; always write the file extension in imports (`./x.js`, `./X.jsx`).
- Function components, hooks, default export per component file.
- Derived values must be declared **before** any hook that uses them, and module-level style constants before the component. Breaking this crashed the app twice ("Cannot access … before initialization"). See the comment above `currentBlock` in `App.jsx`.
- `SessionScreen` re-renders every second (timer). Any callback it passes to a phase that uses it in a `useEffect` dependency list must be wrapped in `useCallback`, or the phase's timers restart forever.
- Reset per-block state with `key={block.id}`, not manual resets.
- Async effects: use a `cancelled` flag and clean up timers.
- Wrap every `localStorage` / IndexedDB access in `try/catch`. Storage can be missing or full.
- Guard data that came from storage or the AI: `(blocks || []).filter(Boolean)`, `card?.concept`.
- New screens that are not needed at first paint are loaded with `lazy()` in `App.jsx`.
- Reducer cases are spread-based and must stay safe to run twice (`BLOCK_FINISHED` is idempotent on purpose).
- Named constants instead of magic numbers for delays and limits.

**Backend**
- Every AI route has the same shape: `validate(X_REQ, req.body)` → 400 on failure → `askLumo({ system, userContent, schema, maxTokens })` → `res.json({ data })` → `catch (err) { sendFriendlyError(res, err) }`.
- Errors shown to users are short, warm, German sentences. Never a stack trace, status code or English SDK message.
- When an AI call fails, **never invent a result** (no "isGood: true", no word-count grading). Show the error or a neutral message.
- JSON schemas: every object has `additionalProperties: false` and a `required` list. Put count limits ("3–5 cards") in the prompt text, not in the schema. Optional fields are simply left out of `required`.
- User material goes inside `<lernmaterial>` tags after `escapeLernmaterialTags()`. Keep that.
- Never return `userId`, never log secrets, keys or users' learning content.
- `blocksAnalyzedTotal` is owned by the server. The client value is display only.
- Database changes: append a new function to `MIGRATIONS` and raise `SCHEMA_VERSION`. Never edit an existing migration.
- Do not loosen Helmet/CSP, the CORS whitelist, `trust proxy`, body limits, rate limits or the concurrency gates. If a feature needs a new external origin, add exactly that origin to the CSP and say so.
- Dependencies are pinned to exact versions. Do not upgrade, do not run `npm audit fix`, do not change `MODEL` unless asked.

**Limits that must stay in sync** (change both sides together)
- Timeouts: client 60 s (`src/api/lumo.js`) > server 55 s (`CLAUDE_TIMEOUT_MS`).
- Material text: server cuts at 32,000 chars (`MAX_MATERIAL_CHARS`); the onboarding form warns at the same number (`BACKEND_LIMIT`).
- Files: max 5 and 7 MB raw in total (`MAX_FILES`, `MAX_TOTAL_FILE_SIZE` in `OnboardingScreen1.jsx`; `MAX_FILES` in `server/index.js`, `MAX_PDF_BYTES_RAW` in `materialUtils.js`). The `/api/analyze` body limit is 10 MB because base64 adds a third. DOCX rejected on both sides.
- Free limit: 20 blocks, defined in both `server/db.js` and `src/utils/planLimits.js`.

## 6. Design rules

**Tokens.** All colours live in `:root` in `src/styles/index.css`. Use `var(--…)`.
- Backgrounds: `--bg` < `--bg-elevated` < `--bg-card` < `--bg-card-bright`
- Accent: `--gold`, `--gold-soft`, `--gold-light`, `--gold-glow`, `--border-gold`
- Text: `--text-primary`, `--text-secondary`
- Meaning: `--green` (understood), `--amber` (warning), `--red` (an orange tone, real errors only)
- Text on a gold surface is always `#1a1206`, never white.

**No red.** Red triggers shame and shutdown in this audience. Gaps, wrong answers, "no idea", low retention, deadlines and bad grades are shown in gold, amber or neutral grey. `--red` is only for genuine failures (network, API) inside `.error-banner`. One existing exception is not a licence: YouTube's brand red in `YoutubePanel.jsx`.

**Dusk mode.** From 20:00 to 05:59 `useChronoBias` sets `data-dusk` on `<html>` and the gold tokens turn amber. A hard-coded `#D4A843` or `rgba(212,168,67,…)` will not switch. In new code use the tokens.

**Styling method.** The codebase styles almost everything with inline `style={{ … }}` objects plus a few shared classes. Follow the file you are in. Shared classes worth knowing: `.screen` + `.screen-content` (every full screen), `.lumo-btn--primary|secondary|waiting|ready` (or `<Button variant>`), `.text-link`, `.back-link`, `.error-banner`, `.lumo-card-reveal`, `.lumo-mood-tile`.

**Type.** Body is 16px system sans. `h1` inside `.screen-content` is Instrument Serif italic 28px (emotional moments). Nunito is for the wordmark. The sizes actually used: 11–12px uppercase labels with letter-spacing, 13–14px secondary text, 15–16px body, 17–22px emphasis. Common radii: 8, 10, 12, 14, 20.

**Layout.**
- Mobile first. Under 600px, `index.css` forces `h1` 22px, `h2` 18px and `.screen-content` gap 16px with `!important`; your inline values lose there.
- Never use `100vh`. Use `var(--dvh, 100dvh)` so the iOS keyboard does not cover inputs.
- Fixed layers already in use: wordmark 10, sticky bars 40–50, toasts 100, feedback button 900, install banner 1000, feedback sheet 1500, modals 2000, sync error 9999. Check before adding one, and check it against the cookie banner and feedback button at the bottom.
- New inputs keep the base 16px font size (smaller makes iOS zoom in on focus).

**Behaviour.**
- One primary action per screen, visible without scrolling. Everything else is a quiet text link.
- Every step has a way out or a skip. Never trap the user.
- Destructive actions need a second confirmation.
- Loading uses content-shaped skeletons from `SkeletonLoader.jsx`, not spinners or blank screens.
- No countdown pressure, no "X wrong", no visible failure counters. Time is shown as time spent, never time left.
- Praise the effort, not the person: "Du hast das hergeleitet." Never "Richtig!", "Super!", "Du bist gut."
- Motion is subtle and short. `prefers-reduced-motion` is handled globally; do not bypass it with JS-driven animation.
- Accessibility: real `<button>`s, `aria-label` on icon-only buttons, keep the gold `:focus-visible` outline.
- Mascot: `<LumoMascot state size />`, `.webp` files only.
- Icons: use `<Icon name size />` from `src/components/Icon.jsx` (inline SVG, inherits text colour). Do not add new emoji as icons; they look different on every platform. Many old emoji icons remain and are replaced step by step.
- The fixed wordmark has a fade strip behind it (`LumoWordmark.jsx`). A screen whose content starts at the top needs about 64px top padding so its header does not sit under the logo.

**Voice of Lumo** (`LUMO_PERSONA` in `server/prompts.js`): calm, warm, direct, first person "ich", max 3 short sentences, no emojis in AI text, no empty praise, one thing at a time. UI copy you write must sound the same.

## 7. Recipes

**Add a screen:** `SCREENS` constant → reducer action that sets `screen` → render branch in `App.jsx` (lazy import unless needed at start) → a way back.

**Add a saved state field:** `initialState` → `createInitialState` → `HYDRATE_FROM_STORAGE` → the `snapshot` object **and** the dependency array of the save effect in `App.jsx`. If it belongs to one subject, also `SAVE_CURRENT_PROJECT`, `LOAD_PROJECT`, `DELETE_PROJECT`, `START_NEW_PROJECT`. Old saved data will not have the field: always default it.

**Add an AI endpoint:** prompt + schema in `prompts.js` → `X_REQ` in `validation.js` → import both and add the route in `index.js` → method in `src/api/lumo.js` → cases in `tests/input-validation.test.js` → UI with skeleton, friendly error, retry.

**Add a prop:** pass it where the component is rendered **and** destructure it in the component. Check both ends.

## 8. Mistakes a weaker model makes here, and how to avoid each

1. **Working on a stale checkout.** This folder was once 88 commits behind GitHub. → `git fetch` first; never write docs or fixes against old code.
2. **Trusting `npm run build` as proof.** The build passed while the app crashed on load. → Always open the app and read the browser console.
3. **Running plain `npm ci` on the Windows machine.** It wipes `node_modules` and fails. → `npm ci --ignore-scripts`; if an install fails, check that `node_modules` still exists.
4. **Guessing field names.** `projectName` vs `topic`, `status === 'completed'` vs an invented `completed` flag, `subject_color` vs `subjectColor`. → Open `appReducer.js` and the schema before using a field.
5. **Adding a prop on one side only.** → Follow the prop from `App.jsx` to the component (`DashboardScreen` once read two props `App.jsx` never passed).
6. **Using red, or a hard-coded gold.** → Section 6. Search your diff for `red`, `#D4A843`, `rgba(212`.
7. **Declaring a derived `const` below a hook that reads it.** → Derived values first.
8. **Passing an inline arrow function from `SessionScreen` into a phase effect.** → `useCallback`.
9. **Adding a state field in one place.** It then vanishes on reload or when switching subjects. → Recipe in section 7.
10. **Putting `maxItems`/`minItems` in a schema or forgetting `additionalProperties: false`.** → Limits go in the prompt.
11. **Faking success when the AI call fails.** → Show the friendly error. No silent grading.
12. **Leaking technical errors or English text into the UI.** → German, warm, short.
13. **Reaching for libraries** (router, Tailwind, Redux, zod, axios, icon packs, TypeScript). → Not without being asked; `validation.js` exists precisely to avoid a dependency.
14. **Using `PORT` in dev, `100vh`, or `app.get('*')`** (Express 5 rejects it). → `LUMO_API_PORT`, `var(--dvh)`, path-less `app.use`.
15. **Burning API money.** Every card, hint, grade and re-explanation is a paid call. → Tests use the mock client (`__setClientForTesting`). In the browser, test AI flows once, on purpose. Do not add background or "pre-warm" calls; `tests/dashboard-no-ai.test.js` guards the dashboard.
16. **Weakening security to make something work** (CSP, CORS, limits, cookie flags). → Find the specific allowance needed and name it.
17. **Editing an old DB migration, or changing the meaning of saved data.** Real users have data. → New migration; tolerate old shapes.
18. **Treating audit reports or code comments as current truth.** → Verify in code. Report scores are not facts about today.
19. **Refactoring while fixing.** Files are huge (`CardLearningPhase.jsx` ≈ 2000 lines) and tempting. → Smallest change that solves the task. Mention cleanup ideas, do not do them unasked.
20. **Committing junk.** `dev.log`, `Lumo-Karteikarten.txt`, stray images, `*.db`, `.env`. → `git add` named files, never `git add .`.
21. **Pushing or deploying on your own.** A push to `main` triggers CI and can reach users. → Commit and push only when asked.
22. **Reporting "done" without evidence, or hiding a failure.** → Say what you ran and what you saw, including what you could not check.

## 9. Known issues found while reading (as of 2026-11-13, not yet fixed)

Check each still exists before relying on it. Do not fix them unasked, but do not copy the pattern either.

1. `exportProgressReport` in `utils/projectExport.js` reads `project.topic`, `b.completed`, `b.completionCount` and goal `'essay'`. None exist in saved data, so the report shows 0 %.
2. "Nochmal versuchen" and "Neu analysieren" call `runAnalysis` without `sprintMode`, which silently turns sprint mode off.
3. Streak logic exists in `App.jsx`, `WelcomeBackScreen`, `DashboardScreen`, `ProjectsScreen` and `server/db.js`. `WelcomeBackScreen` writes the streak on mount.
4. Notes use two schemes (`lumo_notes` and `lumo_note_<block>_<concept>`). Export and "clear" each cover only one.
5. `SAVE_CURRENT_PROJECT` / `LOAD_PROJECT` do not carry `goalDate`, `sprintMode`, `learningStyle`; switching subjects keeps the previous subject's values.
6. The card prompt for mood `bad` says "set `pretest_question` to null", but the schema type is `string`.
7. The reducer writes to `localStorage` in `CONFIRM_MATERIAL` and `RESET_TO_ONBOARDING`.
8. Unused: `components/LumoMascot.css`, `screens/onboarding/OnboardingScreen2.jsx`, `calculateNextReview` in `sm2.js`, `PRETEST_SYSTEM`, actions `GO_TO_STEP2` and `BACK_TO_STEP1`, prop `blockCount` of `AnalyzingScreen`, the `.png` mascot files.
9. `render.yaml` sets neither `DB_PATH` nor `FRONTEND_URL`; with `NODE_ENV=production` the server exits without `DB_PATH`.
10. Users who chose "Nur lokal" have no server identity, so the server-side free-block limit (S-07) cannot apply to them; only the IP rate limit does. Owner decision pending.
11. `syncStreak()` returns an object, but `App.jsx` checks `typeof serverStreak === 'number'`, so the server streak is never written back.

## 10. How to work here

- Read the files you will change, and their callers, before writing. Search for every use of a name before renaming or removing it.
- Do what was asked, nothing more. If you notice something else, say it in one line at the end.
- Ask before anything that deletes data, changes saved-data shape, touches deployment config, adds a dependency, or costs API money at scale.
- Reply to the owner in the language they wrote in. Lead with the result. Plain words, short sentences, no jargon without a half-sentence explanation.
- State uncertainty plainly: "I read it but did not run it" is a useful sentence.

## 11. Checklist before saying a task is done

- [ ] `git status -sb` showed the branch was up to date before I started; only files I meant to change are modified.
- [ ] `npm run build` passes.
- [ ] `npm test` passes.
- [ ] I started the app, walked the changed flow myself, and the browser console and server log show no new errors.
- [ ] Reloaded the page mid-flow: state is still there.
- [ ] Checked at phone width (375px) and with the keyboard open if there is an input.
- [ ] No red, no hard-coded gold, no `100vh`; text on gold is `#1a1206`; it still looks right in dusk mode (`document.documentElement.setAttribute('data-dusk','')`).
- [ ] All new UI text is German, "du", warm, short; effort praise only.
- [ ] Loading, error and empty states exist for anything that waits on the network; no fake success on failure.
- [ ] New state field: added in every place listed in section 7, with a default for old data.
- [ ] New or changed route: validation schema, friendly errors, test added, client and server limits still match.
- [ ] No new dependency, no version bump, no security setting loosened, no secret or user content logged.
- [ ] No extra AI calls were added without the owner knowing.
- [ ] Nothing committed or pushed unless asked. If asked: named files only, conventional message.
- [ ] My report says what changed, what I verified and how, and what I did not verify.
- [ ] If I changed how the project works, I updated this file.
