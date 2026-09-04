# Pickleball Smart Queue

A queuing and matchmaking system for pickleball facilities that replaces the paddle-stack/whiteboard queue with skill-matched games, predictive wait times, and a self-improving rating engine.

One data engine powers three surfaces: **player app, staff console, lobby display.**

---

## Why this exists

Traditional pickleball queues are first-come-first-served with no idea who you'll play, how long you'll actually wait, or whether the match will be balanced. This system fixes that with:

- **Skill-matched queuing** — games are algorithmically balanced instead of random
- **Predictive wait times** — remote check-in, no standing around holding a paddle
- **Squad/solo matchmaking** — solo players and beginners get paired instead of stranded
- **Self-correcting ratings** — a 3-tap post-game prompt keeps skill data accurate over time
- **Live leaderboard** — multi-category (win streak, games played, most improved), not just top-player bragging rights
- **Tournament mode** — the same daily queue engine instantly reuses its rating data to auto-seed round robins

---

## Tech stack

| Layer                           | Choice                                                 |
| ------------------------------- | ------------------------------------------------------ |
| Player app                      | PWA (React) for pilot → React Native for full launch   |
| Staff console / admin dashboard | React + Tailwind CSS                                   |
| Backend                         | Node.js + NestJS (TypeScript)                          |
| Database + real-time + auth     | Supabase (Postgres, built-in real-time, built-in auth) |
| Push notifications              | OneSignal                                              |
| Hosting                         | Render or Fly.io (MVP) → AWS/GCP at scale              |

See `/docs/pickleball-queue-app-plan.md` for full architecture, data model, and algorithm specs.

---

## Project structure (proposed)

```
/apps
  /player-app        # React PWA
  /staff-console      # React staff-facing web app
  /admin-dashboard    # React admin/analytics web app
/services
  /api                # NestJS backend (queue, matching, rating engine)
/packages
  /shared              # shared types, utils between frontend apps
/docs
  pickleball-queue-app-plan.md
  todo.md
```

---

## Core concepts

- **Queue entry** — a player or squad checked in and waiting, matched into a game by the skill-matching algorithm
- **Rating engine** — every player has a `current_rating` that adjusts after each game from both the win/loss result and the post-game quick-rating feedback (too easy / fair / too tough)
- **Tournament mode** — a staff-triggered toggle that reuses the same checked-in roster and rating data to auto-seed a round robin, instead of requiring a separate tournament tool

---

## Build phases

1. **MVP** — check-in, skill-matched queue, predictive wait time, staff console, lobby display
2. **Retention layer** — squad/solo matchmaking, post-game rating, leaderboard, court zones
3. **Revenue/ops layer** — tournament mode, fast-pass, off-peak pricing, sponsor offers, dispute log

Full roadmap and timeline: see `/docs/pickleball-queue-app-plan.md`.

---

## Getting started (dev setup — fill in once repo is initialized)

```bash
# clone the repo
git clone <repo-url>

# install dependencies
cd pickleball-queue
npm install

# set up environment variables
cp .env.example .env
# fill in Supabase project URL/key, OneSignal app ID

# run the backend
cd services/api
npm run start:dev

# run the player app (PWA)
cd apps/player-app
npm run dev
```

---

## Status

Pre-development — planning and architecture stage. See `/docs/todo.md` for current task list.
# pickle-queue
