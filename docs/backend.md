# Backend Architecture — Pickleball Smart Queue

## Overview

NestJS 12 API server backed by Supabase (Postgres + Auth + Realtime). Monorepo service at `services/api/`. Three consumers: player-app, staff-console, admin-dashboard.

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ Player App  │     │ Staff Cons. │     │ Admin Dash. │
│  (React)    │     │  (React)    │     │  (React)    │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                   │
       └───────────────────┼───────────────────┘
                           │
                    ┌──────▼──────┐
                    │  NestJS API │  ← REST + WebSocket (Supabase Realtime)
                    │  Port 3000  │
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
       ┌──────▼──────┐ ┌──▼────┐ ┌────▼─────┐
       │  Supabase   │ │ OneSig│ │  Shared  │
       │ Postgres +  │ │ Push  │ │ Packages │
       │ Auth + RT   │ │ Notif │ │          │
       └─────────────┘ └───────┘ └──────────┘
```

---

## Database Schema (Supabase / PostgreSQL)

### Tables

#### `players`
| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` PK | FK → `auth.users.id` (Supabase Auth) |
| `display_name` | `text` NOT NULL | |
| `email` | `text` UNIQUE | |
| `phone` | `text` | For OTP login |
| `avatar_url` | `text` | |
| `rating` | `numeric(6,2)` DEFAULT 2.50 | Glicko-2 style, range 1.00–5.00 |
| `rating_dev` | `numeric(6,2)` DEFAULT 0.80 | Uncertainty (lower = more confident) |
| `skill_level` | `text` CHECK (`'beginner','intermediate','advanced','pro'`) | Self-assessed on signup |
| `total_games` | `int` DEFAULT 0 | |
| `win_streak` | `int` DEFAULT 0 | |
| `is_active` | `boolean` DEFAULT true | Soft delete |
| `created_at` | `timestamptz` DEFAULT now() | |
| `updated_at` | `timestamptz` DEFAULT now() | |

#### `facilities`
| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` PK DEFAULT `gen_random_uuid()` | |
| `name` | `text` NOT NULL | |
| `address` | `text` | |
| `timezone` | `text` DEFAULT 'America/New_York' | |
| `max_courts` | `int` NOT NULL | |
| `queue_algorithm` | `text` DEFAULT 'skill_based'` CHECK (`'fifo','skill_based','random'`) | |
| `peak_hours` | `jsonb` | `{mon: [{start: "09:00", end: "12:00"}]}` |
| `is_active` | `boolean` DEFAULT true | |
| `created_at` | `timestamptz` DEFAULT now() | |

#### `courts`
| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` PK DEFAULT `gen_random_uuid()` | |
| `facility_id` | `uuid` FK → `facilities.id` | |
| `name` | `text` NOT NULL | "Court 1", "Court A" |
| `surface_type` | `text` DEFAULT 'indoor'` CHECK (`'indoor','outdoor'`) | |
| `is_active` | `boolean` DEFAULT true | |
| `sort_order` | `int` DEFAULT 0 | Display ordering |

#### `queue_entries`
| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` PK DEFAULT `gen_random_uuid()` | |
| `facility_id` | `uuid` FK → `facilities.id` | |
| `player_id` | `uuid` FK → `players.id` | |
| `status` | `text` DEFAULT 'waiting'` CHECK (`'waiting','matched','playing','completed','cancelled','no_show'`) | |
| `position` | `int` | Updated by matching algorithm |
| `joined_at` | `timestamptz` DEFAULT now() | For FIFO fallback |
| `matched_at` | `timestamptz` | |
| `started_at` | `timestamptz` | |
| `completed_at` | `timestamptz` | |
| `game_id` | `uuid` FK → `games.id` NULL | Set when matched |
| `squad_id` | `uuid` NULL | Group queue (Phase 2) |
| `preference_tags` | `jsonb` DEFAULT `'[]'` | `["casual","competitive"]` |
| `device_push_token` | `text` | OneSignal player ID |

#### `games`
| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` PK DEFAULT `gen_random_uuid()` | |
| `facility_id` | `uuid` FK → `facilities.id` | |
| `court_id` | `uuid` FK → `courts.id` | |
| `status` | `text` DEFAULT 'scheduled'` CHECK (`'scheduled','in_progress','completed','cancelled'`) | |
| `player1_id` | `uuid` FK → `players.id` | |
| `player2_id` | `uuid` FK → `players.id` | |
| `player3_id` | `uuid` FK → `players.id` NULL | Doubles |
| `player4_id` | `uuid` FK → `players.id` NULL | Doubles |
| `is_doubles` | `boolean` DEFAULT false | |
| `score_team_a` | `int` | |
| `score_team_b` | `int` | |
| `started_at` | `timestamptz` | |
| `ended_at` | `timestamptz` | |
| `duration_min` | `int` | Computed or tracked |
| `created_at` | `timestamptz` DEFAULT now() | |

#### `rating_history`
| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` PK DEFAULT `gen_random_uuid()` | |
| `player_id` | `uuid` FK → `players.id` | |
| `game_id` | `uuid` FK → `games.id` | |
| `rating_before` | `numeric(6,2)` | |
| `rating_after` | `numeric(6,2)` | |
| `deviation_before` | `numeric(6,2)` | |
| `deviation_after` | `numeric(6,2)` | |
| `created_at` | `timestamptz` DEFAULT now() | |

#### `quick_ratings` (Phase 2)
| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` PK DEFAULT `gen_random_uuid()` | |
| `player_id` | `uuid` FK → `players.id` | |
| `game_id` | `uuid` FK → `games.id` | |
| `rating` | `text` CHECK (`'too_easy','fair','too_tough'`) | |
| `created_at` | `timestamptz` DEFAULT now() | |

#### `facility_settings`
| Column | Type | Notes |
|--------|------|-------|
| `facility_id` | `uuid` PK FK → `facilities.id` | |
| `check_in_method` | `text` DEFAULT 'qr'` CHECK (`'qr','manual','nfc'`) | |
| `auto_match` | `boolean` DEFAULT true | |
| `match_interval_sec` | `int` DEFAULT 30 | How often to run matcher |
| `max_wait_min` | `int` DEFAULT 60 | Force-match if exceeded |
| `no_show_grace_min` | `int` DEFAULT 5 | Phase 3 |
| `peak_hour_surcharge` | `numeric(6,2)` DEFAULT 0 | Phase 3 |

#### `notifications_log`
| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` PK DEFAULT `gen_random_uuid()` | |
| `player_id` | `uuid` FK → `players.id` | |
| `type` | `text` CHECK (`'youre_up','queue_update','game_result','system'`) | |
| `title` | `text` | |
| `body` | `text` | |
| `sent_at` | `timestamptz` DEFAULT now() | |
| `delivered` | `boolean` DEFAULT false | |

### Indexes

```sql
-- Queue lookups (hot path)
CREATE INDEX idx_queue_entries_facility_status ON queue_entries(facility_id, status);
CREATE INDEX idx_queue_entries_player ON queue_entries(player_id, status);
CREATE INDEX idx_queue_entries_facility_joined ON queue_entries(facility_id, joined_at);

-- Game lookups
CREATE INDEX idx_games_facility ON games(facility_id, status);
CREATE INDEX idx_games_court ON games(court_id, status);
CREATE INDEX idx_games_players ON games(player1_id, player2_id);

-- Rating history
CREATE INDEX idx_rating_history_player ON rating_history(player_id, created_at DESC);

-- Court availability
CREATE INDEX idx_courts_facility ON courts(facility_id, is_active);
```

### Row Level Security (RLS)

```sql
-- Players can read/update their own data
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
CREATE POLICY "players_own_profile" ON players
  FOR ALL USING (auth.uid() = id);

-- Queue entries: players see own + facility sees all at their facility
ALTER TABLE queue_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "queue_own_entries" ON queue_entries
  FOR SELECT USING (player_id = auth.uid());
CREATE POLICY "facility_queue_view" ON queue_entries
  FOR SELECT USING (
    facility_id IN (SELECT facility_id FROM facility_staff WHERE user_id = auth.uid())
  );

-- Games: players see games they're in
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
CREATE POLICY "games_own_view" ON games
  FOR SELECT USING (
    player1_id = auth.uid() OR player2_id = auth.uid() OR
    player3_id = auth.uid() OR player4_id = auth.uid()
  );

-- Staff/admin bypass via service role key (backend only)
```

---

## NestJS Module Structure

```
services/api/src/
├── main.ts                          # Bootstrap, CORS, validation pipe
├── app.module.ts                    # Root module
│
├── auth/                            # Supabase Auth integration
│   ├── auth.module.ts
│   ├── auth.guard.ts                # JWT verification via Supabase
│   ├── auth.service.ts              # Token exchange, session management
│   ├── auth.controller.ts           # POST /auth/signup, /auth/login, /auth/me
│   └── supabase.service.ts          # Supabase client singleton
│
├── players/                         # Player profiles & ratings
│   ├── players.module.ts
│   ├── players.controller.ts        # CRUD + rating endpoints
│   ├── players.service.ts           # Business logic
│   ├── dto/
│   │   ├── create-player.dto.ts
│   │   └── update-player.dto.ts
│   └── entities/
│       └── player.entity.ts
│
├── facilities/                      # Facility management
│   ├── facilities.module.ts
│   ├── facilities.controller.ts     # CRUD + settings
│   ├── facilities.service.ts
│   └── entities/
│       └── facility.entity.ts
│
├── courts/                          # Court management
│   ├── courts.module.ts
│   ├── courts.controller.ts
│   └── courts.service.ts
│
├── queue/                           # Queue management (core)
│   ├── queue.module.ts
│   ├── queue.controller.ts          # Join, leave, status, position
│   ├── queue.service.ts             # Position calculation, wait time
│   ├── matching.service.ts          # Skill-matching algorithm
│   └── dto/
│       ├── join-queue.dto.ts
│       └── queue-status.dto.ts
│
├── games/                           # Game lifecycle
│   ├── games.module.ts
│   ├── games.controller.ts          # Create, update score, complete
│   ├── games.service.ts             # Game state machine
│   └── entities/
│       └── game.entity.ts
│
├── ratings/                         # Rating engine
│   ├── ratings.module.ts
│   ├── ratings.service.ts           # Glicko-2 calculation
│   └── quick-rating.controller.ts   # Post-game feedback
│
├── notifications/                   # Push notifications
│   ├── notifications.module.ts
│   ├── notifications.service.ts     # OneSignal integration
│   └── notifications.controller.ts  # Register device, send test
│
├── realtime/                        # Supabase Realtime subscriptions
│   ├── realtime.module.ts
│   └── realtime.service.ts          # Channel subscriptions, broadcast
│
└── common/                          # Shared utilities
    ├── guards/
    │   ├── jwt-auth.guard.ts
    │   └── facility-staff.guard.ts
    ├── interceptors/
    │   └── logging.interceptor.ts
    ├── filters/
    │   └── http-exception.filter.ts
    └── pipes/
        └── parse-uuid.pipe.ts
```

---

## API Endpoints

### Authentication

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| `POST` | `/auth/signup` | Register new player | Public |
| `POST` | `/auth/login` | Email/password login | Public |
| `POST` | `/auth/login/otp` | Phone OTP login | Public |
| `POST` | `/auth/verify-otp` | Verify OTP code | Public |
| `GET` | `/auth/me` | Get current user session | JWT |
| `POST` | `/auth/logout` | Sign out | JWT |

### Players

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| `GET` | `/players/:id` | Get player profile | JWT |
| `PATCH` | `/players/:id` | Update profile | JWT (own) |
| `GET` | `/players/:id/stats` | Win/loss, games played | JWT |
| `GET` | `/players/:id/rating-history` | Rating progression chart | JWT (own) |
| `GET` | `/players/leaderboard` | Facility leaderboard | JWT |
| `POST` | `/players/:id/quick-rating` | Submit post-game feedback | JWT (own) |

### Facilities

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| `GET` | `/facilities` | List all facilities | JWT |
| `GET` | `/facilities/:id` | Get facility details | JWT |
| `POST` | `/facilities` | Create facility | Admin |
| `PATCH` | `/facilities/:id` | Update facility | Admin |
| `GET` | `/facilities/:id/settings` | Get queue/match settings | Staff |
| `PATCH` | `/facilities/:id/settings` | Update settings | Admin |

### Courts

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| `GET` | `/facilities/:id/courts` | List courts for facility | JWT |
| `POST` | `/facilities/:id/courts` | Add court | Admin |
| `PATCH` | `/courts/:id` | Update court | Admin |
| `DELETE` | `/courts/:id` | Deactivate court | Admin |

### Queue Management

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| `POST` | `/queue/join` | Join queue | JWT |
| `DELETE` | `/queue/leave` | Leave queue | JWT (own) |
| `GET` | `/queue/status` | Get own queue status + position | JWT |
| `GET` | `/queue/:facilityId` | Get full queue for facility | JWT |
| `GET` | `/queue/:facilityId/wait-time` | Predicted wait time | JWT |
| `POST` | `/queue/:facilityId/check-in` | QR code check-in | JWT |
| `POST` | `/queue/:facilityId/manual-add` | Staff: add player manually | Staff |
| `PATCH` | `/queue/:entryId/override` | Staff: force position change | Staff |
| `POST` | `/queue/:facilityId/force-match` | Staff: trigger matching now | Staff |

### Games

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| `GET` | `/games/:id` | Get game details | JWT (participants) |
| `POST` | `/games` | Create game (auto or manual) | Staff |
| `PATCH` | `/games/:id/score` | Submit score | JWT (participants) |
| `POST` | `/games/:id/complete` | Mark game finished | Staff |
| `GET` | `/games/:facilityId/active` | Current games at facility | JWT |
| `GET` | `/games/:facilityId/history` | Past games | JWT |

### Ratings

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| `POST` | `/ratings/calculate` | Recalculate rating (internal) | Service |
| `GET` | `/ratings/:playerId/history` | Rating change history | JWT (own) |
| `POST` | `/ratings/quick-feedback` | Submit too_easy/fair/too_tough | JWT |

### Notifications

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| `POST` | `/notifications/register` | Register push token | JWT |
| `GET` | `/notifications/history` | My notification history | JWT |
| `POST` | `/notifications/test` | Staff: send test notification | Staff |

### Lobby Display (WebSocket / Realtime)

| Channel | Event | Payload | Consumers |
|---------|-------|---------|-----------|
| `queue:{facilityId}` | `queue_updated` | `{entries[], position}` | Player, Staff |
| `queue:{facilityId}` | `match_found` | `{gameId, court, players[]}` | Player |
| `games:{facilityId}` | `game_started` | `{gameId, court, players[]}` | Staff, Lobby |
| `games:{facilityId}` | `game_completed` | `{gameId, score, ratingChanges}` | Staff, Lobby |
| `leaderboard:{facilityId}` | `leaderboard_updated` | `{players[]}` | Player, Lobby |

---

## Core Algorithms

### Skill-Matching Algorithm

```
INPUT: facility queue entries (status='waiting')
OUTPUT: match groups (2 or 4 players → game)

1. Sort queue by: rating_dev ASC (most confident first), then joined_at ASC
2. For each unmatched player:
   a. Find candidates within ±0.50 rating spread
   b. Among candidates, prefer:
      - Similar preference_tags (casual vs competitive)
      - Closest to max_wait_min threshold
      - Smallest deviation (most confident rating)
   c. If 2 candidates found → singles match
   d. If 4 candidates found → doubles match
   e. If no valid match and player exceeded max_wait_min:
      - Expand spread to ±1.00
      - If still no match → random pairing
3. Assign cheapest available court
4. Create game + update queue_entries.status to 'matched'
```

### Predicted Wait Time

```
INPUT: facility_id, player_id
OUTPUT: estimated minutes

1. Get player's current queue position
2. Query rolling 7-day stats:
   - Avg games per hour at current time-of-day
   - Avg game duration
3. Get available courts count
4. Estimate:
   wait = (position / active_courts) × avg_game_duration
5. Adjust for:
   - Peak hours (add 20% buffer)
   - Current queue depth (if crowded, add 10%)
6. Return estimate ± confidence range
```

### Glicko-2 Rating Update (Simplified)

```
CONSTANTS:
  τ = 0.5 (system volatility)
  q = ln(10) / 400

1. Calculate g(RD) = 1 / sqrt(1 + 3q²RD²/π²)
2. Calculate E(s,p) = 1 / (1 + 10^(-g×(Rs-Rp)/400))
3. For each player after game:
   d² = 1 / (q² × Σ g²×E×(1-E))
   RD_new = 1 / sqrt(1/RD² + 1/d²)
   R_new = R + q/(1/RD² + 1/d²) × Σ g×(s-E)
4. Clamp: rating ∈ [1.00, 5.00], RD ∈ [0.10, 2.00]
5. Insert into rating_history
```

---

## Real-time Strategy

**Supabase Realtime** (already included in Supabase project):

- **Queue updates**: Broadcast on `queue:{facilityId}` channel when entry added/removed/position changes
- **Game lifecycle**: Broadcast on `games:{facilityId}` when game starts/completes
- **Leaderboard**: Broadcast on `leaderboard:{facilityId}` when ratings update

**Flow**:
1. NestJS API writes to Postgres
2. Postgres trigger fires on INSERT/UPDATE to `queue_entries` or `games`
3. Supabase Realtime broadcasts to subscribed clients
4. React apps subscribe via `@supabase/supabase-js` realtime client

**Fallback**: Polling endpoint every 10s for environments where WebSocket fails.

---

## Push Notifications (OneSignal)

| Trigger | Recipients | Title | Body |
|---------|------------|-------|------|
| `match_found` | Matched players | "You're up!" | "Court {X} — game starting in 5 min" |
| `queue_position_change` | Player (if position dropped by 3+) | "Moving up!" | "You're now #{position} in queue" |
| `game_result` | Players in completed game | "Game over!" | "Final: {score}. Rating: {change}" |
| `system_announcement` | All facility players | "{Facility}" | "{message}" |

---

## Environment Variables

```env
# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJhbG...
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...

# OneSignal
ONESIGNAL_APP_ID=xxxxx
ONESIGNAL_REST_API_KEY=xxxxx

# App
NODE_ENV=development
PORT=3000
CORS_ORIGINS=http://localhost:5173,http://localhost:5174,http://localhost:5175
```

---

## Shared Types (`packages/shared`)

```typescript
// packages/shared/src/types.ts

export interface Player {
  id: string;
  display_name: string;
  email: string;
  phone?: string;
  avatar_url?: string;
  rating: number;
  rating_dev: number;
  skill_level: 'beginner' | 'intermediate' | 'advanced' | 'pro';
  total_games: number;
  win_streak: number;
}

export interface Facility {
  id: string;
  name: string;
  address: string;
  timezone: string;
  max_courts: number;
  queue_algorithm: 'fifo' | 'skill_based' | 'random';
}

export interface Court {
  id: string;
  facility_id: string;
  name: string;
  surface_type: 'indoor' | 'outdoor';
  is_active: boolean;
}

export interface QueueEntry {
  id: string;
  facility_id: string;
  player_id: string;
  status: 'waiting' | 'matched' | 'playing' | 'completed' | 'cancelled' | 'no_show';
  position: number;
  joined_at: string;
  matched_at?: string;
  game_id?: string;
  preference_tags: string[];
}

export interface Game {
  id: string;
  facility_id: string;
  court_id: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  player1_id: string;
  player2_id: string;
  player3_id?: string;
  player4_id?: string;
  is_doubles: boolean;
  score_team_a?: number;
  score_team_b?: number;
}

export interface RatingChange {
  player_id: string;
  rating_before: number;
  rating_after: number;
  game_id: string;
}
```

---

## Build Order

| Step | What | Depends On |
|------|------|------------|
| 1 | Supabase project + schema migration | Nothing |
| 2 | `supabase.service.ts` + auth guard | Step 1 |
| 3 | Shared types in `packages/shared` | Nothing |
| 4 | Auth endpoints (signup, login, me) | Step 2 |
| 5 | Player CRUD + profile | Step 3, 4 |
| 6 | Facility + Court CRUD | Step 3, 4 |
| 7 | Queue join/leave/status | Step 5, 6 |
| 8 | Matching algorithm | Step 7 |
| 9 | Game lifecycle | Step 8 |
| 10 | Rating engine (Glicko-2) | Step 9 |
| 11 | Real-time broadcasts | Step 7 |
| 12 | Push notifications | Step 9 |
| 13 | Lobby display / leaderboard | Step 10 |
| 14 | Staff overrides + admin endpoints | Step 7 |

---

## Hosting (Phase 1)

- **API**: Render or Fly.io (Dockerfile or `npx render deploy`)
- **Supabase**: Supabase Cloud (free tier for pilot)
- **OneSignal**: Free tier (up to 10k subscribers)
- **Frontend**: Vercel or Cloudflare Pages (static SPA)
