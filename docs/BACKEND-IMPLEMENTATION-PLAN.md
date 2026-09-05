# Pickleball Smart Queue - Backend Implementation Plan

## **WEEK 1: Foundation & Auth**

### Day 1-2: Environment Setup

- [ ] Create Supabase project (PostgreSQL + Auth)
- [ ] Get API keys: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
- [ ] Update .env.example → .env.local with real keys
- [ ] Install dependencies in services/api/
  ```bash
  npm install @supabase/supabase-js @nestjs/passport @nestjs/jwt passport passport-jwt class-validator class-transformer
  ```
- [ ] Verify NestJS server starts: npm run start:dev

| Task | Status | Est. Time | Dependencies |
|------|--------|-----------|--------------|
| Create Supabase project | ⬜ | 30 min | None |
| Get API keys | ⬜ | 10 min | Supabase project |
| Update .env.local | ⬜ | 5 min | API keys |
| Install dependencies | ⬜ | 10 min | None |
| Verify server starts | ⬜ | 5 min | Dependencies installed |

### Day 2-3: Database Schema

- [ ] Run Supabase migration with 9 tables:
  - players
  - facilities
  - courts
  - queue_entries
  - games
  - rating_history
  - quick_ratings
  - facility_settings
  - notifications_log
- [ ] Create facility_staff table for role management
- [ ] Add all indexes from docs/backend.md
- [ ] Enable RLS policies

| Table | Status | Est. Time | Notes |
|-------|--------|-----------|-------|
| players | ⬜ | 10 min | FK to auth.users.id |
| facilities | ⬜ | 5 min | Multi-facility ready |
| courts | ⬜ | 5 min | FK to facilities |
| queue_entries | ⬜ | 10 min | Hot path indexes |
| games | ⬜ | 10 min | Supports singles/doubles |
| rating_history | ⬜ | 5 min | Glicko-2 tracking |
| quick_ratings | ⬜ | 5 min | Phase 2 prep |
| facility_settings | ⬜ | 5 min | Queue config |
| notifications_log | ⬜ | 5 min | Push history |
| facility_staff | ⬜ | 5 min | admin/staff roles |
| Indexes | ⬜ | 10 min | Performance |
| RLS Policies | ⬜ | 15 min | Security |

### Day 3: Shared Types

- [ ] Create packages/shared/src/types.ts
- [ ] Add interfaces: Player, Facility, Court, QueueEntry, Game, RatingChange, FacilityStaff
- [ ] Export from packages/shared/src/index.ts
- [ ] Verify types compile in all apps

| Interface | Status | Est. Time | Fields |
|-----------|--------|-----------|--------|
| Player | ⬜ | 10 min | id, display_name, email, rating, skill_level, etc. |
| Facility | ⬜ | 5 min | id, name, address, timezone, max_courts |
| Court | ⬜ | 5 min | id, facility_id, name, surface_type, is_active |
| QueueEntry | ⬜ | 10 min | id, facility_id, player_id, status, position |
| Game | ⬜ | 10 min | id, facility_id, court_id, players, score |
| RatingChange | ⬜ | 5 min | player_id, rating_before, rating_after |
| FacilityStaff | ⬜ | 5 min | id, facility_id, user_id, role |

### Day 4-5: Authentication

- [ ] Create src/auth/supabase.service.ts - Supabase client singleton
- [ ] Create src/auth/auth.guard.ts - JWT verification
- [ ] Create src/common/guards/jwt-auth.guard.ts
- [ ] Create src/common/guards/facility-staff.guard.ts
- [ ] Implement POST /auth/signup - Email/password registration
- [ ] Implement POST /auth/login - Email/password login
- [ ] Implement GET /auth/me - Get current user session
- [ ] Implement POST /auth/logout - Sign out
- [ ] Test all auth endpoints with Postman/Insomnia

| Endpoint | Method | Status | Est. Time | Auth |
|----------|--------|--------|-----------|------|
| /auth/signup | POST | ⬜ | 30 min | Public |
| /auth/login | POST | ⬜ | 30 min | Public |
| /auth/me | GET | ⬜ | 20 min | JWT |
| /auth/logout | POST | ⬜ | 15 min | JWT |
| Auth Guard | - | ⬜ | 30 min | - |
| Staff Guard | - | ⬜ | 20 min | - |

### Day 5-6: Rating Self-Assessment Quiz

- [ ] Create src/auth/quiz/quiz.module.ts
- [ ] Create src/auth/quiz/quiz.service.ts
- [ ] Create src/auth/quiz/quiz.controller.ts
- [ ] Implement 5 pickleball-specific questions:
  1. Serve behind baseline? (rules)
  2. Know kitchen rules? (rules)
  3. Sustain dink rally 10+ shots? (skill)
  4. Played in organized league/tournament? (experience)
  5. Comfortable with spin serves? (advanced)
- [ ] Implement scoring: Each 'Yes' = 0.5 rating points added to base 2.5
- [ ] Add POST /auth/signup/quiz endpoint
- [ ] Store initial rating in players.rating

| Question | Category | Points | Status |
|----------|----------|--------|--------|
| Serve behind baseline | rules | 0.5 | ⬜ |
| Know kitchen rules | rules | 0.5 | ⬜ |
| Sustain dink rally 10+ | skill | 0.5 | ⬜ |
| Organized league/tournament | experience | 0.5 | ⬜ |
| Comfortable with spin serves | advanced | 0.5 | ⬜ |
| Quiz endpoint | - | - | ⬜ |
| Rating calculation | - | - | ⬜ |

### Day 6-7: Player Module

- [ ] Create src/players/players.module.ts
- [ ] Create src/players/players.controller.ts
- [ ] Create src/players/players.service.ts
- [ ] Create src/players/dto/ (create-player.dto.ts, update-player.dto.ts)
- [ ] Create src/players/entities/player.entity.ts
- [ ] Implement GET /players/:id - Get profile
- [ ] Implement PATCH /players/:id - Update profile (own only)
- [ ] Implement GET /players/:id/stats - Win/loss stats
- [ ] Implement GET /players/:id/rating-history - Rating progression
- [ ] Implement GET /players/leaderboard - Facility leaderboard

| Endpoint | Method | Status | Est. Time | Auth |
|----------|--------|--------|-----------|------|
| /players/:id | GET | ⬜ | 20 min | JWT |
| /players/:id | PATCH | ⬜ | 30 min | JWT (own) |
| /players/:id/stats | GET | ⬜ | 25 min | JWT |
| /players/:id/rating-history | GET | ⬜ | 20 min | JWT (own) |
| /players/leaderboard | GET | ⬜ | 25 min | JWT |

### Week 1 Checklist

- [ ] Supabase project created
- [ ] Database schema migrated (9 tables + facility_staff)
- [ ] Shared types package created
- [ ] Auth module working (signup, login, me, logout)
- [ ] Rating quiz implemented
- [ ] Player module working (CRUD + stats)
- [ ] All endpoints tested

**Week 1 Total Est. Time**: 8-10 hours

---

## **WEEK 2: Queue, Matching & Games**

### Day 1-2: Facility & Court Module

- [ ] Create src/facilities/facilities.module.ts
- [ ] Create src/facilities/facilities.controller.ts
- [ ] Create src/facilities/facilities.service.ts
- [ ] Create src/facilities/entities/facility.entity.ts
- [ ] Create src/courts/courts.module.ts
- [ ] Create src/courts/courts.controller.ts
- [ ] Create src/courts/courts.service.ts
- [ ] Implement GET /facilities - List facilities
- [ ] Implement GET /facilities/:id - Get facility details
- [ ] Implement GET /facilities/:id/courts - List courts
- [ ] Hardcode single facility for MVP (but keep schema multi-facility ready)

| Endpoint | Method | Status | Est. Time | Auth |
|----------|--------|--------|-----------|------|
| /facilities | GET | ⬜ | 15 min | JWT |
| /facilities/:id | GET | ⬜ | 15 min | JWT |
| /facilities/:id/courts | GET | ⬜ | 20 min | JWT |

### Day 2-3: Queue Module - Manual Check-in

- [ ] Create src/queue/queue.module.ts
- [ ] Create src/queue/queue.controller.ts
- [ ] Create src/queue/queue.service.ts
- [ ] Create src/queue/matching.service.ts
- [ ] Create src/queue/dto/ (join-queue.dto.ts, queue-status.dto.ts)
- [ ] Implement POST /queue/join - Manual button check-in
- [ ] Implement DELETE /queue/leave - Leave queue
- [ ] Implement GET /queue/status - Get own queue position
- [ ] Implement GET /queue/:facilityId - Full queue list
- [ ] Implement GET /queue/:facilityId/wait-time - Predicted wait time

| Endpoint | Method | Status | Est. Time | Auth |
|----------|--------|--------|-----------|------|
| /queue/join | POST | ⬜ | 45 min | JWT |
| /queue/leave | DELETE | ⬜ | 20 min | JWT (own) |
| /queue/status | GET | ⬜ | 30 min | JWT |
| /queue/:facilityId | GET | ⬜ | 25 min | JWT |
| /queue/:facilityId/wait-time | GET | ⬜ | 40 min | JWT |

### Day 3-4: QR Code Check-in Structure

- [ ] Create src/queue/qr/qr.module.ts
- [ ] Create src/queue/qr/qr.service.ts - QR generation/validation stubs
- [ ] Create src/queue/qr/qr.controller.ts - POST /queue/:facilityId/check-in
- [ ] QR logic returns 501 "Not Implemented" for MVP
- [ ] Add TODO comments for future QR implementation

| File | Status | Est. Time | Notes |
|------|--------|-----------|-------|
| qr.module.ts | ⬜ | 10 min | Module structure |
| qr.service.ts | ⬜ | 20 min | Stub methods |
| qr.controller.ts | ⬜ | 15 min | 501 endpoint |
| Check-in endpoint | ⬜ | 15 min | Returns not implemented |

### Day 4-5: Staff Queue Management

- [ ] Implement POST /queue/:facilityId/manual-add - Staff adds player
- [ ] Implement PATCH /queue/:entryId/override - Force position change
- [ ] Implement POST /queue/:facilityId/force-match - Trigger matching now
- [ ] Add facility-staff.guard.ts to staff-only endpoints
- [ ] Test staff permissions (admin can do all, staff can manage queue)

| Endpoint | Method | Status | Est. Time | Auth |
|----------|--------|--------|-----------|------|
| /queue/:facilityId/manual-add | POST | ⬜ | 30 min | Staff |
| /queue/:entryId/override | PATCH | ⬜ | 25 min | Staff |
| /queue/:facilityId/force-match | POST | ⬜ | 20 min | Staff |

### Day 5-6: Matching Algorithm

- [ ] Implement skill-matching from docs/backend.md:383-403
- [ ] FIFO fallback: Sort by joined_at
- [ ] Skill-based: Match within ±0.50 rating spread
- [ ] Expand to ±1.00 on timeout
- [ ] Court assignment: Cheapest available
- [ ] Add preference_tags matching (casual vs competitive)
- [ ] Test matching with various queue scenarios

| Algorithm Step | Status | Est. Time | Notes |
|----------------|--------|-----------|-------|
| Sort queue by confidence | ⬜ | 20 min | rating_dev ASC |
| Find candidates ±0.50 | ⬜ | 30 min | Rating spread |
| Expand to ±1.00 on timeout | ⬜ | 20 min | Max wait exceeded |
| Preference tags matching | ⬜ | 25 min | casual/competitive |
| Court assignment | ⬜ | 20 min | Cheapest available |
| Create game + update queue | ⬜ | 25 min | Status transition |

### Day 6-7: Game Module

- [ ] Create src/games/games.module.ts
- [ ] Create src/games/games.controller.ts
- [ ] Create src/games/games.service.ts
- [ ] Create src/games/entities/game.entity.ts
- [ ] Implement POST /games - Create game (staff or auto-match)
- [ ] Implement PATCH /games/:id/score - Submit score (participants)
- [ ] Implement POST /games/:id/complete - Mark finished (staff)
- [ ] Implement GET /games/:facilityId/active - Current games
- [ ] Implement GET /games/:facilityId/history - Past games

| Endpoint | Method | Status | Est. Time | Auth |
|----------|--------|--------|-----------|------|
| /games | POST | ⬜ | 35 min | Staff |
| /games/:id/score | PATCH | ⬜ | 30 min | Participants |
| /games/:id/complete | POST | ⬜ | 25 min | Staff |
| /games/:facilityId/active | GET | ⬜ | 20 min | JWT |
| /games/:facilityId/history | GET | ⬜ | 25 min | JWT |

### Day 7: Rating Engine

- [ ] Create src/ratings/ratings.module.ts
- [ ] Create src/ratings/ratings.service.ts
- [ ] Implement Glicko-2 algorithm from docs/backend.md:424-438
- [ ] τ=0.5, q=ln(10)/400
- [ ] Clamp rating [1.00, 5.00], deviation [0.10, 2.00]
- [ ] Implement POST /ratings/calculate - Internal calculation
- [ ] Implement GET /ratings/:playerId/history - Rating history
- [ ] Implement POST /players/:id/quick-rating - too_easy/fair/too_tough (stub)

| Rating Task | Status | Est. Time | Notes |
|-------------|--------|-----------|-------|
| Glicko-2 calculation | ⬜ | 45 min | Core algorithm |
| POST /ratings/calculate | ⬜ | 20 min | Internal endpoint |
| GET /ratings/:playerId/history | ⬜ | 15 min | JWT (own) |
| Quick rating stub | ⬜ | 15 min | Phase 2 prep |

### Week 2 Checklist

- [ ] Facility & court modules working
- [ ] Queue module working (manual check-in)
- [ ] QR code structure ready (501 stub)
- [ ] Staff queue management working
- [ ] Matching algorithm implemented
- [ ] Game lifecycle working
- [ ] Rating engine implemented
- [ ] All endpoints tested

**Week 2 Total Est. Time**: 10-12 hours

---

## **WEEK 3: Real-time, Notifications & Settings**

### Day 1-2: WebSocket Gateway

- [ ] Create src/realtime/realtime.module.ts
- [ ] Create src/realtime/realtime.service.ts
- [ ] Configure Supabase Realtime for queue_entries table
- [ ] Implement channels:
  - queue:{facilityId}
  - games:{facilityId}
  - leaderboard:{facilityId}
- [ ] Implement events:
  - queue_updated
  - match_found
  - game_started
  - game_completed
  - leaderboard_updated
- [ ] Test WebSocket connections from client

| Channel | Event | Status | Est. Time | Payload |
|---------|-------|--------|-----------|---------|
| queue:{facilityId} | queue_updated | ⬜ | 30 min | entries[], position |
| queue:{facilityId} | match_found | ⬜ | 25 min | gameId, court, players[] |
| games:{facilityId} | game_started | ⬜ | 20 min | gameId, court, players[] |
| games:{facilityId} | game_completed | ⬜ | 20 min | gameId, score, ratingChanges |
| leaderboard:{facilityId} | leaderboard_updated | ⬜ | 20 min | players[] |

### Day 2-3: Additional WebSocket Events

- [ ] Implement court_available event - Court freed up
- [ ] Implement court_overtime event - Game exceeds expected duration
- [ ] Implement queue_position_changed event - Player moved up/down
- [ ] Add overtime detection logic:
  - Auto: Check games.started_at vs facility_settings.match_interval_sec
  - Manual: Add is_overtime boolean to games table
- [ ] Test all events fire correctly

| Event | Status | Est. Time | Trigger |
|-------|--------|-----------|---------|
| court_available | ⬜ | 20 min | Court freed |
| court_overtime | ⬜ | 30 min | Auto-detect + manual |
| queue_position_changed | ⬜ | 25 min | Position update |
| Overtime detection | ⬜ | 35 min | Time-based logic |

### Day 3-4: Push Notifications

- [ ] Create src/notifications/notifications.module.ts
- [ ] Create src/notifications/notifications.service.ts
- [ ] Create src/notifications/notifications.controller.ts
- [ ] Install OneSignal SDK: npm install onesignal-node
- [ ] Implement POST /notifications/register - Device token
- [ ] Implement GET /notifications/history - User history
- [ ] Implement POST /notifications/test - Staff test
- [ ] Configure notification triggers:
  - match_found → "You're up!" notification
  - queue_position_change → "Moving up!" (if position dropped 3+)
  - game_result → "Game over!" with score

| Endpoint | Method | Status | Est. Time | Auth |
|----------|--------|--------|-----------|------|
| /notifications/register | POST | ⬜ | 25 min | JWT |
| /notifications/history | GET | ⬜ | 20 min | JWT |
| /notifications/test | POST | ⬜ | 15 min | Staff |
| OneSignal integration | - | ⬜ | 40 min | - |

### Day 4-5: Facility Settings

- [ ] Create src/facilities/settings/settings.module.ts
- [ ] Create src/facilities/settings/settings.controller.ts
- [ ] Create src/facilities/settings/settings.service.ts
- [ ] Implement GET /facilities/:id/settings - Get settings
- [ ] Implement PATCH /facilities/:id/settings - Update settings
- [ ] Settings include:
  - check_in_method (qr/manual/nfc)
  - auto_match (boolean)
  - match_interval_sec (default 30)
  - max_wait_min (default 60)
  - no_show_grace_min (default 5)
  - peak_hour_surcharge

| Endpoint | Method | Status | Est. Time | Auth |
|----------|--------|--------|-----------|------|
| /facilities/:id/settings | GET | ⬜ | 20 min | Staff |
| /facilities/:id/settings | PATCH | ⬜ | 25 min | Admin |
| Settings entity | - | ⬜ | 15 min | - |

### Day 5-6: Overtime Tracking

- [ ] Add is_overtime boolean to games table
- [ ] Implement auto-detect logic:
  - Compare game.started_at + match_interval_sec with current time
  - Trigger court_overtime event when exceeded
- [ ] Implement manual flag:
  - Staff can PATCH /games/:id to set is_overtime=true
- [ ] Add overtime to game status display
- [ ] Log overtime in notifications_log

| Overtime Task | Status | Est. Time | Notes |
|---------------|--------|-----------|-------|
| Database migration | ⬜ | 10 min | Add is_overtime column |
| Auto-detect logic | ⬜ | 35 min | Time-based check |
| Manual flag endpoint | ⬜ | 20 min | PATCH /games/:id |
| WebSocket event | ⬜ | 15 min | court_overtime |
| Overtime logging | ⬜ | 15 min | notifications_log |

### Day 6-7: Admin Dashboard Endpoints

- [ ] Implement POST /facilities - Create facility (admin)
- [ ] Implement PATCH /facilities/:id - Update facility (admin)
- [ ] Implement POST /facilities/:id/courts - Add court (admin)
- [ ] Implement PATCH /courts/:id - Update court (admin)
- [ ] Implement DELETE /courts/:id - Deactivate court (admin)
- [ ] Add admin role checks to all admin endpoints
- [ ] Test admin vs staff permissions

| Endpoint | Method | Status | Est. Time | Auth |
|----------|--------|--------|-----------|------|
| /facilities | POST | ⬜ | 25 min | Admin |
| /facilities/:id | PATCH | ⬜ | 20 min | Admin |
| /facilities/:id/courts | POST | ⬜ | 25 min | Admin |
| /courts/:id | PATCH | ⬜ | 15 min | Admin |
| /courts/:id | DELETE | ⬜ | 15 min | Admin |

### Day 7: Final Testing & Documentation

- [ ] Run full integration test:
  - Signup → Quiz → Check-in → Queue → Match → Game → Score → Rating
- [ ] Test WebSocket events end-to-end
- [ ] Test push notifications
- [ ] Test staff/admin permissions
- [ ] Update API documentation
- [ ] Create Postman collection for all endpoints
- [ ] Fix any bugs found during testing

| Testing Task | Status | Est. Time | Notes |
|--------------|--------|-----------|-------|
| Integration test | ⬜ | 60 min | Full flow |
| WebSocket testing | ⬜ | 30 min | All events |
| Push notification test | ⬜ | 20 min | All triggers |
| Permission testing | ⬜ | 25 min | Admin/staff/player |
| API documentation | ⬜ | 30 min | OpenAPI/Swagger |
| Bug fixes | ⬜ | 60 min | As needed |

### Week 3 Checklist

- [ ] WebSocket gateway working
- [ ] All real-time events implemented
- [ ] Push notifications working
- [ ] Facility settings module working
- [ ] Overtime tracking working
- [ ] Admin dashboard endpoints working
- [ ] Full integration test passed
- [ ] Documentation updated

**Week 3 Total Est. Time**: 10-12 hours

---

## **Summary**

| Week | Focus | Est. Time | Key Deliverables |
|------|-------|-----------|------------------|
| Week 1 | Foundation & Auth | 8-10 hours | Supabase, Schema, Auth, Quiz, Players |
| Week 2 | Queue, Matching & Games | 10-12 hours | Queue, QR stub, Matching, Games, Ratings |
| Week 3 | Real-time & Settings | 10-12 hours | WebSocket, Notifications, Settings, Overtime |

**Total**: 28-34 hours for complete backend

---

## **Data Flow for Frontend**

### Priority 1: Queue Status Real-time (Top Priority)

```
Player check-in → queue_entries table → Supabase Realtime → 
WebSocket → Frontend updates queue position → Match found → 
Game created → Players notified
```

### Priority 2: Game Flow

```
Staff creates game → games table → Real-time update → 
Players see match → Play game → Submit score → 
Rating updated → Leaderboard refreshed
```

### Priority 3: Player Dashboard

```
Auth login → Player profile → Stats/rating history → 
Current queue status → Active games → History
```

### Priority 4: Staff Console

```
Staff login → View queue → Manual add/override → 
Create game → Mark complete → View settings
```

---

## **File Structure After Implementation**

```
services/api/src/
├── auth/                          # Step 4-6
│   ├── auth.module.ts
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   ├── auth.guard.ts
│   ├── supabase.service.ts
│   └── quiz/                      # Rating self-assessment
│       ├── quiz.module.ts
│       ├── quiz.service.ts
│       └── quiz.controller.ts
├── players/                       # Step 7
│   ├── players.module.ts
│   ├── players.controller.ts
│   ├── players.service.ts
│   ├── dto/
│   └── entities/
├── facilities/                    # Step 8
│   ├── facilities.module.ts
│   ├── facilities.controller.ts
│   ├── facilities.service.ts
│   ├── settings/                  # Step 19
│   │   ├── settings.module.ts
│   │   ├── settings.controller.ts
│   │   └── settings.service.ts
│   └── entities/
├── courts/                        # Step 8
│   ├── courts.module.ts
│   ├── courts.controller.ts
│   └── courts.service.ts
├── queue/                         # Step 9-11
│   ├── queue.module.ts
│   ├── queue.controller.ts
│   ├── queue.service.ts
│   ├── matching.service.ts        # Step 12
│   ├── qr/                        # Step 10
│   │   ├── qr.module.ts
│   │   ├── qr.service.ts
│   │   └── qr.controller.ts
│   └── dto/
├── games/                         # Step 13
│   ├── games.module.ts
│   ├── games.controller.ts
│   ├── games.service.ts
│   └── entities/
├── ratings/                       # Step 14-15
│   ├── ratings.module.ts
│   ├── ratings.service.ts
│   └── quick-rating.controller.ts
├── notifications/                 # Step 18
│   ├── notifications.module.ts
│   ├── notifications.service.ts
│   └── notifications.controller.ts
├── realtime/                      # Step 16-17
│   ├── realtime.module.ts
│   └── realtime.service.ts
├── common/                        # Shared utilities
│   ├── guards/
│   ├── interceptors/
│   ├── filters/
│   └── pipes/
└── main.ts                        # Bootstrap
```
