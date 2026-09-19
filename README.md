# JatriLive

Community-powered live bus locations for Dhaka, built with Next.js, MongoDB, and OpenStreetMap.

## Run locally

1. Copy `.env.example` to `.env.local` and set `MONGODB_URI` and `JWT_SECRET`.
2. Install packages with `pnpm install`.
3. Load the sample transport directory with `pnpm seed`.
4. Start the app with `pnpm dev` and open `http://localhost:3000`.

For background stop alerts, generate VAPID keys with `npx web-push generate-vapid-keys` and add `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, and `VAPID_SUBJECT` to `.env.local`. The PWA and in-app notifications still work when push keys are not configured.

The first account created becomes the administrator. Later accounts are normal passengers.

`MONGODB_DNS_SERVERS` is optional. It is included for Windows/network setups where Node's local resolver refuses Atlas SRV queries; remove it when your normal DNS works.

## Product rules in this MVP

- New users receive 10 points.
- Starting a new watch session costs 1 point; heartbeats and page refreshes do not charge again while the session is active.
- Each accepted location report earns 1 point.
- Reports for the same operator within 140 metres and the active 15-minute window are merged into one live vehicle. The location is smoothed across nearby reports.
- Live vehicles are projected onto seeded stop coordinates to show the next-stop ETA. Implausible/stale speeds fall back to a Dhaka city-bus estimate, and vehicles more than 1.2 km off-route do not receive an ETA.
- Passengers can include an empty/seats/standing/packed crowding report with a location update. Current results combine unique passenger reports and expire after 20 minutes.
- The English/Bangla language choice is stored in a cookie; seeded operator, route, and stop names include Bangla variants.
- Passengers can pin a stop for an approaching-bus notification, install the PWA, and opt into background Web Push.
- The journey planner finds direct and one-transfer routes from the documented stop sequences.
- Seven-day reliability scores summarize route coverage, volume, and freshness; vehicle cards show speed, heading, witnesses, and confidence.
- Streaks, badges, a privacy-safe leaderboard, referral rewards, weekly impact, and contributor trust create a retention loop around useful updates.
- Fare fields support verified per-route ranges and link seeded routes to the current official BRTA Dhaka Metro fare-list page.
- Watcher and traveller presence expires after five minutes without a heartbeat.
- After one minute without a vehicle update, the cron route creates an in-app/browser notification for active travellers when watchers are waiting. A five-minute cooldown prevents notification spam.
- Other passengers only see aggregate counts and vehicle positions. Names, emails, and contributor identities are never exposed.

## Traveller reminders without cron

No scheduled job is required. While a passenger is watching a transport, the client sends a presence heartbeat every 45 seconds. That heartbeat checks whether the latest vehicle location is older than one minute and creates reminders for active travellers. A five-minute cooldown prevents duplicate notifications.

## Important production notes

- Replace all development secrets and rotate any database password that has been shared in chat or source history.
- Restrict the MongoDB Atlas network access list and create a least-privilege database user.
- Verify the sample route stops with operators or a maintained official data source before launch.
- Enter exact stop-to-stop fares from the current BRTA chart in the admin workflow before presenting numeric fare ranges as verified.
- Add rate limiting, email verification, abuse review, consent wording, and a retention policy before a public rollout.
- Browser geolocation requires HTTPS outside `localhost`.
