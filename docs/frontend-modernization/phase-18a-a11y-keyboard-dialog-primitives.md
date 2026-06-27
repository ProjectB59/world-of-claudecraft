# Phase P18a: Shared keyboard-nav and dialog-root a11y primitives

Fold the two rule-of-three a11y duplications the packet left behind into two small shared modules and
adopt them thinly across the windows that copy-pasted them. First, the roving Arrow/Home/End index math
is triplicated inside `talents_window.ts` (the class/spec tablist, the spec radiogroup, the choice
flyout), differing only in the select-vs-focus tail: extract the pure index step into one
`src/ui/roving_index.ts` core (the sibling of the existing `dropdown_nav.ts`) and have the three handlers
call it. Second, the `role=dialog` + `aria-modal` + `aria-labelledby`/`aria-label` + `tabindex=-1`
micro-pattern is duplicated inline across roughly a dozen window roots with no shared helper: extract a
thin `markDialogRoot()` and call it from each. While the keyboard-nav primitive is in hand, close the one
window that advertises a `role=listbox` it does not implement (the market filter menus) by wiring it to
the existing pure `dropdownKeyNav` core, and widen the UI-purity guard so a pure core can no longer slip
a `*_window` DOM import past it.

This is PRESENTATION-FIRST cleanup: it touches only `src/ui/` and `tests/`. No sim, server, net,
headless, world_api, IWorld, wire, or CSS change. The roving extraction and the dialog-root helper are
behavior-preserving refactors of green code (the rendered DOM, the keyboard model, and the accessible
names stay byte-identical); the market filter keyboard nav is the one genuine behavior ADD, filling a
keyboard gap an existing pure core already solves elsewhere.

## Starter Prompt

```
This is Phase P18a of the Frontend Modernization v0.16.0 cleanup wave (P18): Shared keyboard-nav and dialog-root a11y primitives.

Model: Opus 4.8, xhigh effort. Harness: Claude Code.

Worktree: /Users/fernando/Documents/wocc-v0.16.0 (branch feature/frontend-modernization-v016, off release/v0.16.0).

ULTRACODE: no. This is two coupled rule-of-three extractions (a pure roving-index core + a thin dialog-root helper) plus two small adoptions (the market filter keyboard nav and the purity-guard widening). It is one coherent design that one mind should hold, not a set of independent work items, so per the canonical workflow run it as a single careful author pass with an adversarial verification + qa-checklist fan-out at the END, not a parallel generation Workflow. A Workflow SHELL (push the heavy reading to an Explore subagent that returns a summary) is still encouraged for context hygiene.

Goal: Land two shared a11y primitives and adopt them thinly.
1. src/ui/roving_index.ts: a pure, DOM-free, deterministic core (the sibling of dropdown_nav.ts) that turns (key, currentIndex, count, orientation) into the next roving index (Home -> 0, End -> count-1, next/prev with wrap), returning null for any key it does not handle. Fold the THREE triplicated handlers in talents_window.ts into it, each keeping its own select-vs-focus tail.
2. src/ui/dialog_root.ts: a thin DOM helper markDialogRoot(el, {label|labelledBy, modal}) that sets role=dialog + aria-modal + the one chosen accessible name + tabindex=-1 exactly once, replacing the inline setAttribute clusters across the window roots.
3. Wire the EXISTING pure dropdownKeyNav core (dropdown_nav.ts) into the market filter listbox menus so the role=listbox they already advertise becomes keyboard-operable (roving focus + Arrow/Home/End/Enter/Space/Escape/Tab), closing the byte-faithful gap P8b carried.
4. Widen the architecture UI-purity guard so a pure core importing a sibling *_window DOM module is flagged like a *_painter is, and pin it with negative tests.

CRITICAL FRAMING - this supersedes the P15b "do not pre-empt" deferral, ON PURPOSE. P15b deliberately LEFT the roving triplication and the dialog-root micro-pattern in place, noting the roving math "folds into the planned src/ui/hud/a11y/roving_tabindex.ts packet (not pre-empted)" (progress.md line 39, state.md line 412) and that the dialog-root pattern was "NOT extracted (audit-only phase; P16 is docs)". Both calls were correct THEN. This P18a cleanup wave is the maintainer now choosing to address them, so the extraction is in scope here. Two coordination rules:
  - REUSE, do not duplicate. dropdown_nav.ts already exists as the proven pure keyboard-nav core for the open/collapse listbox pattern; reuse it verbatim for the market filter (item 3). roving_index.ts is the NEW sibling for the always-visible roving pattern (tablist/radiogroup/flyout). Do not invent a third keyboard-nav abstraction.
  - If a concurrent session has ALREADY landed an equivalent shared roving or dialog-root module (for example under a src/ui/hud/a11y/ directory the separate docs/hud-ux-and-accessibility packet plans), STOP and surface it: adopt that module instead of creating a competing one, do not ship two.

MODULE LOCATION - flat src/ui/, matching the repo's existing a11y/keyboard-nav helpers (dropdown_nav.ts, focus_manager.ts, focus_order.ts are all flat in src/ui/). Create src/ui/roving_index.ts and src/ui/dialog_root.ts. Do NOT introduce a new src/ui/hud/a11y/ subdirectory (none exists; inventing one for two small files diverges from the current convention). If the separate hud-ux-and-accessibility packet later wants that layout, it can re-home them.

STEP 0 - PRE-FLIGHT:
- `git status` must be clean. This is a shared checkout; if it is not clean, STOP and ask the user before touching anything (a concurrent session may be mid-edit; do not stash or revert their work).
- Confirm you are in /Users/fernando/Documents/wocc-v0.16.0 on branch feature/frontend-modernization-v016 (off release/v0.16.0).
- Memory scan: read MEMORY.md plus the entries [[frontend-v016-phase7a-talents]] (the talents window's three roving handlers and that talentStage is a local mutable buffer, NOT IWorld-derived, so this refactor must not touch the gating), [[frontend-v016-phase8b-market-char]] (the market filter listbox carried byte-faithful with no keyboard nav), [[frontend-v016-phase15b-a11y-audit-tooling]] (the chrome-wide axe + the opt-in browser suite via npm run test:browser; aria-labelledby SHADOWS aria-label so a dialog root names itself with exactly one; the social combobox + talents flyout roving were fixed there, the market filter was not), [[frontend-v016-phase16-standards-codification]] (the no-magic-values guard is per-painter, the @layer order), [[phased-packet-qa-cadence]], [[no-em-dashes-or-emojis]], [[shared-worktree-commit-care]].

STEP 1 - LOAD CONTEXT (do NOT read hud.ts (over 14,000 lines) or the HTML entries whole):
Spawn ONE Explore agent to read and summarize back a compact brief (not raw dumps):
- docs/frontend-modernization/state.md, cited by section: locked decisions 4 (presentation-only), 6 (PainterHost two facets, so the write-elision facet is the HOT-path boundary and cold-window setAttribute stays raw), 9 (component contract: pure core + thin consumer, instance-parameterized, no module singleton), 10 (WCAG 2.2 AA on the chrome, the WINDOW/CONTROL row is MANDATORY, target-size 24px floor and 40x40 mobile floor never weakened, :focus-visible never animated away), 11 (forced-colors only), 12 (no magic values in painters), 15 (ClientWorld-vs-Sim parity for cores), 17 (persistent monolith: the hud.ts dialog-root sites stay in hud.ts, the helper is just called from them); the Non-negotiable constraints; the Validation matrix (which rows match a pure-core + a window/control change); the Review Dispatch Matrix.
- This phase file (phase-18a-a11y-keyboard-dialog-primitives.md) in full.
- The SPECIFIC source ranges this phase touches, with their real V16 line numbers (read ONLY these ranges):
  - talents_window.ts: the class/spec tablist roving handler at 207-234 (select-on-move tail = switchTab, then refocus .tal-tab.active); the spec radiogroup handler at 279-307 (select-on-move tail = this.setSpec, then refocus .tal-spec.sel); the choice flyout focusOpt + per-option keydown at 528-573 (focus-only tail = focusOpt(next), with an Escape branch at 546-550 that is NOT roving and stays inline); keyboardActivate at 751-755 (Enter/Space, the non-roving fall-through every handler ends with); the dialog-root cluster at 163-166.
  - market_window.ts: renderMarketFilterMenu at 606-626 (option markup at 617 = `<button role="option">`, the listbox at 623 = `role="listbox" hidden`, the trigger at 622 = aria-haspopup=listbox + aria-expanded); the filter open/close + option-click wiring in render() at 207-262 (closeFilterMenus at 207-216, the .mkt-select-btn toggle at 217-229, the [data-market-filter-option] click at 230-261); the dialog-root cluster at 166-169.
  - dropdown_nav.ts in full (17-68): the EXISTING pure dropdownKeyNav(key, open, current, count) -> action core to reuse for the market filter; and hud.ts buildDropdown at 9122-9229 as the PROVEN reference wiring of that core onto a custom listbox (open/move/select/close/tab, tabindex=-1 options focused programmatically).
  - The dialog-root sites to dedupe (confirm each is the same role/aria-modal/name/tabindex micro-pattern before folding): arena_window.ts:88-91 (labelledBy arena-title), char_window.ts:140-143 (labelledBy char-title), leaderboard_window.ts:98-101 (labelledBy leaderboard-title), market_window.ts:166-169 (label itemUi.market.title), options_window.ts:266-281 (CONDITIONAL: label hudChrome.perf.title for the perf panel, else labelledBy options-title), spellbook_window.ts:115-118 (label abilityUi.spellbook.title), questlog_window.ts:110-113 (labelledBy quest-log-title), social_window.ts:203-206 (label hud.social.title), talents_window.ts:163-166 (label game.talents.title), bags_window.ts:371-376 (the discard/sell PROMPT, the aria-modal=true variant, labelledBy titleEl.id; VERIFY its exact current attribute set before folding), and the hud.ts inline sites at 7264-7267 (labelledBy quest-dialog-title) plus 7342 / 7426 / 7488 / 9015 (verify each).
  - tests/architecture.test.ts: forbiddenUiCoreImport at 81-87 (the regex at line 85), forbiddenRenderCoreImport at 96-103 (the regex at line 100), the UI_PURE_CORES allowlist near line 112, and the teeth test at 276-293 (the negative-assert block near line 286).
  - The test surfaces to extend: tests/talents_window.test.ts (no-magic block at 13), tests/market_window.test.ts (WCAG block at 36-55), tests/browser/keyboard_nav.browser.test.ts (the choice-flyout roving already covered at 195+), tests/dropdown_nav.test.ts (the existing core test, as the template for tests/roving_index.test.ts).
The orchestrator keeps the summary, not the raw dumps. This is well under the 40% ceiling; if the working set still approaches it, land items 1 + 4 (the pure core + its guard) first and defer the adoptions, do not degrade.

STEP 2 - ORCHESTRATION + EXECUTE (one careful pass, in this order):

ITEM 1 - extract the roving-index core and fold the three talents handlers.
- Create src/ui/roving_index.ts (pure, DOM-free, deterministic; no Math.random/Date.now/performance.now). Export a RovingOrientation type and a function, e.g.:
    export type RovingOrientation = 'horizontal' | 'both';
    export function rovingTarget(key, current, count, orientation): number | null
  Semantics, matching the three inline handlers BYTE-FOR-BYTE:
    - count <= 0 -> return null.
    - 'Home' -> 0. 'End' -> count - 1.
    - next key: 'ArrowRight' for 'horizontal'; 'ArrowDown' OR 'ArrowRight' for 'both'. next index = ((current + 1) % count + count) % count (wrap).
    - prev key: 'ArrowLeft' for 'horizontal'; 'ArrowUp' OR 'ArrowLeft' for 'both'. prev index = ((current - 1) % count + count) % count (wrap).
    - any other key -> return null (the caller falls through to Escape/keyboardActivate).
  Include ONLY the two orientations the three call sites use ('horizontal' for the tablist, 'both' for the radiogroup and the flyout). Do NOT add a 'vertical' orientation: no current call site needs it (no-YAGNI; the rule of three is satisfied by these three handlers). Document in the header that the normalized wrap `((x % n) + n) % n` is the single form that unifies the radiogroup's `(i-1+n)%n` and the flyout's `((idx%n)+n)%n`, which are equal for all i in [0, n).
- Register roving_index in tests/architecture.test.ts UI_PURE_CORES.
- Refactor talents_window.ts to import rovingTarget and replace the inline math at all three sites, KEEPING each tail:
    - Tablist (207-234): `const next = rovingTarget(ke.key, i, tabs.length, 'horizontal'); if (next !== null) { ke.preventDefault(); const target = tabs[next]; if (target && target !== tab) { switchTab(target); (el.querySelector('.tal-tab.active') as HTMLElement | null)?.focus(); } return; } this.keyboardActivate(ke, () => switchTab(tab));`
    - Spec radiogroup (279-307): `const i = specCards.findIndex((c) => c.el === card); const next = rovingTarget(ke.key, i, specCards.length, 'both'); if (next !== null) { ke.preventDefault(); this.setSpec(stage, specCards[next].id); (this.deps.root().querySelector('.tal-spec.sel') as HTMLElement | null)?.focus(); return; } this.keyboardActivate(ke, () => this.setSpec(stage, sp.id));`
    - Choice flyout (544-572): keep the Escape branch (546-550) inline, then `const next = rovingTarget(ke.key, i, opts.length, 'both'); if (next !== null) { ke.preventDefault(); focusOpt(next); return; }` then the existing keyboardActivate. (focusOpt already updates the roving tabindex and focuses; do not change it.)
  The rendered DOM, the select-on-move vs focus-only behavior, and the focus targets stay identical; only the index arithmetic is centralized.
- Add tests/roving_index.test.ts: same-input-same-output for both orientations (next/prev/Home/End with wrap at the ends), null for unhandled keys (Tab, Enter, Space, a letter) and for count <= 0, and an equivalence assertion that for each orientation rovingTarget reproduces the exact index the three old handlers computed across a small index grid.

ITEM 2 - wire dropdownKeyNav into the market filter listbox.
- In renderMarketFilterMenu (market_window.ts:617), add `tabindex="-1"` to each `<button class="mkt-select-option" role="option" ...>` so options are programmatically focusable but out of the Tab order (the roving pattern buildDropdown uses).
- In market_window.ts render(), import dropdownKeyNav from './dropdown_nav' and add ONE keydown handler per .mkt-select that drives it, reusing the EXISTING open/close + option-click logic (do not duplicate the filter-change code):
    - isOpen = the menu has the .open class; count = the option buttons; current = options.indexOf(document.activeElement); action = dropdownKeyNav(e.key, isOpen, current, count).
    - 'open' -> run the existing open path (add .open, aria-expanded=true, unhide the menu) and focus options[action.index].
    - 'move' -> focus options[action.index].
    - 'select' -> options[focusedIndex].click() (reuse the existing [data-market-filter-option] click handler that already commits the filter + restores focus).
    - 'close' -> run closeFilterMenus() and focus the .mkt-select-btn.
    - 'tab' -> run closeFilterMenus() and focus the .mkt-select-btn WITHOUT preventDefault (let native Tab advance), matching buildDropdown's tab branch.
    - 'none' -> return (let the browser have the key).
  Preserve the existing click toggle, the click-away closeFilterMenus, and the post-render focus-return at 254-259. This is the open/collapse listbox pattern dropdownKeyNav models; do NOT use the new roving_index core here (that is for always-visible siblings).
- Update tests/market_window.test.ts WCAG block (36-55) to assert the option markup now carries `tabindex="-1"` and that the painter imports/uses dropdownKeyNav (source-level), so the keyboard wiring cannot be silently dropped.

ITEM 3 - extract markDialogRoot and adopt it across the window roots.
- Create src/ui/dialog_root.ts exporting:
    export function markDialogRoot(el, opts: { label?: string; labelledBy?: string; modal?: boolean }): void
  It sets, in one place: role='dialog'; aria-modal = opts.modal ? 'true' : 'false'; tabindex='-1'; and EXACTLY ONE accessible name (if opts.labelledBy: setAttribute('aria-labelledby', ...) and do NOT set aria-label; else if opts.label: setAttribute('aria-label', ...)). aria-labelledby shadows aria-label, so never set both (P15b lesson). Header comment MUST state: this is a COLD-window helper; the writes are raw setAttribute, NOT routed through the PainterHost write-elision facet, because that facet is the hot-path boundary (decision 6) and these roots are set once per open, byte-identical to today. dialog_root touches the DOM, so it is NOT a registered pure core.
- Replace the inline setAttribute clusters with a single markDialogRoot call at each verified site:
    arena_window.ts:88-91 -> markDialogRoot(root, { labelledBy: 'arena-title' })
    char_window.ts:140-143 -> markDialogRoot(el, { labelledBy: 'char-title' })
    leaderboard_window.ts:98-101 -> markDialogRoot(el, { labelledBy: 'leaderboard-title' })
    market_window.ts:166-169 -> markDialogRoot(el, { label: t('itemUi.market.title') })
    options_window.ts:266-281 -> markDialogRoot(el, this.perfPanel ? { label: t('hudChrome.perf.title') } : { labelledBy: 'options-title' }) (preserve the exact existing condition; do not invent a flag name, read the real one)
    spellbook_window.ts:115-118 -> markDialogRoot(el, { label: t('abilityUi.spellbook.title') })
    questlog_window.ts:110-113 -> markDialogRoot(el, { labelledBy: 'quest-log-title' })
    social_window.ts:203-206 -> markDialogRoot(el, { label: t('hud.social.title') })
    talents_window.ts:163-166 -> markDialogRoot(el, { label: t('game.talents.title') })
    hud.ts:7264-7267 -> markDialogRoot(el, { labelledBy: 'quest-dialog-title' }); fold 7342 / 7426 / 7488 / 9015 the same way ONLY after confirming each is the same role/aria-modal/name/tabindex set.
    bags_window.ts:371-376 (the aria-modal=true PROMPT) -> markDialogRoot(prompt, { labelledBy: titleEl.id, modal: true }) ONLY IF the resulting attribute set is byte-identical to the current code (confirm it sets tabindex=-1 today; if the prompt does NOT currently set tabindex, do NOT introduce one, leave that site inline and note it in STEP 6 rather than change behavior).
  RULE for every site: fold ONLY where markDialogRoot produces a byte-identical attribute set. If a site diverges, either extend the helper's options to cover it faithfully, or leave that one site inline and record why.
- Add tests/dialog_root.test.ts: drive markDialogRoot against a minimal fake element (a tiny object with a setAttribute spy, no jsdom needed) and assert it sets role/aria-modal/tabindex plus the chosen name attribute; assert the labelledBy path sets aria-labelledby and NOT aria-label, the label path sets aria-label and NOT aria-labelledby, and modal:true sets aria-modal='true'. Deterministic, DOM-global-free at module scope.

ITEM 4 - widen the UI-purity guard to catch *_window painters.
- tests/architecture.test.ts:85 (forbiddenUiCoreImport): change the regex from
    /(?:^|\/)(?:[a-z0-9_]+_painter|painter_host)$/
  to
    /(?:^|\/)(?:[a-z0-9_]+_(?:painter|window)|painter_host)$/
  Apply the SAME widening to forbiddenRenderCoreImport at line 100.
- In the teeth test near line 286, add negative-test assertions that a pure core importing a *_window is flagged: expect(forbiddenUiCoreImport('./char_window')).toBe('painter') and expect(forbiddenUiCoreImport('./market_window')).toBe('painter'); keep the existing _painter/painter_host asserts. Mirror one *_window assert into the forbiddenRenderCoreImport teeth test if it has its own (only if present; do not invent a block).
- After widening, run tests/architecture.test.ts and CONFIRM no currently-registered pure core trips the wider guard (no UI_PURE_CORES module imports a *_window today; roving_index imports nothing window-y). If one does, that is a real latent coupling: STOP and surface it rather than narrowing the regex back.
- NOTE the residual: dialog_root is DOM-touching but is named dialog_root, so the *_window/*_painter regex still will not catch a core importing it. That is out of item 4's scope (which is specifically the *_window gap); rely on the architecture run confirming no pure core imports dialog_root, and record the residual in STEP 6.

INVARIANTS THIS PHASE MUST KEEP (state.md locked decisions + non-negotiable constraints):
- PRESENTATION-ONLY (decision 4): touch only src/ui/ and tests/. Do NOT touch src/sim, server, src/net, headless, or src/world_api.ts; do NOT extend IWorld or change any wire field. If an item appears to need any of those, STOP and surface it (see STOPPING RULES).
- roving_index stays a PURE core (decision 9): DOM/Three-free, deterministic, no Math.random/Date.now/performance.now (guarded by tests/architecture.test.ts + UI_PURE_CORES; the guard also rejects a pure core importing render/game/net or a *_painter/*_window/painter_host). It takes primitives (key/index/count/orientation), NOT an IWorld, so the ClientWorld-vs-Sim parity row is N/A for it (like dropdown_nav.ts); the same-input-same-output assertion is what applies.
- dialog_root is NOT a pure core (it does setAttribute): it is a thin cold-window DOM helper. Its writes stay raw setAttribute, NOT through the write-elision facet (decision 6: that facet is the hot path; these roots are cold, set once per open).
- Behavior preservation: items 1 and 3 are refactors of GREEN code. The rendered DOM, the keyboard model (select-on-move vs focus-only), the accessible names, and the focus targets must stay byte-identical. Item 2 is the one behavior ADD (market filter keyboard nav), filling a documented gap.
- i18n: NO new player-visible strings are introduced. The dialog roots reuse the existing labels (passed into markDialogRoot); the roving + market work is behavior-only. Do NOT add an i18n key, and do NOT edit i18n.locales/<lang>.ts. (Because nothing new is added, the M16 completeness gate is not in play this phase.)
- WCAG 2.2 AA (decision 10): do not weaken the 24px target-size floor or the 40x40 mobile floor; keep every :focus-visible steady (never animated/blurred/transitioned away). The market filter buttons already meet target-size; do not shrink them.
- No magic values (decision 12): roving_index uses named keys/orientation, no bare layout numbers; dialog_root uses no hex/px; the talents/market painters keep their existing token discipline (their no-magic guards must stay green).
- No em dashes, en dashes, or emojis anywhere (code, comments, commits). Use commas, parentheses, or "to" for ranges.
- Shared worktree: commit with EXPLICIT paths, never `git add -A`.

Out of scope (do NOT do in this phase):
- The other P18 items: per-window aria/structure polish (P18b), visual a11y / forced-colors / tokens / target-size (P18c), live regions + FocusManager unification (P18d), render-tier / content-i18n / perf nits (P18e). Do not pull them forward.
- Re-homing dropdown_nav.ts or focus_manager.ts, or creating a src/ui/hud/a11y/ subdirectory: keep the new modules flat in src/ui/.
- Converting social tabs to role=tablist, or any other window's interactive ARIA change (that is P18b).
- A 'vertical' roving orientation, an aria-activedescendant model for the market filter (programmatic roving focus matches buildDropdown), or any new keyboard-nav abstraction beyond the two named modules.
- Any CSS change, any per-frame/hot-path element, any IWorld/sim/server/net edit.

STEP 3 - VALIDATION + REVIEW:
Run ONLY the validation-matrix rows this phase's change-types match (state.md "Validation matrix"):
- Baseline: `npx tsc --noEmit`.
- Pure core added/changed (roving_index): `npx vitest run tests/roving_index.test.ts` + `npx vitest run tests/architecture.test.ts` (UI-purity guard: roving_index registered, DOM/Three-free, deterministic, and the WIDENED *_window negative tests green) + the same-input-same-output assertion. The ClientWorld-vs-Sim parity row is N/A and must be stated as such in the test (roving_index reads no IWorld; its inputs are primitives, like dropdown_nav.ts).
- New .ts modules added: `biome check` on src/ui/roving_index.ts + src/ui/dialog_root.ts + the changed windows + the changed tests (the V16 ratchet; do not accrue lint debt).
- DOM ids: dialog_root moves NO ids (it sets the same attributes on the same elements). Run `npx vitest run tests/client_shell.test.ts` only if a fold incidentally touches an id (none expected); if it stays green untouched, say so.
- WINDOW or CONTROL changed (MANDATORY, decision 10): the chrome a11y checks over the BUILT windows, via the OPT-IN browser suite, `npm run test:browser`:
    - axe-core reports ZERO serious/critical on the talents + market windows (and a smoke pass over the other dialog-root-adopting windows), under BOTH the Sim-shaped and ClientWorld-mirror-shaped world the suite already drives.
    - the keyboard-nav E2E (tests/browser/keyboard_nav.browser.test.ts): the talents tablist + spec radiogroup + choice flyout still roving (Arrow/Home/End move, select-on-move where it applied, focus-only in the flyout); ADD a market-filter case (open a .mkt-select, Arrow to move the roving focus, Enter to commit a filter, Escape to close returning focus to the trigger, Tab to leave natively).
    - confirm focus-return on close, a steady :focus-visible, the forced-colors snapshot, and target-size are not regressed by the refactor.
  Plus the no-magic-values painter guard: the talents + market no-magic tests stay green; assert roving_index and dialog_root carry no hex/px literal.
- Player text: NONE added, so `tests/localization_fixes.test.ts` is not required by a new label; run it only as a sanity check that nothing regressed (it is fast).
- Full pre-commit sanity: `npm test` (the architecture + window guards live in the suite) and CONFIRM a bare `vitest run` (npm test) launches NO browser (the axe/keyboard suite stays opt-in via npm run test:browser).
This is NOT a per-frame phase: there is NO perf gate (no perf_tour, no skip-rate assertion). All of these windows are cold (open-on-demand), not in hud.update()'s every-frame path.
Review dispatch (state.md Review Dispatch Matrix): spawn qa-checklist ONLY. privacy-security-review does NOT fire (no server/net/admin/secret/SQL, and the new pure core adds no Math.random/Date.now/performance.now). migration-safety does NOT fire (no DB/JSONB DDL). cross-platform-sync does NOT fire (no src/world_api.ts / src/sim / src/net/online.ts / server wire / i18n matcher change; this is src/ui + tests only). Prompt the reviewer for COVERAGE not filtering; do not commit until it reports no BLOCKING. If a reviewer truncates, resume with: "Stop reading more files. Output the full report now based on what you've already seen. No more tool calls. Format: BLOCKING / SHOULD-FIX / NICE-TO-HAVE / VERDICT."
Also run the canonical adversarial verification pass (a fresh subagent diff review for COVERAGE plus a "what is missing" critic) on top of qa-checklist, per the canonical workflow.

STEP 4 - COMMIT CADENCE (2-5 Conventional Commits, scope + EXPLICIT paths, never `git add -A`):
- `feat(ui): add roving_index keyboard-nav core and dialog_root helper` (src/ui/roving_index.ts src/ui/dialog_root.ts).
- `refactor(ui): fold talents roving handlers and window dialog roots onto the shared primitives` (src/ui/talents_window.ts src/ui/arena_window.ts src/ui/char_window.ts src/ui/leaderboard_window.ts src/ui/market_window.ts src/ui/options_window.ts src/ui/spellbook_window.ts src/ui/questlog_window.ts src/ui/social_window.ts src/ui/bags_window.ts src/ui/hud.ts).
- `feat(ui): wire dropdownKeyNav into the market filter listbox` (src/ui/market_window.ts).
- `test(ui): roving_index + dialog_root units, market/talents keyboard-nav, widen UI-purity guard` (tests/roving_index.test.ts tests/dialog_root.test.ts tests/architecture.test.ts tests/market_window.test.ts tests/browser/keyboard_nav.browser.test.ts).
- `docs(frontend): record P18a a11y primitives in progress.md + state.md ledger` (docs/frontend-modernization/progress.md docs/frontend-modernization/state.md).
(Use the ACTUAL files you touch; some windows may already share a file with the dialog-root commit. Do not invent edits to fill a commit.)

STEP 5 - ACCEPTANCE CRITERIA (all verifiable and green):
- [ ] `npx tsc --noEmit` is clean.
- [ ] src/ui/roving_index.ts is a pure core (no DOM/Three import, no Math.random/Date.now/performance.now), registered in UI_PURE_CORES, returning the next index for Home/End/next/prev with wrap and null for any other key (or count <= 0); only the two used orientations exist.
- [ ] The THREE talents_window roving handlers (tablist 207-234, spec radiogroup 279-307, choice flyout 544-572) call rovingTarget and keep their exact tails; the rendered DOM, select-vs-focus behavior, and focus targets are byte-identical; the choice flyout Escape branch stays inline.
- [ ] tests/roving_index.test.ts passes with a same-input-same-output assertion across both orientations and an equivalence check against the old per-handler math; it documents that the ClientWorld-vs-Sim parity row is N/A (no IWorld input).
- [ ] The market filter listbox is keyboard-operable via the EXISTING dropdownKeyNav core: options carry tabindex=-1, Arrow/Home/End move roving focus, Enter/Space commit, Escape closes and returns focus to the trigger, Tab leaves natively; the existing click + click-away + focus-return paths are preserved; tests/market_window.test.ts asserts the wiring.
- [ ] src/ui/dialog_root.ts exists, sets role=dialog + aria-modal + exactly one of aria-labelledby/aria-label + tabindex=-1, never both names, header states it is a cold-window raw-setAttribute helper (not the write-elision facet) and not a pure core; tests/dialog_root.test.ts pins it against a fake element.
- [ ] Every adopting window root (arena, char, leaderboard, market, options incl the perf-vs-options name branch, spellbook, questlog, social, talents, the hud.ts quest dialog + the 4 sibling hud.ts sites, and the bags prompt where byte-faithful) calls markDialogRoot with a byte-identical attribute result; any site left inline is recorded with the reason.
- [ ] tests/architecture.test.ts: forbiddenUiCoreImport and forbiddenRenderCoreImport now flag a *_window import, the teeth test asserts ./char_window and ./market_window are flagged, and NO registered pure core trips the wider guard.
- [ ] WCAG 2.2 AA chrome row green via `npm run test:browser`: axe zero serious/critical on talents + market (under both world shapes), the keyboard-nav E2E green incl the NEW market-filter case, focus-return + steady :focus-visible + forced-colors + target-size not regressed.
- [ ] No new i18n key added; no i18n.locales overlay edited; the no-magic-values guards (talents, market) stay green and roving_index/dialog_root carry no hex/px literal.
- [ ] No em dashes, en dashes, or emojis anywhere in the new/changed files.
- [ ] `biome check` clean on the new modules + changed windows + changed tests; `npm test` green and a bare `vitest run` launches no browser.
- [ ] No src/world_api.ts / src/sim / server / src/net / headless file changed; no CSS file changed.
- [ ] qa-checklist reviewer (and the adversarial verification pass) report no BLOCKING.

STEP 6 - DOC UPDATES + MEMORY:
- Update progress.md: mark P18a done with the module list (roving_index, dialog_root), the test files, the count of dialog-root sites folded vs left inline (with reasons), the market filter keyboard-nav add, the guard widening, and the talents_window/hud.ts line-count deltas.
- Update state.md: flip the P18a ledger row to done; add src/ui/roving_index.ts + src/ui/dialog_root.ts to Key file paths; note that roving_index is registered in UI_PURE_CORES and the UI-purity guard now also flags *_window; record that dropdown_nav.ts is the open/collapse listbox primitive and roving_index is the always-visible-siblings primitive (so a future reader does not merge them).
- Record surprising rules in memory: the P15b "do not pre-empt the roving packet" deferral is now SUPERSEDED by this cleanup wave; the single normalized wrap `((x%n)+n)%n` unifies the three handlers; dialog_root is cold-window raw setAttribute by design (not the elision facet); aria-labelledby shadows aria-label so a dialog root must carry exactly one; and the residual that dialog_root (DOM-touching but not *_window/*_painter named) still slips the purity regex.

STEP 7 - FINAL RESPONSE:
Report: status (done / done-with-deferral), files created/changed (absolute paths), validation results (tsc, roving_index test incl the same-input assertion, architecture guard incl the widened *_window teeth test, dialog_root test, market_window test, the WCAG/browser suite incl the new market keyboard case, biome, npm test, the bare-vitest-no-browser confirmation), the qa-checklist + adversarial-verification verdicts, the count of dialog-root sites folded vs left inline (with reasons), and any deferral. End with exactly:
Next: phase-18b-per-window-aria-polish.md

STOPPING RULES:
- STOP and surface a scope change if any item appears to need a NEW IWorld member, a wire field, or a src/sim / server / src/net / headless / world_api.ts edit. This phase is src/ui + tests only.
- STOP if a concurrent session has already landed an equivalent shared roving or dialog-root module: adopt theirs, do not ship a duplicate.
- STOP if folding a dialog-root site or a roving handler would change the rendered DOM, the accessible name, the keyboard model, or the focus target (these are behavior-preserving refactors of green code); leave that site inline and record it instead of changing behavior.
- STOP if widening the purity regex makes an existing registered pure core fail the guard: that is a real latent coupling to surface, not a reason to narrow the regex back.
- STOP if making the market filter keyboard-operable would require new markup beyond tabindex on the options or would weaken its target-size; the existing pure dropdownKeyNav core should wire onto the existing listbox.
- Do NOT touch any per-frame / hot path; if you find yourself editing hud.update()'s frame divider or the write-elision facet, you are in the wrong phase.
```

## Notes for the planner

P18a is the first of the P18 cleanup wave and the natural home for the two coupled rule-of-three a11y
extractions the main packet deliberately deferred. The load-bearing reconciliation is that P15b's
"do not pre-empt the planned roving_tabindex packet" and "dialog-root micro-pattern not extracted
(audit-only phase)" notes were correct for an audit-only phase, and this wave is the maintainer choosing
to address them, so the extraction is in scope here. The packet is written to REUSE rather than multiply
abstractions: dropdown_nav.ts already exists as the proven pure keyboard-nav core for the open/collapse
listbox, so the market filter (item 2, an actual gap, not a refactor) wires onto it, while the new
roving_index.ts is the sibling primitive for the always-visible roving siblings (tablist, radiogroup,
flyout) that talents_window triplicated. Both new modules sit flat in src/ui/ next to dropdown_nav.ts,
focus_manager.ts, and focus_order.ts, matching the current repo layout rather than inventing the
src/ui/hud/a11y/ tree the separate hud-ux-and-accessibility packet imagines; the packet adds a coordination
stopping rule so two concurrent sessions cannot ship the same module twice.

Items 1 and 3 are behavior-preserving refactors of green code (the single normalized wrap
`((x % n) + n) % n` is provably equal to the three inline forms, and markDialogRoot reproduces each
window's exact role/aria/tabindex set), so the test surface is a same-input core test plus a fake-element
helper test plus the existing browser axe/keyboard suite re-run, with no parity row (roving_index reads no
IWorld) and no perf gate (all cold windows). Item 2 is the one genuine add and gets a new market-filter
keyboard-nav E2E case. Item 4 is a one-line regex widening with negative-test teeth, and it composes
neatly with item 1 since the new roving_index core is exactly the kind of pure core the widened guard
protects. Everything is src/ui + tests, so the review surface is qa-checklist alone plus the canonical
adversarial verification, and no new i18n string means the M16 completeness gate stays out of play. The
next file is phase-18b-per-window-aria-polish.md.
