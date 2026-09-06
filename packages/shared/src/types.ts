// packages/shared/src/types.ts
//
// Shared domain types, mirroring the Supabase/Postgres schema documented in
// docs/backend.md. Keep this file in sync with that schema — it is the
// single source of truth consumed by player-app, staff-console,
// admin-dashboard, and services/api.

export interface Player {
  id: string;
  display_name: string;
  email: string;
  phone?: string;
  avatar_url?: string;
  rating: number;
  rating_dev: number;
  skill_level: "beginner" | "intermediate" | "advanced" | "pro";
  total_games: number;
  win_streak: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Facility {
  id: string;
  name: string;
  address?: string;
  timezone: string;
  max_courts: number;
  queue_algorithm: "fifo" | "skill_based" | "random";
  peak_hours?: Record<string, { start: string; end: string }[]>;
  is_active: boolean;
  created_at: string;
}

export interface Court {
  id: string;
  facility_id: string;
  name: string;
  surface_type: "indoor" | "outdoor";
  is_active: boolean;
  sort_order: number;
}

export interface QueueEntry {
  id: string;
  facility_id: string;
  player_id: string;
  status:
    | "waiting"
    | "matched"
    | "playing"
    | "completed"
    | "cancelled"
    | "no_show";
  position: number;
  joined_at: string;
  matched_at?: string;
  started_at?: string;
  completed_at?: string;
  game_id?: string;
  squad_id?: string;
  preference_tags: string[];
  device_push_token?: string;
}

export interface Game {
  id: string;
  facility_id: string;
  court_id: string;
  status: "scheduled" | "in_progress" | "completed" | "cancelled";
  player1_id: string;
  player2_id: string;
  player3_id?: string;
  player4_id?: string;
  is_doubles: boolean;
  score_team_a?: number;
  score_team_b?: number;
  started_at?: string;
  ended_at?: string;
  duration_min?: number;
  created_at: string;
}

export interface RatingChange {
  id: string;
  player_id: string;
  game_id: string;
  rating_before: number;
  rating_after: number;
  deviation_before: number;
  deviation_after: number;
  created_at: string;
}

export interface FacilityStaff {
  facility_id: string;
  user_id: string;
  role: "owner" | "manager" | "staff";
  created_at: string;
}
