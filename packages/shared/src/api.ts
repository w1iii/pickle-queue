import type {
  Player,
  Facility,
  Court,
  QueueEntry,
  Game,
  RatingChange,
} from "./types";

let API_BASE = "http://localhost:3000";

export function initApi(baseUrl: string) {
  API_BASE = baseUrl;
}

let _token: string | null = null;

try {
  _token = localStorage.getItem("pickle_token");
} catch {}

export function getToken(): string | null {
  return _token;
}

export function setToken(token: string | null) {
  _token = token;
  try {
    if (token) {
      localStorage.setItem("pickle_token", token);
    } else {
      localStorage.removeItem("pickle_token");
    }
  } catch {}
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (_token) {
    headers["Authorization"] = `Bearer ${_token}`;
  }
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  const json: unknown = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const msg = (json as Record<string, string>)?.message ?? JSON.stringify(json);
    throw new Error(msg);
  }
  return (json ?? {}) as T;
}

// ── DTOs ──────────────────────────────────────────────────────────────────────

export type UpdatePlayerDto = {
  display_name?: string;
  email?: string;
  phone?: string;
  avatar_url?: string;
  skill_level?: Player["skill_level"];
};

export type UpdateFacilityDto = {
  name?: string;
  address?: string;
  phone?: string;
  email?: string;
  website_url?: string;
  logo_url?: string;
};

export type CreateCourtDto = {
  name: string;
  facility_id: string;
  surface_type?: string;
};

export type UpdateCourtDto = {
  name?: string;
  surface_type?: string;
};

export type JoinQueueDto = {
  facility_id: string;
  partner_id?: string;
  preference_tags?: string[];
  device_push_token?: string;
};

// ── API ───────────────────────────────────────────────────────────────────────

export const api = {
  // ── Auth ──────────────────────────────────────────────────────────────────

  signup: (data: { email: string; password: string; display_name?: string }) =>
    request<{ user: { id: string }; session: unknown }>(
      "POST",
      "/auth/signup",
      data,
    ),

  login: (data: { email: string; password: string }) =>
    request<{
      user: { id: string };
      session: { access_token: string };
    }>("POST", "/auth/login", data),

  me: () =>
    request<{
      user: { id: string };
      profile: Record<string, unknown>;
      is_onboarding: boolean;
    }>("GET", "/auth/me"),

  logout: () => request<{ success: boolean }>("POST", "/auth/logout"),

  submitQuiz: (data: {
    serveBehindBaseline: boolean;
    knowKitchenRules: boolean;
    sustainDinkRally10Plus: boolean;
    playedOrganizedLeague: boolean;
    comfortableWithSpinServe: boolean;
  }) =>
    request<{ rating: number; yesCount: number }>(
      "POST",
      "/auth/signup/quiz",
      data,
    ),

  // ── Players ───────────────────────────────────────────────────────────────

  getLeaderboard: (facilityId?: string) => {
    const qs = facilityId ? `?facilityId=${facilityId}` : "";
    return request<Player[]>("GET", `/players/leaderboard${qs}`);
  },

  getStats: (id: string) =>
    request<{
      total_games: number;
      wins: number;
      losses: number;
      win_rate: number;
      current_streak: number;
      rating: number;
    }>("GET", `/players/${id}/stats`),

  getRatingHistory: (id: string) =>
    request<RatingChange[]>("GET", `/players/${id}/rating-history`),

  getProfile: (id: string) => request<Player>("GET", `/players/${id}`),

  updateProfile: (id: string, data: UpdatePlayerDto) =>
    request<Player>("PATCH", `/players/${id}`, data),

  // ── Facilities ────────────────────────────────────────────────────────────

  getFacilities: () => request<Facility[]>("GET", "/facilities"),

  getMyFacilities: () => request<Facility[]>("GET", "/facilities/mine"),

  getFacility: (id: string) => request<Facility>("GET", `/facilities/${id}`),

  updateFacility: (id: string, data: UpdateFacilityDto) =>
    request<Facility>("PATCH", `/facilities/${id}`, data),

  deleteFacility: (id: string) =>
    request<{ success: boolean }>("DELETE", `/facilities/${id}`),

  getFacilityCourts: (facilityId: string) =>
    request<Court[]>("GET", `/facilities/${facilityId}/courts`),

  // ── Courts ────────────────────────────────────────────────────────────────

  getCourts: (facilityId: string) =>
    request<Court[]>("GET", `/courts?facilityId=${facilityId}`),

  getCourt: (id: string) => request<Court>("GET", `/courts/${id}`),

  createCourt: (data: CreateCourtDto) =>
    request<Court>("POST", "/courts", data),

  updateCourt: (id: string, data: UpdateCourtDto) =>
    request<Court>("PATCH", `/courts/${id}`, data),

  deleteCourt: (id: string) =>
    request<{ success: boolean }>("DELETE", `/courts/${id}`),

  // ── Queue ─────────────────────────────────────────────────────────────────

  joinQueue: (data: JoinQueueDto) =>
    request<QueueEntry[]>("POST", "/queue/join", data),

  leaveQueue: (facilityId: string) =>
    request<{ success: boolean }>(
      "DELETE",
      `/queue/leave?facility_id=${facilityId}`,
    ),

  getMyQueueStatus: () =>
    request<QueueEntry | null>("GET", "/queue/status"),

  getQueueList: (facilityId: string) =>
    request<QueueEntry[]>("GET", `/queue/${facilityId}`),

  getWaitTime: (facilityId: string) =>
    request<{ estimated_wait_minutes: number }>(
      "GET",
      `/queue/${facilityId}/wait-time`,
    ),

  triggerMatch: (facilityId: string) =>
    request<{ matched: boolean; games: Game[] }>(
      "POST",
      `/queue/match/${facilityId}`,
    ),
};
