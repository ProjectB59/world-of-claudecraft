# API Pipeline Re-Architecture: Brainstorm and Feature Vision

This is the front-matter for the `docs/api-pipeline/` planning packet: the vision, the
current-state read, the seams we reuse, the new work, the web-research findings that back the
design, and the decisions the user locked on 2026-06-30. The single source of truth for every
phase is `state.md` (its Locked design decisions section); this document is the narrative that
motivates it. The 25 numbered
phases live in `phase-NN-<slug>.md` (impl) and `phase-NN-qa.md` (QA). The originating SPEC is
`source-spec.md` in this directory; all of its `main.ts`/`db.ts` line anchors are STALE
(main.ts is now about 1695 lines), so we re-anchor on symbol names and route strings, never
line numbers.

## Feature vision and approved ideas

Re-architect every JSON/HTTP endpoint on the authoritative game server (`server/`) behind ONE
in-house request pipeline: a static-Map table router, a Koa-style middleware onion, per-domain
route tables (component-first, not routes/controllers/services), and tiny in-house typed
schemas. The goal is maintainability, security, testability, and observability. It is NOT a
concurrency-scalability fix (the single-threaded 20 Hz world loop is the real per-realm ceiling
and is a separate, out-of-scope workstream), NOT a gameplay change, and NOT a WS wire change.
No heavy web framework. Zero new runtime dependencies, with the one weighed exception of
`prom-client` when the `/metrics` exporter lands.

Approved ideas, all confirmed by current code and by 2024 to 2026 primary sources:

- One request pipeline replacing the hand-inlined cross-cutting concerns: router to onion to
  thin handlers in `server/<domain>.ts` modules.
- Harden while migrating. Characterization tests encode the INTENDED (hardened) behavior, so an
  expected response change (a `500` becoming `413`, adding `Retry-After`, adding a missing
  limiter, `405`-before-auth) is not a regression; intentional diffs go on a `knownDeviation`
  list.
- Correct client-error status model: `422` for well-formed-but-invalid (collected one-pass),
  `400` for malformed JSON, `413` over byte cap, `409` unique-violation, `401` missing/invalid
  token with `WWW-Authenticate`, `403` no-entitlement, `429` with `Retry-After`.
- Per-surface error envelopes chosen by one `mapError`, never one global serializer:
  `application/problem+json` for `/api`, RFC 6749 `{error, error_description}` for `/oauth`,
  `{success, data, error}` for `/admin`, plus HTML, redirect, and binary surfaces.
- Stable machine error CODES the client localizes, so the server stays language-agnostic.
- A two-tier rate limiter (in-memory IP gate first, Postgres backstop second) promoted into
  scope because multi-realm is imminent.
- Object-level authorization (BOLA) via load-then-authorize `requireOwned*` resource loaders
  plus a deny-by-default coverage test.
- A top-level security-headers wrapper covering the whole prefix ladder, not just the JSON
  onion.
- The World Market realm-scope persistence bug fixed in this packet (its own PR).
- Observability: a structured logger, request-id correlation, a Prometheus `/metrics` exporter,
  and drain-aware health (`/livez` + `/readyz`).

## Current-state summary

The server has four JSON sub-dispatchers reached from the top-level `createServer` prefix
ladder:

- Main API: `handleApi` in `server/main.ts`. About 46 path branches and about 55 method+path
  combos, every cross-cutting concern hand-inlined, untestable because `main.ts` self-invokes at
  module load.
- Admin API: `handleAdminApi` in `server/admin.ts`. About 19 branches, its own sub-router,
  already tested; keeps the `{success, data, error}` envelope and a frozen `page`/`limit`
  pagination contract.
- OAuth JSON: `handleOAuth` in `server/oauth.ts`. Five JSON endpoints, already tested; keeps RFC
  6749 `{error, error_description}`. The GET consent/device pages return HTML, not JSON.
- Internal: `handleInternalApi` in `server/internal.ts`. Secret-gated; grew well past the SPEC's
  stated "about 2" with eight `x-woc-discord-secret` bot-channel endpoints.

The core gap is the `handleApi` if-ladder: roughly 700 lines, 46 path branches plus inline
regexes, no `405` handling, the bearer regex retyped about six times, `bearerActiveAccount`
boilerplate about 26 times, a single outer `catch` that collapses every failure to `500`, about
20 hand-written rate-limit sites across five files with seven variants and five messages and no
`Retry-After`, zero security headers, raw `console.*` logging, and no `livez`/`readyz`/`metrics`.

What is already good and is kept: clean IO/pure splits, server-authoritative resolution (all
combat/loot/economy stay in the deterministic Sim), the existing `bug_report_db` Postgres
limiter pattern, several already-extracted and tested domain handlers, and the component-first
`server/<domain>.ts` layout. There are also two real bugs to fix along the way: the World Market
`'market'` `world_state` key is not realm-scoped (last-writer-wins item loss across realms on one
`DATABASE_URL`), and the rate-limit strings contain U+2014 em dashes (an invariant violation).

## Existing systems and seams reused (do not reinvent)

- Component-first `server/<domain>.ts` modules. Each domain exports `export const routes:
  RouteDef[]`; handlers stay thin and domain functions take no req/res so the same core serves
  REST and WS and is unit-testable. We add new modules (`characters.ts`, `leaderboard.ts`,
  `reports.ts`) for the currently-inline `main.ts` clusters rather than a parallel layer.
- The `bug_report_db.ts` Postgres limiter pattern. The new `server/ratelimit_db.ts` tier-2
  backstop copies its proven single-statement atomic UPSERT plus idempotent DDL under the boot
  advisory lock.
- Already-extracted, already-tested handlers (the `account.ts` family is the template) feed
  straight into thin `Ctx` handlers; the WS-auth extraction in Phase 1 mirrors how `account.ts`
  was lifted out, not a one-line export.
- The `userFacingApiError` client matcher in `src/main.ts`. This is the live `/api` REST error
  localizer (a startsWith/exact/regex matcher, distinct from `server_i18n` which is WS-only). We
  extend it to look up emitted CODES directly in the client catalog instead of reverse-matching
  English prose, preserving its dual REST + WS-disconnect-reason role.
- The repo's injected-interface FakeDb test idiom (SocialDb-style), not pg-mock-by-SQL-substring,
  standardized at `tests/server/<domain>.test.ts`.

## New work needed

The server `http/` spine (domain-agnostic), under `server/http/`:

- `router.ts`: in-house `Map<method, {static, dynamic}>`. O(1) static match, `:param` capture
  with no per-request regex, `404`-vs-`405`+`Allow` decided before auth, HEAD-for-GET,
  synthesized OPTIONS, single trailing-slash normalization, `Vary: Origin`, and a
  no-regex-routing guard.
- `compose.ts` + `context.ts`: the recursive onion with a double-next guard and the `Ctx`
  builder. Critical: `compose()` returns a promise and does NOT respond or catch on its own, so
  `withErrors` must be outermost AND the top-level `compose(ctx)` call is wrapped to guarantee
  exactly one idempotent response on both resolve and throw; a top-level `clientError` handler
  destroys the socket.
- `schema.ts`: a tiny in-house validator (about 150-line cap, no zod/valibot) conforming to the
  Standard Schema v1 `~standard` type shape, collecting all field issues in one pass, with
  handler types derived via `Infer<typeof S>` and typed params AND query.
- `errors.ts` + `error_codes.ts`: `HttpError`/`AppError`, the per-surface `mapError`, and the
  append-only `as const` code catalog.
- `registry.ts` + `index.ts` + `middleware/*.ts` + a pure `config.ts` `loadConfig(env)`.

Per-domain migrations (one domain per phase, public reads first, lowest risk): leaderboard,
auth, characters (introduces BOLA), account (plus the em-dash fix), wallet+cards, reports +
telemetry, Discord, admin, and OAuth+internal. Each migrated route lands behind the dispatch
flag, parity-clean against its golden-master fixtures.

Cross-cutting upgrades, each its own phase: the two-tier rate limiter + `ratelimit_db.ts`, the
World Market realm-scope fix + partitioned backfill, the security-headers wrapper +
Content-Type/Origin enforcement, the REST i18n matcher + per-surface code-parity guard,
structured logging + `/metrics` + drain-aware health, and validated config + server timeouts +
no-magic-values consolidation + the perf/tick-jitter acceptance gate. The packet opens with a
re-inventory and a dedicated test-scaffolding phase (the phase the SPEC was missing), because
the spine is not importable today and the safety net (faithful fake req/res/Ctx, an injectable
`now()` clock, FakeDb interfaces, a golden-master normalizer, a per-pass-isolated parity driver)
does not yet exist.

## Web-research findings (validated decisions, with primary sources)

Every load-bearing decision was checked against a primary source and against the current code.

- RFC 9457 `application/problem+json` as the `/api` error format. It obsoleted RFC 7807 in
  August 2023 with no breaking member change. The stable machine `code` is the load-bearing
  field; consumers use `type`/`code` and never parse `detail`. Confirmed by the RFC and by the
  repo's existing `userFacingApiError` matcher. We adopt the SHAPE but decline its
  Accept-Language content negotiation; the client owns all locales.
- The `422` / `400` / `413` / `429` status model. RFC 9110 makes `422` core HTTP (no longer a
  WebDAV wart) for well-formed-but-invalid; RFC 6585 backs `429` + `Retry-After`. This is a
  deliberate, documented `knownDeviation` from today's `400`-for-validation and
  `500`-for-malformed behavior.
- Per-surface envelopes chosen by `mapError`, never one global flip. Confirmed: all three shapes
  (`problem+json`, RFC 6749, `{success, data, error}`) already exist in the code today.
- Koa-compose recursive-dispatch onion (about 15 lines) with a double-next guard, ordered
  cheap-reject-first (IP-keyed limits before body+DB, account-keyed after auth). Verified against
  `koajs/compose`, with the critical caveat that `compose` returns a promise and does not respond
  or catch on its own, so the outermost-`withErrors` + wrapped single idempotent response +
  top-level socket-destroy on `clientError` are mandatory (raw `node:http` leaves the socket
  hanging on an uncaught throw).
- In-house static-Map table router over URLPattern/regex. ReDoS-safe by construction
  (CVE-2024-45296); `find-my-way` gives no `405`/`Allow` for free at about 46 routes, so
  hand-rolling loses nothing. Guarded by a no-regex-routing test.
- Hand-rolled validator conforming to the Standard Schema v1 `~standard` type shape with
  `Infer`-derived handler types. The server ships nothing to a browser, so a library's bundle
  win is moot, and every library emits English prose we would re-map to codes anyway; the
  type-only `~standard` seam (co-authored by the Zod/Valibot/ArkType maintainers) keeps a
  zero-churn swap to Valibot open. Only un-deferring OpenAPI would flip this.
- OWASP API1 BOLA via load-then-authorize `requireOwned*` (scope-before-find, account-scoped
  query) plus a deny-by-default coverage test and structured deny logging. Current OWASP best
  practice; a session-id == request-id comparison is explicitly insufficient.
- `reqId` via the built-in `node:async_hooks` AsyncLocalStorage (Stable since v16.4.0, zero
  deps, the same mechanism OpenTelemetry uses), echoed as `X-Request-Id` on every response
  behind a pino-shaped logger facade. We defer the full OpenTelemetry SDK as too heavy and use
  `prom-client` only when `/metrics` lands.
- draft-11 / RFC 9651 `RateLimit` + `RateLimit-Policy` structured-field headers (q/w/r/t), pinned
  to a draft version in a comment, plus `Retry-After`, instead of the legacy trio. The two-tier
  limiter (in-memory IP gate first, global-keyed Postgres UPSERT second) is confirmed correct:
  all current limiters are in-memory sliding-window, none share state across realms, and
  `authThrottled` genuinely cannot be a pre-handler middleware (body-username keyed,
  failure-counted, cleared on success).
- The top-level security-headers wrapper with NO `COEP: require-corp` (it would break cross-origin
  GLB/HDRI) and full CSP deferred to a Report-Only effort. Static/SSR/card/avatar/sitemap/OAuth-GET
  surfaces never enter any JSON handler, so the top-level wrapper is the only correct seam, and
  zero security headers exist today.
- The World Market realm-scope bug is real: exactly two writers of the bare `'market'` key (the
  escrow tx and `saveWorldState`) plus a global read, all sharing one primary-key row. The
  em-dash fix is matcher-safe (`userFacingApiError` matches the prefix before the dash, so
  dash-to-comma leaves resolution unchanged).

## Open items (deferred, tracked for sequencing)

- Conventions A (versioning `/api/v1`), D (ETag), F (Deprecation/Sunset), G (OpenAPI) are
  DEFERRED to a consumer-driven follow-up; paths ship UNVERSIONED. Conventions B (pagination),
  H (trailing-slash), I (drain-aware health) ship now. Convention E (idempotency keys) is skipped
  (name-UNIQUE covers create). Convention C (compression) is deferred to the Cloudflare edge; no
  app-layer `node:zlib`.
- Full CSP enforcement is a separate Report-Only effort; only the free non-script directives ship
  now.
- The realtime-reliability workstream (tick-loop error boundary, bounded WS egress, per-connection
  WS ingress token bucket + Origin-allowlist handshake, graceful WS shutdown, event-loop-lag SLI)
  is the actual per-realm ceiling and ships as its own small PR, out of scope here. Its
  `[realtime]` metrics (`game_tick_*`, `ws_*`, `nodejs_eventloop_lag_seconds`) land with that
  workstream.
- Horizontal scale by world partition (sharding, Redis pub/sub, zone instancing) is named but
  out of scope; parallelizing one Sim across threads is an explicit non-goal.
- Confirm the Capacitor native client sends `Content-Type: application/json` on its auth POSTs
  BEFORE enforcing `415` globally; roll `415` out in log-only mode first.
- Name the old-ladder deletion exit criteria (which metric, what threshold, who owns it) for the
  next-release follow-up PR.
- Backlog deferrals: TOTP-at-rest encryption / password floor / session revocation (P2), the
  versioned migration ledger (P2, needs maintainer sign-off since one advisory lock cannot span
  per-step txns), self-state encoder dirty-gating (needs sim-side counters), and traces (Tempo,
  optional later via the same ALS `reqId`).

## Decisions locked 2026-06-30

These five user decisions are authoritative and override the earlier SPEC and the synthesis
recommendations where they differ. They are mirrored in `state.md` (Locked design decisions).

1. SINGLE all-or-nothing env dispatch flag. One flag controls whether the new pipeline sits in
   front of the old `handleApi`. The new path is the DEFAULT and is the path the suite targets;
   the new dispatcher delegates un-migrated paths to the old ladder via a per-path catch-all so
   partially-migrated states work. Rollback = flip the one flag (all migrated routes revert to
   the old ladder at once). The user accepted the hardening-revert tradeoff KNOWINGLY: a flag
   flip reverts the hardening too (new limiters, BOLA loaders, the bearer-gap close, security
   headers, and the em-dash fix all live on the new path). This is the deliberate choice over the
   synthesis recommendation of a per-surface/per-batch flag. CORS + the OPTIONS-204 short-circuit
   and the security-headers wrapper stay as TOP-LEVEL `createServer` wrappers covering BOTH the
   old and new paths, so a routing rollback cannot drop CORS/preflight or security headers. The
   old ladder is deleted in the NEXT release once the metric exit-criteria are clean.

2. STACKED PR CHAIN. Delivery is a stacked PR chain, not one mega-PR: each of the 25 phases is
   its own green, bisectable PR, and the suite stays green at every commit. This pairs with the
   per-phase context bound (each phase under about 40% of a context window) so phases, PRs, and
   reviews all stay small.

3. MARKET + LIMITER + METRICS all in scope, each as its own phase. The World Market realm-scope
   fix + partitioned backfill (Phase 20, its own PR under the migration-safety reviewer), the
   two-tier rate limiter + `ratelimit_db.ts` (Phase 19, the boolean-to-`{remaining,
   resetSeconds}` rework included), and structured logging + the `/metrics` exporter +
   drain-aware health (Phase 23) are all in scope for this packet rather than spun out as prior
   PRs. Each is isolated as its own deep cross-cutting phase.

4. DISCORD family migrated, with the two known defects fixed in scope. The SPEC predates the
   Discord/guild/moderation merge, so Phase 16 migrates `POST /api/auth/discord/start`, `GET
   /api/auth/discord/callback` (classified non-JSON HTML redirect), `GET /api/discord` (status),
   and `DELETE /api/discord` (unlink) onto RouteDefs. In the same scope we WIRE the unwired
   `DISCORD_SCHEMA` (five tables in `discord_db.ts`) into `ensureSchema` under the boot advisory
   lock (the exact trap `RATELIMIT_SCHEMA` must also avoid, with a boot-time table-existence
   assertion), and FIX the orphaned `handleSwagClaim` (implemented and tested in `discord.ts` but
   never dispatched in `main.ts`, currently unreachable over HTTP). We add a `discord.*` ip+account
   policy and Discord error codes to the catalog and client matcher, and carry forward the
   `isIpBlocked` + Turnstile parity gap from prior reviews. The eight secret-gated
   `/internal/discord/*` endpoints migrate in Phase 18.

5. BOLA denial status: 404 for player objects, 403 for admin. A cross-account denial on an
   account-owned `:id` resource returns `404` (anti-enumeration: do not confirm the object
   exists). A denial on an admin/operator-scoped `:id` route returns `403`. Account-owned routes
   resolve through an account-scoped loader; admin moderation `:id` routes use an admin-scope
   loader and are EXCLUDED from the account-owner BOLA coverage clause. Both denials emit
   structured `bola_denied` logging.
