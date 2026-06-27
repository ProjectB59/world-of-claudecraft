# Phase P18: Cleanup wave (the leftover nice-to-have / should-have / nit items)

The 30-phase feature packet (P0 to P17b) is complete. This wave (P18) picks up the items that prior
phases classified as nice-to-have, should-have, should-fix, nit, minor, follow-up, deferred,
accepted-not-fixed, or noted-not-done and that a discovery pass then VERIFIED are still open in the
live tree. It exists so those leftovers are addressed the same way every other phase was: each
sub-phase is its own self-contained starter prompt, run as a fresh Claude Code session, with the
mandatory QA pass immediately after. P18 is split into six sub-phases (P18a to P18f) for the same
reason the main packet went 18 to 30: each slice plus its QA plus in-session remediation must fit
well under the ~40% Opus-degradation ceiling.

This wave stays in the SAME spirit as the packet it cleans up: PRESENTATION-FIRST and behavior
preserving. No sub-phase touches `src/sim`, `server`, `src/net`, `headless`, or `src/world_api.ts`;
none extends `IWorld` or changes a wire field. The few genuine behavior ADDs (the market filter
keyboard nav, the target-name live region, the chat anti-flood throttle) fill documented gaps; the
rest are refactors of green code, token cleanups, a11y polish, test hardening, and docs hygiene.

## How this list was produced

A read-only discovery pass audited all 30 phase packets plus `state.md`, `progress.md`, and the
per-phase memory files, then verified every candidate against the live code on
`feature/frontend-modernization-v016`:

| Verdict | Count | Meaning |
|---|---|---|
| total candidates | 225 | every item any phase classified as a leftover, across the whole packet |
| RESOLVED | 93 | a later phase or re-audit already did it (verified present in code) |
| DECLINED | 29 | the maintainer explicitly decided NOT to do it (see "Declined / out of scope") |
| NON_ISSUE | 47 | recorded then verified a non-issue / byte-faithful carry-over with no defect |
| OPEN | 56 | genuinely still open and actionable |

Of the 56 OPEN, five were the SAME item logged under more than one phase (the roving-tabindex
extraction x3, the entity-display-helper dedup x2, the dialog-root extraction x2, the FCT-into-combat
feed x2, the windowFocus E2E seam x2), which collapse to single items, and two are follow-on FEATURES
(see below). That leaves 48 distinct cleanup items, scheduled across P18a to P18f.

## The six sub-phases (48 items)

- P18a `phase-18a-a11y-keyboard-dialog-primitives.md` (4) - the two rule-of-three a11y extractions:
  a pure `roving_index.ts` core folding the three triplicated talents handlers, a thin
  `dialog_root.ts` helper across the window roots, wiring the existing `dropdownKeyNav` core into the
  market filter listbox (the one real keyboard gap), and widening the UI-purity guard to flag a pure
  core importing a `*_window`.
- P18b `phase-18b-per-window-aria-polish.md` (9) - the deferred per-window WCAG nice-to-haves: social
  tabs to a real tablist, bags focus-return + an inert prompt background, the char preview name, the
  party leader-glyph / raid-membership / focus-ring-opacity fixes, the char-window focus-return test
  pin, and axe coverage of the social combobox expanded state.
- P18c `phase-18c-visual-a11y-tokens.md` (6) - visual a11y and design-token cleanup: forced-colors
  redundant cues for the target name and the cast bars, tokenizing the residual hover hex, target-size
  verification (with a desktop min-height bump) for bag cells and social rows, the `#bags`
  block-vs-flex reconcile, and a live computed-style focus-indicator check.
- P18d `phase-18d-live-regions-focus.md` (6) - the decision-10 announcement follow-ups and one focus
  unification: a target-name polite live region, routing the FCT self-note into `#combat-live`,
  decoupling chat's live region from chat-pane visibility, re-announcing identical combat summaries,
  a chat anti-flood throttle, and folding the wallet-picker trap into the one `FocusManager`.
- P18e `phase-18e-render-tier-i18n-perf-dedup.md` (9) - render-tier, content-i18n, perf nits and
  structural dedup: the weak-GPU nameplate cadence ceiling via the static preset, the aura
  duration-suffix i18n, the arena auto-close focus-return + offline skip-rebuild, the
  entity-display-helper dedup into `entity_i18n`, the player-frame combat toggle through the elided
  writer, and the FCT internals (rise transform, pure SimEvent-to-FctEvent mapper, dead field removal).
- P18f `phase-18f-tooling-test-docs-hygiene.md` (14) - tooling, test-harness, and docs hygiene: the
  mobile-script port + assertions + deadzone-nav fix, the two tolerated biome INFOs, the windowFocus
  E2E seam, the bare-named pure-core completeness gate, an executing delve-painter draw test, the
  stale-comment and stale-ledger-bullet fixes, the decision-10 wording reconcile, and the OPTIONAL
  cross-engine WebKit/Firefox + axe-in-CI decision (decision 14, prototyped then reverted; re-land or
  keep declined).

Execution order (the linear "Next:" chain): P18a, P18b, P18c, P18d, P18e, P18f, then a short
whole-wave QA confirming all gates stay green and `git status` is clean.

## Deliberately NOT in this wave

Follow-on FEATURES the seams enable (these are new product surface, not leftover cleanup, so they
belong in a feature packet, not here):

- Build the extra second/third action bars through the P12a descriptor seam.
- Build the raid / focus / boss unit frames through the P10b `unit_frame` FAMILY seam.

Already DECLINED by the maintainer (do not resurrect without new evidence; recorded for traceability):

- The P17b / decision-13 selective lazy-load + JS bundle-budget CI gate (measured and declined: the
  fully-proven prototype saved ~14 KiB gzip with zero FPS impact).
- `admin.html` / `guide.html` CSS left survival-only, not extracted or tokenized (decision 18).
- The iOS real-device manual mobile-landscape pass (cannot run in CI; stays a manual deliverable).
- The target cast-bar label staying the raw ability id (byte-faithful preservation, P11a).
- Re-adding a device-keyed (`isMobileRuntime`) nameplate cadence floor (P14b: the cadence axis is the
  static preset now, by decision 6; P18e restores the COST CEILING via the sanctioned preset-default
  path, NOT the device fork).

The cross-engine WebKit/Firefox + axe-in-CI matrix (decision 14) sits between "declined" and "open":
it was prototyped green then reverted with the decision-13 bundle work. P18f carries it as an
OPTIONAL, explicitly-decided item (re-land the CI job, or record it as intentionally deferred), not a
mandate.

## Coordination with the separate hud-ux-and-accessibility packet

`docs/hud-ux-and-accessibility/` is a separate, larger PLANNING packet (the follow-on to the
`ui-architecture-hud-modularization` refactor) that deliberately re-baselines visuals to a
dark-fantasy aesthetic and pushes accessibility to WCAG 2.2 AAA with a Reader Mode and an Edit Mode.
Several of its foundation phases (its roving-tabindex, its announcer, its design-token system, its
themes, its mobile target-size pass) OVERLAP in theme with P18a/c/d, but the two are different in
intent and baseline:

- P18 closes THIS packet's own deferred nits on `feature/frontend-modernization-v016`, behavior
  PRESERVING, now.
- hud-ux-and-accessibility is a later, aspirational overhaul that re-baselines visuals and may
  subsume or re-home some of these helpers.

P18a's starter prompt carries an explicit stopping rule: if a concurrent session has already landed
an equivalent shared roving or dialog-root module, adopt it instead of shipping a duplicate. Keep
the two waves coordinated through that rule; do not build the same module twice.
