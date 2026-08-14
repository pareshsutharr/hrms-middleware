# COSEC Attendance Dashboard

A standalone attendance dashboard and integration layer for the COSEC access-control API, with Frappe HRMS integration and a local sync agent bridging it to a live cloud deployment. Built in phases (standalone dashboard → Frappe connection/mapping/sync → local sync agent → Vercel deployment) — see [Roadmap](#roadmap) below for what's built vs. what's next.

**Live deployment**: [https://cosec-api-test.vercel.app](https://cosec-api-test.vercel.app) — see [Deploying to Vercel](#deploying-to-vercel) for how it's set up.

## What's here

- Next.js 16 (App Router) + TypeScript + Tailwind + shadcn/ui dashboard
- A server-only COSEC API client with Basic Auth, timeouts, and a response validator that catches COSEC's `failed: CODE : message` application-level errors even under HTTP 200
- A robust pipe-delimited parser (BOM/`<EOT>`/blank-line handling, malformed-row logging instead of crashing, and two undocumented quirks discovered by testing against the real device — see [Known limitations](#known-limitations))
- PostgreSQL (Prisma) storage for attendance, events, employees, and sync logs, with idempotent upserts so re-running a sync never duplicates data
- NextAuth (Credentials) authentication in front of every page and API route
- Dashboard, Attendance, Events, Employees, Synchronization, Settings, and Health pages
- A Frappe HRMS connection layer (`lib/frappe`) — Settings UI, Test Connection, Health check
- Employee mapping (COSEC User ID ↔ Frappe Employee) with fuzzy name-based suggestions and an explicit-confirmation UI on the Employees page
- Idempotent Employee Checkin sync (COSEC punches → Frappe, mapped employees only) — Attendance-record sync isn't built yet, see [Roadmap](#roadmap)
- `/agent/cosec-agent` — a standalone process for Mode B (Vercel can't reach a private LAN IP), plus the cloud-side `/api/agent/*` endpoints it relays to — see [The COSEC Agent](#the-cosec-agent)
- A Vitest unit suite covering the parser/date/error/status logic against real captured sample data, so it never needs the COSEC server to run

## Environment variables

Copy `.env.example` to `.env` and fill in:

| Variable | Purpose |
|---|---|
| `COSEC_BASE_URL` | COSEC server root, e.g. `http://192.168.0.107:85` (no `/COSEC/api.svc` suffix — the client appends that) |
| `COSEC_USERNAME` / `COSEC_PASSWORD` | COSEC Basic Auth credentials |
| `DATABASE_URL` | PostgreSQL connection string |
| `AUTH_SECRET` | NextAuth secret — generate with `openssl rand -base64 32` |
| `AUTH_URL` | Canonical app URL. Leave unset for local dev (inferred per-request); set to your real domain in production |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `ADMIN_NAME` | Seeded dashboard login, used by `npm run db:seed` |
| `SETTINGS_ENCRYPTION_KEY` | 32-byte hex key used to encrypt COSEC/Frappe settings overrides saved from the UI — generate with `openssl rand -hex 32` |
| `FRAPPE_BASE_URL` / `FRAPPE_API_KEY` / `FRAPPE_API_SECRET` | Frappe HRMS connection (Phase 2) — see [Connecting Frappe HRMS](#connecting-frappe-hrms). Can be left unset and configured instead from Settings > Frappe HRMS |
| `AGENT_SECRET` | Shared secret for `/agent/cosec-agent`'s cloud endpoints — see [The COSEC Agent](#the-cosec-agent). Generate with `openssl rand -hex 32`; the agent's own `.env` needs the same value |
| `CRON_SECRET` | Secures `/api/cron/frappe-sync` (daily Frappe push safety net) — see [Automatic Frappe push](#automatic-frappe-push). Generate with `openssl rand -hex 32`. Only matters in production; Vercel sends it automatically as a Bearer token on cron-triggered requests |

None of the COSEC/Frappe credentials are ever sent to the browser: the client, config resolver, and Basic Auth header construction all run server-side only (API routes, Server Components, Server Actions).

## Running locally

Requires Node 20+, and a PostgreSQL server reachable at `DATABASE_URL`. `docker-compose.yml` provides one at port `5433` (mapped away from the default `5432` in case you already have a local Postgres running, as this machine did — adjust `DATABASE_URL` accordingly, or point it at any Postgres instance you already have, including a Supabase/Neon/RDS connection string).

```bash
npm install
docker compose up -d          # or point DATABASE_URL at an existing Postgres
npx prisma migrate dev        # applies prisma/schema.prisma
npm run db:seed               # creates the ADMIN_EMAIL/ADMIN_PASSWORD login
npm run dev
```

Open the printed local URL, sign in with `ADMIN_EMAIL`/`ADMIN_PASSWORD`.

## Testing

```bash
npm run test     # Vitest — parser, dates, error detection, status logic (no COSEC/DB needed)
npm run lint
npm run build
```

## Testing attendance & events against the real COSEC server

With `COSEC_BASE_URL`/`COSEC_USERNAME`/`COSEC_PASSWORD` set and this machine on the same network as the device:

1. **Settings → COSEC → Test Connection** (or `GET /api/cosec/test`) confirms Basic Auth + reachability.
2. **Synchronization → Sync Today** pulls both `attendance-daily` and `event-ta-date` for today and upserts them.
3. **Attendance** / **Events** pages read from the database (not COSEC directly) and show the synced rows.
4. **Synchronization → Full Sync** (behind a confirmation dialog) pulls the entire `event-ta` history — this was tested against the real device during development and cleanly synced 7,405 events with zero failures.

Re-running any sync is safe: `AttendanceRecord` upserts on `(cosecUserId, processDate)`, `EventRecord` inserts with `skipDuplicates` on `indexNo`.

## Connecting Frappe HRMS

The dashboard can connect to a self-hosted or Frappe Cloud HRMS instance. What's built so far is the connection layer only (Settings form, Test Connection, Health check) — employee mapping and Checkin/Attendance sync are the next step, and need your real instance's doctype fields inspected first (see [Roadmap](#roadmap)).

To connect:

1. Log into your Frappe instance as a user with API access (Administrator, or any user with the **HR Manager**/**HR User** role and access to Employee/Employee Checkin/Attendance).
2. Go to **your user's profile → API Access → Generate Keys**. Frappe shows the API Key and API Secret once — copy both immediately.
3. In the dashboard, go to **Settings → Frappe HRMS**, enter your instance's Base URL (e.g. `https://hr.yourcompany.com`), the API Key, and the API Secret, then click **Test Connection**.
   - Equivalently, set `FRAPPE_BASE_URL` / `FRAPPE_API_KEY` / `FRAPPE_API_SECRET` in `.env` instead — same override-or-env resolution as the COSEC config (`lib/frappe/config.ts`).
4. A successful test confirms both that the API key/secret authenticate against the Frappe framework and that the Employee doctype is reachable (i.e. HRMS is actually installed and this user can read it). The **Health** page reflects the same check.

### Employee mapping

Once connected, the **Employees** page gets a "Frappe Employee" column. For each COSEC employee, `lib/mapping/suggest.ts` computes a best-guess Frappe match by token-overlap name similarity (`lib/mapping/similarity.ts`) — tolerant of minor spelling drift and an extra middle name/initial on one side, since COSEC and Frappe names are rarely byte-identical in practice (verified against a real instance: e.g. COSEC "DINESH CHOURASIA" vs Frappe "DINESH CHAURASIA"). A suggestion is only ever a pre-filled dropdown value — nothing is saved until you click **Map** (one row) or review and confirm the list in **Auto Match** (all suggested rows at once, behind a confirmation dialog listing every pair). Confirming writes the COSEC User ID into that Frappe Employee's **Attendance Device ID** field — Frappe HR's own biometric-device-ID field — so re-running the suggestion algorithm is unnecessary once mapped. **Unmap** clears both sides.

### Checkin sync

**Frappe HRMS → Sync Today / Sync Date Range** pushes COSEC punches into Frappe as **Employee Checkin** records, for mapped employees only (`lib/frappe/checkin.ts`). Deliberately targets Checkin, not Attendance directly — whether Frappe derives Attendance from these checkins is controlled by `Shift Type > Enable Auto Attendance` in Frappe itself, which the spec's "don't override HRMS shift calculations" guidance says is the user's call, not this sync's.

Idempotency: Employee Checkin's `device_id` field has no uniqueness constraint in Frappe, so before creating anything the sync fetches which `COSEC-{indexNo}` values already exist in the target range and skips those — verified by running the same sync twice against the real instance (first run: 14 created; second run: 0 created, 14 skipped) and confirming 14 unique `device_id`s on the Frappe side directly.

`log_type` (IN/OUT) is inferred from COSEC's `EntryExitType` as `0`→IN, `1`→OUT — based on the field name, not a confirmed OUT-type sample (none existed in the data used during development). It's optional on Employee Checkin, so anything outside `{0, 1}` is left unset rather than guessed.

**Excluded: employees on the "Open Attendence" shift.** That Shift Type has `working_hours_threshold_for_absent = 0` on the connected instance (confirmed live via the Frappe API), meaning Frappe marks those employees Present every day regardless of check-in data. Pushing COSEC punches for them would create Checkin records with no effect on their Attendance, so `syncCheckinsToFrappe` skips them (`fetchExcludedFrappeEmployeeIds` in `lib/frappe/checkin.ts`, matched by exact shift-type name). This is real, not hypothetical — `ASIT MISTRY` (Frappe `HR-EMP-00026`, COSEC device `JBV004`) is on this shift; if he ever gets mapped, his punches won't be pushed. As of this writing production has zero employee mappings yet (see [Roadmap](#roadmap)), so this exclusion hasn't fired on real data in production — it's verified against live Frappe data (the shift-type query) but not yet end-to-end.

### Automatic Frappe push

Checkin sync now runs on its own, two ways — you don't have to click "Sync Today" for routine use:

1. **Agent-triggered** (the primary path): after `/api/agent/sync` ingests a `event-ta-date`/`event-ta` payload from the agent, it immediately calls `syncTodaysCheckinsToFrappe()` — so on a live agent (5-minute cycle by default), new punches reach Frappe within minutes. This is best-effort: a Frappe-push failure is logged to `FrappeSyncLog` and never fails the agent's own sync response.
2. **Daily Vercel Cron safety net** (`/api/cron/frappe-sync`, `vercel.json`): catches up the last 3 IST days in case the agent was offline for a stretch. **Vercel's Hobby plan only allows cron jobs to run once per day, with ±59-minute timing precision** — this deployment's cron runs at `30 21 * * *` UTC (≈3:00 AM IST, ±59 min). Re-covering already-synced days is cheap since the sync is idempotent. Secured the same way as the agent endpoints: `CRON_SECRET` env var, sent automatically by Vercel as a Bearer token (`lib/cron-auth.ts`).

Manual "Sync Today" / "Sync Date Range" on the Frappe HRMS page still work — useful for backfilling a specific range or re-running after fixing a mapping.

**Known instance-specific gotcha, found and resolved during development**: if Frappe HR Settings has **Allow Geolocation Tracking** enabled, `Employee Checkin.validate_distance_from_shift_location()` requires latitude/longitude on *every* checkin — including device-sourced ones with no GPS data, and this is enforced in Frappe HR's own code regardless of which API entry point creates the record (confirmed by testing both the generic REST endpoint and Frappe HR's dedicated `add_log_based_on_employee_field` device-checkin method — same validation fires either way). No coordinates were fabricated to work around it; the connected instance had this setting disabled (a config choice on the Frappe side, not this codebase) to unblock device-sourced checkins. If your instance has it on and you want to keep it on for genuine mobile checkins, real office coordinates would need to be attached to COSEC-synced checkins instead — not currently implemented.

## The COSEC Agent

`/agent/cosec-agent` is a separate, standalone Node/TypeScript project (its own `package.json`) meant to run on a machine inside the office network. It's what makes **Mode B** possible: a Vercel-hosted deployment of this app can't reach a private LAN IP like `192.168.0.107`, so the agent runs where COSEC actually is, and relays data over normal HTTPS.

**Design**: the agent is a thin relay, not a second parser. It fetches raw, unparsed COSEC responses and `POST`s them as-is to this app's `/api/agent/sync`, which runs them through the *same* `lib/cosec/attendance.ts`/`lib/cosec/events.ts` parsers and the *same* idempotent upsert logic used by the direct-COSEC path (`lib/sync/attendance.ts`'s `ingestAttendanceDailyRaw` / `lib/sync/events.ts`'s `ingestEventsRaw` — extracted from what were previously fetch-and-upsert-in-one-step functions, so both paths share one parser, per the project's own "don't duplicate parser code" rule). The only thing genuinely duplicated in the agent is the ~100-line HTTP-calling layer (Basic Auth header, URL building, date formatting) — unavoidable, since it's the one piece that must physically run on the LAN.

Setup: see `agent/cosec-agent/README.md`. In short — `cd agent/cosec-agent && npm install && cp .env.example .env` (fill in COSEC credentials, `CLOUD_API_URL`, and an `AGENT_SECRET` matching this app's own), then `npm run dev` for continuous syncing or `npm run full-sync` for a one-time full event-history backfill.

Cloud-side endpoints (`app/api/agent/heartbeat`, `app/api/agent/sync`) use a separate auth scheme from the dashboard — `Authorization: Bearer <AGENT_SECRET>`, checked with a constant-time comparison in `lib/agent-auth.ts` (not a session; this deployment has exactly one agent). Every agent-relayed sync is tagged `viaAgent: true` on its `CosecSyncLog` row, and the Health page's Agent status reflects the last heartbeat (`connected` if seen in the last 10 minutes, matching the agent's default 5-minute interval with a 2x buffer).

**Verified**: the heartbeat round-trip end-to-end against this app's dev server (auth, `SystemSetting` write, Health page picking it up). **Not fully verified**: an actual COSEC-to-cloud data relay — this machine changed networks partway through development (moved from the `192.168.0.0/24` subnet where COSEC lives to `192.168.10.0/24`, confirmed via `ping`/routing table, not a code issue) and lost direct LAN access to the device before that check could run. The agent's error handling for exactly this case (COSEC unreachable) was itself exercised for real and behaved correctly — clear error logged, heartbeat still sent, next cycle would retry — but the success path (raw response actually parsed and upserted via the relay) needs re-verification once back on the COSEC network.

## Deploying to Vercel

Live at **[https://cosec-api-test.vercel.app](https://cosec-api-test.vercel.app)**. The app needed zero source changes to deploy — Prisma already uses `@prisma/adapter-pg` (a JS-native driver adapter), which sidesteps the classic "wrong engine binary for Vercel's runtime" problem, and the DB-first-reads / agent-mediated-COSEC-access architecture was already built with Mode B in mind (see [The COSEC Agent](#the-cosec-agent)). This section documents the actual steps taken, for next time.

### Database: Supabase, not Vercel Postgres/Neon

The original plan was to provision Vercel Postgres (Neon-backed) directly from the Vercel CLI. That path hit a real blocker: `vercel integration add neon` requires accepting marketplace terms through a browser-based consent flow, which a non-interactive CLI session can't complete. Rather than block on that, this deployment uses an existing Supabase project ("hrms") instead, provisioned via the Supabase Management API using a personal access token:

- `PATCH /v1/projects/{ref}/database/password` — set a fresh database password (not reused from anywhere else).
- `GET /v1/projects/{ref}/config/database/pooler` — read the Supavisor pooler connection strings.

Supabase (via Supavisor) exposes two distinct connection modes, and which one to use matters:
- **Transaction mode, port `6543`, with `?pgbouncer=true`** — this is `DATABASE_URL` in Vercel's Production env vars. Required for a serverless runtime, since it pools/multiplexes short-lived connections instead of holding one Postgres connection open per invocation.
- **Session mode, port `5432`** — used only transiently, from this machine, to run migrations (`prisma migrate deploy` needs a real session, not a transaction-pooled one, for its advisory locks).

### Steps

1. **`vercel link`** — linked this directory to a Vercel project (`pareshsutharr/cosec-api-test`).
2. **Provisioned the Supabase DB** as described above, using the user-supplied Supabase access token — not written to any file, used directly against the Management API and discarded.
3. **Migrated + seeded the production DB from this machine**: temporarily pointed local `DATABASE_URL` at the session-mode (port `5432`) connection string, ran `npx prisma migrate deploy` (production-safe — applies existing migrations from `prisma/migrations/`, never generates new ones, unlike `migrate dev`) then `npm run db:seed` (creates the admin login) — then restored the local `.env` back to the local Postgres.
4. **Set Vercel Production environment variables** (`vercel env add ... --sensitive --yes`): `DATABASE_URL` (pooled, transaction-mode, step 2), fresh `AUTH_SECRET` and `SETTINGS_ENCRYPTION_KEY` (generated new for production — never reused from dev), `COSEC_BASE_URL`/`USERNAME`/`PASSWORD` (the same real values, even though Vercel genuinely can't reach a private LAN IP — Health/Settings correctly show COSEC as unreachable, honestly reflecting Mode B rather than hiding the field or leaving it unset), `FRAPPE_BASE_URL`/`API_KEY`/`API_SECRET` (Frappe **is** a public HTTPS endpoint, so this works directly from Vercel with no agent needed for that side), `AGENT_SECRET` (same value as the agent's own `.env`, so the agent can relay to this deployment). `AUTH_URL` was deliberately left unset, same reasoning as local dev — `trustHost: true` infers it per-request.
5. **`vercel --prod --yes`** — deployed.
6. **Verified the live deployment**: `GET /api/health` returns `database: connected`, `frappe: connected`, `cosec: error` (expected — Mode B, no agent had pushed a heartbeat yet at that point). Confirmed an unauthenticated request to a protected page (`/dashboard`) redirects (307) and a protected API route (`/api/attendance`) returns 401 JSON. Confirmed logging in with the seeded admin credentials succeeds (302 + valid session), and that authenticated `/api/mappings`/`/api/employees` return real Frappe-sourced data.
7. **Pointed the agent at production**: updated `agent/cosec-agent/.env`'s `CLOUD_API_URL` to `https://cosec-api-test.vercel.app/api/agent`, ran it, and confirmed the Health page's Agent status flipped to `connected` from a real heartbeat. The COSEC-fetch side of the agent's cycle is still unverified against this deployment — this machine has been off the COSEC LAN since partway through Phase 3 (see [The COSEC Agent](#the-cosec-agent)) — so only the heartbeat, not an actual data relay, has been confirmed end-to-end in production.

### To redeploy

```bash
vercel --prod --yes                        # after any source change
npx prisma migrate deploy                  # only if prisma/migrations/ has new migrations —
                                            # run with DATABASE_URL temporarily set to the session-mode (5432) string
```

## Architecture notes

- **DB-first reads**: `/api/attendance` and `/api/events` (and the pages) query Postgres, never COSEC directly. Only the `Sync` actions call COSEC live. This is what lets the read path work unmodified now that Vercel + the local Agent split reads and COSEC access across two processes (see [The COSEC Agent](#the-cosec-agent)).
- **Settings resolution**: COSEC and Frappe config can each be overridden from their Settings form (stored in `SystemSetting`, secrets AES-256-GCM encrypted with `SETTINGS_ENCRYPTION_KEY`) or fall back to environment variables (`lib/cosec/config.ts`, `lib/frappe/config.ts` — same pattern, neither secret is ever echoed back to the browser).
- **Frappe error handling differs from COSEC's**: Frappe uses real HTTP status codes for failures (401/403/404/417) with a JSON body, so `lib/frappe/errors.ts` just extracts the most readable message from that shape — there's no COSEC-style "HTTP 200 but actually failed" case to guard against.
- **Timezone handling**: all COSEC date parsing/formatting goes through `lib/cosec/dates.ts` using Luxon with an explicit `Asia/Kolkata` zone — no locale-dependent `Date` parsing anywhere. Two distinct helper pairs exist on purpose: `parseIsoDateOnly`/`toUtcDateOnly` anchor to UTC midnight and are only correct for the date-only `processDate` column; `parseIsoDateAsIstStartOfDay`/`parseIsoDateAsIstEndOfDay` anchor to true IST midnight and are what every DATETIME range query/sync (events, checkins) uses — mixing these up was a real bug caught during Checkin sync development (see below).
- **Client-side "today"**: quick-filter buttons (Today/Yesterday/This Week/This Month) use `lib/client-dates.ts`, not `new Date().toISOString().slice(0, 10)` — the latter gives the UTC calendar date, which is wrong for the ~5.5 hours a day (00:00–05:30 IST) where it's already "tomorrow" in IST but still "today" in UTC.

## Known limitations

Two real-world response quirks were discovered while syncing against the live device that the original API documentation didn't mention, and are now handled + covered by regression tests (`lib/cosec/parser.test.ts`):

1. `attendance-daily` prepends an undocumented header row (`UserID|UserName|...`) to its data. The parser drops it explicitly (`dropLeadingHeaderRow`) rather than letting it fail downstream date parsing.
2. A zero-result query (e.g. `event-ta-date` for a range with no events) returns a `success: CODE : No records found` status line instead of an empty body. This is now recognized as "zero rows," not a malformed row or an error.

Given the API is undocumented beyond what was tested, other edge cases (additional status-line formats, a differently-shaped error code, shift/leave data once populated) may surface with more usage — the parser is built to log and skip rather than crash on anything unexpected, but "logged and skipped" still needs a human to check `CosecSyncLog.errorMessage` / server logs occasionally.

A related, more consequential bug was found and fixed while building Checkin sync: `/api/sync/events` and `/api/frappe/sync` were anchoring date-range queries to UTC midnight instead of IST midnight, so a single-day sync (`from === to`, e.g. "Sync Today") collapsed to a zero-width instant and silently fetched nothing — this is why the original Phase 1 testing showed `event-ta-date` returning "no records" for date-ranged syncs (only the boundary-free full `event-ta` sync worked). Fixed via `parseIsoDateAsIstStartOfDay`/`parseIsoDateAsIstEndOfDay`, covered by regression tests, and re-verified against the real COSEC/Frappe instances afterward.

Other scope boundaries (all intentional, not bugs):
- COSEC Agent (Mode B) is built but its full data-relay path needs re-verification once back on the COSEC network — see [The COSEC Agent](#the-cosec-agent).
- Frappe HRMS: connection, employee mapping, and Checkin sync are built (see [Connecting Frappe HRMS](#connecting-frappe-hrms)). No Attendance-record sync yet — see [Roadmap](#roadmap).
- `EntryExitType`/`MasterControllerID`/etc. are displayed as COSEC's raw numeric codes; `log_type` IN/OUT on synced checkins is inferred from `EntryExitType` 0/1 the same way (see [Checkin sync](#checkin-sync)) — neither mapping was documented or independently confirmed beyond the field naming.

## Security considerations

- All dashboard pages and API routes (except the public `GET /api/health`, which returns only connectivity status, and the NextAuth route itself) require a session — checked both in `proxy.ts` (page-level redirect) and per-route via `requireApiSession()` in `lib/require-api-session.ts`, per Next.js's own guidance that proxy coverage alone can silently regress.
- Passwords are hashed (bcrypt) for the dashboard login and encrypted (AES-256-GCM) for the optional COSEC settings override; neither is ever returned to the client.
- `lib/logger.ts` redacts `password`/`authorization`/`secret`/`token` keys from any logged metadata.
- `.env` is gitignored; `.env.example` has no real values.

## Roadmap

Built (Phase 1): standalone dashboard, real COSEC client + parser, Postgres storage, sync engine, auth, CSV export, health checks.

Built (Phase 2, in progress): Frappe HRMS connection layer (`lib/frappe`), employee mapping (`lib/mapping`, `EmployeeMapping` table, Employees page UI), and idempotent Employee Checkin sync (`lib/frappe/checkin.ts`, `FrappeSyncLog` table, Frappe HRMS page) — all verified against a real, live Frappe HR 16.11.0 instance during development, including a real end-to-end sync of 14 checkins and a confirmed-idempotent re-sync (see [Connecting Frappe HRMS](#connecting-frappe-hrms)).

Built (Phase 3): `/agent/cosec-agent` and the cloud-side `/api/agent/*` endpoints it relays to (see [The COSEC Agent](#the-cosec-agent)) — heartbeat round-trip verified end-to-end; the COSEC-fetch side of a sync cycle needs re-verification once this machine is back on the COSEC network (it changed networks mid-development).

Built (Phase 4): deployed to Vercel, live at **[https://cosec-api-test.vercel.app](https://cosec-api-test.vercel.app)** — Supabase-backed Postgres (Supavisor pooler), production env vars set, migrations applied, seeded admin login, and the agent's `CLOUD_API_URL` pointed at the live domain with a confirmed heartbeat. See [Deploying to Vercel](#deploying-to-vercel) for the full writeup, including why Supabase was used instead of the originally-planned Vercel Postgres/Neon integration.

Resolved without app code: the Attendance doctype gets populated automatically — `Shift Type > Enable Auto Attendance` is on for every shift on the connected instance, and Frappe's own scheduler derives real `Attendance` records ("Present") from the Checkins this app syncs in (confirmed live, e.g. `HR-ATT-2026-02419`). This app deliberately only ever writes Checkins, never Attendance directly (see [Checkin sync](#checkin-sync)) — Frappe does the rest on its own.

Built: automatic Frappe push (agent-triggered + daily Vercel Cron safety net) and the "Open Attendence" shift exclusion — see [Automatic Frappe push](#automatic-frappe-push). Deployed and its own plumbing verified (cron auth, cron registration, exclusion query against live Frappe) — but **production has zero rows in `employee_mappings` and no attendance/event data yet**, since mapping and Checkin sync were only ever run against local dev during Phase 2. Until COSEC is back online, the agent relays real data into production, and mapping is (re-)done against the production DB, none of this has pushed a real checkin in production — it's built and its parts individually proven, not yet observed end-to-end on real data live.

Not built yet, by design (see the original project spec for full detail):
- **Full agent data-relay verification in production**: the heartbeat works against the live deployment, but an actual COSEC → agent → production-DB sync hasn't been confirmed yet, since this machine still lacks network access to the COSEC device — see [The COSEC Agent](#the-cosec-agent)
# hrms-middleware
