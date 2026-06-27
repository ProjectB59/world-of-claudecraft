# Phase P18d: Live regions and FocusManager unification

Pick up the leftover decision-10 live-region follow-ups that P15a/P15b recorded-not-done plus the one
remaining parallel focus system. P15a built the global live-region and focus infra (`#combat-live`
polite summary on `COMBAT_ANNOUNCE_INTERVAL_MS`, the `#chatlog` polite log, the one shared
`FocusManager`), but five threads were explicitly deferred and never picked up: there is no
target-change announcement, FCT-only events (the "Can't move!" self-note) never reach a live region,
chat goes silent while the combat tab is selected, identical consecutive combat summaries can fail to
re-announce, chat has no flood throttle, and the `$WOC` wallet-connect modal still runs its own
hand-rolled focus trap outside the `FocusManager`. This phase closes all six. It is presentation-only:
DOM, CSS, the two HTML entries, the DOM-free announcer/politeness modules, the client entry wiring, and
tests. It does NOT touch `src/sim`, `server`, `src/net`, `headless`, or `src/world_api.ts`.

The two threads are coupled and UX/determinism-sensitive: the live-region announce cadence must never
flood a screen reader (so chat gets the same named-constant throttle combat already has), and the
single-FocusManager invariant from P15a forbids two focus systems living at once (so the wallet picker
must route through the one `FocusManager` class, not a second ad-hoc trap). Both want one careful pass,
not a parallel fan-out.

## Starter Prompt

```
This is Phase P18d of the Frontend Modernization v0.16.0 cleanup wave (P18): Live regions and FocusManager unification. It closes the decision-10 combat/chat live-region follow-ups P15a/P15b deferred, plus folds the wallet-picker's parallel focus trap into the one shared FocusManager.

Model: Opus 4.8, xhigh effort. Harness: Claude Code.

Worktree: /Users/fernando/Documents/wocc-v0.16.0 (branch feature/frontend-modernization-v016, off release/v0.16.0).

ULTRACODE: no. These six items are small and individually low-risk, but two of them are coupled and correctness-sensitive in a way that wants one mind, not a fan-out: the chat live-region throttle must hold the same anti-flood cadence guarantee as combat (a parallel slice could pick a second magic cadence), and the single-FocusManager invariant (P15a) forbids a second focus system from surviving (a parallel slice editing main.ts could re-introduce one). Run it as one sequential pass with a Workflow shell for context, then the adversarial verify + qa-checklist at the end.

Goal: ship the six deferred a11y/focus cleanups, all presentation-only:
  1. A polite target-name live region: announce the new target's display name on target CHANGE (not per frame), reusing the target-id change edge that already gates the target-frame repaint.
  2. Route the FCT-only self-note ("Can't move!") into the existing #combat-live polite region, so an event the combat log never logs is still announced.
  3. Decouple chat's live region from chat-pane visibility: a dedicated, tab-independent off-screen #chat-live region that announces regardless of which chat tab is shown, so chat is not silent while the combat tab is active.
  4. Force re-announce of identical consecutive #combat-live summaries so screen readers that suppress unchanged live text still re-read them.
  5. Throttle chat live-region announcements under flood, behind a named cadence constant, mirroring the combat announcer (this and item 3 share one chat-live design).
  6. Unify the $WOC wallet-picker's hand-rolled focus trap (showWalletPicker / closeWalletPicker / walletPickerFocusable + the inline Tab cycle in src/main.ts) into the one shared src/ui/focus_manager FocusManager, so there is one focus-trap implementation, not two.

CRITICAL FRAMING:
- PRESENTATION-FIRST. Do NOT touch src/sim, server, src/net, headless, or src/world_api.ts. The live regions, the announcers, the chat throttle, the target-name announce, and the wallet-picker focus are all client/render/DOM/test. If any item appears to need a new IWorld member, a wire field, or a sim/server change, STOP and surface it (see STOPPING RULES).
- The live-region announcers stay DOM-free and DETERMINISTIC: the text sink and the clock are INJECTED (as CombatAnnouncer already is), no Math.random / Date.now / performance.now inside the announcer or the pure politeness core. The pure live_region_politeness picker stays a registered UI pure core (tests/architecture.test.ts UI_PURE_CORES).
- ONE focus system (P15a invariant). After item 6 there must be exactly one focus-trap IMPLEMENTATION, the FocusManager class; walletPickerFocusable and the inline Tab cycle are GONE. The wallet picker is a PRE-GAME shell modal, NOT a hud.closeAll-routed window, so it KEEPS its own local Escape handler (FocusManager deliberately owns no Escape, decision in focus_manager.ts header) and its backdrop-click close. Do NOT add a second document-level Escape listener and do NOT route it through hud.closeAll.
- Item 6 is a FOCUS-MECHANISM-ONLY refactor. The wallet selection / resolve / connect behavior stays byte-identical; only the trap + return-to-opener + focusable-selector change. Do not alter the wallet flow, and do not touch src/net.

STEP 0 - PRE-FLIGHT:
- git status MUST be clean. This is a SHARED checkout (concurrent sessions). If it is dirty, STOP and ask the user; do not stash or revert someone else's work.
- Confirm you are in /Users/fernando/Documents/wocc-v0.16.0 on branch feature/frontend-modernization-v016.
- Memory scan: read MEMORY.md plus the frontend-modernization entries: [[frontend-v016-phase15a-a11y-infra]] (the one focus manager: trap-inside-only because Tab is the game key, Esc stays with closeAll so the manager owns no Escape, FOCUSABLE_SELECTOR must include [data-close]; the chat/combat live regions + COMBAT_ANNOUNCE_INTERVAL_MS), [[frontend-v016-phase15b-a11y-audit-tooling]] (per-frame dialog-aria set ONCE in toggle not per-tick; aria-labelledby SHADOWS aria-label), [[frontend-v016-phase13b-fct-painter-migration]] (FCT nodes are aria-hidden decorative text; the coalesced summary belongs to #combat-live, the FCT-feed-into-the-region note is the open follow-up), phased-packet-qa-cadence, no-em-dashes-or-emojis, shared-worktree-commit-care.

STEP 1 - LOAD CONTEXT (do NOT read hud.ts (~14k lines) or the HTML entries whole):
Spawn ONE Explore agent to read and summarize back a compact brief (the orchestrator keeps the summary, not raw dumps):
- docs/frontend-modernization/state.md, cited by section: locked decisions 4 (presentation-only), 9 (component contract: instance-parameterized, NO module singleton; this is why the wallet picker cannot just grab a global focus manager), 10 (WCAG 2.2 AA chrome: live regions for chat + combat, focus trap + return, visible :focus-visible, target-size >=24px / >=40x40 mobile), 11 (forced-colors only, no light theme), 12 (NO MAGIC VALUES: the announce cadence is a NAMED constant, not a literal), 15 (ClientWorld-vs-Sim parity for cores), 16 (responsive is gated); the Non-negotiable constraints (presentation-only, i18n English-only catalog, EXPLICIT commit paths, no em/en dashes); the Validation matrix; the Review Dispatch Matrix.
- This phase file (phase-18d-live-regions-focus.md).
- The SPECIFIC V16 source ranges this phase touches (read narrowly by line range; re-grep, lines drift under concurrent edits):
  - Live-region DOM in BOTH entries: #combat-live (play.html:158 / index.html:208, the visually-hidden role=status aria-live=polite aria-atomic=true template to MIRROR), #target-frame (play.html:166 / index.html:216, role=group static aria-label, NOT live), #chatlog (play.html:286 / index.html:336, class="chat-pane active" role="log" aria-live="polite" tabindex="-1"), #map-summary (play.html:309 / index.html:359, the other visually-hidden status region precedent).
  - hud.ts live-region wiring: this.combatLiveEl = $('#combat-live') + the CombatAnnouncer construction (hud.ts:667-669), combatAnnouncer.flush(now) on the fastHud tier (hud.ts:4127), combatLog's push (hud.ts:6871), appendLog (the chat/combat append funnel; the el === this.chatLogEl special-case is the chat hook), showSelfNote (hud.ts:6900-6907, the 8th FCT spawn site; calls fctPainter.spawn for the self-note kind and NOTHING else).
  - hud.ts target-frame update: the target-id change edge targetChanged = target.id !== this.lastTargetFrameId (hud.ts:~4199), lastTargetFrameId updated at ~4205, name: entityDisplayName(target) at ~4217. This is the edge to reuse so the target-name announce fires once per change, never per frame.
  - src/ui/combat_announcer.ts (the WHOLE file, ~56 lines): flush() sets this.setText(this.pending) with NO comparison against the last announced text (item 4). DOM-free, clock injected.
  - src/ui/live_region_politeness.ts (the WHOLE file): the LiveRegionEventKind union already includes 'chat'; liveRegionPoliteness('chat') === 'polite'; combatLineKind() returns 'combat'; COMBAT_ANNOUNCE_INTERVAL_MS = 1500; combatAnnounceDue() is the pure throttle gate. This is a registered UI pure core.
  - src/ui/fct_painter.ts header (lines 61-64): the "routing a FCT-specific coalesced feed into that region ... remains a follow-up" note that item 2 resolves; update it when item 2 lands.
  - src/ui/focus_manager.ts (the WHOLE file, ~206 lines): the FocusManager class (open({root, returnFocusTo}) -> handle with focusFirst(preferredSelector) and release(returnFocus), restore(), activeFocusable()) and the exported FOCUSABLE_SELECTOR (line 43). The trap fires only when focus is already inside root, and the manager owns NO Escape.
  - src/main.ts wallet picker (re-grep; ~4499-4646): walletPickerFocusable (~4499-4510), closeWalletPicker (~4513-4525), the P15b deferral comment (~4524-4532), showWalletPicker (~4534-4646) with its inline Tab cycle (~4619-4638), its local Escape (~4619-4625), and the initialFocus computation (~4642-4646: selected option, else first option, else closeBtn). main.ts does NOT currently import focus_manager.
  - Existing tests: tests/combat_announcer.test.ts, tests/live_region_politeness.test.ts, tests/focus_manager.test.ts, tests/client_shell.test.ts (asserts the exact #chatlog and #combat-live strings at ~212-218, and #target-frame at ~286). tests/architecture.test.ts UI_PURE_CORES.
Have the agent return: the exact current #chatlog / #combat-live / #target-frame attribute strings in both entries, the target-id-change edge variable names, the appendLog chat hook shape, and whether combatAnnouncer.flush runs on a per-frame tier.

STEP 2 - ORCHESTRATION + EXECUTE (one sequential pass; Workflow shell for context only, no impl fan-out):

ITEM 1 - Target-name polite live region (hud.ts + both entries + hud_chrome.ts):
- Add a visually-hidden role=status aria-live=polite node id="target-live" to BOTH index.html and play.html, MIRRORING the #combat-live template exactly (same classes/roles; aria-atomic="true" so the whole name is re-read). Place it adjacent to #combat-live (a top-of-HUD off-screen status region), NOT inside #target-frame and NOT inside chatlog-wrap.
- In hud.ts add this.targetLiveEl = $('#target-live') and a private lastAnnouncedTargetId tracker. In the target-frame update, on the target-id change edge (the existing targetChanged computation against lastTargetFrameId), when the resolved target id differs from lastAnnouncedTargetId, write the localized announcement through the ELIDED setText writer into #target-live and update lastAnnouncedTargetId. When there is no target (or a world-object target that hides the frame), setText('') and reset lastAnnouncedTargetId to null so re-acquiring the SAME target re-announces. Do NOT add a per-frame write: the announce is change-gated and routed through the elided writer.
- Localize via a NEW English-only key in src/ui/i18n.catalog/hud_chrome.ts (e.g. hudChrome.unitFrame.targetAnnounce = 'Target {name}'), called as t('hudChrome.unitFrame.targetAnnounce', { name: entityDisplayName(target) }). No concat, no ?? fallback. KEEP the English value NON-WORDY (longest lowercase run <= 3 words) so it does not trip the M16 completeness gate as untranslated English in zh/ja/ko/ru; "Target {name}" is fine.

ITEM 2 - Route the FCT self-note into #combat-live (hud.ts + fct_painter.ts comment):
- In showSelfNote (hud.ts:6900-6907), after the fctPainter.spawn call, also push the SAME already-t()-resolved text into the existing this.combatAnnouncer.push(text, performance.now()), so the self-note (e.g. t('hud.combat.cannotMove') from main.ts) reaches the throttled #combat-live region. The announcer coalesces and never streams raw per-damage text, so this does not double-announce combat-log lines (the self-note is an event the combat log never logs).
- AUDIT the other FCT-only events that call no combatLog (the xp and rested-xp floats). Decide per event: route via combatAnnouncer.push IF it reads well coalesced, or LEAVE it unannounced with a one-line recorded rationale (xp floats can be noisy even throttled). Do not silently skip the audit; record the outcome in STEP 7.
- Update the fct_painter.ts header note (lines 61-64): the "routing a FCT-specific coalesced feed into that region ... remains a follow-up" line is now resolved for self-note; reword it to state self-note is routed and what (if anything) stays intentionally unannounced.

ITEMS 3 + 5 - Dedicated throttled chat live region (one design, two ledger items) (new chat_announcer.ts + live_region_politeness.ts + hud.ts + both entries):
- Add a visually-hidden role=status aria-live=polite (aria-atomic="true") node id="chat-live" to BOTH entries, adjacent to #combat-live. It is TAB-INDEPENDENT (a top-of-HUD off-screen region), so it announces regardless of which chat tab's pane is visible.
- DECOUPLE #chatlog from announcing: set aria-live="off" on #chatlog in BOTH entries. CRITICAL: role="log" implies an IMPLICIT aria-live="polite", so removing the attribute is NOT enough; the explicit aria-live="off" overrides the implicit polite so #chatlog (which becomes display:none on the combat tab) no longer double-announces alongside #chat-live when the chat tab IS visible. Keep role="log" and tabindex="-1" (it is still the "skip to chat" landing target and the visible scrollback).
- Add chatLineKind() (returns 'chat') and a NAMED CHAT_ANNOUNCE_INTERVAL_MS constant to src/ui/live_region_politeness.ts (the registered pure core; decision 12, no magic cadence). Mirror combatLineKind / COMBAT_ANNOUNCE_INTERVAL_MS exactly in shape.
- Add src/ui/chat_announcer.ts: a DOM-free wiring announcer that MIRRORS CombatAnnouncer (injected text sink + injected clock + injected interval, gated on liveRegionPoliteness(chatLineKind()) === 'polite', throttled to at most one announcement per CHAT_ANNOUNCE_INTERVAL_MS, collapsing a burst to the most recent line). Prefer a small sibling class so combat behavior stays byte-identical; generalizing CombatAnnouncer into a kind-parameterized announcer is allowed ONLY if combat's behavior stays byte-for-byte (do not over-abstract for two uses).
- Wire it in hud.ts: this.chatLiveEl = $('#chat-live'); new ChatAnnouncer((line) => { this.chatLiveEl.textContent = line; }); flush it on the same fastHud tier next to combatAnnouncer.flush (hud.ts:4127). Push from the chat append funnel (appendLog when el === this.chatLogEl) so every chat line that REACHES the visible pane is announced. Only push lines that are actually SHOWN (skip channel-filtered / hidden lines) to match what the old #chatlog live region would have announced (a display:none child is not announced).

ITEM 4 - Force re-announce of identical consecutive #combat-live summaries (combat_announcer.ts + test):
- In CombatAnnouncer.flush, track the last text actually announced. When the new summary EQUALS the last, force a DOM mutation so AT re-reads it: append a DETERMINISTIC toggling trailing marker (alternate between '' and a single trailing U+00A0 non-breaking space, or a zero-width space) to the string handed to setText, so the textContent differs byte-for-byte while the visible/announced content is unchanged. Keep the module DOM-FREE (the sink is injected) and DETERMINISTIC (the toggle is internal state, no Math.random / Date.now / performance.now). Do NOT use a microtask/clear-then-set if it would introduce non-determinism into the Node test.

ITEM 6 - Fold the wallet picker into the shared FocusManager (src/main.ts + test):
- Import { FocusManager, FOCUSABLE_SELECTOR } from './ui/focus_manager' in main.ts and instantiate ONE module-local FocusManager for the wallet-picker bootstrap (an instance, NOT a module singleton exported from focus_manager.ts; decision 9 forbids the module singleton, and a main.ts-local instance mirrors how Hud owns its own instance). The pre-game shell cannot reach Hud's private focusManager, so a dedicated instance is the correct unification, not a cross-boundary thread.
- In showWalletPicker: call focusManager.open({ root: () => walletPickerModal querying the panel, returnFocusTo: <the active element captured BEFORE focus moves> }) to record the opener and install the Tab cycle, then use handle.focusFirst(...) (or keep the explicit initialFocus computation) so initial focus lands on the selected option, else the first option, else the close button (preserve this byte-faithfully). DELETE walletPickerFocusable and the inline Tab cycle in the keydown handler (the manager's onKeyDown does the trap).
- In closeWalletPicker: call handle.release() for the return-to-opener (replacing the manual walletPickerReturnFocus.focus()), then resolve. Preserve the resolve(id) contract and the modal.remove() exactly.
- KEEP the local Escape handler and the backdrop-click close: the wallet picker is NOT a hud.closeAll window, so the FocusManager's no-Escape rule means the modal owns its own Escape (do not add a second document Escape listener; do not route through hud.closeAll). Remove the now-stale P15b deferral comment (main.ts:~4524-4532) and replace it with a one-line note that the modal now uses the shared FocusManager and owns only its own Escape because it is a pre-game shell modal.
- Add a focused test (e.g. tests/wallet_picker_focus.test.ts or extend an existing wallet test) asserting the wallet picker uses the FocusManager (a source-grep that walletPickerFocusable is gone and FOCUSABLE_SELECTOR / FocusManager is used) and/or a jsdom test that opening traps Tab and closing returns focus to the opener. Keep it browser-free unless it joins the opt-in browser suite.

After all six: update tests/client_shell.test.ts for the moved/added ids (the #chatlog aria-live="off" change, the new #target-live and #chat-live assertions mirroring #combat-live). Run tsc after each item; do not interleave edits across files without recompiling (the monolith breaks silently).

INVARIANTS THIS PHASE MUST KEEP (state.md locked decisions + non-negotiable constraints):
- PRESENTATION-ONLY (decision 4): no src/sim, server, src/net, headless, or src/world_api.ts change. If an item needs an IWorld/wire/sim change, STOP and surface it.
- Determinism: the announcers (combat + chat) and the pure live_region_politeness core stay DOM-free and free of Math.random / Date.now / performance.now (clock injected). live_region_politeness stays in UI_PURE_CORES; the announcers and FocusManager are WIRING and are NOT registered.
- NO MAGIC VALUES (decision 12): CHAT_ANNOUNCE_INTERVAL_MS is a named constant; no literal cadence/hex/px in TS.
- i18n: the ONE new player-visible string (the target-name announce) is an English-only key in hud_chrome.ts, kept NON-WORDY for the M16 gate; never edit i18n.locales/<lang>.ts; no concat / ?? fallback / default param. The FCT self-note and the chat lines relay ALREADY-t()-resolved strings (no new keys).
- ACCESSIBILITY (decision 10): live regions announce, never flood (the throttle holds for chat as it does for combat); no region re-announces text an existing aria-live/role=alert node already speaks; the wallet picker keeps trap + return + Escape + visible :focus-visible (never animated away) + target-size; the 3D canvas stays OUT of a11y scope.
- ONE focus system (P15a): after item 6 there is exactly one focus-trap implementation (FocusManager); no walletPickerFocusable, no second inline Tab cycle.
- Per-frame hygiene (decisions 3, 5): the target-name write and the announcer flushes route through the elided writers / are cheap change-gated; do not add an unconditional per-frame DOM write.
- No em dashes, en dashes, or emojis anywhere (code, comments, commits). Shared worktree: commit with EXPLICIT paths, never git add -A.

Out of scope (do NOT do in this phase):
- The triplicated roving arrow-key math, the dialog-root setAttribute helper, the social tablist conversion, and the per-window ARIA polish (P18a / P18b).
- Forced-colors cues, focus-ring tokens, target-size CSS (P18c).
- Nameplate cadence, content i18n suffixes, render-tier nits (P18e).
- Any new IWorld member, wire field, sim/server/net change (none in this packet).
- Reworking the combat announcer's politeness policy or the FocusManager's Escape ownership (both settled in P15a; reuse, do not re-litigate).

STEP 3 - VALIDATION + REVIEW:
Run ONLY the validation-matrix rows that match this phase's change-types:
- Baseline (every phase): npx tsc --noEmit.
- New .ts module guard: biome check on src/ui/chat_announcer.ts and every changed .ts (src/ui/hud.ts, src/ui/combat_announcer.ts, src/ui/live_region_politeness.ts, src/main.ts) (the V16 ratchet).
- Pure core changed (live_region_politeness gains chatLineKind + CHAT_ANNOUNCE_INTERVAL_MS): npx vitest run tests/live_region_politeness.test.ts + npx vitest run tests/architecture.test.ts (the UI-purity guard; live_region_politeness stays registered and DOM/Three-free; chat_announcer and the FocusManager are NOT registered) + a same-input-same-output assertion + the ClientWorld-vs-Sim parity assertion (decision 15: chatLineKind is host-agnostic like combatLineKind, so it classifies identically online and offline; assert it).
- Announcer behavior: extend tests/combat_announcer.test.ts with the item-4 case (an identical consecutive summary STILL mutates the sink text, while non-identical text is byte-faithful) and add tests/chat_announcer.test.ts (single chat line announces once; a burst collapses to at most one per CHAT_ANNOUNCE_INTERVAL_MS; blank/filtered lines do not announce; never assertive).
- CSS / HTML entry changed (the two entries gain #target-live + #chat-live and flip #chatlog to aria-live="off"): npx vitest run tests/client_shell.test.ts (update the #chatlog assertion + add the two new region assertions) + npx vitest run tests/css_corpus.test.ts (no NEW CSS section is added; the new regions reuse the existing visually-hidden class, so confirm the corpus still balances) + npm run build (all 4 entries).
- PER-FRAME hold (item 1's target-name write and item 4's flush touch per-frame-adjacent paths): run scripts/perf_tour.mjs desktop AND mobile and assert frameP95 <= the P0 baseline AND hudHotDomSkipRate >= the P0 baseline. The target-name write is change-gated and routed through the elided setText writer, so it must not regress the skip-rate; if it does, the write is not change-gated correctly.
- WINDOW or CONTROL changed (MANDATORY, decision 10, for the wallet-picker control in item 6): the WCAG 2.2 AA chrome checks over the wallet picker after the FocusManager swap: keyboard reachable, Tab/Shift+Tab cycle stays trapped, focus returns to the opener on close, Escape still closes, a visible :focus-visible that is never animated/transitioned away, target-size >=24px (>=40x40 mobile). The new live regions are NON-INTERACTIVE (no target-size, not focusable); axe over the built HUD should stay clean with them present. If the opt-in browser suite (npm run test:browser) is the only way to drive the wallet picker's trap, add the case there; a bare vitest run must stay browser-free.
- Player text changed (the one new hud_chrome key): npx vitest run tests/localization_fixes.test.ts (English-only addition must NOT trip the release tier; the key stays NON-WORDY for M16).
- Whole-suite + build: npm test and npm run build (4 entries) green; confirm a bare vitest run does NOT launch a browser.
Review dispatch (state.md Review Dispatch Matrix; spawn ONLY the rows the diff touches): qa-checklist ONLY. privacy-security-review does NOT fire (no server/src/admin/src/net/deploy/secret change; no new Math.random/Date.now/performance.now in sim or a registered core; the wallet picker change is focus-mechanism-only and does not touch the wallet connect/auth/net flow). migration-safety does NOT fire (no DDL / characters.state JSONB change). cross-platform-sync does NOT fire (IWorld unchanged; chatLineKind host-parity is covered by the per-core parity unit test, not by spawning the reviewer). Prompt the reviewer for COVERAGE not filtering; do not commit until it reports no BLOCKING. Resume a truncated reviewer with: "Stop reading more files. Output the full report now based on what you've already seen. No more tool calls. Format: BLOCKING / SHOULD-FIX / NICE-TO-HAVE / VERDICT."
Also run the canonical adversarial verification pass (a fresh subagent reviewing the diff for COVERAGE) regardless of the qa-checklist verdict.

STEP 4 - COMMIT CADENCE (3 to 5 Conventional Commits, scope + EXPLICIT paths, never git add -A):
- feat(ui): announce target name and FCT self-note via the HUD live regions
  (index.html, play.html, src/ui/hud.ts, src/ui/fct_painter.ts, src/ui/i18n.catalog/hud_chrome.ts)
- feat(ui): dedicated throttled chat live region decoupled from chat-pane visibility
  (src/ui/chat_announcer.ts, src/ui/live_region_politeness.ts, src/ui/hud.ts, index.html, play.html, tests/chat_announcer.test.ts, tests/live_region_politeness.test.ts)
- fix(ui): re-announce identical consecutive combat-live summaries
  (src/ui/combat_announcer.ts, tests/combat_announcer.test.ts)
- refactor(ui): route the wallet picker through the shared FocusManager
  (src/main.ts, tests/wallet_picker_focus.test.ts)
- test(ui): update client_shell ids for the target/chat live regions
  (tests/client_shell.test.ts)
- docs(frontend): record P18d in progress.md + state.md ledger
  (docs/frontend-modernization/progress.md, docs/frontend-modernization/state.md)
(Use the ACTUAL file names you create; group sensibly into 3 to 5 commits.)

STEP 5 - ACCEPTANCE CRITERIA (all verifiable + green):
- [ ] Item 1: a visually-hidden role=status aria-live=polite #target-live region exists in BOTH entries; hud.ts announces entityDisplayName(target) through the elided setText writer ONLY on a target-id change (never per frame), via the new NON-WORDY English-only hud_chrome.ts key (no concat / ?? fallback); clearing the target empties the region and re-acquiring the same target re-announces.
- [ ] Item 2: showSelfNote pushes the already-t()-resolved self-note text into combatAnnouncer so "Can't move!" reaches #combat-live; the fct_painter.ts follow-up note is updated; the xp/rested-xp audit outcome is recorded.
- [ ] Item 3: a tab-independent #chat-live region announces chat regardless of the visible tab, and #chatlog is set aria-live="off" (overriding role=log's implicit polite) so it no longer double-announces; #chatlog keeps role="log" + tabindex="-1" as the skip-to-chat target.
- [ ] Item 4: CombatAnnouncer.flush forces a DOM mutation when the new summary equals the previous one (deterministic toggling marker), so identical consecutive summaries re-announce; the module stays DOM-free and deterministic; tests/combat_announcer.test.ts pins it.
- [ ] Item 5: chat announcements are throttled to at most one per the NAMED CHAT_ANNOUNCE_INTERVAL_MS via the DOM-free ChatAnnouncer (clock + sink injected), never assertive, blank/filtered lines skipped; tests/chat_announcer.test.ts pins the throttle.
- [ ] Item 6: the wallet picker routes through the shared FocusManager (instantiated locally in main.ts, NOT a module singleton); walletPickerFocusable and the inline Tab cycle are removed; FOCUSABLE_SELECTOR is reused; trap + return-to-opener + initial focus are preserved byte-faithfully; the local Escape and backdrop close are kept (no second document Escape listener); the wallet connect/resolve flow is byte-identical.
- [ ] tsc clean; biome clean on every new/changed .ts.
- [ ] live_region_politeness + architecture (UI-purity) green incl the same-input-same-output and the ClientWorld-vs-Sim parity assertion for chatLineKind; combat_announcer + chat_announcer tests green.
- [ ] client_shell + css_corpus green with the entry changes; npm run build (4 entries) green.
- [ ] PER-FRAME hold: perf_tour desktop AND mobile show frameP95 <= the P0 baseline AND hudHotDomSkipRate >= the P0 baseline.
- [ ] WCAG 2.2 AA chrome row green for the wallet picker (trap, focus-return, Escape, visible :focus-visible, target-size); axe over the built HUD stays clean with the new non-interactive regions present.
- [ ] localization_fixes green (the new hud_chrome key is English-only, NON-WORDY, does not trip the release tier).
- [ ] npm test green; a bare vitest run does NOT launch a browser.
- [ ] PRESENTATION-ONLY held: no src/sim / server / src/net / headless / src/world_api.ts change; no i18n.locales overlay edited; ONE focus-trap implementation survives.
- [ ] qa-checklist reviewer reports no BLOCKING; the adversarial verification pass ran.

STEP 6 - DOC UPDATES + MEMORY:
- progress.md: mark P18d complete with the module list (chat_announcer.ts, the live_region_politeness additions, the two new regions, the wallet-picker focus unification), the test files, and the xp/rested-xp audit outcome.
- state.md: flip the P18d ledger row to done; note the #target-live and #chat-live regions, that #chatlog is now aria-live="off" (role=log implicit-polite override), that the wallet picker now uses the shared FocusManager (closing the P15a MAJOR #2 two-focus-systems item), and CHAT_ANNOUNCE_INTERVAL_MS in the named-constants / new-i18n-keys lists. Do NOT edit the shared index docs beyond your own ledger row.
- Memory: record the surprising rules: role=log implies an implicit aria-live=polite so decoupling needs explicit aria-live="off" (not attribute removal); a display:none live region is silent (the chat-on-combat-tab root cause); the wallet picker is a pre-game shell modal so it keeps its own Escape even after FocusManager unification (the manager owns no Escape); the identical-text re-announce needs a deterministic toggling marker to stay DOM-free and Node-testable.

STEP 7 - FINAL RESPONSE:
Report: status (done / done-with-deferral), files created/changed (absolute paths), validation results (tsc, biome, live_region_politeness incl parity, architecture, combat_announcer + chat_announcer, client_shell, css_corpus, perf_tour numbers, the WCAG wallet-picker row, localization_fixes, npm test, build), the qa-checklist verdict, the xp/rested-xp announce decision, and any deferral. End with exactly:
Next: phase-18e-render-tier-i18n-perf-dedup.md

STOPPING RULES:
- STOP and surface a scope change if any item appears to need a NEW IWorld member, a wire field, or a sim/server/net change (presentation-only is a hard line; the live regions and focus are all client/DOM).
- STOP if folding the wallet picker into the FocusManager would require a focus_manager MODULE SINGLETON (decision 9 forbids it) or would entangle the pre-game shell with the in-game Hud instance: instead instantiate a main.ts-local FocusManager (an instance), or if even that is not clean, surface it and keep the documented exception rather than ship a half-migration.
- STOP if decoupling chat leaves #chatlog still announcing alongside #chat-live (the role=log implicit-polite double-announce): set aria-live="off" explicitly before shipping.
- STOP if the chat throttle could let a burst announce more than once per CHAT_ANNOUNCE_INTERVAL_MS, or if any region would announce assertively: re-check the politeness + throttle.
- STOP if the identical-text re-announce introduces non-determinism (Math.random / Date.now / a real microtask) into the DOM-free announcer; use a deterministic toggling marker.
- STOP if the target-name announce adds an unconditional per-frame DOM write (it must be change-gated and routed through the elided writer) or regresses the perf baseline.
- STOP if the wallet-picker change alters the wallet selection / resolve / connect behavior or touches src/net: it is focus-mechanism-only.
```

## Notes for the planner

P18d gathers the six decision-10 live-region and single-FocusManager threads that P15a and P15b
explicitly deferred and that the discovery pass re-verified still open. Five are live-region work and
one is the parallel-focus-system cleanup; they share this packet because they are the same a11y surface
and the same two coupled invariants (anti-flood announce cadence, one focus system). The load-bearing
correctness points, all confirmed against the live tree:

- The chat-silent-on-combat-tab root cause is that the live region rides #chatlog (play.html:286 /
  index.html:336), a .chat-pane that goes display:none on the combat tab, and a display:none live
  region is silent. The fix is a dedicated tab-independent #chat-live region. The subtle trap is that
  role="log" carries an IMPLICIT aria-live="polite", so merely removing the attribute would leave
  #chatlog double-announcing alongside #chat-live whenever the chat tab is visible; the packet mandates
  an explicit aria-live="off" override. Items 3 and 5 collapse into this one chat-live design (one
  #chat-live node plus one throttled ChatAnnouncer), which is why they are scheduled together with two
  acceptance checkboxes but one implementation.
- The FCT-self-note gap (item 2) is real and narrow: combatAnnouncer.push has exactly one caller
  (combatLog, hud.ts:6871), and showSelfNote (hud.ts:6900-6907) only spawns an aria-hidden FCT node, so
  t('hud.combat.cannotMove') is never announced. The fix is one push call; the fct_painter.ts header
  (lines 61-64) already names this as the open follow-up.
- The wallet-picker unification (item 6) is consistency-only: the modal is already fully accessible
  (role=dialog + aria-modal + labelledby/describedby + Tab cycle + Escape + initial focus + return), so
  this closes the P15a MAJOR #2 two-focus-systems finding without an a11y change. The decision-9 wrinkle
  is that the FocusManager is a Hud instance and the wallet picker lives at main.ts module scope before
  the game loads, so the correct unification is a main.ts-local FocusManager instance (not a module
  singleton, not a cross-boundary thread), and the modal KEEPS its own Escape because the FocusManager
  deliberately owns none and the modal is not a hud.closeAll window. This is the determinism/UX-coupled
  reason ULTRACODE is recorded as no: one careful pass, not a fan-out that could re-introduce a second
  focus system or a second cadence constant.

Only item 1 adds an i18n key (the target-name announce), kept NON-WORDY for the M16 gate; the other
five relay already-resolved strings or add only the named CHAT_ANNOUNCE_INTERVAL_MS constant. The diff
is render/ui/test/docs only, so the review surface is qa-checklist alone: privacy-security-review,
migration-safety, and cross-platform-sync do not fire (no server/net/admin/secret, no DDL, no IWorld
change; the host-parity of chatLineKind is covered by the per-core parity unit test). The next file is
phase-18e-render-tier-i18n-perf-dedup.md.
