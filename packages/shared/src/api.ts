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
  const json: unknown = await res.json();
  if (!res.ok) {
    const msg = (json as Record<string, string>).message ?? JSON.stringify(json);
    throw new Error(msg);
  }
  return json as T;
}

export const api = {
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
    request<{ user: { id: string }; profile: Record<string, unknown> }>(
      "GET",
      "/auth/me",
    ),

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
};
