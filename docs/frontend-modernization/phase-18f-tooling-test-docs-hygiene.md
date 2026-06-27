# Phase P18f: Tooling, test-harness and docs hygiene (+ optional cross-engine CI)

The last sub-phase of the P18 cleanup wave sweeps the leftover tooling, test-harness, and docs nits the
P0 to P17b packet logged as accepted-not-fixed or noted-not-done, plus the one genuine open
infrastructure item (decision 14's cross-engine + axe CI). These are presentation-adjacent: tooling
scripts, test files, browser tests, the architecture guard, CI config, and the packet's own docs. Two
items reach into a src/ui file: the windowFocus E2E seam (a small module-first lift out of the hud.ts
monolith so the keyboard E2E imports the REAL glue) and, coupled to it, clearing the pre-existing biome
debt the hud.ts touch surfaces. Everything else is test, script, or docs only.

Presentation-first scope: this phase does NOT touch `src/sim`, `server`, `src/net`, `headless`, or
`src/world_api.ts` (IWorld). No new player-visible strings are added, so there is no i18n catalog edit,
no `i18n.locales` touch, and no M16 completeness-gate concern. No per-frame or hot-path code changes, so
there is NO perf gate. The work is independent across file groups, so it fans out then converges on one
coverage review.

## Starter Prompt

```
This is Phase P18f of the Frontend Modernization v0.16.0 P18 cleanup wave: Tooling, test-harness and
docs hygiene (+ the optional cross-engine CI decision). Deps: P0-P17b complete; P18a-P18e are sibling
cleanup sub-phases (independent file sets).

Model: Opus 4.8, xhigh effort. Harness: Claude Code.

Worktree: /Users/fernando/Documents/wocc-v0.16.0 (branch feature/frontend-modernization-v016, off release/v0.16.0).

ULTRACODE: yes. This is a batch of 14 mostly-independent test/tooling/docs nits across disjoint files,
which is exactly what the generation-fan-out axis is for (state.md canonical workflow). Fan out parallel
agents across the file-disjoint cohorts, then converge on ONE coverage review. Cohorts: (A) mobile
tooling scripts; (B) test-file nits; (C) docs hygiene (single-author within the cohort: it edits the
same two docs and parallel prose self-conflicts); (D) the windowFocus extraction + the coupled hud.ts
biome clearance (sequential, careful: it touches the monolith); (E) the optional cross-engine CI
decision. Cohort D is the only source touch and runs as one careful pass, not fanned out.

Goal: close the leftover P18-wave hygiene items the prior discovery pass verified still-open, each as a
small, verifiable change, WITHOUT regressing any guard. Concretely: normalize a drifted screenshot-script
port; clear three accepted biome INFO/warning nits in tests; harden two mobile E2E scripts to actually
assert touch-target sizes and fix a third's post-entry navigation; add an executing browser test for the
delve canvas painter; close the bare-named pure-core reverse-completeness gap (test-only); reconcile
stale docs (the decision-10 wording, the client_shell theme comment, the progress.md per-phase bullet
list); fold the windowFocus E2E glue back behind a real src/ui module and clear the hud.ts biome debt
that the touch surfaces; and DECIDE the optional cross-engine + axe CI matrix (land it behind an env gate
or record a reasoned decline).

CRITICAL FRAMING: presentation-first. Do NOT touch src/sim, server, src/net, headless, or
src/world_api.ts (IWorld). No new player-visible strings (no hud_chrome.ts edit, no i18n.locales touch).
No per-frame / hot-path edit (so no perf_tour gate). The one monolith touch (the windowFocus lift,
cohort D) is presentation-only (src/ui), must be behavior-identical, and is the reason the hud.ts biome
debt becomes in-scope; do NOT run `biome --write` on the whole hud.ts monolith (the P5 memory lesson:
never biome --write the dirty monolith) and do NOT edit vite.config.ts (its biome debt stays deferred).

STEP 0 - PRE-FLIGHT:
- `git status` must be clean. This is a shared checkout; if it is not clean, STOP and ask the user before
  touching anything (a concurrent session may share the tree). Stage only this phase's explicit paths.
- Memory scan: read MEMORY.md and the entries [[frontend-v016-phase17a-harness-floor]] (the standing
  harness floor, the onDiskCores completeness sweep + the bare-named-core gap N1 this phase closes, the
  client_shell dissolved-pool guards, the *_view/*_core naming codification), [[frontend-v016-phase17b-bundle-lazy-declined]]
  (the cross-engine WebKit-in-CI item left OPEN/optional after the revert, the `; echo $?` masks-vitest-exit
  gotcha, the i18n M16 non-Latin-fill trap), [[frontend-v016-phase0-foundation-gates]] (the mobile E2E
  baseline: only 2 of 6 truly assert, the mobile_chat_safe_area :5174 port drift, the css_corpus guard),
  [[frontend-v016-phase6-painterhost-pilot]] (the delve painter canvas-draw test deferred to a real 2D
  context, now satisfiable by the opt-in browser suite), [[frontend-v016-phase15b-a11y-audit-tooling]]
  (the opt-in Vitest-4 Browser-Mode suite + the windowFocus copy in the keyboard E2E), and
  [[frontend-v016-phase16-standards-codification]] (P16 docs-only; the stale client_shell theme comment).
- Confirm you are in the feature/frontend-modernization-v016 worktree (off release/v0.16.0).

STEP 1 - LOAD CONTEXT (do NOT read hud.ts (14,377 lines) or the HTML entries whole):
Spawn ONE Explore agent to read and summarize, returning a compact brief (not raw dumps):
- docs/frontend-modernization/state.md. Cite by section: locked decisions 4 (presentation-only), 9
  (component contract: instance-parameterized core + thin painter, the module-first seam the windowFocus
  lift follows), 10 (WCAG 2.2 AA chrome; the validation-matrix per-window wording this phase reconciles),
  11 (theming: forced-colors is the only AUTOMATIC contrast adaptation; a user-selectable light parchment
  theme exists), 12 (no magic values in painters; canvas painters resolve --color-* tokens once per
  redraw), 14 (the cross-engine + WebKit-in-CI matrix, OPEN/optional), 15 (ClientWorld-vs-Sim parity),
  17 (persistent monolith owned: do not force an extraction, but a self-contained module-first lift is
  allowed). Also: the non-negotiable constraints, the validation matrix (which rows match a
  test/tooling/docs/CI change), and the Review Dispatch Matrix.
- This phase file (phase-18f-tooling-test-docs-hygiene.md).
- The SPECIFIC source ranges this phase touches, with their real V16 line numbers (all verified open):
  - scripts/mobile_chat_safe_area.mjs:16 (default URL `'http://localhost:5174/'`; siblings use
    `'http://localhost:5173'`).
  - tests/css_corpus.test.ts:58 (`css += '\n' + block[1]`) and :70 (`css += '\n' + readFileSync(...)`)
    (biome useTemplate INFO).
  - tests/leaderboard_window.test.ts:64 (`expect(code).toContain('${esc(r.name)}')`) and :65
    (`'${esc(standing.name)}'`) (two noTemplateCurlyInString warnings).
  - tests/browser/keyboard_nav.browser.test.ts: header comments at lines 1-13 ("a faithful copy of
    hud.ts windowFocus"), windowFocusBridge() at ~line 122, wired at ~line 159; the real glue lives
    inline in hud.ts as this.windowFocus('#...') at hud.ts:2496/2527/2575/2595/2610.
  - tests/architecture.test.ts: onDiskCores() regex `/_(?:view|core)\.ts$/` at ~line 53-54 with the
    bare-named-cores-not-caught comment at lines 50-51; UI_PURE_CORES at ~line 121 (xp_bar at 123,
    swing_timer at 148); RENDER_PURE_CORES at ~line 165 (cast_bar bare-named per the comment at ~343).
  - tests/delve_map_painter.test.ts header at lines 7-11 (paintMinimapDelve/paintWorldMapDelve "need a
    real 2D context + getComputedStyle, so they are NOT exercised here"); the methods are wired live at
    hud.ts:5340 / hud.ts:5458. Existing browser tests: tests/browser/{a11y,keyboard_nav,target_size}.browser.test.ts
    + tests/browser/_harness.ts; the config is vitest.browser.config.ts; the script is
    package.json "test:browser".
  - scripts/mobile_button_size.mjs and scripts/mobile_joystick_size.mjs (default :5173, import
    enterOfflineGame, only register pageerror/console + screenshot, NO getBoundingClientRect assertion).
  - scripts/mobile_joystick_deadzone.mjs:66-68 (the `#options-menu .set-row` /deadzone/i search) with
    fixed setTimeout waits at :49/:54/:61; the slider is options_view.ts:309 (joystickDeadzone, env.touch-gated).
  - docs/frontend-modernization/state.md:352 ("the PER-WINDOW roles/aria/labels/target-size are NOT
    deferred there").
  - tests/client_shell.test.ts:234-236 (the "no light theme" comment) and :240 (the
    `.not.toMatch(/@media\s*\(prefers-color-scheme/)` assertion, which is correct and stays);
    src/ui/theme.ts:28/47/61/66 (PresetId 'parchment'|'highContrast', a user-selectable light theme),
    theme.ts:73 (DEFAULT_PRESET = 'classic').
  - docs/frontend-modernization/progress.md: the "## Per-phase deliverable checklists" section (~line
    59) whose bullets read "_not started_" for P0/P2/P7b/P9b/P11a/P11b/P12a/P13a/P13b/P14a/P14b/P15a/P15b/P17b
    while the authoritative table above records them done.
  - vitest.browser.config.ts:23-24 (the chromium-only instances + the "P17b adds webkit/firefox here +
    the CI matrix" comment); .github/workflows/ci.yml (three jobs: Biome `--changed` at ~line 82, PR
    gate at ~line 85, Release gate at ~line 137; none invoke the browser suite); package.json
    "test:browser" + the @vitest/browser-playwright + playwright peers.
  - The pre-existing biome debt: `npx biome check src/ui/hud.ts vite.config.ts` (errors + warnings;
    `biome ci --changed` is whole-file, so the cohort-D hud.ts touch surfaces hud.ts's share).
The orchestrator keeps the summary, not the raw file dumps. This is a wide-but-shallow batch; keep the
working set under the 40% ceiling by pushing each cohort's reads into its agent.

STEP 2 - ORCHESTRATION + EXECUTE (fan out the disjoint cohorts; cohort D sequential):

COHORT A - mobile tooling scripts (fan out; disjoint files):
- Item 1 (port drift): scripts/mobile_chat_safe_area.mjs:16, change the default from
  `'http://localhost:5174/'` to `'http://localhost:5173'` so it matches every other mobile_* script and
  runs against the standard `npm run dev` port without a GAME_URL override.
- Item 7 (assert touch-target sizes): scripts/mobile_button_size.mjs and scripts/mobile_joystick_size.mjs
  already boot via enterOfflineGame + force mobile-touch and screenshot. ADD a getBoundingClientRect()
  measurement of the touch action buttons (mobile_button_size) and the joystick element
  (mobile_joystick_size), push a message to errors[] and process.exit(1) when measured width or height
  is < 40 (the existing >=40x40 mobile-touch floor; use a named const e.g. TOUCH_MIN = 40, no magic
  literal), keeping the screenshots. Defense-in-depth: the 40x40 floor is already enforced in CSS and
  statically guarded; this only closes the E2E-assertion gap, so do NOT change any CSS.
- Item 8 (post-entry navigation): scripts/mobile_joystick_deadzone.mjs targets the Graphics/touch
  joystickDeadzone slider (options_view.ts:309, label "Joystick Deadzone", env.touch-gated). The
  /deadzone/i row search at :66-68 is structurally right; the failure is timing/navigation. Replace the
  fixed setTimeout waits around the Graphics-panel build with a page.waitForFunction that polls for the
  deadzone .set-row to exist before the lookup, and ensure env.touch is true at the time the Graphics
  panel is built (the script forces body.mobile-touch + patches matchMedia coarse; confirm that patch
  lands before the options menu first renders the touch sliders, e.g. set it before entering the game /
  before the first toggleOptionsMenu). Script-only fix; do NOT edit options_view.ts.

COHORT B - test-file nits (fan out; disjoint files):
- Item 2 (useTemplate INFO): tests/css_corpus.test.ts, rewrite the two `css += '\n' + ...` accumulations
  (the inlineStyleCss loop at :58 and the extractedStyleCss loop at :70) as an array push + .join('\n')
  (or template literals) so the biome useTemplate INFO clears. Pure-cosmetic; the guard output must stay
  byte-identical (same corpus string), so re-run tests/css_corpus.test.ts and confirm green.
- Item 3 (noTemplateCurlyInString): tests/leaderboard_window.test.ts:64-65, either add a
  `// biome-ignore lint/suspicious/noTemplateCurlyInString: asserting the painter source literally contains this template expression`
  directly above each of the two assertions, or restructure so the matched substring no longer contains
  a literal `${...}` (e.g. assert on `esc(r.name)` and the wrapping separately). Keep the assertion's
  meaning (the painter routes names through esc()).
- Item 5 (bare-named pure-core completeness): tests/architecture.test.ts. The onDiskCores() sweep only
  matches *_view/*_core, so bare-named pure cores (xp_bar, swing_timer; render cast_bar) escape the
  on-disk completeness check. Implement OPTION (a), the test-only path: add a hardcoded BARE_NAMED set of
  the curated bare cores (the ones already listed in UI_PURE_CORES / RENDER_PURE_CORES that do not end in
  _view/_core), and a new it() that asserts each BARE_NAMED entry IS on disk AND IS registered, so a
  curated bare core that is deleted or renamed fails here. Do NOT rename the source files (option b is a
  SOURCE edit, out of scope). Add a one-line comment that bare names are enforced by this curated cross-
  check while *_view/*_core are auto-swept.
- Item 6 (executing delve canvas-draw test): add tests/browser/delve_map_painter.browser.test.ts to the
  opt-in browser suite. It must: set the six --color-delve-* tokens on documentElement (via
  documentElement.style.setProperty, NOT a hex literal in the test logic; the tokens ARE the values, so
  this is decision-12-consistent, the painter reads them via getComputedStyle); build an in-delve IWorld
  stub reusing the SCENARIO/makeWorld shape from tests/delve_map_painter.test.ts; construct DelveMapPainter
  with a real writer facet; call paintMinimapDelve(ctx, world, zoneLabelEl, 162) and
  paintWorldMapDelve(ctx, world, 280) against a real canvas 2D context; then assert the #zone-label text
  node is written and the canvas has non-blank pixels (getImageData) OR a screenshot snapshot matching
  the sibling a11y/keyboard_nav/target_size browser tests. It supplements (does not replace) the
  adversarial-fork parity. Keep it OPT-IN (it lives under tests/browser/**, which bare `vitest run`
  excludes); do NOT make bare npm test launch a browser.
- Item 10 (stale theme comment): tests/client_shell.test.ts:234-236, reword the comment so it stops
  asserting "no light theme." The :240 assertion (`.not.toMatch(/@media\s*\(prefers-color-scheme/)`) is
  correct and STAYS; only the prose is wrong. Suggested wording: "forced-colors is the only AUTOMATIC
  contrast adaptation (decision 11): no @media (prefers-color-scheme) switch in the corpus. (A user-
  selectable light parchment / highContrast theme exists via theme.ts at runtime; this guards only the
  absence of an automatic CSS theme switch.)" No assertion change, comment only.

COHORT C - docs hygiene (SINGLE-AUTHOR within the cohort; it edits two shared docs):
- Item 9 (decision-10 wording): docs/frontend-modernization/state.md:352. Reword the validation-matrix
  line so it distinguishes the in-phase STRUCTURAL a11y (per-window roles/aria/labels/focus-return, NOT
  deferred) from the LIVE/computed checks (axe / forced-colors / computed target-size / :focus-visible)
  that the cold-window phases deferred to P15b and that P15b LANDED. This is the validation-matrix PROSE,
  not the phase ledger row. Docs-only.
- Items 11 + 12 (stale per-phase bullets): docs/frontend-modernization/progress.md, the "## Per-phase
  deliverable checklists" section (~line 59). Reconcile every "_not started_" bullet that contradicts the
  authoritative status table above it / state.md: the named ones are P2 (~line 67) and P11b (~line 87),
  but the same staleness affects P0, P7b, P9b, P11a, P12a, P13a, P13b, P14a, P14b, P15a, P15b, and P17b
  (P11c / P12b already read DONE). Match each bullet to its real status (P0-P17a are done; P17b is done
  as a measure-and-decline), mirroring the table / state.md / memory; do not invent outcomes.
- NOTE: these fix PRE-EXISTING stale content, distinct from the P18-wave ledger-row wiring handled
  separately. If that separate wiring pass has already corrected an exact line, reconcile rather than
  clobber.

COHORT D - windowFocus E2E seam + coupled hud.ts biome (SEQUENTIAL, careful; the only source touch):
- Item 4 (fold the E2E glue behind a real module seam): extract hud.ts's windowFocus(selector) helper
  (the {captureFocus, restoreFocus} pair wired at hud.ts:2496/2527/2575/2595/2610) into a new small
  src/ui/window_focus.ts module: a factory makeWindowFocus(fm: FocusManager, root: () => HTMLElement)
  that returns the same {captureFocus, restoreFocus} contract the test's windowFocusBridge() reconstructs
  (open the trap on capture, release-and-return on restore). Repoint hud.ts to consume the new module
  (behavior-identical; same call sites). Then change tests/browser/keyboard_nav.browser.test.ts to import
  the REAL makeWindowFocus instead of the local windowFocusBridge() copy, deleting the copy and its
  "faithful copy" comments. This is module-first behind the existing focus_manager seam (decision 9), not
  a new seam. If client_shell.test.ts greps any id that this lift relocates, update it (it should not:
  the helper is logic, not ids).
- Item 14 (coupled hud.ts biome): because item 4 makes hud.ts a changed file, `biome ci --changed` will
  flag hud.ts's pre-existing format/lint debt. Clear ONLY that hud.ts debt with TARGETED edits to the
  specific findings biome reports (run `npx biome check src/ui/hud.ts` and fix each reported error +
  warning by hand). Do NOT run `biome --write` on the whole monolith (P5 memory: never biome --write the
  dirty monolith) and do NOT edit vite.config.ts (its biome debt stays deferred this phase). If the
  targeted hud.ts clearance is not safely achievable in this phase's scope, STOP (see STOPPING RULES):
  fall back to keeping windowFocusBridge() in the test with a structural drift-guard comment and record
  item 4 as still-deferred, rather than ship a half-applied monolith format.

COHORT E - the optional cross-engine + axe CI decision (item 13):
- DECIDE and either land or decline. First MEASURE: locally run `npm run test:browser` to confirm the
  existing axe + keyboard-nav + target-size browser suite is green, and confirm `npx playwright install`
  provisions the engines (there is no install hook by design). If green and provisionable, LAND it:
  add `{ browser: 'firefox' }`, `{ browser: 'webkit' }`, and a mobile-WebKit instance to
  browser.instances in vitest.browser.config.ts BEHIND a BROWSER_MATRIX env gate (so the local default
  stays chromium-only and installable with just `npx playwright install chromium`); add ONE standing job
  to .github/workflows/ci.yml that runs `npm ci`, then `npx playwright install`, then `npm run test:browser`
  (with BROWSER_MATRIX set), so the P15b axe + keyboard-nav + target-size suite runs cross-engine as a
  standing a11y/cross-engine regression gate. Keep bare `vitest run` browser-free (vite.config.ts already
  excludes tests/browser/** and **/*.browser.test.ts; do not change that). If provisioning fails (mobile
  WebKit cannot install in the runner) or the suite is not green cross-engine, do NOT force it: record a
  reasoned DECLINE in the final response + memory (mirroring P17b's measure-and-decline precedent) and
  leave decision 14 OPEN. No source/sim/i18n change either way; this is test-infra/CI only.

INVARIANTS THIS PHASE MUST KEEP (state.md locked decisions + non-negotiable constraints):
- PRESENTATION-FIRST (decision 4): no src/sim / server / src/net / headless / src/world_api.ts (IWorld)
  edit. The only source file touched is src/ui (hud.ts + the new src/ui/window_focus.ts), and only for
  the behavior-identical windowFocus lift. If any item appears to need an IWorld/wire/sim change, STOP
  and surface it.
- No new player-visible strings: this phase adds NO t() keys. Do NOT edit src/ui/i18n.catalog/* or
  src/ui/i18n.locales/*; there is no M16 completeness-gate exposure and localization_fixes is not
  triggered.
- Determinism in any registered pure core (item 5 only reads the guard; item 6 drives the painter in a
  browser): no Math.random / Date.now / performance.now added to a pure core.
- Graphics-tier UI reads the STATIC preset, never the FPS governor (decision 6): untouched here (no tier
  knob edited).
- No magic values (decision 12): item 6 sets --color-delve-* tokens via setProperty (the tokens are the
  values; the painter resolves them once per redraw via getComputedStyle); items 7's size floor is a
  named const, not a bare literal.
- No per-frame / hot-path edit (decision 5/5a): nothing here is in hud.update()'s frame divider, so there
  is NO perf gate and NO write-elision routing change.
- Module-first (decision 9): the windowFocus lift goes behind the existing focus_manager seam as its own
  small module, not a new seam and not a copy.
- Do NOT biome --write the hud.ts monolith (P5 memory lesson); clear only the reported hud.ts findings
  by hand; leave vite.config.ts deferred.
- No em dashes, en dashes, or emojis anywhere (code, comments, docs, commits). Use commas, colons,
  parentheses, or "to" for ranges.
- Shared worktree: commit with EXPLICIT paths, never `git add -A`.

Out of scope (do NOT do in this phase):
- Any src/sim / server / src/net / headless / IWorld change; any per-frame / hot-path edit.
- The bare-named-core SOURCE rename (item 5 option b); only the test-only curated cross-check (option a).
- `biome --write` on the hud.ts monolith, and any vite.config.ts edit (item 14 keeps vite.config.ts
  deferred).
- The roving_tabindex / dialog-root a11y extractions (P18a), the per-window ARIA polish (P18b), the
  visual-a11y CSS (P18c), the live-region / FocusManager unification (P18d), and the render/i18n/perf
  nits (P18e). This phase is tooling/test/docs + the optional CI, only.
- The declined P17b bundle lazy-load + JS bundle-budget gate (decision 13 DECLINED-on-evidence). Do not
  resurrect it; cohort E lands ONLY decision 14's cross-engine + axe matrix.
- Any new window/control or new player string.

STEP 3 - VALIDATION + REVIEW:
Run ONLY the validation-matrix rows that match this phase's change-types (state.md "Validation matrix"):
- Baseline: `npx tsc --noEmit` (items 4, 5, 6 add/change .ts).
- New .ts module added: `biome check` on src/ui/window_focus.ts + tests/browser/delve_map_painter.browser.test.ts
  + every changed test (the V16 ratchet). Confirm the three biome nits cleared: re-run
  `npx biome check tests/css_corpus.test.ts tests/leaderboard_window.test.ts` and confirm 0 INFO / 0
  warnings on the touched lines.
- Test-harness change: `npx vitest run tests/architecture.test.ts` (item 5 completeness gate green; add a
  NEGATIVE proof: temporarily remove one BARE_NAMED entry from the curated set and confirm the new
  cross-check would still cover the rest, or remove an on-disk bare core path and confirm it FAILS, then
  revert) + `npx vitest run tests/css_corpus.test.ts` (item 2, corpus byte-identical) + `npx vitest run
  tests/leaderboard_window.test.ts` (item 3) + `npx vitest run tests/client_shell.test.ts` (item 10
  comment; item 4 should move no ids). Then full `npm test` green (source-grep guards can false-pass on a
  narrow run).
- BROWSER-SUITE change (opt-in, decision 14 / item 6): `npm run test:browser` green locally (chromium
  default), including the new delve painter browser test; confirm bare `vitest run` does NOT launch a
  browser. If cohort E lands the matrix, run `BROWSER_MATRIX=1 npm run test:browser` and confirm
  Chromium/Firefox/WebKit + mobile WebKit are green after `npx playwright install`.
- RESPONSIVE / mobile changed (decision 16, items 1/7/8): with `npm run dev` up, run the touched mobile
  E2E scripts (mobile_chat_safe_area, mobile_button_size, mobile_joystick_size, mobile_joystick_deadzone)
  and confirm they pass against :5173 with no GAME_URL override; mobile_button_size / mobile_joystick_size
  now FAIL (exit 1) if a measured control is under 40x40, and mobile_joystick_deadzone finds the deadzone
  row post-entry. Compare against the recorded mobile-baseline-v016.md floor; do not regress a passing
  script. Use `npx ... ; echo $?` carefully (the P17b gotcha: a trailing `; echo $?` masks the real exit
  code; assert on the script's own exit, not the echo).
- WINDOW/CONTROL a11y (decision 10): NO new window/control is added, so this is a NO-REGRESSION row, not
  a new axe build: keyboard_nav.browser.test.ts (now importing the REAL makeWindowFocus) stays green and
  still proves focus-first / Tab-cycle / return-to-opener; the existing a11y.browser.test.ts axe pass
  stays green; item 6 asserts the vendor-window a11y boundary the delve host composes is intact.
- No-magic-values guard (decision 12): unchanged (no painter source edited); item 6's test drives tokens
  via setProperty, not hex literals.
- CI-mirror for the changed surfaces: `biome ci --changed` green (this is where item 14's hud.ts
  clearance is proven: hud.ts as a changed file must pass; vite.config.ts is unchanged so its debt does
  not surface). If cohort E lands, dry-validate the new ci.yml job locally (`npm run test:browser` with
  the matrix), since CI itself runs on push.
- Player text changed: NOT triggered (no new strings); do not run localization_fixes for this phase.
- This is NOT a per-frame phase: NO perf_tour, NO skip-rate assertion, NO hud_perf_budget gate (nothing
  enters hud.update()'s frame path).
Review dispatch (state.md Review Dispatch Matrix): spawn qa-checklist ONLY. Justify the exclusions
explicitly: privacy-security-review does NOT fire (no server/admin/net/secret/deploy file; ci.yml gains
a test job that runs the public browser suite + `npx playwright install`, no secret/auth/SQL, and no new
Math.random/Date.now/performance.now in sim or a pure core); migration-safety does NOT fire (no
*_db.ts DDL or characters.state JSONB); cross-platform-sync does NOT fire (no IWorld / src/sim /
src/net/online.ts / server wire / i18n-matcher change; the windowFocus lift is a UI-internal helper, not
an IWorld member). Prompt qa-checklist for COVERAGE not filtering (did any guard get loosened; is the
windowFocus lift behavior-identical and now the single source the E2E imports; is bare vitest still
browser-free; did the hud.ts biome clearance stay targeted and not reformat the monolith). Do not commit
until it reports no BLOCKING. If a reviewer truncates, resume with: "Stop reading more files. Output the
full report now based on what you've already seen. No more tool calls. Format: BLOCKING / SHOULD-FIX /
NICE-TO-HAVE / VERDICT."

STEP 4 - COMMIT CADENCE:
2 to 5 Conventional Commits with a scope and EXPLICIT paths (never `git add -A`). Suggested:
- `fix(scripts): normalize mobile_chat port + assert touch-target sizes + fix deadzone nav`
  (scripts/mobile_chat_safe_area.mjs scripts/mobile_button_size.mjs scripts/mobile_joystick_size.mjs
  scripts/mobile_joystick_deadzone.mjs).
- `test(ui): clear biome nits, close bare-core gap, add delve painter browser test, fix stale theme comment`
  (tests/css_corpus.test.ts tests/leaderboard_window.test.ts tests/architecture.test.ts
  tests/browser/delve_map_painter.browser.test.ts tests/client_shell.test.ts).
- `refactor(ui): lift windowFocus glue into window_focus.ts so the keyboard E2E imports the real bridge`
  (src/ui/window_focus.ts src/ui/hud.ts tests/browser/keyboard_nav.browser.test.ts).
- `style(ui): clear pre-existing biome findings on hud.ts surfaced by the windowFocus lift`
  (src/ui/hud.ts) - only if item 14's targeted clearance lands; never a monolith --write.
- `ci(ui): run cross-engine browser-mode + axe a11y behind BROWSER_MATRIX` (.github/workflows/ci.yml
  vitest.browser.config.ts) - only if cohort E lands; otherwise record the decline.
- `docs(frontend): reconcile decision-10 wording + stale per-phase bullets`
  (docs/frontend-modernization/state.md docs/frontend-modernization/progress.md) - the PROSE fixes
  (items 9/11/12), separate from this phase's own ledger-row flip in STEP 6.

STEP 5 - ACCEPTANCE CRITERIA:
- [ ] Item 1: scripts/mobile_chat_safe_area.mjs:16 defaults to `'http://localhost:5173'`, matching the
      other mobile_* scripts; it runs against `npm run dev` with no GAME_URL override.
- [ ] Item 2: tests/css_corpus.test.ts no longer uses `css += '\n' + ...`; biome useTemplate INFO cleared
      and the corpus string is byte-identical (test still green).
- [ ] Item 3: tests/leaderboard_window.test.ts reports 0 noTemplateCurlyInString warnings (biome-ignore
      or restructured) with the esc() assertion meaning preserved.
- [ ] Item 4: the windowFocus glue lives in src/ui/window_focus.ts (makeWindowFocus); hud.ts consumes it
      behavior-identically; keyboard_nav.browser.test.ts imports the REAL module and the local
      windowFocusBridge() copy is gone.
- [ ] Item 5: tests/architecture.test.ts cross-checks a curated BARE_NAMED set (xp_bar, swing_timer,
      render cast_bar, etc.) against on-disk + registration; the negative proof fired then reverted; no
      source file renamed.
- [ ] Item 6: tests/browser/delve_map_painter.browser.test.ts executes paintMinimapDelve +
      paintWorldMapDelve against a real 2D context (tokens set via setProperty), asserts the #zone-label
      write + non-blank canvas, and stays opt-in (bare vitest run launches no browser).
- [ ] Item 7: mobile_button_size.mjs + mobile_joystick_size.mjs measure getBoundingClientRect() and exit
      1 when a control is under 40x40 (named const, not a magic literal).
- [ ] Item 8: mobile_joystick_deadzone.mjs finds the Graphics/touch deadzone row post-entry via
      waitForFunction (env.touch resolved before the panel builds); options_view.ts untouched.
- [ ] Item 9: state.md:352 distinguishes in-phase STRUCTURAL a11y (not deferred) from the LIVE/computed
      checks (deferred to and landed in P15b).
- [ ] Item 10: tests/client_shell.test.ts:234-236 no longer claims "no light theme" (the :240
      prefers-color-scheme assertion is unchanged and green).
- [ ] Item 11: the progress.md per-phase bullet for P11b (and the same-stale P7b/P9b/P11a/P12a/P13a/
      P13b/P14a/P14b/P15a/P15b/P17b bullets) match the authoritative table.
- [ ] Item 12: the progress.md per-phase bullet for P2 (and the same-stale P0 bullet) match the
      authoritative table.
- [ ] Item 13: the cross-engine + axe matrix is either LANDED (BROWSER_MATRIX-gated instances + one
      ci.yml job, bare vitest still browser-free) or DECLINED with a recorded reason; decision 14 status
      updated accordingly.
- [ ] Item 14: `biome ci --changed` is green over hud.ts (targeted clearance only, the monolith NOT
      reformatted); vite.config.ts left deferred and untouched.
- [ ] Gate: `npx tsc --noEmit` clean; `npm test` green; `biome check` clean on the new/changed .ts;
      `npm run test:browser` green (chromium); the touched mobile E2E scripts pass against :5173.
- [ ] Gate: no src/sim / server / src/net / headless / IWorld file changed; no new player string / no
      i18n.locales edit; no per-frame / hot-path edit; qa-checklist reports no BLOCKING.

STEP 6 - DOC UPDATES + MEMORY:
- Update progress.md: mark P18f complete with the item list, the files added/changed, and any deferral
  (e.g. item 4 falling back to test-only, or item 13 declined). This is distinct from the items-11/12
  per-phase-bullet reconciliation, which is a scheduled deliverable.
- Update state.md: flip the P18f ledger row to done; record decision 14's resolution (landed behind
  BROWSER_MATRIX, or declined-and-OPEN); note window_focus.ts as a new src/ui module and the architecture
  guard's bare-named cross-check.
- Record surprising rules in memory: that the windowFocus lift made hud.ts a changed file and thus forced
  the targeted (never --write) hud.ts biome clearance; the cross-engine CI decision outcome + the
  BROWSER_MATRIX gate; the `; echo $?` masks-vitest-exit gotcha if re-hit; whether the delve browser test
  needed a screenshot snapshot vs getImageData.
- Do NOT, in this phase, edit the P18-wave packet README or wire the P18 ledger rows (that wiring is
  handled separately); flip only this phase's own row and record memory.

STEP 7 - FINAL RESPONSE:
Report: status (done / done-with-deferral), files created/changed (absolute paths), validation results
(tsc, biome check + biome ci --changed on hud.ts, the vitest files incl the architecture negative proof,
npm test, npm run test:browser incl the new delve test, the touched mobile E2E pass set, and the
cross-engine matrix result or the decline), the windowFocus lift outcome (landed vs fell back to
test-only), the cross-engine CI decision (landed-behind-BROWSER_MATRIX vs declined-and-OPEN), the
qa-checklist verdict, and any deferral. End with exactly:
Next: P18 cleanup wave complete; update the packet README + state.md ledger to mark P18 done.

STOPPING RULES:
- STOP and surface a scope change if any item appears to need a new IWorld member or a sim/server/net
  change (this phase is presentation/test/docs/CI only).
- STOP on the windowFocus lift (item 4) if it cannot be made behavior-identical without leaking new
  coupling, OR if clearing the hud.ts biome debt (item 14) cannot be done as a TARGETED fix and would
  require a monolith-wide `biome --write` (the P5 lesson forbids it): fall back to keeping
  windowFocusBridge() in the test with a structural drift-guard comment, record item 4 as deferred, and
  do NOT touch hud.ts. Never ship a half-applied monolith reformat.
- STOP and DECLINE item 13 (record the reason, leave decision 14 OPEN) if `npx playwright install` cannot
  provision mobile WebKit in the runner or the suite is not green cross-engine; do not force a flaky CI
  gate. Never let wiring the matrix make bare `vitest run` launch a browser.
- STOP if any guard can only be made green by loosening it (dropping the bare-core cross-check, weakening
  the css_corpus completeness, or moving the delve test out of the opt-in browser suite into bare npm
  test): keep the assertion strict and route the failure to its cause.
- Do NOT edit any CSS to make a mobile size assertion pass (item 7 is an E2E-assertion gap, not a CSS
  defect); if a control genuinely measures under 40x40, that is a real finding to surface, not a CSS
  change to slip in here.
```

## Notes for the planner

P18f is the catch-all close of the P18 wave: the test-harness, tooling-script, and docs nits that every
earlier phase logged as accepted-not-fixed or noted-not-done, plus the one real open infrastructure item
(decision 14's cross-engine + axe CI). It is deliberately wide-but-shallow, which is why ULTRACODE is yes
here even though the earlier single-module phases were no: the 14 items live in disjoint files (mobile
scripts, test files, the architecture guard, the browser suite, two docs, and the CI config), so the
generation-fan-out axis pays off, while the one careful cohort (the windowFocus lift) runs sequentially.

Two items carry the only real risk and are coupled on purpose. Item 4 (folding the keyboard E2E's
"faithful copy" of hud.ts windowFocus behind a real src/ui/window_focus.ts module) is the one source
touch, and it is a genuine module-first lift behind the existing focus_manager seam, not a forced
decomposition of the monolith. But touching hud.ts at all turns the pre-existing biome debt (item 14)
from latent to live, because `biome ci --changed` is whole-file, so item 14 is scoped tightly to a
targeted, by-hand clearance of hud.ts's reported findings (never a `biome --write` on the dirty monolith,
per the P5 memory lesson) and leaves vite.config.ts deferred. The stopping rule lets the implementer fall
back to the test-only drift-guard if that clearance is not safely achievable, so the phase never ships a
half-applied monolith reformat.

The remaining items are low-risk and verified open against live code: the :5174 port drift, the two
biome INFO/warning nits, the bare-named pure-core cross-check (test-only option a, not the source
rename), the delve canvas-draw test now satisfiable by the opt-in browser suite the close-out added, the
mobile E2E size assertions and deadzone-nav fix, and the docs reconciliations (decision-10 wording, the
stale "no light theme" comment now that theme.ts ships a user-selectable parchment theme, and the
progress.md per-phase bullet list that still reads "_not started_" for nearly every done phase). The
cross-engine CI item is framed as a decide-and-land-or-decline so the implementer follows the evidence
(it was verified green in P17b before the entangled revert) without forcing a flaky gate. Review dispatch
is qa-checklist only, justified: nothing here touches server/net/IWorld/sim/secret/DDL, so
privacy-security-review, migration-safety, and cross-platform-sync do not fire. This is the last P18
sub-phase; STEP 7 hands back to the wave-level README + ledger close.
