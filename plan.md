# JatriLive — Feature Roadmap

## Wave 1 (this implementation)

### F1. Bangla toggle (i18n)
Cookie-based language (`lang=en|bn`), dictionaries in `lib/i18n.ts`, toggle in header.
- [x] Dictionary covers header, home, live page, auth, dashboard surfaces
- [x] `LangToggle` client component sets cookie + router.refresh()
- [x] `getLang()` server helper reads cookie; html lang attribute follows
- [x] Seeded transport, route, and stop names have Bangla variants
- [x] Acceptance: switching to বাংলা renders home/login/live pages in Bangla; persists across reloads

### F2. Stop-level ETA
- [x] Seed gains approximate stop coordinates (lng/lat) for all 6 routes
- [x] `estimateEtas()` projects live vehicles onto the stop sequence; fresh plausible GPS speed is used with an 18 km/h fallback
- [x] Live API returns per-vehicle `nextStopIndex` + stop ETAs
- [x] Arrivals card in live sidebar: "Farmgate — ~8 min" per vehicle
- [x] Acceptance: user on a transport page sees ETA per stop within 15 s refresh cycle

### F3. Crowding reports
- [x] `CrowdReport` model (empty/seats/standing/packed), 20-min TTL window
- [x] Crowding passed optionally with a location share and aggregated per live vehicle
- [x] Live API returns vehicle `crowding`; map popup + sidebar chip display it
- [x] Acceptance: sharing location with a crowding choice updates UI immediately

## Wave 2 (implemented)

### F4. Approaching-stop alerts
- [x] Passengers can pin a stop and choose a 1–3 stop trigger distance
- [x] Fresh vehicle updates evaluate active alerts without exposing subscriber identities
- [x] In-app and Web Push notifications deep-link to the live route

### F5. Journey planner
- [x] `/journey` matches origin/destination names across the transport directory
- [x] Direct routes are ranked by stop count and reliability
- [x] One-transfer alternatives are shown when no direct route exists

### F6. PWA + Web Push
- [x] Web app manifest, service worker, safe offline screen, and install prompt
- [x] Authenticated Push API subscription storage
- [x] Stale reminders and stop alerts use the shared push delivery pipeline

### F7. Streaks, badges, and leaderboard
- [x] Dashboard calculates contribution streaks and five badges
- [x] Seven-day leaderboard ranks accepted reports and measured watcher impact
- [x] Privacy defaults to an anonymous rider code; first-name visibility is opt-in

### F8. Route reliability
- [x] Seven-day score combines active coverage days, update volume, and freshness
- [x] Score appears in route cards, the journey planner, and live route details

### F9. Live vehicle detail
- [x] Heading arrows, reported speed, confidence, last confirmed stop, and unique witnesses
- [x] Passenger issue reporting feeds an admin review queue

## Wave 3 (implemented)

### F10. Referral rewards
- [x] Unique referral links and optional signup codes
- [x] Referrer and new passenger each receive 5 points

### F11. Weekly impact digest
- [x] Location updates record how many active watchers they helped
- [x] Dashboard summarizes weekly updates, routes, people helped, and rank

### F12. Contributor trust
- [x] Newcomer, contributor, and trusted levels derive from volume, corroboration, and confirmed flags
- [x] Trusted reports receive greater merge weight and a modest accuracy allowance
- [x] Admin decisions on passenger flags affect contributor trust

### F13. Fare information
- [x] Per-route fare range, notes, currency, source, and verification date fields
- [x] Live route and journey planner surfaces show available fare data
- [x] Seed links to the latest official BRTA Dhaka Metro fare-list page; exact values remain admin-verifiable

## Verification checklist
- [x] `npm exec tsc -- --noEmit` clean
- [x] `npm run build` succeeds
- [ ] Set VAPID environment keys to enable background push delivery
- [x] Ran `pnpm seed` against the configured target to add coordinates, Bangla names, and fare sources
- [ ] Device E2E: signup → live API → location share with crowding → ETA present
- [ ] Device E2E: install PWA → enable push → trigger approaching-stop alert
