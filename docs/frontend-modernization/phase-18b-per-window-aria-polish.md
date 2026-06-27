# Phase P18b: Per-window interactive ARIA and structure polish

Pick up the deferred per-window WCAG nice-to-haves the P7-P15 phases recorded but did not close: the
social tab strip still advertises toggle-button semantics instead of a real ARIA tablist, the bags
window drops focus to `<body>` on close (and its ad-hoc prompts do not inert the grid behind them), the
character preview reuses the title's level/class string as its `role=img` name, and three party-row
items survive from P11c (the leader star leaks into the row accessible name, raid-group membership is
never conveyed to a screen reader, and a focused dead / out-of-range row dims its focus ring). Two
test-coverage gaps round it out: the new char-window close path is unpinned, and the social typeahead
combobox is only axed collapsed.

These are presentation-first cleanups: DOM attributes, one CSS rule, two English-only labels, and
tests. Most are COLD windows (social / bags / char, open-on-demand, no perf gate); the two party-row
items live on the PER-FRAME `party_frames_painter` hot path, so they carry the perf gate and the
elided-writer routing rule and nothing else does. Nothing here touches `src/sim`, `server`, `src/net`,
`headless`, or `src/world_api.ts`: the work is entirely in `src/ui/` + `src/styles/` + `tests/`.

## Starter Prompt

```
This is Phase P18b of the Frontend Modernization v0.16.0 cleanup wave (P18): Per-window interactive ARIA and structure polish.

Model: Opus 4.8, xhigh effort. Harness: Claude Code.

Worktree: /Users/fernando/Documents/wocc-v0.16.0 (branch feature/frontend-modernization-v016, off release/v0.16.0).

ULTRACODE: yes. These nine items split cleanly along window boundaries (social, bags, char, party) plus two test slices, and the slices touch disjoint source files, so this is the multi-slice batch shape the canonical workflow flags for a Workflow fan-out: one slice per window, then adversarial verify, then fold each fix into its own module. The only shared sink files are tests/browser/a11y.browser.test.ts (social + char axe cases) and the party trio's converging edits to party_frames_painter.ts + party_frame_row.ts, which the orchestrator integrates serially.

Goal: close the deferred per-window WCAG nice-to-haves recorded across the P7b / P8b / P11c / P15b ledgers and memory:
  1. Social tabs: convert the friends/guild/ignore/raid strip from aria-pressed buttons to a real role=tablist / role=tab / role=tabpanel pattern with roving tabindex + Arrow/Home/End, mirroring talents_window.
  2. Bags close: give the window focus-return on close (WCAG 2.4.3) without installing a focus trap (bags is a non-modal companion of vendor/trade/market).
  3. Bags prompt: mark the bag grid behind the discard/sell prompt inert while the modal prompt is open.
  4. Char preview: give the role=img 3D-preview host a distinct accessible name instead of duplicating the title's level/class subtitle.
  5. Party leader star: render the leader glyph in its own aria-hidden span so it stops leaking into the row's role=button accessible name.
  6. Party raid group: convey a raid member's group to screen readers via a new English-only label and a visually-hidden span.
  7. Party focus ring: reset opacity to 1 on a focused dead / out-of-range row so its focus ring is not drawn dimmed.
  8. Pin the closeManagedWindow 'char-window' focus-return case in a source guard.
  9. Add an axe case for the social typeahead combobox in its EXPANDED listbox state (with a moving aria-activedescendant).

CRITICAL FRAMING - HOT vs COLD, and the bags no-trap rule:
- Items 1, 2, 3 (social, bags) and item 4 (char) are COLD windows: open-on-demand, NOT in hud.update()'s frame path. NO perf gate applies to them.
- Items 5 and 6 edit src/ui/party_frames_painter.ts, which IS the per-frame party hot path (it runs from updatePartyFrames in hud.update()). Every NEW DOM write they add (the leader-star text, the group-label text) MUST route through the host's elided writer facet (this.writers.setText), never a raw textContent / setAttribute / className. The aria-hidden on the star span and the visually-hidden class on the group span are set ONCE at row build time (party_frame_row.ts), not per frame. These two items carry the PER-FRAME perf gate (frameP95 <= P0 baseline AND hudHotDomSkipRate >= P0 baseline) and the no-raw-write routing assertion; the cold items do not.
- Item 2 (bags focus-return) must NOT install a Tab focus trap. Bags is a NON-MODAL companion window that rides alongside the vendor / trade / market windows; trapping focus inside #bags would break the inventory cluster. Use a lightweight capture-and-return only: capture the opener via this.focusManager.activeFocusable() and return via this.focusManager.restore(target), NOT the trap-installing windowFocus('#bags') helper. If bags appears to need a real trap, STOP and surface it.

STEP 0 - PRE-FLIGHT:
- `git status` must be clean. This is a shared checkout; if it is not clean, STOP and ask the user before touching anything. Do not stash or revert a concurrent session's work.
- Confirm you are in /Users/fernando/Documents/wocc-v0.16.0 on branch feature/frontend-modernization-v016.
- Memory scan: read MEMORY.md and the entries [[frontend-v016-phase7b-social-bags]] (social repaints on the 500ms slowHud cadence behind a struct-sig diff-gate, delegated body listener), [[frontend-v016-phase11c-party-pool]] (the keyed-pool party painter, listeners-once + LIVE-MUTABLE-slot rule, the elided setStyleProp/toggleClass routing, the deferred-to-P15a party a11y items: leader-glyph split, raid-group, focus-ring opacity), [[frontend-v016-phase15a-a11y-infra]] (the ONE FocusManager: activeFocusable + restore + open/trap, FOCUSABLE_SELECTOR, Esc stays with closeAll), [[frontend-v016-phase15b-a11y-audit-tooling]] (the opt-in browser axe suite over MOUNTED painters in both world shapes; aria-labelledby shadows aria-label; per-frame dialog-aria set once), [[no-em-dashes-or-emojis]], [[shared-worktree-commit-care]].

STEP 1 - LOAD CONTEXT (do NOT read hud.ts (14k+ lines) or the HTML entries whole):
Spawn ONE Explore agent to read + summarize back (the orchestrator keeps the summary, not raw dumps):
- docs/frontend-modernization/state.md. Cite by section: locked decisions 4 (presentation-only), 5/5a (per-frame write-elision + the six elided writers for the party items), 6 (PainterHost two facets), 9 (component contract: unit_frame family instances for party), 10 (WCAG 2.2 AA on the chrome, target-size 24px floor / 40x40 mobile, :focus-visible never animated away), 11 (forced-colors only), 12 (no magic values in painters), 15 (ClientWorld-vs-Sim parity for cores), 16 (responsive gated), 17 (persistent monolith); the Non-negotiable constraints; the Validation matrix (the WINDOW/CONTROL row is MANDATORY, and the PER-FRAME perf-gate row fires for the party items only); the Review Dispatch Matrix.
- This phase file (phase-18b-per-window-aria-polish.md) in full.
- The SPECIFIC source ranges this phase touches, with their real V16 line numbers (read narrowly, not whole files):
  - SOCIAL: src/ui/social_window.ts:212-230 (the render() innerHTML: .soc-tabs at 214, the four .soc-tab aria-pressed buttons at 215-218, .soc-body at 220), :491-500 (wireChrome, the .soc-tab click loop to extend with roving keydown), :469-483 (the typeahead combobox markup), :599-670 (renderSuggest + moveSuggest, the aria-expanded / aria-activedescendant state for item 9). The TEMPLATE to mirror for item 1: talents_window.ts:194-197 (role=tablist + role=tab + aria-selected + roving tabindex + aria-controls + role=tabpanel) and :204-229 (the Arrow/Home/End roving handler).
  - BAGS: src/ui/bags_window.ts:83-111 (BagsWindowDeps, where captureFocus/restoreFocus deps are added), :113-127 (the class head, where openerFocus + close() go), :360-414 (installPromptDialog, the single chokepoint for both prompts, closeAndReturn at 387-390 for the inert clear). hud.ts:2536-2563 (the BagsWindow ctor deps, where the non-trapping focus closures are wired), :7861-7877 (toggleBags: the hide branch 7863-7868 and the open branch 7869-7877), :1571-1578 (closeManagedWindow 'bags' case), :675 (the FocusManager instance), :2995-3032 (windowFocus, the TRAPPING helper to NOT use for bags), :86-94 of focus_manager.ts (activeFocusable + restore).
  - CHAR: src/ui/char_window.ts:144 (the title subtitle, keep its levelClass) and :148 (#char-model-preview role=img aria-label, the one to change). src/ui/i18n.catalog/hud_chrome.ts:95-104 (the unitFrame block, the model for a Title-Case English-only key).
  - PARTY: src/ui/party_frame_row.ts:42 (PARTY_LEADER_GLYPH), :61-67 (PartyRow interface), :120-214 (createPartyRow: the .lead span at 162-164, the family painter wiring at 187-205 where level: lead is passed). src/ui/party_frames_painter.ts:88-124 (sync, the call into paintRow), :168-197 (paintRow: levelText at 184). src/ui/party_frames.ts:7-24 (selectPartyFrameMembers sorts by group when info.raid; PartyFrameMember carries member.group) and :43-60 (partyFrameSignature already encodes group + raid, so a group/raid change flips the sig and forces a sync). hud.ts:9310-9332 (updatePartyFrames, the sync call at 9331). src/styles/hud.css:3178-3196 (the .party-frame rules: .dead 3193, .oor 3195, :hover ... opacity:1 at 3196; .pfm-meta gap:4px at 3184; .lead at 3185). src/styles/shell.css:3077-3081 (the global [tabindex="0"]:focus-visible ring) and :2706-2709 (the .visually-hidden utility).
  - TESTS: tests/social_window.test.ts (item 1 source/DOM guard), tests/browser/a11y.browser.test.ts:298-350 (the social describe block + its collapsed-combobox comment, for item 9) and :357-390 (the char case, for item 4), tests/client_shell.test.ts:82 (the hudTs = readFileSync of hud.ts, the home for item 8's source grep), tests/party_frames_painter.test.ts (items 5/6 routing + sig assertions).
The orchestrator keeps the summary. The working set fits well under the 40% ceiling; if it does not, land the party slice (items 5/6/7, the perf-gated one) first, then the cold windows.

STEP 2 - CHOOSE ORCHESTRATION + EXECUTE (ultracode Workflow, fan out EXPLICITLY):
Four PARALLEL window slices plus a serial test-integration pass. Each slice FIXES its items and folds the fix into the right module; an adversarial verifier confirms the fix and that no green work regressed. Reconcile the shared sink files (a11y.browser.test.ts, and the party trio's converging files) serially.

  SLICE A - SOCIAL (items 1, 9):
  - Item 1 (tablist): in social_window.ts:214 change `<div class="soc-tabs">` to `<div class="soc-tabs" role="tablist" aria-label="${esc(t('hud.social.title'))}">`. For each .soc-tab button at 215-218 REMOVE `aria-pressed="..."` and ADD `role="tab" aria-selected="${tab === '<name>' ? 'true' : 'false'}" tabindex="${tab === '<name>' ? '0' : '-1'}" aria-controls="soc-body-panel"`; keep the existing `on` class (the styling stays; aria-selected runs parallel to it, byte-faithful to .soc-tab.on in components.css:2419). At :220 change `<div class="soc-body"></div>` to `<div class="soc-body" id="soc-body-panel" role="tabpanel"></div>` (refreshList queries by .soc-body class at :236, so the class must stay). In wireChrome (:491-500), where the .soc-tab click loop lives, add the roving keydown handler modeled on talents_window.ts:204-229: collect the tabs into an array, and on ArrowRight/ArrowLeft/Home/End preventDefault, compute the next index, set this.tab, this.notice = null, this.lastStruct = this.structSig(), call this.render(), then focus the freshly active tab (`(el.querySelector('.soc-tab.on') as HTMLElement | null)?.focus()`) since render() rebuilds the strip. Keep the existing click handler behavior identical. components.css needs no change (the `on` class already styles the active tab); do NOT add a new CSS section.
  - Item 9 (axe expanded combobox): add an `it(...)` to the `describe('axe: social window', ...)` block in tests/browser/a11y.browser.test.ts after the collapsed case (:326-349). Mount the online friends tab, stub world().searchCharacters(q) to resolve with 2-3 results plus a name that is NOT the player, dispatch an 'input' event on `input[role="combobox"]` with a non-empty value, await the SUGGEST_DEBOUNCE_MS debounce (real timers run in browser mode), then dispatch an ArrowDown keydown so moveSuggest sets aria-activedescendant. Assert: aria-expanded === 'true'; the listbox has >= 1 `[role="option"]` child; aria-activedescendant resolves to a rendered option id inside the listbox; and expectClean(root) reports ZERO serious/critical. Update the comment at :298-303 to record that the expanded state is now axed. Keep this case in the OPT-IN browser suite only (it must not run under a bare vitest run).

  SLICE B - BAGS (items 2, 3):
  - Item 2 (focus-return, NO trap): add `captureFocus(): HTMLElement | null;` and `restoreFocus(target: HTMLElement | null): void;` to BagsWindowDeps (bags_window.ts:83-111). Add `private openerFocus: HTMLElement | null = null;` to the class (near :114). Add a public method to capture the opener on open (e.g. `noteOpener(): void { this.openerFocus = this.deps.captureFocus(); }`) and a `close(): void` that: returns early if #bags is already hidden; sets root display to 'none'; calls this.deps.hideTooltip() and this.deps.cancelPetFeed() (preserve the side effects the inline path had); calls this.deps.restoreFocus(this.openerFocus); then nulls openerFocus. In the hud.ts BagsWindow ctor (:2536-2563) wire the NON-TRAPPING closures: `captureFocus: () => this.focusManager.activeFocusable()` and `restoreFocus: (target) => this.focusManager.restore(target)` (do NOT spread ...this.windowFocus('#bags'); that installs a Tab trap and would break the bags+vendor cluster). In toggleBags (:7861): in the open branch (after :7869 closeOtherWindows / before `el.style.display = 'flex'`) call `this.bagsWindow.noteOpener()`; in the hide branch (:7863-7868) replace the inline `el.style.display='none'; this.hideTooltip(); this.cancelPetFeed();` with `audio.bagClose(); this.bagsWindow.close();` (keep the bagClose audio, let close() do the hide + tooltip + petfeed + focus return). In closeManagedWindow 'bags' (:1571-1578) keep the mobile-touch vendor branch exactly, and replace the else block's inline hide with `this.bagsWindow.close();`. The other (pointer-driven) show paths (vendor :7751, mobile :9865, :4025) are out of scope: close() with a null opener is a safe no-op restore. Do NOT change them.
  - Item 3 (inert background): in installPromptDialog (bags_window.ts:360-414), set the bags root inert while the prompt is open and clear it on close. After setting role/aria-modal (around :371-372) add `const bagsRoot = this.deps.root(); bagsRoot.inert = true;`. In closeAndReturn (:387-390) clear it BEFORE returning focus, so a focus into a no-longer-inert subtree is not dropped: `close(); bagsRoot.inert = false; opener?.focus();`. This single chokepoint covers BOTH the discard and the sell prompt. Use the `inert` property (TS lib.dom typed); this is a cold open-on-demand path, raw DOM is fine here.

  SLICE C - CHAR (item 4):
  - Add a new English-only key to hud_chrome.ts (next to the unitFrame block at :95-104), e.g. `character: { modelPreview: 'Character Model Preview' }`. Title Case keeps it non-wordy (no run of four+ lowercase words) so the M16 completeness gate does not flag it as untranslated English in zh/ja/ko/ru.
  - In char_window.ts:148 change the role=img aria-label from `t('itemUi.equipment.levelClass', { level, className })` to `t('hudChrome.character.modelPreview')`. Leave the title subtitle at :144 unchanged (it keeps levelClass). The preview host now has a distinct preview-specific name and no longer duplicates the title.
  - Extend the char axe case (a11y.browser.test.ts:357-390): assert the #char-model-preview aria-label differs from the #char-title subtitle text. If tests/char_window.test.ts asserts the old preview aria-label anywhere, update it.

  SLICE D - PARTY (items 5, 6, 7) - the party trio converges on two TS files + one CSS file; build it as one coherent sub-slice:
  - Item 5 (leader star out of the accessible name): in party_frame_row.ts:162-164 make `.lead` a WRAPPER holding two inline children instead of the level element itself: an aria-hidden `.lead-star` span and a `.lead-num` span. Build them, `leadStar.setAttribute('aria-hidden', 'true')` ONCE here, `lead.append(leadStar, leadNum)`, then `meta.append(deadBadge, combatBadge, oorBadge, lead)` as before. Pass `level: leadNum` (not `lead`) to the UnitFramePainter at :187-205. Add `leadStar: HTMLElement` to the PartyRow interface (:61-67) and return it from createPartyRow (:207-213). In party_frames_painter.ts:184 change `levelText` from `` `${leader === m.pid ? PARTY_LEADER_GLYPH : ''}${m.level}` `` to `String(m.level)` (the family writes leadNum), and add (routed through the elided writer) `this.writers.setText(row.leadStar, leader === m.pid ? PARTY_LEADER_GLYPH : '');` in paintRow. The star + number stay visually adjacent because `.lead` is a single flex child of `.pfm-meta` (the gap:4px at hud.css:3184 applies BETWEEN flex children, and leadStar/leadNum are inline children INSIDE .lead, not flex children), so the rendered "star then number" is byte-faithful. Verify no gap appears; if the browser renders inter-span whitespace, the spans are created without text nodes between them so none should. PARTY_LEADER_GLYPH stays the named constant.
  - Item 6 (raid-group to a screen reader): extend the painter API to carry the raid flag and emit a visually-hidden group label. In party_frames_painter.ts change `sync(members, leader)` to `sync(members, leader, raid: boolean)` and thread it into `paintRow(row, m, leader, raid)`. Update the call site hud.ts:9331 to `this.partyFramesPainter.sync(others, info.leader, info.raid)`. Add a `.pfm-group visually-hidden` span to the row in party_frame_row.ts (append it as the last child of nameRow or meta so it joins the role=button accessible name; use the existing `.visually-hidden` class from shell.css:2706 so it is in the a11y tree but not visible). Add `group: HTMLElement` to PartyRow and return it. Add a NEW English-only key hudChrome.unitFrame.partyGroup = 'Group {n}' to hud_chrome.ts (Title Case + a single word before the placeholder keeps it non-wordy for M16). In paintRow, setText the group span (elided): `this.writers.setText(row.group, raid ? t('hudChrome.unitFrame.partyGroup', { n: formatNumber(m.group, { maximumFractionDigits: 0 }) }) : '')`. Import t + formatNumber into party_frames_painter.ts. RECYCLE-SAFE re-localization: store the last synced raid flag on the painter (private lastRaid) and re-emit the group label in relocalize() for every pooled row from slot.member.group + lastRaid (a language switch does not flip partyFrameSignature, so without this the group label would stay in the old language, exactly like the badge tooltips relocalize already fixes). Keep the work allocation-light: it runs only on a real sync (the Hud short-circuits an unchanged party) or on a language switch.
  - Item 7 (focus-ring opacity): in src/styles/hud.css, immediately after the `.party-frame:hover { ... opacity: 1; }` rule at :3196, add `.party-frame:focus-visible { opacity: 1; }`. This mirrors the hover opacity reset so a keyboard-focused dimmed (dead opacity 0.7 / out-of-range opacity 0.45) row draws the global ring (shell.css:3077 [tabindex="0"]:focus-visible) at full opacity. No shell.css change is needed; the fix belongs in hud.css where the party opacity rules live. This is a single declaration inside the existing party section, so it adds no new 10-dash css_corpus section.

  TEST INTEGRATION (serial, after the slices):
  - Item 8 (pin the char-window close path): tests/client_shell.test.ts already reads hud.ts into hudTs (:82). Add a source-grep guard asserting hudTs contains the closeManagedWindow 'char-window' case routed through `this.charWindow.close()` (and, to lock the family, the sibling social/arena/talents/spellbook close() routes), mirroring the existing DOM-id grep style in that file. Optionally assert char_window.ts / market_window.ts close() reference restoreFocus.
  - Update tests/party_frames_painter.test.ts for the new sync(members, leader, raid) signature: assert the leader star is set on the leadStar span (not the level element) so the level element holds only the number; assert the group label is set only when raid is true; and assert BOTH new writes route through the elided writers (no raw textContent / setAttribute / className on the hot path), extending the existing no-raw-write routing test.

INVARIANTS THIS PHASE MUST KEEP (state.md locked decisions + non-negotiable constraints):
- PRESENTATION-ONLY (decision 4): no IWorld / src/sim / server / src/net / headless / src/world_api.ts change. Changing a painter method signature (sync gains a raid arg) and adding window deps are src/ui-internal, not an IWorld change. If any item appears to need a new IWorld member or a wire field, STOP and surface it.
- PER-FRAME write-elision (decisions 5, 5a): the two party hot-path writes (leader star, group label) route through this.writers.setText; NO raw style / className / innerHTML / setAttribute / textContent on the party hot path. aria-hidden (leadStar) and the visually-hidden class (group span) are set ONCE at build time in party_frame_row.ts, never per frame.
- Bags is NON-MODAL: capture-and-return focus only, NO Tab trap (do not use windowFocus('#bags')).
- No magic values in painters (decision 12): PARTY_LEADER_GLYPH stays a named constant; no literal hex/px/color enters a painter. The new CSS rule (item 7) uses the existing opacity value 1 already present on the sibling :hover rule.
- WCAG 2.2 AA (decision 10): target-size 24px floor / 40x40 mobile is never weakened; :focus-visible is never animated/blurred/transitioned away (item 7 only resets opacity, it does not animate the ring).
- i18n: the two NEW labels (hudChrome.character.modelPreview, hudChrome.unitFrame.partyGroup) are English-only keys in src/ui/i18n.catalog/hud_chrome.ts, Title Case + non-wordy (lowercase run <= 3 words) for M16. Never edit src/ui/i18n.locales/<lang>.ts. No concat, no `?? 'English'` fallback, no default param. The group number goes through formatNumber.
- forced-colors only (decision 11); no light theme.
- No em dashes, en dashes, or emojis anywhere (code, comments, commits). Use commas, colons, parentheses, or "to" for ranges.
- Shared worktree: commit with EXPLICIT paths, never `git add -A`.

Out of scope (do NOT do in this phase):
- The shared a11y INFRA (focus manager, skip links, live regions): that is P15a; consume it, do not rebuild it. The roving_tabindex / dialog-root helper extraction is P18a; do NOT pre-empt it (item 1's roving handler is inline-per-talents-precedent, not a new shared module).
- Any other window's tab/combobox/focus work not in the nine items.
- Live-region / FocusManager-unification items (target-name announce, FCT feed, chat live region, wallet picker): those are P18d.
- Visual a11y tokens / forced-colors fill / target-size verification: those are P18c.
- Any new IWorld member, wire field, sim/server/net change, or graphics-governor wiring.
- Rebuilding selectPartyFrameMembers (already pure; consume it) or the unit_frame family (instantiate it).

STEP 3 - VALIDATION + REVIEW:
Run ONLY the validation-matrix rows this phase's change-types touch (state.md "Validation matrix"):
- Baseline (always): `npx tsc --noEmit`.
- New / changed .ts: `biome check` on every changed module (social_window.ts, bags_window.ts, char_window.ts, party_frame_row.ts, party_frames_painter.ts, hud.ts, hud_chrome.ts, the touched test files) - the V16 ratchet.
- WINDOW or CONTROL changed (MANDATORY, decision 10) - social / bags / char / party all touched: the WCAG 2.2 AA checks over the BUILT windows via the OPT-IN browser suite (`npm run test:browser`): axe-core zero serious/critical on each touched window (the expanded social combobox case is NEW here); keyboard reachability of the social tablist (Arrow/Home/End roving, Enter/Space activation) and focus-return of bags on close; a forced-colors snapshot still legible; visible :focus-visible never animated away (the item 7 opacity reset does not animate). Plus the no-magic-values painter guard. Run the social + char axe cases under BOTH the Sim-shaped and the ClientWorld-mirror-shaped stub (decision 15) as the existing suite does.
- PER-FRAME perf gate (party items 5/6 ONLY): `npm run` the perf_tour harness desktop + mobile and assert frameP95 <= the P0 baseline AND hudHotDomSkipRate >= the P0 baseline (the leader star + group label are now counted/elided writes; skip-rate must hold). Plus the party routing test: the two new writes go through the elided writers, no raw write on the hot path. Plus the ClientWorld-vs-Sim parity assertion for the party rows (the group / oor shape under both world stubs).
- CSS changed (item 7, one declaration in hud.css): `npx vitest run tests/css_corpus.test.ts` + `npx vitest run tests/client_shell.test.ts` + `npm run build` (4 entries) + the backdrop-filter survival check + `biome check` on hud.css. No new 10-dash section is added, so css_corpus completeness should pass unchanged.
- DOM ids / source guards (item 8): `npx vitest run tests/client_shell.test.ts`.
- Player text changed (items 4, 6 add English-only hud_chrome keys): `npx vitest run tests/localization_fixes.test.ts` - the new labels must NOT trip the release tier (they are non-wordy English-only).
- Whole-suite + build: `npm test` and `npm run build` (4 entries) green; CONFIRM a bare `vitest run` does NOT launch a browser (the axe suite is opt-in only).
Review dispatch (state.md Review Dispatch Matrix; spawn ONLY the rows the diff touches): qa-checklist ONLY. privacy-security-review does NOT fire (no server/, src/admin/, src/net/, deploy/secret, and no new Math.random/Date.now/performance.now in a pure core). migration-safety does NOT fire (no server DDL or characters.state JSONB change). cross-platform-sync does NOT fire (no src/world_api.ts / src/sim / src/net/online.ts / server wire / i18n-matcher change; changing the party painter's sync signature is src/ui-internal, and the ClientWorld-vs-Sim parity obligation is covered by the per-core parity test, not by spawning the reviewer). Prompt the reviewer for COVERAGE not filtering; do not commit until it reports no BLOCKING. If a reviewer truncates, resume with: "Stop reading more files. Output the full report now based on what you've already seen. No more tool calls. Format: BLOCKING / SHOULD-FIX / NICE-TO-HAVE / VERDICT."
Always run the adversarial verification pass (a fresh-subagent diff review prompted for COVERAGE plus a "what is missing" critic) on top of qa-checklist; remediate every BLOCKING/SHOULD-FIX/NICE-TO-HAVE in-session.

STEP 4 - COMMIT CADENCE (2-5 Conventional Commits, scope + EXPLICIT paths, never git add -A):
- `fix(ui): social tabs as a role=tablist with roving arrow nav` (src/ui/social_window.ts, tests/social_window.test.ts, tests/browser/a11y.browser.test.ts).
- `fix(ui): bags focus-return on close + inert prompt background` (src/ui/bags_window.ts, src/ui/hud.ts).
- `fix(ui): name the char preview host distinctly from the title` (src/ui/char_window.ts, src/ui/i18n.catalog/hud_chrome.ts, tests/browser/a11y.browser.test.ts).
- `fix(ui): party rows keep the leader star and raid group out of / into the right a11y slot` (src/ui/party_frame_row.ts, src/ui/party_frames_painter.ts, src/ui/hud.ts, src/ui/i18n.catalog/hud_chrome.ts, src/styles/hud.css, tests/party_frames_painter.test.ts). TAG this commit's green perf gate so a later cumulative regression bisects to this phase.
- `test(ui): pin the char-window close focus-return source guard` (tests/client_shell.test.ts).
(Use the actual file names you touch; collapse or split as the work lands. Do not invent edits to fill a commit.)

STEP 5 - ACCEPTANCE CRITERIA (all verifiable and green):
- [ ] Social: the friends/guild/ignore/raid strip is role=tablist with role=tab + aria-selected + roving tabindex (0 active / -1 others) + aria-controls; .soc-body is role=tabpanel with the matching id; aria-pressed is gone; Arrow/Home/End move and activate tabs and focus the new one; a guard in tests/social_window.test.ts pins the markup.
- [ ] Bags: closing the window (toggle, X, or Escape via closeManagedWindow) returns focus to the opener; NO Tab trap is installed (bags stays a non-modal companion); the mobile-touch vendor-close branch and the hideTooltip / cancelPetFeed side effects are preserved.
- [ ] Bags: the bag grid behind the discard / sell prompt is marked inert while the prompt is open and cleared before focus returns to the opener (single installPromptDialog chokepoint covers both prompts).
- [ ] Char: #char-model-preview role=img has a distinct hudChrome.character.modelPreview name and no longer reuses the title's level/class subtitle; the title subtitle is unchanged; an axe-case assertion confirms the two names differ.
- [ ] Party: the leader glyph renders in its own aria-hidden .lead-star span; the level element (.lead-num) holds only the number, so the row's role=button accessible name is "name level" with no star; the rendered star + number stay visually adjacent (byte-faithful).
- [ ] Party: in raid mode a member's group reaches a screen reader via a visually-hidden .pfm-group span set to the new hudChrome.unitFrame.partyGroup label (formatNumber group); it is empty outside raid and re-localized in relocalize() on a language switch.
- [ ] Party: a focused dead / out-of-range row resets opacity to 1 via `.party-frame:focus-visible { opacity: 1; }` in hud.css, so the global focus ring is drawn at full opacity (the ring is not animated away).
- [ ] The two party hot-path writes (leader star, group label) route through the elided writers; the party routing test asserts no raw textContent / setAttribute / className on the hot path; aria-hidden and the visually-hidden class are set once at build.
- [ ] An axe case drives the social typeahead combobox to its EXPANDED listbox state (aria-expanded=true, >=1 role=option, aria-activedescendant resolving to a rendered option) and reports zero serious/critical; it stays in the opt-in browser suite.
- [ ] tests/client_shell.test.ts pins the closeManagedWindow 'char-window' (and sibling) focus-return source case.
- [ ] WCAG 2.2 AA row green: axe clean on social/bags/char/party under both world shapes; keyboard reachability + focus-return; forced-colors snapshot; :focus-visible never animated away; target-size >=24px (>=40x40 mobile) not weakened.
- [ ] PER-FRAME perf gate green (party items): perf_tour frameP95 <= P0 baseline AND hudHotDomSkipRate >= P0 baseline; the green commit is tagged.
- [ ] `npx tsc --noEmit`, `biome check` on every changed .ts, css_corpus + client_shell + build (4 entries) for the CSS change, localization_fixes for the two new keys, full `npm test` and `npm run build` all green; a bare `vitest run` launches no browser.
- [ ] qa-checklist reviewer reports no BLOCKING.
- [ ] No IWorld / sim / server / net / headless / world_api change; no i18n.locales overlay edited; both new labels are English-only hud_chrome keys.

STEP 6 - DOC UPDATES + MEMORY (do NOT edit the shared index docs' rows from inside the slices; the orchestrator updates them once at the end):
- Update progress.md: mark P18b done with the per-window fixes applied (social tablist, bags focus-return + inert, char preview name, party star/group/focus-ring, the two test pins), the new keys, and the perf-gate result vs baseline for the party items.
- Update state.md: flip the P18b ledger row to done; note the two new hud_chrome keys in the i18n-keys ledger; record that the party items rode the per-frame perf gate while the rest were cold.
- Record surprising rules in memory: that bags is non-modal so it gets capture-and-return WITHOUT a trap (windowFocus would trap and break the vendor cluster); the leader-star split (family writes the number, painter writes the aria-hidden star, both adjacent inside .lead); the raid-group visually-hidden span + relocalize() re-emit because a language switch does not flip partyFrameSignature; that the inert clear must precede opener.focus(); and that the social roving handler is inline-per-talents-precedent (the shared roving_tabindex extraction is P18a, not pre-empted here).

STEP 7 - FINAL RESPONSE:
Report status (done / done-with-deferral), files created/changed (absolute paths), validation results (tsc, biome, the WCAG/axe row under both world shapes incl the new expanded-combobox case, the party perf gate vs baseline, css_corpus/client_shell/build, localization_fixes, the party routing test, full npm test, the bare-vitest-no-browser confirmation), the qa-checklist verdict, and any deferral. End with exactly:
Next: phase-18c-visual-a11y-tokens.md

STOPPING RULES (phase-specific):
- STOP and surface a scope change if any item appears to need a NEW IWorld member, wire field, or a sim/server/net change (presentation-only is a hard line).
- STOP if bags genuinely needs a focus TRAP to satisfy the close item: it is a non-modal companion window and must NOT trap (it rides alongside vendor/trade/market); surface it rather than installing windowFocus('#bags').
- STOP if the party leader-star split or the group label cannot be expressed through the elided writers without a raw hot-path write, OR if it regresses perf_tour frameP95 above the P0 baseline / drops hudHotDomSkipRate below it; diagnose the raw-write or cache-key cause first, do not commit a perf regression.
- STOP if converting the social tabs cannot keep the tab styling and the active-tab selection byte-faithful (the `on` class plus aria-selected), or if the roving handler double-fires the existing click path.
- STOP if a :focus-visible ring ends up animated/blurred/transitioned away anywhere (item 7 must only reset opacity, never animate the ring).
- STOP and split the phase if the working set approaches the ~40% context ceiling (land the perf-gated party slice first, then the cold windows).
```

## Notes for the planner

P18b is the per-window interactive-ARIA cleanup of the P18 wave: nine items the P7b / P8b / P11c / P15b
phases recorded as deferred nice-to-haves and that the discovery pass re-confirmed still open in the live
tree. The load-bearing structural point is that the nine split across two cost classes: social, bags, and
char are COLD windows with no perf gate, while two of the three party items (the leader-star split and the
raid-group label) edit `party_frames_painter.ts`, which is the per-frame hot path, so they alone carry the
perf gate and the elided-writer routing rule. The packet keeps that boundary explicit so a future session
does not over-test the cold items or under-test the hot ones.

Two correctness traps the packet front-loads. First, bags is a NON-MODAL companion window (it rides
alongside vendor / trade / market), so the focus-return fix must be a capture-and-return only via the
FocusManager's activeFocusable + restore, NOT the trap-installing windowFocus('#bags') helper that the
modal cold windows use; trapping focus inside #bags would break the inventory cluster. Second, the party
leader-star and raid-group writes must route through the elided writers and the aria-hidden /
visually-hidden attributes must be set once at row-build time, or the keyed pool's skip-rate collapses;
the raid-group label additionally needs a relocalize() re-emit because a language switch does not flip
`partyFrameSignature` (the same reason the badge tooltips already relocalize). The leader-star split is
made byte-faithful by wrapping both the star and the number inside the single `.lead` flex child, so the
4px `.pfm-meta` gap never separates them.

The review surface is qa-checklist alone (presentation/render/test/CSS only; no server/net/IWorld/sim/wire
change), which the packet states and justifies row by row. The social roving handler is intentionally
inline per the talents precedent, NOT a new shared module, because the shared roving_tabindex / dialog-root
extraction is P18a's job and must not be pre-empted here. The next file is
phase-18c-visual-a11y-tokens.md.
