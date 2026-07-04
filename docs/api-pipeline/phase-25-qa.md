# Phase 25 QA: Docs + new:endpoint scaffold + flag-default flip

This is the QA pass for the final implementation phase. It audits the docs sweep, the
`new:endpoint` scaffold and its golden test, and the dispatch-flag default flip for correctness,
coverage, and dead code, applies BLOCKING and SHOULD-FIX findings, then performs PACKET TEARDOWN
(this is Phase 25, the last phase). The audit stays under the 40% context bound because the diff
is small: a handful of docs, one generator plus its test, and a one-field default change. Do not
contradict `state.md` (Locked design decisions).

Paste the block below into a fresh Claude Code session. It is self-contained.

### QA Starter Prompt

````text
This is the QA pass for Phase 25 of the API Pipeline re-architecture: Docs + new:endpoint scaffold
+ flag-default flip.
Model: Opus 4.8, xhigh effort. Harness: Claude Code.
Goal: verify every acceptance criterion from phase-25-docs-flag-flip.md, confirm the default flip
is parity-clean and the scaffold output compiles and passes, fix BLOCKING and SHOULD-FIX findings,
then run packet teardown.

STEP 0 - PRE-FLIGHT
- Run `git status`. The worktree is SHARED; if it is dirty with files you did not create, STOP and
  ask before staging. Commit only with EXPLICIT paths, never `git add -A`.
- Scan Claude Code memory for: "Server API pipeline audit (2026-06-29)", "Biome on touched files",
  "AI-architecture overhaul" (keep AGENTS.md and GEMINI.md thin), "Instruction-files policy".

STEP 1 - LOAD CONTEXT (spawn ONE Explore agent; do not read the planning docs directly)
Have it read and summarize:
- docs/api-pipeline/state.md and docs/api-pipeline/progress.md (the ledger and deferred-items list).
- docs/api-pipeline/phase-25-docs-flag-flip.md (the acceptance criteria and stopping rules).
- The git diff of this phase: `git diff --name-only` plus the full diff of the touched files
  (expect server/CLAUDE.md, CLAUDE.md, server/http/CLAUDE.md, the i18n doc, scripts/new_endpoint.mjs,
  package.json, server/http/config.ts, possibly server/main.ts, tests/server/new_endpoint.test.ts,
  tests/server/http/dispatch_default.test.ts).
The Explore agent must RETURN: the acceptance-criteria checklist verbatim, the exact set of files
changed, the dispatch-flag name and its new default, the scaffold's emitted file set, and the
old-ladder deletion exit criteria as written.

STEP 2 - QA AUDIT (spawn agents in parallel; give each only the Explore summary plus the diff)
- Correctness agent: verify EVERY acceptance criterion in phase-25-docs-flag-flip.md against the
  real diff (not the prose). Specifically confirm:
  - The dispatch default now routes a migrated path through the new pipeline AND the old value
    still reaches the old `handleApi` (server old-vs-new dispatch parity: the Phase 9 dual-path
    parity harness and the registry-completeness test stay green after the flip).
  - The per-path catch-all delegate semantics for un-migrated paths are unchanged.
  - The scaffold emits a RouteDef stub, a typed `Infer`-derived schema, an APPEND-ONLY error code,
    an English `apiError.*` entry, and a paired FakeDb-based test, auto-attaching `requireOwned*` on
    `:id` routes; its output type-checks and its emitted test passes.
  - Stable-code i18n where relevant: any code the scaffold or example puts into the real catalog
    resolves client-side via `userFacingApiError` plus `apiError.*`, with NO English text emitted
    from the server.
  - The docs reference REAL template modules and a REAL canonical-example commit hash, and AGENTS.md
    and GEMINI.md were not re-bloated.
  - No WS wire change; no src/sim/ touch.
- Test-coverage agent: are the new tests sufficient? Confirm the golden test runs the scaffold to a
  temp dir, asserts compile + emitted-test-pass + append-only error_codes.ts, and the dispatch test
  asserts BOTH default-to-new and old-value-to-old. Flag any missing case (for example a `:id`
  scaffold path that does not assert the auto-attached `requireOwned*`).
- Dead-code / cleanup agent: any leftover scaffolding, unused exports, duplicated tunables (the
  flag name or exit thresholds hard-coded in two places), stale doc cross-references, or magic
  literals. Confirm Biome is clean on changed files.
- Domain review agents (spawn ONLY those whose surface the diff touches; check
  `git diff --name-only`): privacy-security-review (server/ touched and the production dispatch
  default flipped: confirm the old path stays reachable, the flip exposes nothing new, the scaffold
  stubs are safe-by-default). Add cross-platform-sync ONLY if the diff touches src/ (the
  `userFacingApiError` matcher or the `apiError.*` catalog). Do NOT spawn migration-safety or
  architecture-reviewer (no DDL, JSONB, or src/sim/ change).
Add to EVERY reviewer prompt: "If your review is truncated, resume from the last file you fully
reviewed and continue; do not restart." Prompt each for COVERAGE, not filtering.

STEP 3 - FIX
- Apply all BLOCKING and SHOULD-FIX findings. Leave NICE-TO-HAVE as deferrals.
- Re-run the validation matrix after fixes:
```
npx tsc --noEmit
npx vitest run tests/server/new_endpoint.test.ts tests/server/http/dispatch_default.test.ts
npx vitest run tests/server/http
npm run ci:changed
npm test && npx tsc --noEmit && npm run build:env && npm run build:server && npm run build
```
  If the diff touches the real `apiError.*` catalog or `userFacingApiError`, also run
  `npx vitest run tests/localization_fixes.test.ts` and the Phase 22 code-parity test.
- Commit fixes as SEPARATE Conventional Commits with a scope and EXPLICIT paths (for example
  `fix(http): ...`, `test(server): ...`, `docs(http): ...`). This phase stays its own green PR.

STEP 4 - UPDATE DOCS + MEMORY
- Update docs/api-pipeline/progress.md and state.md with the QA outcome and any fixes; confirm the
  packet is marked COMPLETE and the old-ladder deletion exit criteria and owner are recorded.
- Record in memory: final dispatch default, the exit criteria wording, the canonical-example commit
  hash, and any surprising rule found during QA.

STEP 5 - PACKET TEARDOWN (this IS the final phase)
- FIRST surface every deferred follow-up so nothing is lost: the old-ladder deletion PR and its
  exit criteria and owner, the deferred API conventions A (versioning) / D (ETag) / F
  (Deprecation/Sunset) / G (OpenAPI), the full-CSP Report-Only effort, the separate
  concurrency-scalability workstream, and every accumulated knownDeviation from state.md. Print
  them as an explicit handoff list.
- THEN, only after the user has seen that list, OFFER to delete docs/api-pipeline/ (the whole
  planning packet) and require EXPLICIT confirmation before deleting. Do not delete unprompted; if
  the user does not confirm, leave the packet in place.

STEP 6 - FINAL RESPONSE FORMAT
Report one of PASS / PASS-WITH-FOLLOWUPS / FAIL, with counts (criteria verified, BLOCKING fixed,
SHOULD-FIX fixed, deferrals), the validation and review results, the deferred follow-up list, the
teardown decision (offered or completed or declined), and the handoff line: "packet complete".
````
