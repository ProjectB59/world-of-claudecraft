# Phase P18c: Visual a11y: forced-colors, focus rings, tokens, target-size

The visual-accessibility cleanup wave (P18) picks up the deferred should-have / nice-to-have / nit
items that the per-window and a11y phases (P11a/P11b, P15a/P15b) logged but did not land. P18c is the
CSS-and-cascade slice: two forced-colors redundant cues (the hostile-vs-friendly target name, the cast
bar fill) that go missing when the OS forces its palette, the residual non-ring hover hex that decision
12 would rather see as tokens, a target-size verification (and likely a small desktop min-height bump)
for the bag cells and social rows the P7b WCAG row named but never measured, the desktop block-vs-flex
display inconsistency on `#bags`, and a live computed-style focus-indicator check for the pre-game shell
controls whose box-shadow rings the outline-scoped Node guard cannot see.

Everything here is PRESENTATION-FIRST: CSS, one hot-path elided class toggle on the target name, a JS
display-value reconcile, opt-in browser tests, and the perf/visual baseline docs the gates read. No
`src/sim`, `server`, `src/net`, `headless`, or `src/world_api.ts` is touched; the target's hostile flag
is already read by the existing color write, so no new `IWorld` surface appears. The changes are
cascade-sensitive (forced-colors overrides, token swaps, a layer-crossing override), so this runs as one
careful pass behind the computed-style + visual-diff gates, exactly like P4a, not a parallel fan-out.

## Starter Prompt

```
This is Phase P18c of the Frontend Modernization v0.16.0 cleanup wave: Visual a11y: forced-colors, focus rings, tokens, target-size.

Model: Opus 4.8, xhigh effort. Harness: Claude Code.

Worktree: /Users/fernando/Documents/wocc-v0.16.0 (branch feature/frontend-modernization-v016, off release/v0.16.0).

ULTRACODE: no. These are six small, cascade-sensitive changes that mostly share three CSS files (base.css forced-colors block, hud.css cast bars, components.css bags/social/tokens) plus one hot-path write and a JS reconcile in hud.ts. Parallel generation would collide on those shared files and fragment the cascade reasoning that one mind must hold (the P4a lesson: a single cascade flip was caught only by a computed-style diff). Run it as ONE careful sequential pass gated by the computed-style + visual-diff checks, with the adversarial verification + qa-checklist at the end. A Workflow SHELL (an Explore agent that reads and returns a summary) is still encouraged to keep the orchestrator under the 40% context ceiling.

Goal: close six deferred visual-a11y items, all presentation-only:
  (1) a non-color (forced-colors) redundant cue for the hostile-vs-friendly target NAME (P11b deferral);
  (2) forced-colors fill shading for the player + target cast bars so cast PROGRESS stays visible when the gradient is stripped (P11a deferral);
  (3) tokenize the residual non-ring hover hex in components.css where an EXACT-value token already exists (the D12-spirit tail P15b left);
  (4) add target-size verification for the bag cells and social rows (the P7b WCAG row named them; P15b never measured them), and a desktop min-height bump if a row measures under the 24px SC 2.5.8 floor;
  (5) reconcile the #bags block-vs-flex display inconsistency (one show-site uses 'block' against a flex-column layout);
  (6) wire a live computed-style browser check for the pre-game shell controls whose box-shadow / border focus indicators the outline-scoped Node guard does not cover.

CRITICAL FRAMING - one item is HOT, the rest are cold/CSS/test/docs. Item 1 lives in hud.ts's per-frame target-frame update block (the same block that already writes the name color and the elite class), so its new write MUST route through the existing elided toggleClass writer and is gated by the per-frame perf row (frameP95 + the hudHotDomWrites budget). The forced-colors CSS rule it feeds is cold (only matches in high-contrast mode). Items 2, 3, 4, 6 are cold CSS / opt-in browser tests; item 5 is a cold JS reconcile (bags is open-on-demand). Do NOT add any of these to hud.update()'s every-frame divider beyond the single elided class toggle item 1 needs.

STEP 0 - PRE-FLIGHT:
- `git status` must be clean. This is a SHARED checkout with concurrent sessions; if it is dirty, STOP and ask the user before touching anything. Do not stash or revert another session's work.
- Confirm you are in /Users/fernando/Documents/wocc-v0.16.0 on branch feature/frontend-modernization-v016.
- Memory scan: read MEMORY.md plus the entries [[frontend-v016-phase15a-a11y-infra]] (the forced-colors net + system-color keywords + the @layer-base !important-crosses-layers trick), [[frontend-v016-phase15b-a11y-audit-tooling]] (the opt-in browser suite, the :focus-visible-never-animated guard, the 24-vs-40 target-size split, axe over mounted painters under both world shapes), [[frontend-v016-phase11a-cast-bars]] and [[frontend-v016-phase11b-target-frame]] (the cast-bar + target-frame deferrals this phase closes), [[frontend-v016-phase4a-css-shell]] (the cascade flip caught only by a computed-style diff), [[frontend-v016-phase17a-harness-floor]] (the hudHotDomWrites=152 anchor is the durable per-frame invariant; a deliberate new per-frame write updates the anchor in perf-baseline-v016.md), phased-packet-qa-cadence, no-em-dashes-or-emojis, shared-worktree-commit-care.

STEP 1 - LOAD CONTEXT (do NOT read hud.ts (14k+ lines) or the HTML entries whole):
Spawn ONE Explore agent to read + summarize back (the orchestrator keeps the summary, not raw dumps):
- docs/frontend-modernization/state.md - locked decisions 4 (presentation-only; the only IWorld signature this packet consumes is leaderboard(), unrelated here), 6 (graphics-tier UI reads the STATIC preset, never the governor; not directly touched but do not regress), 9 (component contract; the target name write stays in the per-frame painter path), 10 (WCAG 2.2 AA: target-size 24px absolute floor + 40x40 mobile floor never weakened; :focus-visible never animated/blurred/transitioned away; forced-colors snapshot), 11 (forced-colors is the ONLY contrast adaptation, no light theme / no prefers-color-scheme), 12 (no magic values in painters; thresholds named; tokens not literals), 15 (ClientWorld-vs-Sim parity; the target hostile flag must be read identically in both), 17 (the per-frame HUD stays a framework-free monolith); the Non-negotiable constraints; the Validation matrix (the CSS/HTML row, the WINDOW/CONTROL row, the PER-FRAME row for item 1, the RESPONSIVE row); the Review Dispatch Matrix.
- this phase file in full.
- The SPECIFIC source ranges this phase touches, with their real V16 line numbers (have the agent confirm they have not shifted):
  - Item 1 (hostile/friendly cue): the target-frame update block hud.ts:4227-4236 (the elite toggleClass at 4230, the name-color setStyleProp at 4232-4236 writing target.hostile ? 'var(--color-hostile)' : 'var(--color-friendly)'); targetNameEl = $('#tf-name') at hud.ts:699; the elided writers setStyleProp (hud.ts ~1268) + toggleClass (hud.ts:1289); the #tf-name element (class uf-name) at play.html:173 and index.html:223; the forced-colors block @media (forced-colors: active) at src/styles/base.css:634 (section marker at base.css:628); tokens --color-hostile #ff6b5e / --color-friendly #9fdc7f at tokens.css:49-50.
  - Item 2 (cast-bar forced-colors fill): the cast-bar rules in hud.css - #castbar (773), #castbar .fill (787-792, background: linear-gradient at 790), #castbar.channel .fill (793-795), #tf-castbar (818), #tf-castbar .fill (830-835, gradient at 833), #tf-castbar.channel .fill (836-838); the 2px var(--border) + 1px #000 outline survive forced-colors already (781-782, 824-825); the same base.css:634 forced-colors block as item 1.
  - Item 3 (tokenize residual hex): components.css raw hex with an EXACT token match: #c0392b (2 occurrences; tokens --color-rage / --color-debuff, both #c0392b) and #998d6a (8 occurrences; token --color-text-muted #998d6a). The full token list is tokens.css:19-142. The .bag-item:hover #ffffff12 (components.css:2251), .bi-count #ccc (2255), .soc-row:hover #ffffff10 (2444), and the .soc-dot status hex (2451-2467) are translucent/state colors with NO exact token; they are OUT of this exact-match cleanup.
  - Item 4 (target-size): tests/browser/target_size.browser.test.ts (mobile-only today: TOUCH_FLOOR=40, body.mobile-touch + 844x390, cases for action-btn / party-frame / party-leave / mobile-more-close / community-toggle / joystick / map-zoom-btn; NO bag/social case); .bag-item at components.css:2235-2249 (padding 3px 4px; font-size 12px; NO desktop min-height, so ~20px desktop); .soc-row at 2430-2438 (padding 6px ~25px) and .soc-tab at 2396-2407 (padding ~27px desktop); the mobile floors body.mobile-touch .bag-item/.soc-tab/.soc-x { min-height: 40px } at hud.mobile.css:935-948.
  - Item 5 (#bags display): the #bags rule at components.css:2166 (flex-direction: column, no explicit display); the JS show-sites in hud.ts that set display = 'flex' (2581, 7751, 9865) versus the lone display = 'block' at 4025 (the pet-feed path); the read-guards that test === 'block' at hud.ts:966 and 3042 (every other site uses !== 'none'); the mobile override body.mobile-touch #bags at hud.mobile.css:918.
  - Item 6 (focus-indicator browser check): tests/focus_visible_guard.test.ts (the OUTLINE-scoped Node scan; lines 14-19 admit a live computed-style version over box-shadow indicators "is not yet wired"; the scan at 88-138); the pre-game shell controls that use outline:none + a box-shadow glow with transition: box-shadow var(--transition-speed) in shell.css - .header-logo-btn:focus-visible (86), .mobile-menu-toggle:focus-visible (126), .nav-link:focus-visible (188), .lang-select-dropdown:focus-visible (248), .homepage-music-btn:focus-visible (290), .donate-cta:focus-visible (346), .wallet-cta:focus-visible (386), .wallet-mini:focus-visible (558); the browser harness tests/browser/_harness.ts (imports src/styles/index.css, host()/cleanup(); page.viewport from vitest/browser).
  - The gate inputs: tests/hud_perf_budget.test.ts ARM3 reads the hudHotDomWrites anchor from perf-baseline-v016.md (readBaselineBypassCount ~128-138; the gate at ~670); the anchor row | hudHotDomWrites | 152 | at perf-baseline-v016.md:100; visual-baseline-v016.md (the P0 screenshot baseline for the cascade-risk diff); tests/css_corpus.test.ts (keyed on the LIVE /* ---------- name ---------- */ 10-dash markers).
The orchestrator keeps the summary. If the working set approaches the ~40% ceiling, STOP and split (land the forced-colors cues first, the tokenize/target-size/display/focus-check tail second).

STEP 2 - ORCHESTRATION + EXECUTE (one careful sequential pass):

Item 1 - hostile/friendly forced-colors redundant cue (HOT path + cold CSS):
- In the target-frame update block (hud.ts:4227-4236), RIGHT AFTER the existing name-color setStyleProp, add ONE elided class toggle on the target name element, mirroring the elite toggle two lines above: this.toggleClass(this.targetNameEl, 'hostile', target.hostile). Keep the inline color write exactly as-is so NORMAL mode renders byte-for-byte unchanged (do NOT move the color into CSS; the inline-style approach preserves the cascade and is the conservative choice for this cascade-sensitive phase). This is a new per-frame elided write: expect the hudHotDomWrites anchor to rise from 152 to 153 if the perf fixture has a target. That is a DELIBERATE new per-frame write; update the anchor in perf-baseline-v016.md (the | hudHotDomWrites | 152 | row -> 153) with a one-line reason and re-run ARM3 to confirm it parses and passes. If the fixture exercises no target and the count stays 152, leave the anchor untouched.
- In the @media (forced-colors: active) block at base.css:634, add a redundant NON-COLOR cue for the hostile target name that survives the forced palette and reads differently from friendly, keyed off the new class, scoped so it cannot recolor the player (#uf-name) or party (#pf-name) names: e.g. #tf-name.hostile { text-decoration: underline; } (underline-on-hostile is a redundant cue that survives forced-colors, needs no i18n, and adds no magic color). The CSS lives ONLY inside the forced-colors block, so normal mode is unchanged. Do not add a new section marker (extend the existing /* ---------- forced-colors ---------- */ section so css_corpus needs no new registration).

Item 2 - cast-bar forced-colors fill shading (cold CSS):
- The .fill gradients (hud.css:790/793/833/836) are stripped in forced-colors, so the fill width that conveys cast PROGRESS becomes invisible against the bar background. In the SAME base.css:634 forced-colors block, give the fills a system-color background so progress stays visible: #castbar .fill, #tf-castbar .fill { background: Highlight !important; }. The !important is load-bearing and consistent with the existing focus-ring net in that block: #castbar lives in @layer hud and the .fill gradient is a normal declaration in that later layer, so an !important from the earlier @layer base is required to win (the same rationale the block already documents for the Highlight focus outline). Highlight reads as an active/filled region; do NOT try to restore the cast-vs-channel hue distinction (the forced palette has no second accent and a pattern hack is out of scope). The 2px var(--border) + 1px #000 outline + the label/timer text already survive, so the bar frame stays legible.

Item 3 - tokenize residual non-ring hover hex (cold CSS, EXACT-match only):
- In components.css, replace each raw hex that is BYTE-IDENTICAL to an existing token value with var(--that-token). Because the value is identical, the rendered output is unchanged by construction (a var() resolving to the same hex), so this carries zero cascade risk for exact matches. Confirmed candidates: #998d6a -> var(--color-text-muted) (8 occurrences) and #c0392b -> the semantically-correct token of --color-rage / --color-debuff (2 occurrences; both are #c0392b today, pick the one whose declaration purpose matches, e.g. debuff styling -> --color-debuff). Enumerate ALL exact-value matches against tokens.css:19-142 and convert them. DO NOT touch a focus-ring outline (the focus_visible_guard already enforces tokens there), DO NOT convert a near-match (a hex one digit off a token is NOT a match; leave it), and DO NOT invent a new token for a token-less hex (that is a design decision out of scope). Landing zero swaps is an acceptable outcome if no exact matches remain; report it.

Item 4 - bag / social target-size verification + desktop min-height (CSS + test):
- Add a DESKTOP-profile describe block to tests/browser/target_size.browser.test.ts (a fine-pointer, non-mobile viewport with NO body.mobile-touch class, a DESKTOP_FLOOR=24 constant) that mounts a .bag-item, a .soc-row, and a .soc-tab into a host and asserts getBoundingClientRect() height >= 24 (SC 2.5.8, the absolute floor). Keep the existing mobile (>=40) cases untouched.
- If the desktop .bag-item measures under 24px (the live padding 3px 4px + 12px font yields ~20px), add min-height: 24px to the .bag-item rule in components.css (inside the existing /* ---------- bags ---------- */ section). The mobile override body.mobile-touch .bag-item { min-height: 40px } (hud.mobile.css:935) is MORE specific and MUST still win, so the 40x40 mobile floor is not weakened. .soc-row (~25px) and .soc-tab (~27px) should already pass; if either measures under 24px, bump it the same way, otherwise leave it.

Item 5 - reconcile the #bags block-vs-flex display (cold JS):
- #bags is a flex-column layout (components.css:2166 flex-direction: column), but the pet-feed show-site at hud.ts:4025 sets display = 'block', which drops the column layout, and the read-guards at hud.ts:966 and 3042 test === 'block', so they never fire renderBags when bags was opened via the common display = 'flex' path. Reconcile to ONE consistent value: change the 'block' at 4025 to 'flex' (matching 2581/7751/9865), and change the two === 'block' read-guards (966, 3042) to !== 'none' (matching every other read-guard). This is presentation-only and removes the inconsistency without a CSS change. Pin it with a tiny source guard (in tests/client_shell.test.ts, the existing source-grep style) asserting hud.ts contains no `#bags').style.display = 'block'` and no `#bags').style.display === 'block'`.

Item 6 - live computed-style focus-indicator browser check (new opt-in test):
- Add a browser-suite test (tests/browser/focus_indicator.browser.test.ts, reusing the _harness style-barrel import + page from vitest/browser) that, for each pre-game shell control whose focus indicator is a box-shadow glow under outline:none (.header-logo-btn, .mobile-menu-toggle, .nav-link, .lang-select-dropdown, .homepage-music-btn, .donate-cta, .wallet-cta, .wallet-mini), mounts the control, focuses it, and asserts getComputedStyle(el).boxShadow !== 'none' (a real focus indicator is present) when focused, complementing the OUTLINE-scoped Node guard. The check VERIFIES the indicator exists and is steady; the transition: box-shadow fades it IN to a steady ring (it is never animated to none on focus), and the forced-colors net forces a steady Highlight outline regardless. If any control's focused box-shadow computes to 'none' or is animated to removal, STOP and surface it (that would be a real FB-lesson violation needing a CSS fix, not just a test).
- Update the tests/focus_visible_guard.test.ts header comment (lines 14-19) to record that the box-shadow indicators are now covered by the opt-in browser check (drop the "is not yet wired" admission); do not weaken the Node scan.

INVARIANTS THIS PHASE MUST KEEP (state.md locked decisions + non-negotiable constraints):
- PRESENTATION-FIRST (decision 4): no src/sim, server, src/net, headless, or src/world_api.ts change. target.hostile is already read by the existing color write; reading it for the class toggle adds NO IWorld surface. If any item appears to need an IWorld/wire/sim change, STOP and surface it.
- forced-colors is the ONLY contrast adaptation (decision 11): no light theme, no prefers-color-scheme branch. The new cues live inside the @media (forced-colors: active) block; normal mode stays byte-for-byte identical.
- :focus-visible rings stay steady and visible (decision 10); item 6 only ADDS coverage, it must not change a ring. The focus_visible_guard Node scan stays green.
- Target-size: 24px absolute floor (SC 2.5.8) everywhere; 40x40 the mobile floor, NEVER weakened (decision 10). The desktop min-height bump must sit UNDER the more-specific mobile 40px override.
- Per-frame discipline (decisions 3, 5): item 1's only hot write is the single elided toggleClass through the host writer; no raw style/class/text writes on the hot path; frameP95 must stay <= the P0 baseline; the hudHotDomWrites anchor is updated in perf-baseline-v016.md if (and only if) it deliberately rises.
- No magic values (decision 12): item 3 swaps to tokens; the forced-colors rules use system-color keywords (Highlight) and a named decoration, not a literal hex. The cast-bar !important matches the documented layer-crossing pattern.
- i18n: this phase adds NO player-visible string (the cues are CSS decoration / system colors, not text), so NO t() key is added and the M16 wordy-English completeness gate does not apply. If you find yourself needing a label, STOP (that is a scope change).
- No em dashes, en dashes, or emojis anywhere (code, comments, commits). Commit with EXPLICIT paths, never git add -A.

Out of scope (do NOT do in this phase):
- Any sim/server/net/IWorld/headless change; any new IWorld member or wire field.
- A light theme or prefers-color-scheme branch (decision 11 forbids it).
- Restoring the cast-vs-channel hue distinction in forced-colors (no second forced accent; a pattern hack is over-engineering).
- Tokenizing near-match or token-less hex, or inventing new tokens (only exact-value matches in item 3).
- Per-window ARIA/structure polish, party-row a11y, the dialog-root / roving-tabindex helpers (those are P18a/P18b); live-region and FocusManager work (that is P18d); render-tier / content-i18n / perf-dedup nits (P18e).
- Re-running the full P15b chrome-wide axe rebuild; this is a targeted gap-fill, not a re-audit.

STEP 3 - VALIDATION + REVIEW (run ONLY the validation-matrix rows this phase's change-types touch):
- Baseline (always): `npx tsc --noEmit`.
- CSS / HTML entry changed (items 1, 2, 3, 4): `npx vitest run tests/css_corpus.test.ts` (completeness over the live 10-dash markers; no new section expected since the cues extend existing sections) + `npx vitest run tests/client_shell.test.ts` (incl the item-5 source guard) + `npm run build` (all 4 entries: index, play, admin, guide) + the backdrop-filter survival check on the built CSS + `biome check` on the changed CSS + a screenshot-diff against the P0 visual baseline (visual-baseline-v016.md) for the cascade-risk cues: NORMAL mode must be byte-identical (only forced-colors and the bag min-height may differ), and the forced-colors snapshot shows the hostile underline + the cast-bar fill.
- WINDOW or CONTROL changed (MANDATORY, decision 10): `npm run test:browser` for the a11y rows this phase moves - the forced-colors snapshot (axe + the new cues visible), the target_size desktop + mobile cases (item 4), and the new focus_indicator computed-style check (item 6); plus the no-magic-values posture (the focus_visible_guard Node guard still green; item 3 introduces no TS painter hex). Confirm a bare `vitest run` does NOT launch a browser (the suite stays opt-in).
- PER-FRAME (item 1 only): `npm run` the perf_tour harness and assert frameP95 <= the P0 baseline; `npx vitest run tests/hud_perf_budget.test.ts` (ARM3 hudHotDomWrites against the anchor: it passes at 152 if the count held, or at 153 after you bump the perf-baseline-v016.md anchor with its reason); the elided-writer routing assertion (the new toggleClass is routed through the host writer, no raw class write added to the hot path).
- RESPONSIVE / mobile (item 4): confirm the mobile target_size cases still pass at >=40 (the desktop min-height did not weaken the mobile floor); a CSS-text sanity that body.mobile-touch .bag-item still carries min-height: 40px.
- Player text: NONE changed, so tests/localization_fixes.test.ts is NOT required for this phase (state it in the report).
- New .ts module (the focus_indicator browser test): `biome check` on it.
- Full pre-commit sanity: `npm test` (the Node guards live in the suite) + `npm run build`.
Review dispatch (state.md Review Dispatch Matrix): spawn qa-checklist ONLY. privacy-security-review does NOT fire (no server/admin/net, no new randomness in sim/a pure core). migration-safety does NOT fire (no DB/DDL/JSONB). cross-platform-sync does NOT fire (IWorld unchanged; reading the already-landed target.hostile in a painter is not an IWorld change, decision 15 parity is covered by the target frame already rendering under both world shapes). Prompt the reviewer for COVERAGE not filtering; do not commit until it reports no BLOCKING. Resume a truncated reviewer with: "Stop reading more files. Output the full report now based on what you've already seen. No more tool calls. Format: BLOCKING / SHOULD-FIX / NICE-TO-HAVE / VERDICT."

STEP 4 - COMMIT CADENCE (2-5 Conventional Commits, scope + EXPLICIT paths, never git add -A):
- `feat(ui): forced-colors cues for the target reaction name + cast-bar fill` (src/styles/base.css, src/ui/hud.ts, docs/frontend-modernization/perf-baseline-v016.md if the anchor moved).
- `style(css): tokenize exact-match residual hex + desktop bag-cell min-height` (src/styles/components.css).
- `fix(ui): reconcile the #bags flex-vs-block display + render guards` (src/ui/hud.ts, tests/client_shell.test.ts).
- `test(ui): browser target-size + focus-indicator computed-style checks` (tests/browser/target_size.browser.test.ts, tests/browser/focus_indicator.browser.test.ts, tests/focus_visible_guard.test.ts).
- `docs(frontend): record P18c visual-a11y cleanup in progress.md + state.md ledger` (docs/frontend-modernization/progress.md, docs/frontend-modernization/state.md).
(Use the ACTUAL files you touch; some commits may be empty if an item lands as a no-op, e.g. item 3 finds no exact match. Do not invent edits to fill a commit.)

STEP 5 - ACCEPTANCE CRITERIA (all verifiable + green):
- [ ] `npx tsc --noEmit` is clean.
- [ ] Item 1: the target name carries a forced-colors NON-COLOR cue (e.g. #tf-name.hostile underline in the base.css forced-colors block) driven by an elided toggleClass on targetNameEl; NORMAL mode renders byte-for-byte unchanged (the inline color write is untouched); the hot write routes through the host toggleClass writer; the hudHotDomWrites budget passes (anchor held at 152, or bumped to 153 in perf-baseline-v016.md with a recorded reason) and frameP95 <= the P0 baseline.
- [ ] Item 2: #castbar .fill and #tf-castbar .fill get a system-color background (Highlight) in the forced-colors block so cast/channel PROGRESS stays visible when the gradient is stripped; the !important layer-crossing override is in place; normal mode unchanged.
- [ ] Item 3: every exact-value hex match in components.css (#998d6a -> --color-text-muted, #c0392b -> --color-rage/--color-debuff, plus any others enumerated) is now a token var with zero rendered change; near-match and token-less hex are left alone; no new token invented. (Zero swaps is acceptable if none remain; report it.)
- [ ] Item 4: tests/browser/target_size.browser.test.ts has DESKTOP cases for .bag-item / .soc-row / .soc-tab asserting >=24px; .bag-item carries a desktop min-height: 24px (if it measured under), and the mobile body.mobile-touch .bag-item min-height: 40px still wins (mobile cases still >=40).
- [ ] Item 5: every #bags show-site uses display = 'flex' (the 'block' at 4025 fixed) and every read-guard uses !== 'none' (966, 3042 fixed); a source guard pins the absence of the 'block' patterns.
- [ ] Item 6: tests/browser/focus_indicator.browser.test.ts focuses each box-shadow-indicator shell control and asserts a present (non-'none') steady focus indicator; the focus_visible_guard.test.ts header is updated to point at the now-wired browser check; the Node scan still passes.
- [ ] forced-colors snapshot + axe (npm run test:browser) clean over the touched windows under both world shapes; a bare `vitest run` launches no browser.
- [ ] css_corpus, client_shell, the backdrop-filter survival check, biome on the changed CSS + the new .ts, and the P0 visual-diff (normal mode byte-identical) all green.
- [ ] No new player-visible string / t() key added; tests/localization_fixes.test.ts not required and not regressed.
- [ ] PRESENTATION-FIRST held: no src/sim / server / src/net / headless / src/world_api.ts change; no i18n.locales overlay edited.
- [ ] `npm test` and `npm run build` (4 entries) are green.
- [ ] qa-checklist reviewer reports no BLOCKING.

STEP 6 - DOC UPDATES + MEMORY:
- progress.md: mark P18c done; list the six items (and any that landed as a no-op, e.g. item 3 if no exact match), the files touched, the hudHotDomWrites anchor outcome (152 held vs 153 bumped), and that no new t() key was added.
- state.md: flip the P18c ledger row to done; note the forced-colors cues (hostile underline + cast-bar Highlight fill), the exact-match tokenization, the bag desktop 24px min-height + the new desktop target-size cases, the #bags display reconcile, and the new focus-indicator browser check; if the perf anchor moved, record 152 -> 153 with its reason.
- Memory: record the surprising rules: the forced-colors !important-crosses-@layer trick reused for the cast fill; that the hostile cue costs one hot-path elided write and may bump the durable hudHotDomWrites anchor; that exact-value hex tokenization is cascade-safe by construction (var resolves to the same hex) while near-matches are not; that the #bags inconsistency was a JS toggle ('block' vs 'flex'), not a CSS rule; and that the box-shadow shell focus indicators fade IN via transition but land on a steady ring (the Node guard is outline-scoped by design, the browser check covers the rest).

STEP 7 - FINAL RESPONSE:
Report: status (done / done-with-deferral), files created/changed (absolute paths), validation results (tsc, css_corpus, client_shell, build x4, backdrop survival, biome, the P0 visual-diff, the npm run test:browser forced-colors/target-size/focus-indicator rows, the perf_tour frameP95 + hudHotDomWrites outcome, npm test), the qa-checklist verdict, the per-item outcome (incl any no-op like item 3), and any deferral. End with exactly:
Next: phase-18d-live-regions-focus.md

STOPPING RULES:
- STOP and surface a SCOPE CHANGE if any item appears to need a new IWorld member, a wire/sim/server/net change, or a new player-visible string (this phase is presentation-only and adds no t() key).
- STOP if item 1's class toggle pushes frameP95 above the P0 baseline (a class toggle is trivial; if it does, something else is wrong) - do not relax the perf budget to pass.
- STOP if a forced-colors rule changes NORMAL-mode rendering (the cues must live inside @media (forced-colors: active); the visual-diff must show normal mode byte-identical).
- STOP if the desktop bag min-height weakens the mobile 40x40 floor (the mobile override must still win) - never weaken a target-size floor.
- STOP if item 3 cannot find an exact token match and you are tempted to swap a near-match or invent a token: leave the hex and report zero swaps; do not change a rendered color.
- STOP if a shell control's focused box-shadow computes to 'none' or is animated to removal (a real FB-lesson violation): surface it; do not paper it over in the test.
```

## Notes for the planner

P18c is the cascade-sensitive slice of the P18 visual-a11y cleanup wave: it closes the two forced-colors
deferrals that P11a (cast-bar fill) and P11b (hostile-vs-friendly name) explicitly punted to P15, plus
the residual D12-spirit hex, the P7b-named-but-never-measured bag/social target-size, the `#bags`
block-vs-flex display inconsistency, and the box-shadow focus-indicator coverage gap the P15b honesty
fix admitted in the `focus_visible_guard` header. All six were verified still-open against live source.

Two grounding corrections worth flagging. First, the `#bags` item was logged as a CSS inconsistency
across `components.css` and `hud.mobile.css`, but the live tree shows the real defect is the JS toggle:
one show-site (`hud.ts:4025`, the pet-feed path) sets `display = 'block'` against a `flex-direction:
column` layout, and two read-guards (`hud.ts:966`, `3042`) test `=== 'block'` so they never re-render
when bags is opened via the common `flex` path. The fix is a JS reconcile, not a CSS rule change, which
the packet states so the implementer does not chase the wrong file. Second, the hostile/friendly cue is
the only HOT item: it adds one elided `toggleClass` to the per-frame target-frame block, which can lift
the durable `hudHotDomWrites` anchor from 152 to 153. The packet treats that as a deliberate,
documented anchor update (the perf budget test literally invites it) rather than a regression, and keeps
the inline color write untouched so normal mode stays byte-identical, which is the conservative choice
for a phase whose whole risk is the cascade. The exact-match-only framing for the hex tokenization makes
item 3 safe by construction (a `var()` resolving to the same hex cannot move a pixel), so the
visual-diff gate is a backstop, not the primary safety net. ULTRACODE is `no`: the six items share
`base.css`, `components.css`, and `hud.css`, so a parallel fan-out would collide and fragment the
cascade reasoning; this runs as one careful pass like P4a, gated by the computed-style + visual-diff
checks, with qa-checklist as the sole review row (no server/net/IWorld/sim/DB surface is touched). The
next file is phase-18d-live-regions-focus.md.
