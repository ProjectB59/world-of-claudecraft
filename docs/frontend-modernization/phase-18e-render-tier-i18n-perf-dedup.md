# Phase P18e: Render-tier, content-i18n, perf nits and structural dedup

The P18 cleanup wave picks up the nice-to-have / should-have / nit / deferred items the maintainer left
open after the 30-phase v0.16.0 packet (P0..P17b) closed. P18e is the render-tier + content-i18n +
arena-perf + FCT + structural-dedup batch: nine independent leaf cleanups that each descend from a
specific ledger deferral (P14b nameplate cadence, P12b aura i18n debt, P9a arena, P9a entity-helper
dedup, P10a player-frame write, P13b FCT internals). None of them are new behavior. Each is presentation
or render or test or docs only.

PRESENTATION-FIRST SCOPE (decision 4): this phase does NOT touch `src/sim`, `server/`, `src/net`,
`headless/`, or `src/world_api.ts` (IWorld). Every item lives in `src/render`, `src/game` (render-importable
leaf), `src/ui`, `src/styles`, `tests/`, or docs. If any item appears to need an IWorld / wire / sim
change, STOP and surface it (see STOPPING RULES). The one item with real product breadth (the mobile
graphics default) carries its own stop gate.

## Starter Prompt

```
This is Phase P18e of the Frontend Modernization v0.16.0 cleanup wave: Render-tier, content-i18n, perf nits and structural dedup.

Model: Opus 4.8, xhigh effort. Harness: Claude Code.

Worktree: /Users/fernando/Documents/wocc-v0.16.0 (branch feature/frontend-modernization-v016, off release/v0.16.0).

ULTRACODE: yes. These are six disjoint cleanup slices (render-tier default, aura i18n suffix, arena window, entity-helper dedup, player-frame hot write, FCT internals) across mostly disjoint files. Fan out one subagent per slice, then integrate the four hud.ts-touching slices SEQUENTIALLY into the monolith (only one file is shared). The verification + qa pass at the end is the shared acceptance. Do NOT fan out work that one response can do, and do NOT parallelize edits to hud.ts.

Goal: close the nine verified-open P18e ledger items with the smallest faithful change each, keeping every guard green. The items, grouped into slices:
  Slice A (render-tier): restore the weak-mobile-GPU cost ceiling via the sanctioned static-preset path + refresh the stale P17a comments.
  Slice B (content-i18n): localize the hardcoded aura duration 's' suffix through an injected dep + a new English-only key.
  Slice C (arena): focus-return on the arena auto-close, and skip-rebuild the arena offline panel.
  Slice D (dedup): lift classDisplayName + zone/poi/dungeon display helpers into the entity_i18n shared seam.
  Slice E (player-frame): route the #player-frame combat-class toggle through the cached ref + elided toggleClass writer.
  Slice F (FCT): move the FCT rise off margin-top, extract the SimEvent -> FctEvent shaping into a pure mapper, drop the unread FctDescriptor.riseDistance field.

CRITICAL FRAMING - the graphics-default item (Slice A) keys off the STATIC preset, never the FPS governor (decision 6), and never a per-frame device fork (the old device fork was DECLINED). The data-fx-level the nameplate cadence reads is derived from ONE static source: graphicsPresetLabel(settings.get('graphicsPreset')) -> resolveUiEffectsProfile -> data-fx-level (main.ts:878-886, ui_effects_profile.ts:78-100), and the nameplate interval reads coerceFxTier(document.documentElement.dataset.fxLevel) (renderer.ts:4079-4081). So lowering the unset/default graphics preset for a constrained device cascades correctly to the nameplate cadence AND the 3D render tier through the one static preset. That breadth (a whole-renderer tier downgrade for defaulting weak-mobile users) is the product call the maintainer deferred; if it is judged too aggressive, land the doc/comment half alone and surface the default change (see STOPPING RULES). Restoring a nameplate-only ceiling would require the device fork that was explicitly declined.

STEP 0 - PRE-FLIGHT:
- `git status` must be clean. This is a SHARED checkout; if there are unexpected staged/modified files, STOP and ask the user before touching anything.
- Confirm you are in /Users/fernando/Documents/wocc-v0.16.0 on branch feature/frontend-modernization-v016.
- Memory scan: read MEMORY.md and [[frontend-v016-phase14b-nameplate-extraction]] (the device->preset cadence axis change, the mobile 1/15 floor, the PR901 weak-GPU lesson), [[frontend-v016-phase14a-graphics-tiering]] (static-preset two-controller hazard, named tier knobs), [[pr901-webgl-context-release]] (the original mobile cost ceiling), [[frontend-v016-phase12b-auras-minimap]] (auras keyed-pool + the pre-existing 's'/glyph i18n debt), [[frontend-v016-phase13b-fct-painter-migration]] (FCT pooled painter, screen-anchored, hotWrites pinned 152), and [[frontend-v016-phase10a-perframe-leakfix-writers]] (the elided setStyleProp/toggleClass facet + the player-frame raw toggle left for later). Note [[no-em-dashes-or-emojis]] and [[shared-worktree-commit-care]].
- Confirm P14b (nameplate_view + nameplateIntervalSec), P12b (auras_view), P13a/P13b (fct_core + fct_painter), and P10a (the elided toggleClass writer) are landed on this branch. If any is missing, STOP: the items have nothing to clean up.

STEP 1 - LOAD CONTEXT (do NOT read hud.ts (14,377 lines) or the HTML entries whole):
Spawn ONE Explore agent to read and summarize, returning a compact brief (not raw dumps):
- docs/frontend-modernization/state.md, cited by section: locked decisions 4 (presentation-only), 6 (static preset never the FPS governor; PainterHost two facets), 9 (pure core + thin painter component contract), 10 (WCAG 2.2 AA on chrome: focus-return on window close/auto-close), 12 (no magic values in painters), 15 (ClientWorld-vs-Sim parity for pure cores), 17 (persistent-monolith: hud.ts/renderer.ts stay the hub); the decision 3/5/5a write-elision writer facet (setText/setDisplay/setTransform/setWidth + the P10a setStyleProp/toggleClass extension); the Non-negotiable constraints (determinism, i18n English-only into hud_chrome.ts, never edit i18n.locales, explicit-path commits, no em/en dashes/emojis); the Validation matrix; and the Review Dispatch Matrix.
- This phase file (phase-18e-render-tier-i18n-perf-dedup.md).
- The SPECIFIC source ranges this phase touches, with their real V16 line numbers:
  - Slice A: src/render/gfx.ts:104-109 (PRESET_* + DEFAULT_PRESET = PRESET_ULTRA), :246-253 (graphicsPresetLabel), :352-371 (runtimeHints), :373-376 (isConstrainedBrowser), :378-389 (tierFromHints); src/game/settings.ts:16-18 (graphicsPreset { min:1, max:5, def:4 }, and the browserEffects def:0 "Auto" precedent at :19-25); src/main.ts:878-886 (the UiEffectsApplier resolve closure feeding presetLabel: graphicsPresetLabel(settings.get('graphicsPreset'))); src/game/ui_effects_profile.ts:78-100 (resolveUiEffectsProfile: tier from presetLabel); src/render/renderer.ts:1330-1332 (isMobileRuntime) and :4071-4084 (the nameplate timer + the STALE comment at 4075-4078); src/game/ui_tier_knobs.ts:151-186 (the nameplate-cadence block + the STALE comments at 156-167 and 179-182, the NAMEPLATE_INTERVAL_LOW_SEC=1/15 at :174 and NAMEPLATE_INTERVAL_FULL_SEC=1/24 at :177, nameplateIntervalSec at :184-186).
  - Slice B: src/ui/auras_view.ts:62-69 (DURATION_HIDE_THRESHOLD=99 + DURATION_UNIT_SUFFIX='s'), :91-103 (the AurasDeps interface), :188-203 (the slot.durationText emit at :196-199 using DURATION_UNIT_SUFFIX); the single AurasDeps construction site src/ui/hud.ts:2445-2450 (aurasViewDeps, shared by buffBarPainter :2459 + targetDebuffsPainter :2468); src/ui/i18n.catalog/hud_chrome.ts (the unitFrame group; English-only); tests/auras_view.test.ts (the deps stub).
  - Slice C: src/ui/hud.ts:4462-4467 (the arena auto-close raw hide); src/ui/arena_window.ts:102-111 (close() with restoreFocus) and :148-163 (the offline branch unconditional el.innerHTML at :151 vs the live sig skip at :159).
  - Slice D: src/ui/entity_i18n.ts:286-297 (tEntity + the itemDisplayName precedent to mirror); the duplicate definitions classDisplayName at hud.ts:10064, char_window.ts:59, social_window.ts:74, talents_window.ts:120, arena_window.ts:318 (private), leaderboard_window.ts:253 (private), spellbook_window.ts:269 (private); zoneDisplayName/zonePoiLabel/dungeonDisplayName at hud.ts:10119/10127/10131 and map_window_painter.ts:285-292; and the call sites that use `this.classDisplayName(...)` in the three private-method windows (arena/leaderboard/spellbook).
  - Slice E: src/ui/hud.ts:4424 (the raw `$('#player-frame').classList.toggle('combat', inCombat)`), :733 (the cached `private playerFrameEl = $('#player-frame')`), :1289 (the elided `private toggleClass` writer); tests/hud_perf_budget.test.ts (the `hudHotDomWrites <= 152` ceiling) and docs/frontend-modernization/perf-baseline-v016.md.
  - Slice F: src/styles/hud.css:2180 (the base `.fct { transform: translate(-50%, -50%) }` centering) and :2188-2211 (@keyframes fct-rise margin-top 0 -> -76px, @keyframes fct-crit margin-top 0 -> -86px with the 15% scale(1.5) pop); the 8 fctPainter.spawn sites in hud.ts at 5691-5702, 5720-5729, 5743-5746, 5764-5773, 5784-5793, 5795-5804, 6053 (heal2), 6901 (showSelfNote); src/ui/fct_core.ts:118-186 (the FctEvent type, FctDescriptor.riseDistance at :131, the doc + FCT_RISE_PX=76 at :145-151, describeFct + the riseDistance assignment at :183); tests/fct_core.test.ts:18/52/130/138.
The orchestrator keeps the summary, not the raw dumps. This is a leaf-cleanup batch and fits well under 40%; if the working set approaches the ceiling, split off Slice D (the cross-file dedup) and Slice F (the FCT trio) into their own sessions.

STEP 2 - ORCHESTRATION + EXECUTE (fan out, integrate hud.ts sequentially):
Slice A - render-tier cost ceiling (item 1):
- PRIMARY (always safe, maintainer already endorsed "fix docs"): refresh the now-stale "P17a-tracked" / "tracked for the P17a perf gate" comments. P17a closed TEST-ONLY without restoring the ceiling, so the comments must stop pointing at a closed phase. Edit renderer.ts:4075-4078 and ui_tier_knobs.ts:156-167 and :179-182 so they describe the CURRENT state (the device->preset axis change, the 1/15 staleness floor, and where the cost ceiling now lives), not a future P17a job. No em/en dashes.
- THEN the actual mitigation (the sanctioned static-preset path): make the UNSET/default graphicsPreset device-aware so a constrained/weak mobile device lands on a lower tier (and therefore the nameplate cadence on its 1/15 LOW ceiling). Use the existing static device probe isConstrainedBrowser(runtimeHints()) (gfx.ts:373-376), gate it on the user NOT having explicitly chosen a preset, and apply it consistently to BOTH default-resolution paths so the 3D tier and the data-fx-level never diverge: (1) the gfx.ts path that reads storedNumericSetting('graphicsPreset') and falls to DEFAULT_PRESET (gfx.ts:365 + tierFromHints :381), and (2) the main.ts path graphicsPresetLabel(settings.get('graphicsPreset')) (main.ts:881) whose unset value is masked by settings.ts def:4. The cleanest shape is a single pure resolveDefaultGraphicsPreset(hints) helper in gfx.ts returning PRESET_LOW when isConstrainedBrowser(hints) else DEFAULT_PRESET, used wherever the unset default is resolved; do NOT change graphicsPresetLabel(value)'s own `?? DEFAULT_PRESET` (it is also the options-UI label resolver and must stay device-agnostic), and do NOT override an explicit stored preset. Add a deterministic unit test (drive the helper with a constrained-hints stub and a desktop-hints stub) asserting constrained -> low and desktop -> ultra, plus an assertion that the resolved low tier yields nameplateIntervalSec === NAMEPLATE_INTERVAL_LOW_SEC (the restored ceiling). Keep the two-controller invariant: the helper imports no governor; only the static probe + the stored preset move it.

Slice B - aura duration suffix (item 2):
- Add a duration-suffix dep to the AurasDeps interface (auras_view.ts:94-103), e.g. `durationUnitSuffix(): string`, fired every frame like the existing iconId/auraName deps (so an in-game language switch lands next tick, per the comment at :91-93). In the core, replace the DURATION_UNIT_SUFFIX literal at :198 with deps.durationUnitSuffix() and DELETE the DURATION_UNIT_SUFFIX const (:66-69). Keep DURATION_HIDE_THRESHOLD and the Math.ceil exactly (byte-faithful number; do not introduce formatNumber here, that is a separate larger i18n change).
- Wire the dep ONCE at hud.ts:2445-2450 (aurasViewDeps) to a t() call on a NEW English-only key in src/ui/i18n.catalog/hud_chrome.ts under the unitFrame group, e.g. hudChrome.unitFrame.durationUnitSeconds with English value 's'. The value is a single char (non-wordy), so it will NOT trip the M16 completeness gate's untranslated-English flag in zh/ja/ko/ru. Never edit i18n.locales/<lang>.ts. Update tests/auras_view.test.ts's deps stub with the new dep and assert durationText uses the injected suffix.
- The NPC quest glyphs (the NpcGlyph union of question mark, exclamation, and neutral dot at minimap_markers.ts:50/155) and the 'bold 11px Georgia' font (minimap_painter.ts:66) are near-universal symbols and a named typography constant; per the item's own guidance LEAVE them unchanged and note that in the doc update. The aura suffix is the only deliverable in this slice.

Slice C - arena window (items 3 + 4):
- Auto-close focus-return (item 3): at hud.ts:4462-4467 replace the raw `$('#arena-window').style.display = 'none'` with `this.arenaWindow.close()`. ArenaWindow.close() (arena_window.ts:102-111) already guards: it no-ops + nulls openerFocus when the window was not displayed, and restoreFocus tolerates a stale opener, so returning focus to the opener mid-bout is safe. Keep the `arenaMatchSeen` bookkeeping at :4467 unchanged.
- Offline skip-rebuild (item 4): in arena_window.ts:148-153, guard the offline `el.innerHTML = this.offlineHtml()` with a sentinel signature so it builds once per open instead of every ~250ms mediumHud tick. Add a named const (e.g. ARENA_OFFLINE_SIG) that the live-sig builder can never emit (prefix it with a marker the real sig format never produces). On the offline branch: `if (this.lastSig === ARENA_OFFLINE_SIG) return; this.lastSig = ARENA_OFFLINE_SIG;` then build + attach the close listener. The live branch already resets via `view.sig === this.lastSig` (:159), so a transition offline->live rebuilds (the live sig never equals the sentinel) and live->offline rebuilds once (lastSig holds a real sig, not the sentinel). Verify the sentinel cannot collide.

Slice D - entity-helper dedup (item 5):
- Add to src/ui/entity_i18n.ts (mirroring the itemDisplayName precedent at :295-297) thin tEntity wrappers: classDisplayName(cls: PlayerClass), zoneDisplayName(zoneId: string), zonePoiLabel(zoneId: string, poiIndex: number), dungeonDisplayName(dungeonId: string). Each is a one-line `return tEntity({ kind, ... , field: 'name'|'label' })`.
- Replace every redefinition with an import from './entity_i18n': the module-level functions at hud.ts:10064/10119/10127/10131, char_window.ts:59, social_window.ts:74, talents_window.ts:120, and map_window_painter.ts:285-292; and the PRIVATE methods at arena_window.ts:318, leaderboard_window.ts:253, spellbook_window.ts:269 (delete the method, change `this.classDisplayName(...)` call sites to `classDisplayName(...)`). For arena_window's `classDisplayName(m.oppClass)` (the private took `cls: string` and cast), pass `m.oppClass as PlayerClass` at the call site to match the shared signature. Keep social_window's CLASSES[cls] guard wrapper (:80) intact; only its inner classDisplayName changes to the import. Leave hud.ts's dungeonDisplayNameFromSource (:10143) and any source-fallback variant alone (they are not the tEntity wrapper).
- entity_i18n.ts is not a UI_PURE_CORES module (it imports the i18n runtime), so no purity-allowlist change is needed.

Slice E - player-frame combat toggle (item 6):
- At hud.ts:4424 replace `$('#player-frame').classList.toggle('combat', inCombat);` with `this.toggleClass(this.playerFrameEl, 'combat', inCombat);` (cached ref :733, elided multi-slot writer :1289). The 'combat' (element,class) slot is independent of the unit_frame painter's slots, so it cannot collide. This converts a per-frame raw, uncounted, re-querying write into a counted, change-only one.
- IMPORTANT: this now ROUTES through the elided writer, so the standing hud_perf_budget.test.ts `hudHotDomWrites <= 152` census will count it (the codeCheck confirms 152 currently EXCLUDES this raw write). If the steady-loop census rises to 153, UPDATE the ceiling constant in tests/hud_perf_budget.test.ts and the number in docs/frontend-modernization/perf-baseline-v016.md, with the justification that a raw uncounted re-query became a counted change-only write (a skip-rate improvement, not a regression). Do not weaken the gate; raise the documented floor with the reason.

Slice F - FCT internals (items 7 + 8 + 9):
- Rise off margin-top (item 7, CSS-only, treat carefully): in src/styles/hud.css:2188-2197 change @keyframes fct-rise to composite via translateY instead of margin-top, folding the base `.fct` centering (translate(-50%, -50%), hud.css:2180) into the keyframe so it is not overridden: `from { transform: translate(-50%, -50%); opacity: 1 }` to `to { transform: translate(-50%, calc(-50% - 76px)); opacity: 0 }`, and remove margin-top from the keyframe. For @keyframes fct-crit (:2198-2211) the rise shares the transform with the 15% scale(1.5) pop, so byte-identical motion is harder: either pin the 0%/15%/100% translateY alongside the existing scale (0%: translate(-50%,-50%) scale(1); 100%: translate(-50%, calc(-50% - 86px)) scale(1)) and verify the 15% interpolation matches, OR animate translateY on an inner wrapper element (a small fct_painter.ts change, the suggestedFix's alternative). The motion (rise distance, easing, the crit scale pop, screen-anchored position) MUST be pixel-identical: verify by screenshot-diff against the P0 visual baseline. If the fct-crit case cannot be made byte-identical by composing into the single transform OR a clean inner wrapper, STOP and leave item 7 (it is a compositor perf nicety, not a correctness fix).
- SimEvent -> FctEvent mapper (item 8, pure + tested): the FctEvent literal is assembled inline at the 8 spawn sites. Extract the PURE discrimination (the kind selection + isSelf + crit decision) into a small pure, deterministic helper (extend fct_core.ts or a new src/ui/fct_event.ts registered in UI_PURE_CORES) that takes the normalized SimEvent fields + the {isPlayerSource, isPlayerTarget} role flags and returns { kind: FctKind; isSelf: boolean; crit: boolean } (or null when no float). The localized text (the t() calls and the `${amount}`/`-${amount}`/`+${amount}` fragments) and the resolved target entity ({pos, scale}) STAY at the call site and are spread onto the result, so the core stays i18n-free, clock-free, and IWorld-free (consistent with fct_core emitting discriminators and the painter localizing). Behavior at every site must be byte-identical. Add a unit test covering each kind path (miss/dodge self-vs-other, damage-done-ability vs -auto, damage-taken, heal, xp, rested-xp, self-note). If keeping all 8 sites behavior-identical forces the mapper to call t() or read an entity (impurity), extract only the pure discrimination subset and leave text/target inline rather than ship an impure or behavior-changing mapper.
- Remove the unread riseDistance field (item 9, trivial): delete FctDescriptor.riseDistance (fct_core.ts:131), the assignment at :183, and the doc-comment reference at :149; in tests/fct_core.test.ts remove the `riseDistance: FCT_RISE_PX` field at :52 and the assertion at :130. KEEP the FCT_RISE_PX constant (:151) and its self-test (:138 `expect(FCT_RISE_PX).toBe(76)`): it stays the documentary constant the test pins against the CSS rise distance that item 7 preserves (so FCT_RISE_PX remains exported + referenced, no unused-symbol break).

Then integrate the hud.ts-touching slices (C auto-close, D helper imports, E toggle, F spawn sites) into the monolith SEQUENTIALLY, running `npx tsc --noEmit` after each so an interleaved clip does not compile-break silently. Update tests/client_shell.test.ts only if a DOM id moved (none expected this phase).

INVARIANTS THIS PHASE MUST KEEP (state.md locked decisions + non-negotiable constraints):
- PRESENTATION-ONLY (decision 4): no change to src/sim, server, src/net, headless, or src/world_api.ts (IWorld). Slice A edits src/render + src/game (render-importable leaf), which is in scope; if it appears to need an IWorld member, STOP.
- STATIC PRESET, never the FPS governor (decision 6): Slice A's default-preset helper and the nameplate cadence read the static graphicsPreset / data-fx-level only; no governor import, no per-frame device fork (the device fork was DECLINED). The ui gfx bucket stays governable:false.
- COMPONENT CONTRACT + DETERMINISM (decision 9, non-negotiable): the Slice B suffix dep and the Slice F FCT mapper keep their pure cores DOM/Three-free and clock-free (no Math.random / Date.now / performance.now); injected deps localize. Cores stay registered in UI_PURE_CORES; the purity guard stays green.
- CLIENTWORLD-vs-SIM PARITY (decision 15): auras_view (Slice B) and the FCT mapper (Slice F) are world-shaped cores; keep their tests driving BOTH a Sim-shaped and a ClientWorld-mirror-shaped stub with identical output (auras_view already has this; preserve it).
- WRITE-ELISION (decisions 3/5/5a): Slice E routes the combat toggle through the existing elided toggleClass writer; add NO raw style/class/text write to the hot path and NO seventh writer.
- WCAG 2.2 AA on chrome (decision 10): Slice C's auto-close preserves focus-return (SC 2.4.3); do not regress the arena window's role/aria/focus wiring. FCT nodes are aria-hidden screen-anchored combat text (not focusable chrome): state that a11y boundary honestly, do not add a control role.
- NO MAGIC VALUES (decision 12): no new TS hex/px in any painter; Slice C's sentinel and Slice A's helper use named constants. (The Slice F keyframe pixel distances are CSS @keyframes values, not TS painter literals, so the no-magic-values painter guard does not cover them.)
- i18n: the ONLY new player-visible string is the Slice B aura suffix, added to hud_chrome.ts (English-only) and rendered via t(); keep it non-wordy (single char). Never edit i18n.locales/<lang>.ts; no concat, no `?? 'English'` fallback, no default param.
- PERSISTENT-MONOLITH (decision 17): hud.ts and renderer.ts stay the wiring hub; this phase removes inline dup/raw-writes, it does not try to shrink them to nothing.
- No em dashes, en dashes, or emojis anywhere (code, comments, docs, commits). Shared worktree: commit with EXPLICIT paths, never `git add -A`.

Out of scope (do NOT do in this phase):
- The aura/glyph item's NPC glyphs + font (left as documented), and any numeric formatting of aura durations beyond the suffix (a separate larger i18n change).
- The other P18 waves: keyboard-nav/dialog-root a11y (P18a), per-window ARIA (P18b), forced-colors/focus-rings/target-size (P18c), live-regions + FocusManager unification (P18d), tooling/test/docs hygiene (P18f). Do not pull their items in.
- Any sim/server/net/IWorld/wire change; any new IWorld member; the FPS governor or a new gfx bucket.
- Restoring the DECLINED per-device nameplate fork; cross-engine CI (P17b, declined/optional).

STEP 3 - VALIDATION + REVIEW (run ONLY the validation-matrix rows the diff touches):
- Baseline (every phase): `npx tsc --noEmit`.
- Pure core added/changed (Slices A helper, B auras_view, F mapper + fct_core): `npx vitest run` the touched core tests (the new gfx default-preset test, tests/auras_view.test.ts, tests/fct_core.test.ts, the new FCT-mapper test, tests/ui_tier_knobs*.test.ts or the nameplate cadence test) + `npx vitest run tests/architecture.test.ts` (UI-purity guard; register any NEW pure core in UI_PURE_CORES) + the same-input-same-output + the ClientWorld-vs-Sim parity assertions (decision 15) for the world-shaped cores.
- New / changed .ts module: `biome check` on every new/changed .ts (the V16 ratchet).
- CSS / HTML entry changed (Slice F item 7): `npx vitest run tests/css_corpus.test.ts` + `npx vitest run tests/client_shell.test.ts` + `npm run build` (4 entries) + the backdrop-survival check (a no-op for FCT) + `biome check` on hud.css + a SCREENSHOT-DIFF against the P0 visual baseline confirming the FCT rise + crit pop motion is pixel-identical (the load-bearing gate for item 7).
- PER-FRAME phase (Slice E touches the hot path): `npm run` the perf_tour harness (desktop + mobile) and assert frameP95 <= the P0 baseline AND hudHotDomSkipRate >= the P0 baseline; run tests/hud_perf_budget.test.ts and, if the now-counted combat toggle raised the steady-loop census, update its ceiling + perf-baseline-v016.md with the justification (counted change-only write replacing a raw uncounted re-query). Slice C's arena is a COLD window (open-on-demand): no perf gate, but the offline skip-rebuild is verifiable by a sig assertion.
- WINDOW or CONTROL changed (decision 10, Slice C): the WCAG 2.2 AA chrome check that the arena window's focus-return survives the auto-close path (axe clean on the built window; focus returns to the opener on close()/auto-close; visible :focus-visible never animated away; target-size unchanged). Plus the no-magic-values painter guard stays green (no new TS hex/px).
- Player text changed (Slice B): `npm test` (the i18n catalog/freshness + M16 completeness guards live in the suite); the new English-only hud_chrome.ts key does not trip the release tier (PR tier permits English-only).
- Full pre-commit sanity: `npm test`.
Review dispatch (state.md Review Dispatch Matrix): spawn qa-checklist ONLY, plus the mandatory adversarial verification pass (a fresh subagent diff review prompted for COVERAGE, plus a "what is missing" critic). privacy-security-review does NOT fire (no server/admin/net/secret, no new Math.random/Date.now/performance.now in sim or a pure core). migration-safety does NOT fire (no DDL/JSONB). cross-platform-sync does NOT fire (no IWorld/sim/online.ts/server-wire/i18n-MATCHER change; entity_i18n.ts is a UI display wrapper and hud_chrome.ts is a UI catalog, neither is the sim_i18n/server_i18n matcher). Prompt the reviewer for COVERAGE not filtering; do not commit until it reports no BLOCKING. If a reviewer truncates, resume with: "Stop reading more files. Output the full report now based on what you've already seen. No more tool calls. Format: BLOCKING / SHOULD-FIX / NICE-TO-HAVE / VERDICT."

STEP 4 - COMMIT CADENCE:
2 to 5 Conventional Commits with a scope and EXPLICIT paths (never `git add -A`). Suggested:
- `fix(render): default constrained mobile to the low graphics preset; refresh stale nameplate comments` (src/render/gfx.ts src/game/settings.ts src/render/renderer.ts src/game/ui_tier_knobs.ts src/main.ts + the gfx test).
- `refactor(ui): lift class/zone/poi/dungeon display helpers into entity_i18n; localize aura duration suffix` (src/ui/entity_i18n.ts the 8 importers src/ui/auras_view.ts src/ui/hud.ts src/ui/i18n.catalog/hud_chrome.ts tests/auras_view.test.ts).
- `fix(ui): arena auto-close focus-return + offline panel skip-rebuild; player-frame combat toggle via elided writer` (src/ui/hud.ts src/ui/arena_window.ts tests/hud_perf_budget.test.ts docs/frontend-modernization/perf-baseline-v016.md).
- `refactor(ui): FCT rise composites via transform; pure SimEvent->FctEvent mapper; drop unread riseDistance` (src/styles/hud.css src/ui/fct_core.ts src/ui/fct_event.ts src/ui/hud.ts tests/fct_core.test.ts + the mapper test).
- `docs(frontend): record P18e cleanups in progress.md + state.md ledger` (docs/frontend-modernization/progress.md docs/frontend-modernization/state.md).

STEP 5 - ACCEPTANCE CRITERIA:
- [ ] Slice A: a constrained/weak mobile device with no explicit graphicsPreset defaults to the low tier via the static-preset path (one resolveDefaultGraphicsPreset(hints) helper, no governor, no per-frame fork), so its nameplate cadence is the restored 1/15 LOW ceiling; an explicit user preset is never overridden; the stale "P17a-tracked" comments at renderer.ts:4075-4078 and ui_tier_knobs.ts:156-167/179-182 are refreshed. (OR: if the default breadth was surfaced and deferred, the comment refresh landed alone and the default change is surfaced to the maintainer.)
- [ ] Slice B: the aura duration suffix renders through an injected AurasDeps dep backed by a new English-only hud_chrome.ts key (non-wordy); DURATION_UNIT_SUFFIX is deleted; auras_view stays a pure core; the NPC glyphs + font are left unchanged and noted.
- [ ] Slice C: the arena auto-close routes through arenaWindow.close() (focus-return preserved, restoreFocus guards a stale opener); the arena offline panel skip-rebuilds via a named sentinel sig (built once per open, not every 250ms) with no sentinel/live-sig collision.
- [ ] Slice D: classDisplayName + zoneDisplayName + zonePoiLabel + dungeonDisplayName are exported from entity_i18n.ts (thin tEntity wrappers); all 8+ redefinitions across hud.ts/char/social/talents/arena/leaderboard/spellbook/map_window_painter are replaced with imports; tsc + biome clean.
- [ ] Slice E: hud.ts:4424 routes through this.toggleClass(this.playerFrameEl, 'combat', inCombat); the hud_perf_budget census + perf-baseline-v016.md are updated if the now-counted write raised the ceiling (with justification); no raw hot-path write or seventh writer added.
- [ ] Slice F item 7: the FCT rise + crit pop composite via transform (no margin-top layout), with motion pixel-identical to the baseline (screenshot-diff), OR item 7 is STOPPED and reported with the reason.
- [ ] Slice F item 8: the SimEvent -> FctEvent shaping runs through a pure, tested, clock-free, i18n-free, IWorld-free mapper; all 8 spawn sites are behavior-identical; OR only the pure discrimination subset was extracted with the reason.
- [ ] Slice F item 9: FctDescriptor.riseDistance is removed (field + assignment + doc reference + the two test assertions); FCT_RISE_PX and its self-test remain as the documentary constant.
- [ ] Gates: `npx tsc --noEmit` clean; `biome check` clean on all new/changed .ts; tests/architecture.test.ts green (any new pure core registered); the touched core tests + their ClientWorld-vs-Sim parity assertions pass; perf_tour frameP95 <= P0 baseline AND hudHotDomSkipRate >= P0 baseline (Slice E); css_corpus + build x4 + screenshot-diff pass (Slice F item 7); `npm test` green; qa-checklist reviewer reports no BLOCKING; the adversarial verification pass found no uncovered gap.
- [ ] No src/sim / server / src/net / headless / src/world_api.ts change; no i18n.locales/<lang>.ts edited; no em/en dashes or emojis anywhere.

STEP 6 - DOC UPDATES + MEMORY:
- Update docs/frontend-modernization/progress.md: record the P18e cleanups (the nine items, which landed and any deferral, the hud.ts line-count delta, the perf-budget census change if any).
- Update docs/frontend-modernization/state.md: flip this phase's ledger row to done; note the entity_i18n.ts shared display helpers, the new hud_chrome.ts aura-suffix key, and the restored mobile cost ceiling (or its surfaced deferral).
- Record surprising rules in memory: that the data-fx-level the nameplate cadence reads derives from ONE static graphicsPreset source (so a device-aware default cascades cleanly, decision 6); that Slice E converting a raw write to the elided toggleClass writer can raise the standing hudHotDomWrites census (raise the ceiling with justification, do not weaken the gate); and the FCT rise-vs-crit transform faithfulness gotcha (the crit scale pop shares the transform, so the inner-wrapper path may be the only byte-identical route).

STEP 7 - FINAL RESPONSE:
Report status (done / done-with-deferral), files created/changed (absolute paths), validation results (tsc, the touched core tests incl parity, architecture guard, perf_tour numbers + the perf-budget census, the screenshot-diff for the FCT rise, biome, npm test), the qa-checklist + adversarial-verification verdicts, and any deferral (especially Slice A's default-preset breadth and any STOPPED Slice F sub-item). End with exactly:
Next: phase-18f-tooling-test-docs-hygiene.md

STOPPING RULES:
- STOP and surface a scope change if any item appears to need a NEW IWorld member or a sim/server/net/headless change (presentation-only).
- STOP on Slice A if lowering the unset/default whole-renderer tier for constrained mobile is judged a product/balance decision beyond a cleanup; land the doc/comment refresh alone and surface the default change to the maintainer (the nameplate-only ceiling would require the DECLINED per-device fork, so do not reintroduce it).
- STOP on Slice F item 7 if the FCT crit rise + scale pop cannot be made pixel-identical by composing into the single transform or a clean inner wrapper; leave item 7 (it is a perf nicety, not correctness).
- STOP on Slice F item 8 if keeping all 8 sites behavior-identical would force the mapper to call t() or read an entity (impurity); extract only the pure discrimination subset.
- STOP if routing Slice E through the elided writer regresses frameP95 above the P0 baseline or drops the skip-rate below baseline; diagnose the cache-key cause first, do not commit a perf regression.
- STOP if any change would weaken a guard (the UI-purity guard, the no-magic-values guard, the hud_perf_budget ceiling, the M16 completeness gate) instead of satisfying it.
- STOP and split if the working set approaches the ~40% context ceiling (Slice D and Slice F are the natural split points).
```

## Notes for the planner

P18e collects the render-tier / content-i18n / arena-perf / FCT / dedup leftovers that each ledger phase
recorded as accepted-not-fixed and the discovery pass re-verified open against live source. Eight of the
nine items are genuinely small (a focus-return call swap, a sentinel sig, an injected suffix dep, a
dead-field removal, a tEntity wrapper lift, an elided-writer route, a CSS keyframe). The two that carry
real weight are item 1 and item 8, and the packet front-loads both.

Item 1 (the mobile nameplate cost ceiling) is the one with product breadth. The discovery suggestedFix
named gfx.ts, but the live trace shows the nameplate cadence reads data-fx-level, which is derived from
the ONE static graphicsPreset source through graphicsPresetLabel(settings.get('graphicsPreset')) ->
resolveUiEffectsProfile -> the applier (main.ts:878-886, ui_effects_profile.ts:78-100), while the 3D
render tier reads the same preset by a SECOND path (gfx.ts storedNumericSetting :365 + tierFromHints
:381). settings.ts pins graphicsPreset def:4, masking the unset state downstream. So the faithful
mitigation is a device-aware UNSET default applied to both paths, which cascades to the nameplate 1/15
ceiling AND the whole low render tier through the single static preset (decision 6 clean, no fork). That
breadth (a default whole-renderer downgrade for defaulting weak-mobile users) is exactly the product call
the maintainer deferred with "Keep deferral, fix docs," so the packet makes the comment refresh the
always-safe primary, makes the default change the sanctioned-but-gated secondary, and carries a STOPPING
RULE rather than shipping the broad default unilaterally. The codebase already has the device-aware-default
precedent (browserEffects def:0 = Auto) and the static probe (isConstrainedBrowser), so the seam exists.

Item 8 (the SimEvent -> FctEvent mapper) is scoped conservatively: only the pure discrimination
(kind/isSelf/crit) is extractable while staying clock-free, i18n-free, and IWorld-free, because the text
uses t() and the target is a live entity. The packet pins those to the call site and adds a STOPPING RULE
to extract only the pure subset rather than ship an impure or behavior-changing mapper. Item 7's crit pop
shares the transform with the rise, so the faithfulness gate (screenshot-diff) and the inner-wrapper
fallback are load-bearing. Item 9 deliberately keeps FCT_RISE_PX (only riseDistance goes) so the
documentary constant the test pins against item 7's preserved 76/86px rise stays referenced.

ULTRACODE is yes: six disjoint generation slices, with the four hud.ts-touching slices integrated
sequentially (the state.md guidance: fan out, integrate the shared monolith one at a time). The only
reviewer that fires is qa-checklist; privacy-security-review, migration-safety, and cross-platform-sync do
not, because the diff is presentation/render/test/docs and touches no IWorld, sim, server, net, wire, or
i18n matcher (entity_i18n.ts is a UI display wrapper and hud_chrome.ts is a UI catalog, not the
sim_i18n/server_i18n matchers). All nine assigned items are scheduled; none were excluded.
