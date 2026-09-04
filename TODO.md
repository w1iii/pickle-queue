# To-do list — Pickleball Smart Queue

## Phase 0 — Setup & pilot groundwork

- [ ] Lock MVP feature scope (Phase 1 list below) — no scope creep before pilot
- [ ] Pick final tech stack / confirm who's building each part
- [ ] Initialize repo with proposed project structure
- [ ] Set up Supabase project (Postgres + auth + real-time)
- [ ] Set up OneSignal account for push notifications
- [ ] Line up one pilot facility willing to run Phase 1 for 4–6 weeks
- [ ] Draft pilot agreement / expectations with that facility

## Phase 1 — MVP (core loop)

- [ ] Design database schema (players, facilities, courts, queue_entries, games, rating_history)
- [ ] Build player sign-up + rating self-assessment quiz (5 questions)
- [ ] Build check-in flow (QR code scan, in-app button)
- [ ] Build skill-matching queue algorithm (group by rating spread, cap max wait)
- [ ] Build predictive wait-time calculation (rolling avg per court/time/zone)
- [ ] Build real-time queue position updates (WebSocket via Supabase)
- [ ] Build "you're up" push notification
- [ ] Build staff console: live queue board, manual override, check-in management
- [ ] Build lobby display: now playing / next up
- [ ] QA + internal test before pilot goes live
- [ ] Launch pilot at facility #1

## Phase 1.5 — Pilot feedback loop

- [ ] Collect staff feedback (queue accuracy, override frequency, pain points)
- [ ] Collect player feedback (wait time accuracy, match fairness)
- [ ] Fix bugs / adjust matching algorithm based on real data
- [ ] Document what changed and why (for the next pitch deck)

## Phase 2 — Retention & growth layer

- [ ] Build squad queue (queue together as a group)
- [ ] Build open/solo matchmaking with vibe tags (casual/competitive/improve)
- [ ] Build post-game quick rating prompt (too easy / fair / too tough)
- [ ] Wire quick-rating feedback into rating engine adjustment logic
- [ ] Build leaderboard (win streak, games played, most improved, weekly reset)
- [ ] Build court "mood" zone tagging (competitive/social/beginner/drilling)
- [ ] Update lobby display to rotate leaderboard

## Phase 3 — Facility revenue & ops layer

- [ ] Build tournament/round-robin auto-bracket mode
- [ ] Build bracket-limited fast-pass priority system
- [ ] Build off-peak nudge pricing / incentive surfacing
- [ ] Build sponsor offer slot during wait window
- [ ] Build no-show grace window ("ghost slot" protection)
- [ ] Add accessibility/preference tags to matching engine
- [ ] Build dispute log for score conflicts
- [ ] Build admin analytics dashboard (peak hours, avg wait, retention, revenue)

## Phase 4 — Scale

- [ ] Port PWA to React Native for app-store presence
- [ ] Multi-facility support in admin dashboard (cross-location reporting)
- [ ] Move hosting from Render/Fly.io to AWS/GCP if scale requires it
- [ ] Build onboarding flow for new facility clients (self-serve setup)

---

## Ongoing / not phase-locked

- [ ] Keep `/docs/pickleball-queue-app-plan.md` updated as architecture evolves
- [ ] Track pilot metrics for use in future sales pitches
- [ ] Revisit monetization model (SaaS license, fast-pass rev share, setup fee) as pricing data comes in
