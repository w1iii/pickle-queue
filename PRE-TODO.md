# PRE-TODO.md — Before Coding

## Project Status: Greenfield Monorepo

**Pickle** — Pickleball facility queue/matchmaking system. Scaffolding exists, no business logic.

---

## What You Need Before Coding

### 1. Database Schema (Supabase)
No schema exists. Need tables for:
- `players` — user profiles
- `facilities` — venues/courts
- `courts` — individual courts per facility
- `queue_entries` — player check-ins, position, status
- `games` — matched games, scores
- `rating_history` — ELO/Glicko ratings

**Action**: Design Supabase schema + run first migration.

### 2. Authentication
No auth library installed. Planned: Supabase Auth.

**Action**: Decide auth flow (email/password, phone OTP, social login). Install `@supabase/supabase-js`.

### 3. API Endpoints
Only `GET /` exists. Need:
- Queue management (join, leave, status)
- Game matching logic
- Player profiles
- Facility management
- Rating engine

**Action**: Define API contract (OpenAPI spec or at minimum endpoint list).

### 4. Shared Types
`packages/shared/` is empty. All three apps + API need same types.

**Action**: Define shared interfaces (`Player`, `QueueEntry`, `Game`, `Facility`, etc.).

### 5. Real-time
Queue updates need real-time (Supabase Realtime or WebSockets).

**Action**: Decide realtime strategy for queue position updates.

### 6. Push Notifications
OneSignal planned but not installed.

**Action**: Set up OneSignal account, install SDK, define notification triggers.

### 7. Environment Setup
`.env.example` exists but no actual `.env.local`.

**Action**: Create Supabase project, get keys, create `.env.local` per app.

### 8. Deployment
No deployment config. Plan: Render or Fly.io.

**Action**: Decide hosting, set up CI/CD.

---

## Recommended Build Order

```
Phase 0: Supabase schema + auth + env setup
Phase 1: Shared types + API endpoints (queue CRUD)
Phase 2: Player app (check-in, queue status)
Phase 3: Staff console (queue management)
Phase 4: Real-time updates + matching logic
Phase 5: Rating engine + admin dashboard
```

---

## Key Decisions Needed

| Decision | Options | Impact |
|----------|---------|--------|
| Queue algorithm | FIFO, skill-based, random | Affects matching logic |
| Rating system | ELO, Glicko, custom | Affects game pairing |
| Check-in method | QR code, manual, NFC | Affects player app UX |
| Multi-facility | Yes/no | Affects schema design |
| Payment | Free, paid, freemium | Affects Phase 4+ |

---

## Tech Stack (Already Decided)

| Layer | Choice |
|-------|--------|
| Frontend (3 apps) | React 19.1 + Vite 6.3 |
| Backend API | NestJS 12 |
| Styling | Tailwind CSS 3.4 (staff/admin only) |
| Database + Auth + Realtime | Supabase |
| Push Notifications | OneSignal |
| Linting | oxlint 1.58 |
| Formatting | Prettier 3.4 |
| Testing | Vitest 4.1 + Supertest 7 |
| Language | TypeScript 5.8 (apps) / 6.0.2 (API) |
| Module System | ESM |
