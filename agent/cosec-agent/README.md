# COSEC Agent

A small, standalone Node/TypeScript process meant to run on a machine inside the office network (where the COSEC device is reachable). It calls COSEC directly and relays the **raw, unparsed** responses to the cloud-hosted COSEC Attendance Dashboard, which does the actual parsing and database writes.

This is what makes "Mode B" possible: a Vercel-hosted dashboard can't reach a private LAN IP like `192.168.0.107`, so this agent bridges the two — COSEC stays on the LAN, only normalized HTTPS calls to your own cloud API cross the network boundary.

## Why this duplicates `lib/cosec`

The main app's parser (`lib/cosec/attendance.ts`, `lib/cosec/events.ts`) is **not** duplicated here — the agent forwards raw COSEC text and the cloud parses it (`ingestAttendanceDailyRaw`/`ingestEventsRaw` in `lib/sync/`), so there's exactly one place pipe-delimited COSEC responses get interpreted.

What **is** duplicated (`src/cosecClient.ts`, `src/dates.ts`) is the thin HTTP-calling layer — Basic Auth header, URL building, date-range formatting. That's unavoidable: it's the one piece that must physically run on the LAN, this project has no shared package between the Next.js app and this standalone process, and at ~100 lines total it's not the "parser code" the project's anti-duplication rule is protecting against.

## Setup

```bash
cd agent/cosec-agent
npm install
cp .env.example .env   # fill in COSEC_*, CLOUD_API_URL, AGENT_SECRET (must match the cloud app's)
npm run dev             # runs continuously, syncing every SYNC_INTERVAL_MINUTES
```

For a one-time full event-history backfill (not part of the periodic loop — COSEC's `event-ta` endpoint returns everything, so this should be run once, not on a timer):

```bash
npm run full-sync
```

## Running in production

```bash
npm run build
npm start   # runs dist/index.js — pair with pm2, a systemd service, or similar to keep it alive
```

## What it does each cycle

1. Sends a heartbeat to `POST {CLOUD_API_URL}/heartbeat` (shows up on the dashboard's Health page).
2. Fetches `attendance-daily` and `event-ta-date` from COSEC for **today** (Asia/Kolkata calendar day), and relays each raw response to `POST {CLOUD_API_URL}/sync`.

Both requests use `Authorization: Bearer <AGENT_SECRET>`. Network failures are retried (3 attempts, backing off) before being logged and skipped for that cycle — the next tick tries again.
