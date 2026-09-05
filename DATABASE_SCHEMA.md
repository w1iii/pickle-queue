# Database Schema — Pickleball Smart Queue

Copy-paste the SQL below into Supabase SQL Editor to create all tables.

---

## Complete SQL Schema

```sql
-- =====================================================
-- PICKLEBALL SMART QUEUE - DATABASE SCHEMA
-- Run this in Supabase SQL Editor
-- =====================================================

-- =====================================================
-- 1. PLAYERS (User profiles)
-- =====================================================
CREATE TABLE players (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  email text UNIQUE,
  phone text,
  avatar_url text,
  rating numeric(6,2) DEFAULT 2.50,
  rating_dev numeric(6,2) DEFAULT 0.80,
  skill_level text CHECK (skill_level IN ('beginner','intermediate','advanced','pro')),
  total_games int DEFAULT 0,
  win_streak int DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

COMMENT ON COLUMN players.rating IS 'Glicko-2 rating, range 1.00-5.00, default 2.50';
COMMENT ON COLUMN players.rating_dev IS 'Rating deviation/uncertainty, lower = more confident';

-- =====================================================
-- 2. FACILITIES (Venues)
-- =====================================================
CREATE TABLE facilities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text,
  timezone text DEFAULT 'America/New_York',
  max_courts int NOT NULL,
  queue_algorithm text DEFAULT 'skill_based' CHECK (queue_algorithm IN ('fifo','skill_based','random')),
  peak_hours jsonb DEFAULT '{}',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

COMMENT ON COLUMN facilities.peak_hours IS 'Format: {mon: [{start: "09:00", end: "12:00"}]}';
COMMENT ON COLUMN facilities.queue_algorithm IS 'fifo: first-in-first-out, skill_based: match by rating, random: random pairing';

-- =====================================================
-- 3. COURTS (Individual courts per facility)
-- =====================================================
CREATE TABLE courts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id uuid REFERENCES facilities(id) ON DELETE CASCADE,
  name text NOT NULL,
  surface_type text DEFAULT 'indoor' CHECK (surface_type IN ('indoor','outdoor')),
  is_active boolean DEFAULT true,
  sort_order int DEFAULT 0
);

-- =====================================================
-- 4. QUEUE_ENTRIES (Player check-ins)
-- =====================================================
CREATE TABLE queue_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id uuid REFERENCES facilities(id) ON DELETE CASCADE,
  player_id uuid REFERENCES players(id) ON DELETE CASCADE,
  status text DEFAULT 'waiting' CHECK (status IN ('waiting','matched','playing','completed','cancelled','no_show')),
  position int,
  joined_at timestamptz DEFAULT now(),
  matched_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  game_id uuid,
  squad_id uuid,
  preference_tags jsonb DEFAULT '[]',
  device_push_token text
);

COMMENT ON COLUMN queue_entries.status IS 'waiting: in queue, matched: paired with opponent, playing: game in progress, completed: game done, cancelled: left queue, no_show: did not show up';
COMMENT ON COLUMN queue_entries.preference_tags IS 'Array of tags like ["casual","competitive","drilling"]';

-- =====================================================
-- 5. GAMES (Matched games)
-- =====================================================
CREATE TABLE games (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id uuid REFERENCES facilities(id) ON DELETE CASCADE,
  court_id uuid REFERENCES courts(id) ON DELETE SET NULL,
  status text DEFAULT 'scheduled' CHECK (status IN ('scheduled','in_progress','completed','cancelled')),
  player1_id uuid REFERENCES players(id) ON DELETE CASCADE,
  player2_id uuid REFERENCES players(id) ON DELETE CASCADE,
  player3_id uuid REFERENCES players(id) ON DELETE SET NULL,
  player4_id uuid REFERENCES players(id) ON DELETE SET NULL,
  is_doubles boolean DEFAULT false,
  score_team_a int,
  score_team_b int,
  started_at timestamptz,
  ended_at timestamptz,
  duration_min int,
  is_overtime boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

COMMENT ON COLUMN games.is_doubles IS 'true = 4 players (2v2), false = 2 players (1v1)';
COMMENT ON COLUMN games.is_overtime IS 'Auto-detected or manually flagged when game exceeds expected duration';

-- =====================================================
-- 6. RATING_HISTORY (Rating changes per game)
-- =====================================================
CREATE TABLE rating_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid REFERENCES players(id) ON DELETE CASCADE,
  game_id uuid REFERENCES games(id) ON DELETE CASCADE,
  rating_before numeric(6,2),
  rating_after numeric(6,2),
  deviation_before numeric(6,2),
  deviation_after numeric(6,2),
  created_at timestamptz DEFAULT now()
);

-- =====================================================
-- 7. QUICK_RATINGS (Post-game feedback)
-- =====================================================
CREATE TABLE quick_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid REFERENCES players(id) ON DELETE CASCADE,
  game_id uuid REFERENCES games(id) ON DELETE CASCADE,
  rating text CHECK (rating IN ('too_easy','fair','too_tough')),
  created_at timestamptz DEFAULT now()
);

-- =====================================================
-- 8. FACILITY_SETTINGS (Per-facility config)
-- =====================================================
CREATE TABLE facility_settings (
  facility_id uuid PRIMARY KEY REFERENCES facilities(id) ON DELETE CASCADE,
  check_in_method text DEFAULT 'manual' CHECK (check_in_method IN ('qr','manual','nfc')),
  auto_match boolean DEFAULT true,
  match_interval_sec int DEFAULT 30,
  max_wait_min int DEFAULT 60,
  no_show_grace_min int DEFAULT 5,
  peak_hour_surcharge numeric(6,2) DEFAULT 0
);

COMMENT ON COLUMN facility_settings.check_in_method IS 'qr: scan QR code, manual: staff/player button, nfc: tap phone';
COMMENT ON COLUMN facility_settings.match_interval_sec IS 'How often the matching algorithm runs';
COMMENT ON COLUMN facility_settings.max_wait_min IS 'Force-match player if waiting longer than this';

-- =====================================================
-- 9. NOTIFICATIONS_LOG (Push notification history)
-- =====================================================
CREATE TABLE notifications_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid REFERENCES players(id) ON DELETE CASCADE,
  type text CHECK (type IN ('youre_up','queue_update','game_result','system')),
  title text,
  body text,
  sent_at timestamptz DEFAULT now(),
  delivered boolean DEFAULT false
);

-- =====================================================
-- 10. FACILITY_STAFF (Role management)
-- =====================================================
CREATE TABLE facility_staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id uuid REFERENCES facilities(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  role text CHECK (role IN ('admin', 'staff')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(facility_id, user_id)
);

COMMENT ON COLUMN facility_staff.role IS 'admin: full facility control, staff: queue/game management';

-- =====================================================
-- INDEXES (Performance)
-- =====================================================

-- Queue lookups (hot path)
CREATE INDEX idx_queue_entries_facility_status ON queue_entries(facility_id, status);
CREATE INDEX idx_queue_entries_player ON queue_entries(player_id, status);
CREATE INDEX idx_queue_entries_facility_joined ON queue_entries(facility_id, joined_at);

-- Game lookups
CREATE INDEX idx_games_facility ON games(facility_id, status);
CREATE INDEX idx_games_court ON games(court_id, status);
CREATE INDEX idx_games_player1 ON games(player1_id);
CREATE INDEX idx_games_player2 ON games(player2_id);

-- Rating history
CREATE INDEX idx_rating_history_player ON rating_history(player_id, created_at DESC);

-- Court availability
CREATE INDEX idx_courts_facility ON courts(facility_id, is_active);

-- Facility staff
CREATE INDEX idx_facility_staff_user ON facility_staff(user_id);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Players: read/update own profile
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
CREATE POLICY "players_own_profile" ON players
  FOR ALL USING (auth.uid() = id);

-- Queue entries: players see own, staff sees all at their facility
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

-- Facilities: everyone can read, only admin can update
ALTER TABLE facilities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "facilities_read_all" ON facilities
  FOR SELECT USING (true);

-- Courts: everyone can read active courts
ALTER TABLE courts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "courts_read_active" ON courts
  FOR SELECT USING (is_active = true);

-- Rating history: players see own
ALTER TABLE rating_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rating_history_own" ON rating_history
  FOR SELECT USING (player_id = auth.uid());

-- Quick ratings: players see own
ALTER TABLE quick_ratings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "quick_ratings_own" ON quick_ratings
  FOR SELECT USING (player_id = auth.uid());

-- Notifications: players see own
ALTER TABLE notifications_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notifications_own" ON notifications_log
  FOR SELECT USING (player_id = auth.uid());

-- Facility staff: users see their own assignments
ALTER TABLE facility_staff ENABLE ROW LEVEL SECURITY;
CREATE POLICY "facility_staff_own" ON facility_staff
  FOR SELECT USING (user_id = auth.uid());

-- =====================================================
-- TRIGGER: Auto-update updated_at on players
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_players_updated_at
  BEFORE UPDATE ON players
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- TRIGGER: Auto-create player profile on signup
-- =====================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.players (id, display_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email),
    NEW.email
  );
  RETURN NEW;
END;
$$ language 'plpgsql' SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- =====================================================
-- SEED DATA: Default facility for MVP
-- =====================================================
INSERT INTO facilities (name, address, max_courts, queue_algorithm)
VALUES ('Pickleball Pro', '123 Main St, Anytown USA', 4, 'skill_based');

INSERT INTO facility_settings (facility_id, check_in_method, auto_match, match_interval_sec, max_wait_min)
SELECT id, 'manual', true, 30, 60
FROM facilities
WHERE name = 'Pickleball Pro';

INSERT INTO courts (facility_id, name, surface_type, sort_order)
SELECT id, 'Court 1', 'indoor', 1 FROM facilities WHERE name = 'Pickleball Pro'
UNION ALL
SELECT id, 'Court 2', 'indoor', 2 FROM facilities WHERE name = 'Pickleball Pro'
UNION ALL
SELECT id, 'Court 3', 'indoor', 3 FROM facilities WHERE name = 'Pickleball Pro'
UNION ALL
SELECT id, 'Court 4', 'indoor', 4 FROM facilities WHERE name = 'Pickleball Pro';
```

---

## Tables Summary

| Table | Purpose | Key Relationships |
|-------|---------|-------------------|
| `players` | User profiles | FK → `auth.users.id` |
| `facilities` | Venues | Independent |
| `courts` | Individual courts | FK → `facilities.id` |
| `queue_entries` | Player check-ins | FK → `facilities.id`, `players.id`, `games.id` |
| `games` | Matched games | FK → `facilities.id`, `courts.id`, `players.id` |
| `rating_history` | Rating changes | FK → `players.id`, `games.id` |
| `quick_ratings` | Post-game feedback | FK → `players.id`, `games.id` |
| `facility_settings` | Per-facility config | FK → `facilities.id` |
| `notifications_log` | Push notification history | FK → `players.id` |
| `facility_staff` | Role management | FK → `facilities.id`, `auth.users.id` |

---

## Status Flows

### Queue Entry Status
```
waiting → matched → playing → completed
   ↓         ↓
cancelled  no_show
```

### Game Status
```
scheduled → in_progress → completed
    ↓
cancelled
```

### Player Rating Flow
```
Signup (quiz) → 2.50 default
    ↓
Games played → Glicko-2 updates → rating_history logged
```

---

## Environment Variables Required

```env
# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJhbG...
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...

# OneSignal (push notifications)
ONESIGNAL_APP_ID=xxxxx
ONESIGNAL_REST_API_KEY=xxxxx

# App
NODE_ENV=development
PORT=3000
CORS_ORIGINS=http://localhost:5173,http://localhost:5174,http://localhost:5175
```
