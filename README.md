# JatriLive

Community-powered live bus locations for Dhaka, built with Next.js, MongoDB, and OpenStreetMap.

## Run locally

1. Copy `.env.example` to `.env.local` and set `MONGODB_URI`, `JWT_SECRET`, and `CRON_SECRET`.
2. Install packages with `pnpm install`.
3. Load the sample transport directory with `pnpm seed`.
4. Start the app with `pnpm dev` and open `http://localhost:3000`.

The first account created becomes the administrator. Later accounts are normal passengers.

`MONGODB_DNS_SERVERS` is optional. It is included for Windows/network setups where Node's local resolver refuses Atlas SRV queries; remove it when your normal DNS works.

## Product rules in this MVP

- New users receive 10 points.
- Starting a new watch session costs 1 point; heartbeats and page refreshes do not charge again while the session is active.
- Each accepted location report earns 1 point.
- Reports for the same operator within 140 metres and the active 15-minute window are merged into one live vehicle. The location is smoothed across nearby reports.
- Watcher and traveller presence expires after five minutes without a heartbeat.
- After one minute without a vehicle update, the cron route creates an in-app/browser notification for active travellers when watchers are waiting. A five-minute cooldown prevents notification spam.
- Other passengers only see aggregate counts and vehicle positions. Names, emails, and contributor identities are never exposed.

## Scheduled reminders

`vercel.json` invokes `/api/cron/notifications` every minute. Vercel sends the configured `CRON_SECRET` as a bearer token. For another host, call this endpoint every minute with the same authorization header.

## Important production notes

- Replace all development secrets and rotate any database password that has been shared in chat or source history.
- Restrict the MongoDB Atlas network access list and create a least-privilege database user.
- Verify the sample route stops with operators or a maintained official data source before launch.
- Add rate limiting, email verification, abuse review, consent wording, and a retention policy before a public rollout.
- Browser geolocation requires HTTPS outside `localhost`.
