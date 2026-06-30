# API Pipeline Re-Architecture: Progress Tracker

Status board for the 25-phase stacked PR chain that re-architects every JSON
endpoint on the authoritative game server behind one in-house request pipeline.
Canonical decisions live in the planning packet (see `canonical.md` / `README.md`);
each implementation phase has a `phase-NN-<slug>.md` file and a paired `phase-NN-qa.md`.

Mark a row's Status as "In progress" or "Done" and fill Started / Completed
(YYYY-MM-DD) as work lands. Keep deliverable and QA boxes in sync with the PR.

## Overall status

| Phase | Status | Started | Completed |
|---|---|---|---|
| Phase 01 | Done | 2026-06-30 | 2026-06-30 |
| Phase 01 QA | Done | 2026-06-30 | 2026-06-30 |
| Phase 02 | Done | 2026-06-30 | 2026-06-30 |
| Phase 02 QA | Not started |  |  |
| Phase 03 | Not started |  |  |
| Phase 03 QA | Not started |  |  |
| Phase 04 | Not started |  |  |
| Phase 04 QA | Not started |  |  |
| Phase 05 | Not started |  |  |
| Phase 05 QA | Not started |  |  |
| Phase 06 | Not started |  |  |
| Phase 06 QA | Not started |  |  |
| Phase 07 | Not started |  |  |
| Phase 07 QA | Not started |  |  |
| Phase 08 | Not started |  |  |
| Phase 08 QA | Not started |  |  |
| Phase 09 | Not started |  |  |
| Phase 09 QA | Not started |  |  |
| Phase 10 | Not started |  |  |
| Phase 10 QA | Not started |  |  |
| Phase 11 | Not started |  |  |
| Phase 11 QA | Not started |  |  |
| Phase 12 | Not started |  |  |
| Phase 12 QA | Not started |  |  |
| Phase 13 | Not started |  |  |
| Phase 13 QA | Not started |  |  |
| Phase 14 | Not started |  |  |
| Phase 14 QA | Not started |  |  |
| Phase 15 | Not started |  |  |
| Phase 15 QA | Not started |  |  |
| Phase 16 | Not started |  |  |
| Phase 16 QA | Not started |  |  |
| Phase 17 | Not started |  |  |
| Phase 17 QA | Not started |  |  |
| Phase 18 | Not started |  |  |
| Phase 18 QA | Not started |  |  |
| Phase 19 | Not started |  |  |
| Phase 19 QA | Not started |  |  |
| Phase 20 | Not started |  |  |
| Phase 20 QA | Not started |  |  |
| Phase 21 | Not started |  |  |
| Phase 21 QA | Not started |  |  |
| Phase 22 | Not started |  |  |
| Phase 22 QA | Not started |  |  |
| Phase 23 | Not started |  |  |
| Phase 23 QA | Not started |  |  |
| Phase 24 | Not started |  |  |
| Phase 24 QA | Not started |  |  |
| Phase 25 | Not started |  |  |
| Phase 25 QA | Not started |  |  |

## Phase 01: Importable spine + WS-auth extraction (the gate, zero behavior change)

Deliverables:
- [x] Export startServer() and guard main.ts's module-load self-invoke (require.main === module, NOT import.meta) so the module imports without binding a socket
- [x] Lift authenticateWebSocket/onConnection/upgrade out of main() into an importable ws_auth module (createWsAuth(deps) factory mirroring the wallet_link/SocialService IO-pure split, not a one-line export)
- [x] Expose the createServer prefix dispatcher as a pure function (routeHttpRequest)
- [x] A smoke test that imports the module without booting

QA:
- [x] Fixes applied
- [x] Tests added (tests/server/ws_auth.test.ts 17 + tests/server/importable_spine.test.ts 1 = 18, all green)
- [x] Dead code removed (type WebSocket import narrowed out of main.ts)
- [x] Reviews clean (privacy-security-review: no findings; cross-platform-sync: NO WIRE CHANGE; qa-checklist: READY)

Notes:
- New surface: server/ws_auth.ts (createWsAuth(deps) -> { authenticateWebSocket, onConnection, attachUpgrade(server, wss) }); server/main.ts exports startServer(): Promise<http.Server> and routeHttpRequest(req, res). NO server/http/ spine module created (that is Phase 4+).
- Entrypoint guard: esbuild leaves import.meta EMPTY under format: 'cjs' (the bundle is the only launch path: npm run server / npm run realms both exec node dist-server/server.cjs), so the working guard is require.main === module, NOT the import.meta comparison drafted in the SPEC. Verified: build:server emits no import.meta warning; the bundled dist-server/server.cjs boots, serves GET /api/status -> 200, and stops cleanly on SIGTERM; a Vitest import() binds no socket and opens no DB connection.
- Cleanliness pass (per user request): the WS handshake wire vocabulary (rejection strings, the 1008 close + reason, leave reasons, the 10000ms timeout, the /ws path) lives in named constants (WS_AUTH_ERROR, TOO_MANY_CONNECTIONS_CLOSE, LEAVE_REASON, AUTH_TIMEOUT_MS, WS_UPGRADE_PATH) with a single rejectHandshake(ws, error) helper, no scattered magic literals. Wire VALUES byte-identical (the 18 tests assert literal frames). The HTTP prefix ladder is intentionally left inline; Phase 4 turns it into a route table.
- QA pass (phase-01-qa.md, 2026-06-30): 5 read-only auditors (correctness, test-coverage, dead-code, privacy-security-review, cross-platform-sync). 0 BLOCKING. cross-platform-sync verdict NO WIRE CHANGE (9 handshake frames + {t:hello} shape + 1008 close all byte-identical); privacy-security-review no CRITICAL/WARNING (check order, per-IP gate, and server authority preserved; the new console.error logs the SyntaxError not the raw token frame). Applied ALL findings (2 SHOULD-FIX + 4 nits, per user "apply everything so nothing accumulates"): strengthened the IP-gate test to assert the isConnectionRefused input bag and added real-predicate refuse + admin-bypass cases; added tests/server/route_dispatch.test.ts pinning routeHttpRequest (OPTIONS-204 short-circuit, public CORS '*', /internal + /admin/api prefix dispatch via mocked sub-dispatchers); added mutedUntil precedence/fallback, an accept-path socket-stays-open assertion, and a moderation-before-character order test; fixed the stale main().catch() comment (also clearing its em dash). The three server test files went 19 -> 28 tests. Full mirror gate green (572 files / 6033 tests, tsc, build:env, build:server, build); the bundled dist-server/server.cjs re-confirmed self-invoke -> listen -> GET /api/status 200 -> clean SIGTERM. NOTE (not a finding): main.ts carries PRE-EXISTING em dashes (dev comments + the player-facing rate-limit strings) that the SPEC defers to Phase 13/22 under a userFacingApiError matcher-lockstep constraint; left untouched on purpose.

## Phase 02: Shared test scaffolding harness (the phase the SPEC is missing)

Deliverables:
- [x] One faithful fake-http helper (FakeRes: setHeader/getHeader/getHeaders/removeHeader/headersSent/writableEnded/writeHead-merge/write/guarded-end + makeReq with node-faithful lower-cased headers) + a fakeCtx(overrides) producing the frozen Ctx (refactor-ready for Phase 5 buildContext) + a nextGuard() onion primitive
- [x] Inject a now() clock into ratelimit.ts (default Date.now) for deterministic window tests, threaded through every Date.now site; setRateLimitClock is production-guarded; behavior-preserving (no return-shape change; that rework is P19, and ratelimit_db.ts does not exist until P19)
- [x] An in-memory FakeRateLimitStore implementing the type-only RateLimitStore interface ({remaining,resetSeconds}) with the injected clock; mirrors recordSlidingWindowAttempt semantics
- [x] FakeDb (SocialDb-style injected-interface) for characters/leaderboard/reports with in-memory fakes + a type-only-import tsc drift guard that fails the build on signature drift (reports targets moderation_db.ts, where createPlayerReport actually lives)
- [x] A golden-master generator (write-then-compare, no manual-approve) + a separately-tested field-name-driven normalizer with an exported NORMALIZER_PLACEHOLDERS constant (timestamps, ids, tokens, reqId, Date header, expiry seconds, nonces/csrf)
- [x] A parity-harness driver (runParity) running each fixture through BOTH injected dispatchers in-process with per-pass isolation (every limiter bucket incl. the failed-login bucket + clock reset, plus an injected reset hook for the later fresh-ALS/reloaded-config steps)
- [x] Registry-introspection meta-test helpers (route completeness; :id requireOwned presence with operator AND publicRead exclusions)
- [x] A pure loadConfig(env) returning a frozen Config separate from the boot call site (parses the single API_DISPATCH flag; NOT wired into boot, that is P24)
- [x] Create the tests/server/ + tests/server/helpers/ + tests/server/http/ dirs and an index barrel; standardize tests/server/<domain>.test.ts (existing suites NOT converted)

QA:
- [ ] Fixes applied
- [ ] Tests added
- [ ] Dead code removed
- [ ] Reviews clean

Notes:
- Shipped server/http/types.ts (TYPE-ONLY, zero runtime emit: RouteDef/RouteMeta/RequireOwned/OwnerScope/Ctx/CtxAccount/Method/Surface/EnvelopeKind/Middleware/Next/RateLimitStore + the Standard-Schema-v1 slot), server/http/config.ts (pure loadConfig), the server/ratelimit.ts clock seam, and tests/server/helpers/{fake_http,fake_ctx,fake_db,fake_ratelimit_store,normalizer,golden,parity,registry_introspect,index}.ts with self-tests, plus tests/server/ratelimit_clock.test.ts and tests/server/http/config.test.ts.
- Orchestration: lead wrote the frozen types.ts, then three parallel Agents (clock+store; fake-http+ctx; FakeDb+config) on disjoint files, then one Agent for golden/normalizer/parity/registry. All against the one frozen contract.
- In-phase reviewers (the two the phase doc requires): privacy-security-review 0 BLOCKING / 0 SHOULD-FIX (3 nits), qa-checklist READY 0 BLOCKING / 2 SHOULD-FIX. Per the standing "apply every finding" directive, ALL were applied: production guard on setRateLimitClock; a meta.publicRead marker so public :id reads are not false-flagged (the Phase 10 exemption); resetAuthFailures added to the parity per-pass isolation (the failed-login bucket was bleeding); normalizer no longer over-masks the generic key 'state'; makeReq lower-cases header names. The golden mkdir/write nit was reviewed as intentional (test-only, author-controlled path), no change.
- Validation: tsc clean; tests/server 15 files / 120 tests; behavior-preservation (woc_balance/wallet_server/discord_server/security/ip_block + ratelimit_clock) 156 tests unchanged; full npm test 582 files / 6115 passed / 11 skipped; build:server/build:env/build green; ci:changed green (only pre-existing ws_auth noExplicitAny warnings). NO DDL, NO ensureSchema change, NO WS wire change, NO src/sim touch.

## Phase 03: Surface re-inventory, content-type classification + characterization/golden corpus

Deliverables:
- [ ] Re-derive every endpoint and line anchor against HEAD (main.ts now 1695 lines); add a route-count freshness gate test
- [ ] Classify the /api surface: JSON (problem+json) vs HTML (email/unsubscribe) vs redirect (discord callback) vs binary (card) vs the {ok:false} 405 (perf_report) so the 415/withBody/mapError design is correct before primitives
- [ ] Characterization + golden-master fixtures over every inline main.ts route and the createServer prefix dispatch (incl. the new Discord + guild-board + dev-gated /api/perf routes), normalizing dynamic fields
- [ ] Encode INTENDED (hardened) behavior with a knownDeviation list seeded (perf_report 405, anti-enumeration 404 on register/login, planned 405-before-auth)

QA:
- [ ] Fixes applied
- [ ] Tests added
- [ ] Dead code removed
- [ ] Reviews clean

Notes:

## Phase 04: Table router (server/http/router.ts)

Deliverables:
- [ ] Map<method,{static:Map,dynamic[]}>, O(1) static match, :param capture with no per-request regex
- [ ] 404-vs-405 + Allow, HEAD-for-GET, synthesized OPTIONS from the real method set, single-trailing-slash normalization (convention H), Vary:Origin
- [ ] A no-regex-routing guard asserting every pattern is literal segments or a plain :param

QA:
- [ ] Fixes applied
- [ ] Tests added
- [ ] Dead code removed
- [ ] Reviews clean

Notes:

## Phase 05: Onion compose + request context (compose.ts + context.ts)

Deliverables:
- [ ] compose(Mw[]) recursive dispatch with a double-next guard
- [ ] Ctx type + buildContext (url, query, params, ip via requestIp(), reqId, body?, account?)
- [ ] An AsyncLocalStorage carrier for reqId
- [ ] An outermost wrapper contract: the top-level compose(ctx) call is wrapped to guarantee exactly one idempotent response on both the resolve and throw paths (raw node:http does not auto-respond)

QA:
- [ ] Fixes applied
- [ ] Tests added
- [ ] Dead code removed
- [ ] Reviews clean

Notes:

## Phase 06: Typed schema validator (schema.ts)

Deliverables:
- [ ] object()/str()/num()/enum() decoders implementing the Standard Schema v1 ~standard type shape (type-only conformance)
- [ ] All-issues-in-one-pass collection yielding errors[]{pointer,code,params}
- [ ] Infer<typeof S> so handler input types derive from the schema
- [ ] Typed params AND query (a :id cannot reach a DB call as NaN; page/pageSize bounded once)

QA:
- [ ] Fixes applied
- [ ] Tests added
- [ ] Dead code removed
- [ ] Reviews clean

Notes:

## Phase 07: RFC 9457 error model + per-surface serializers + error_codes catalog

Deliverables:
- [ ] HttpError(status,code,msg) + mapError: malformed-JSON->400, validation->422, missing/invalid token->401(+WWW-Authenticate), no-entitlement->403, over-cap->413, unique-violation->409, rate-limited->429, unknown->logged-500 with no stack/SQL/table text
- [ ] Per-route serializer selection (problem+json / RFC 6749 / {success,data,error} / HTML-error / redirect / binary), NOT per-prefix, resolving the non-JSON /api classification
- [ ] error_codes.ts as the single as-const source of truth, frozen (domain,reason) + param keys append-only per AIP-193, reusing existing domain.reason vocabulary

QA:
- [ ] Fixes applied
- [ ] Tests added
- [ ] Dead code removed
- [ ] Reviews clean

Notes:

## Phase 08: Core middleware set + metric/log hook seam + thin rateLimit adapter

Deliverables:
- [ ] withErrors (outermost), requestId+ALS, withCors(class), withBody(maxBytes) mapping overflow->413/bad-json->400 preserving the card pre-auth Content-Length 413 short-circuit, PLUS a withRawBody/binary variant for the card route
- [ ] requireAccount({scope}) as the one bearer resolver modeling at least read/active/full scopes, applying the ban/moderation+scope gate uniformly
- [ ] A THIN rateLimit(policy) adapter over today's existing limiter booleans (deep two-tier rework deferred to P19)
- [ ] The per-route metric + access-log hook behind an INJECTABLE no-op sink (collection point must land now)
- [ ] Always-drain-body on early reject; clientError handler at the top-level createServer setup (no req/res, destroy the socket)

QA:
- [ ] Fixes applied
- [ ] Tests added
- [ ] Dead code removed
- [ ] Reviews clean

Notes:

## Phase 09: Registry + dispatcher-in-front (per-path delegate) + dual-path parity harness + top-level CORS wrapper

Deliverables:
- [ ] registry.ts spreading domain route tables into one lookup + http/index.ts barrel
- [ ] New dispatcher in front of old handleApi; un-migrated paths delegate per-path to the old ladder unchanged; reproduce the createServer prefix order and the non-awaited void semantics exactly
- [ ] Keep CORS/OPTIONS as a top-level wrapper covering both old and new paths
- [ ] A parity harness diffing each P3 fixture through old vs new (status, body, contracted headers), weighting error and 404-vs-405 paths heaviest, blocking on any undocumented diff
- [ ] A registry-completeness test diffing the old-ladder path set against the new-router path set, hard-failing on any old path absent from the new router (run on every rebase)

QA:
- [ ] Fixes applied
- [ ] Tests added
- [ ] Dead code removed
- [ ] Reviews clean

Notes:

## Phase 10: Migrate public reads (server/leaderboard.ts)

Deliverables:
- [ ] Port /api/leaderboard (incl. ?board=guilds, legacy ?limit=N, ?scope), /api/arena/leaderboard, /api/releases, /api/project-stats, /api/search, /api/realms, /api/public/characters/:id/sheet, dev-gated /api/perf as RouteDefs
- [ ] Typed page/pageSize query decoders + the {items,page,pageCount,total,pageSize} envelope (convention B); decide explicitly whether it applies to the guild board and legacy single-page shape
- [ ] Labeled-behavioral /api/status trim to {ok,realm,players_online}
- [ ] Apply the one bearer resolver to /api/realms (anonymous-friendly when no token) and /api/search, closing their authz gap

QA:
- [ ] Fixes applied
- [ ] Tests added
- [ ] Dead code removed
- [ ] Reviews clean

Notes:

## Phase 11: Migrate auth (register/login/native-attestation)

Deliverables:
- [ ] Port /api/register, /api/login, /api/native-attestation/challenge
- [ ] passesTurnstile as a per-route POST-body middleware after withBody, scoped to register+login (not a global prologue)
- [ ] Preserve authThrottled as a HANDLER-level check (per-username, failed-only, clears on success, 15m/10-fail)
- [ ] Keep the deliberate anti-enumeration 404 on register/login as a documented knownDeviation

QA:
- [ ] Fixes applied
- [ ] Tests added
- [ ] Dead code removed
- [ ] Reviews clean

Notes:

## Phase 12: Migrate character ownership + BOLA seam (server/characters.ts)

Deliverables:
- [ ] Port /api/me/characters, /api/characters (GET/POST), /api/characters/:id (DELETE), /rename, /takeover, /standing, /sheet with typed :id params
- [ ] requireOwnedCharacter loader populating ctx.character via an account-scoped query + a deny-by-default coverage test that every account-owned :id route resolves through an account-scoped loader (admin operator routes excluded)
- [ ] Labeled-behavioral NEW limiters character.create/rename/delete/takeover as asserted knownDeviations
- [ ] 403-vs-404 denial applied per the locked decision (404 for player-owned objects, 403 for admin/operator-scoped routes)

QA:
- [ ] Fixes applied
- [ ] Tests added
- [ ] Dead code removed
- [ ] Reviews clean

Notes:

## Phase 13: Migrate account portal (server/account.ts) + em-dash fix

Deliverables:
- [ ] Port account/password/logout/email(+change/verify)/deactivate/export/marketing/2fa(setup/enable/disable)/companion-token/email-unsubscribe (classify unsubscribe as HTML) onto thin Ctx handlers
- [ ] Labeled-behavioral em-dash rate-limit string fix at the re-anchored sites (now 658/664/733/748) AND the matching userFacingApiError change in src/main.ts in the SAME change (prefix unchanged so startsWith still resolves)
- [ ] Fix the operator-facing em dashes in src/admin/i18n.locales/en_CA.ts + its resolved copy

QA:
- [ ] Fixes applied
- [ ] Tests added
- [ ] Dead code removed
- [ ] Reviews clean

Notes:

## Phase 14: Migrate wallet + cards (server/wallet.ts)

Deliverables:
- [ ] Port /api/wallet/link/challenge, /api/wallet/link (POST/DELETE), /api/wallet (GET), /api/woc/balance, /api/card (via withRawBody), /api/referrals
- [ ] Preserve keyBy:'ip+account' ordering (account known only after the DB token lookup) and the card pre-auth byte-cap short-circuit + Connection:close
- [ ] Give the previously-unmatched 'rate limited' responses (wallet.ts:39/62, main.ts:1266/1285) stable codes

QA:
- [ ] Fixes applied
- [ ] Tests added
- [ ] Dead code removed
- [ ] Reviews clean

Notes:

## Phase 15: Migrate reports + telemetry + misc (server/reports.ts)

Deliverables:
- [ ] Port /api/reports (NEW reports.create per-account limiter, labeled behavioral), /api/bug-reports, /api/perf-report (PRESERVE its 200-not-429 by-design response), /api/site-presence
- [ ] Route bug-report/perf-report through their existing *_db limiters under the policy table
- [ ] Preserve perf_report's 405 and site_presence's 405 ownership through the seam (knownDeviations); characterize the pre-prologue early-return routes whose position changes under the table router

QA:
- [ ] Fixes applied
- [ ] Tests added
- [ ] Dead code removed
- [ ] Reviews clean

Notes:

## Phase 16: Migrate Discord family (server/discord.ts), net-new since SPEC

Deliverables:
- [ ] Port /api/auth/discord/start, /api/auth/discord/callback (HTML redirect, classified non-JSON), /api/discord (GET status / DELETE unlink) onto RouteDefs; decide whether to wire the orphaned handleSwagClaim
- [ ] Add a discord.* ip+account policy to POLICIES and the discord error codes to the catalog + client matcher
- [ ] Carry forward the isIpBlocked + turnstile parity gap from prior Discord reviews so ported endpoints do not skip those checks
- [ ] Decide whether wiring the unwired DISCORD_SCHEMA into ensureSchema is in scope here or left to PR #1075

QA:
- [ ] Fixes applied
- [ ] Tests added
- [ ] Dead code removed
- [ ] Reviews clean

Notes:

## Phase 17: Migrate Admin API onto the shared seam (server/admin.ts)

Deliverables:
- [ ] Convert handleAdminApi branches into RouteDefs KEEPING the {success,data,error} envelope and the frozen page/limit pagination contract (NOT page/pageSize)
- [ ] Restructure admin enum-segment regex routes (suspend|unsuspend|ban|unban) to :param + schema-validated enum to satisfy the no-regex-routing guard
- [ ] Give admin moderation :id routes an admin-scope loader excluded from the account-owner BOLA clause
- [ ] Keep admin.login on its own per-policy limiter store

QA:
- [ ] Fixes applied
- [ ] Tests added
- [ ] Dead code removed
- [ ] Reviews clean

Notes:

## Phase 18: Migrate OAuth JSON + Internal onto the shared seam (oauth.ts + internal.ts)

Deliverables:
- [ ] Port /oauth/token, /oauth/revoke, /oauth/device_authorization, authorize-POST, device-POST KEEPING RFC 6749 {error,error_description}
- [ ] Model OAuth as mixed HTML+JSON: the GET authorize/device pages stay on the top-level ladder with the thin security-header subset, only POST JSON gets the RFC 6749 envelope
- [ ] Port the secret-gated /internal endpoints (restart-countdown + the 8 /internal/discord/* bot-channel endpoints) preserving their secret gate

QA:
- [ ] Fixes applied
- [ ] Tests added
- [ ] Dead code removed
- [ ] Reviews clean

Notes:

## Phase 19: Two-tier rate limiter + ratelimit_db (cross-cutting, deep)

Deliverables:
- [ ] Rework the limiters (rateLimited, recordSlidingWindowAttempt) from boolean to {remaining,resetSeconds} (touches every limiter; uses the P2 clock seam)
- [ ] ratelimit_db.ts: global-keyed single-statement atomic UPSERT tier-2 backstop with idempotent DDL; ADD RATELIMIT_SCHEMA to the ensureSchema statement list under pg_advisory_xact_lock (the DISCORD_SCHEMA trap); tier-1 in-memory IP gate runs first
- [ ] respond429 emitting Retry-After + draft-11 RateLimit/RateLimit-Policy structured-field headers (q/w/r/t, pinned to a draft version in a comment); per-policy algorithm; swap POLICIES to the two-tier resolver with values DERIVING from existing named constants
- [ ] Add the discord.* policy and the new character/reports policies to the table

QA:
- [ ] Fixes applied
- [ ] Tests added
- [ ] Dead code removed
- [ ] Reviews clean

Notes:

## Phase 20: World Market realm-scope fix + partitioned backfill (separate persistence PR)

Deliverables:
- [ ] Realm-scope the world_state 'market' key at BOTH write sites in lockstep (the saveCharacterAndMarketState escrow txn AND saveWorldState) plus the read (loadMarketState); anchor on function names, not the stale lines
- [ ] A backfill PARTITIONING the existing global blob by each seller character's realm, idempotent under the advisory lock, with a boot-ordering gate before the first new-key write
- [ ] A dry-run + escrow-sum/row-count verification and a documented data-rollback

QA:
- [ ] Fixes applied
- [ ] Tests added
- [ ] Dead code removed
- [ ] Reviews clean

Notes:

## Phase 21: Security headers top-level wrapper + Content-Type/Origin enforcement

Deliverables:
- [ ] withSecurityHeaders via a TOP-LEVEL wrapper covering serveStatic, /c/ SSR, /p/ card, /avatar, sitemap, OAuth GET pages AND the route onion: nosniff, Referrer-Policy, Permissions-Policy deny-all, HSTS in prod, COOP/CORP same-origin, frame-ancestors/X-Frame-Options on OAuth, no-store on auth/token, strip Server/X-Powered-By; explicitly NO COEP:require-corp
- [ ] Enforce Content-Type: application/json on /api JSON bodies (415) in LOG-ONLY mode first, exempting binary/HTML/redirect routes, until the Capacitor native client is confirmed
- [ ] A cheap Origin/Sec-Fetch-Site check on mutating endpoints (bearer-only, no cookies)

QA:
- [ ] Fixes applied
- [ ] Tests added
- [ ] Dead code removed
- [ ] Reviews clean

Notes:

## Phase 22: REST i18n matcher + per-surface code-parity guard

Deliverables:
- [ ] Extend userFacingApiError to look up emitted codes DIRECTLY in the client catalog instead of reverse-matching English prose; port parametric cases (suspended-until {date}, the {seconds} rate-limit families) to {code,params}; preserve its dual REST + WS-disconnect-reason role
- [ ] Add apiError.* English catalog entries and wire them into client i18n; params formatted client-side via formatNumber/formatDuration/Intl
- [ ] A per-surface code-parity Vitest asserting every server-emitted code resolves to a client entry in every locale, append-only frozen, PLUS coverage for the ~30-45 EXISTING REST strings (currently unguarded; S3 scans only game.ts) and the new Discord/guild codes

QA:
- [ ] Fixes applied
- [ ] Tests added
- [ ] Dead code removed
- [ ] Reviews clean

Notes:

## Phase 23: Structured logging + /metrics exporter + drain-aware health

Deliverables:
- [ ] A pino-shaped logger facade replacing the ~70 raw console.* calls on the request path, with secret/PII redaction (Authorization/bearer 64-hex/password/cookie/OAuth-code/TOTP/wallet-key); structured access line + X-Request-Id echo on every response via the ALS reqId reaching db.ts/domain fns
- [ ] A Prometheus /metrics exporter (prom-client, the one weighed dependency) emitting the RED request-layer catalog with bounded cardinality (route = :param template, never concrete path)
- [ ] /livez + /readyz with /readyz reporting NOT-ready during the SIGTERM drain

QA:
- [ ] Fixes applied
- [ ] Tests added
- [ ] Dead code removed
- [ ] Reviews clean

Notes:

## Phase 24: Validated config + server timeouts + no-magic-values consolidation

Deliverables:
- [ ] A validated fail-fast config read ONCE at boot via the pure loadConfig(env) from P2 (HSTS-in-prod, REQUIRE_WEB_LOGIN, realm/native-app origins, limiter DSN, the dispatch flag), replacing scattered process.env reads; log the active dispatch path at boot and alert if the old path is active in prod
- [ ] Set requestTimeout/headersTimeout/keepAliveTimeout/maxHeaderSize in startServer() with chosen named-constant values mindful of the WS upgrade handshake and the 1 MB card upload
- [ ] Consolidate every tunable into named constants with unit + comment; POLICIES values DERIVE from existing constants
- [ ] Add the perf/tick-jitter acceptance gate (pipeline adds < X ms p99, tick p95 stays under 0.8 x DT)

QA:
- [ ] Fixes applied
- [ ] Tests added
- [ ] Dead code removed
- [ ] Reviews clean

Notes:

## Phase 25: Docs + new:endpoint scaffold + flag-default flip

Deliverables:
- [ ] Update server/CLAUDE.md (pipeline model + graduated Adding-an-endpoint recipe + error-localization rule + the injected-FakeDb test recipe over the pg-mock idiom), root CLAUDE.md (the server/http seam), new server/http/CLAUDE.md, i18n docs (apiError.* domain)
- [ ] npm run new:endpoint scaffold emitting RouteDef stub + typed schema + paired error code + English catalog entry + a paired FakeDb-based copy-from TEST file, auto-attaching requireOwned* on :id routes
- [ ] Flip the env-flag default to the new path keeping the old ladders behind the flag; designate one early migration commit as the canonical add-one-authenticated-endpoint example
- [ ] Name the old-ladder deletion exit criteria (metric gate + owner) for the next-release follow-up PR

QA:
- [ ] Fixes applied
- [ ] Tests added
- [ ] Dead code removed
- [ ] Reviews clean

Notes:
