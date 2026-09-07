import { useState, useEffect, useCallback } from "react";
import type { Player, Facility, QueueEntry, RatingChange } from "@pickle-queue/shared";
import { api, setToken, getToken, initApi } from "@pickle-queue/shared";

initApi(import.meta.env.VITE_API_URL ?? "http://localhost:3000");

const FACILITY_ID = import.meta.env.VITE_FACILITY_ID as string;

type View = "login" | "signup" | "quiz" | "dashboard";

interface AuthState {
  user: { id: string };
  profile: Player;
}

export default function App() {
  const [view, setView] = useState<View>("login");
  const [auth, setAuth] = useState<AuthState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!getToken()) {
      setLoading(false);
      return;
    }
    api
      .me()
      .then((res) => {
        setAuth({ user: res.user as AuthState["user"], profile: res.profile as unknown as Player });
        setView(res.is_onboarding ? "quiz" : "dashboard");
      })
      .catch(() => setToken(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-green-50 flex items-center justify-center">
        <p className="text-green-700">Loading...</p>
      </div>
    );
  }

  if (auth && view === "dashboard") {
    return <Dashboard auth={auth} onLogout={handleLogout} />;
  }

  if (view === "quiz") {
    return <Quiz onComplete={handleQuizComplete} />;
  }

  return (
    <div className="min-h-screen bg-green-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded text-sm">
            {error}
          </div>
        )}
        {view === "signup" ? (
          <SignupForm onSubmit={handleSignup} onSwitch={() => { setView("login"); setError(null); }} />
        ) : (
          <LoginForm onSubmit={handleLogin} onSwitch={() => { setView("signup"); setError(null); }} />
        )}
      </div>
    </div>
  );

  function handleSignup(data: { email: string; password: string; display_name?: string }) {
    setError(null);
    api.signup(data).then((res) => {
      setToken(res.session ? (res.session as unknown as { access_token: string }).access_token : null);
      return api.me();
    }).then((res) => {
      setAuth({ user: res.user as AuthState["user"], profile: res.profile as unknown as Player });
      setView(res.is_onboarding ? "quiz" : "dashboard");
    }).catch((e: Error) => {
      if (e.message.includes("already exists")) {
        setError("Account already exists. Please log in.");
      } else {
        setError(e.message);
      }
    });
  }

  function handleLogin(data: { email: string; password: string }) {
    setError(null);
    api.login(data).then((res) => {
      setToken(res.session.access_token);
      return api.me();
    }).then((res) => {
      setAuth({ user: res.user as AuthState["user"], profile: res.profile as unknown as Player });
      setView(res.is_onboarding ? "quiz" : "dashboard");
    }).catch((e: Error) => setError(e.message));
  }

  function handleLogout() {
    api.logout().catch(() => {});
    setToken(null);
    setAuth(null);
    setView("login");
  }

  function handleQuizComplete(_rating: number) {
    return api.me().then((res) => {
      setAuth({ user: res.user as AuthState["user"], profile: res.profile as unknown as Player });
      setView(res.is_onboarding ? "quiz" : "dashboard");
    });
  }
}

// ── LoginForm ──────────────────────────────────────────────────────────────────

function LoginForm({
  onSubmit,
  onSwitch,
}: {
  onSubmit: (data: { email: string; password: string }) => void;
  onSwitch: () => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h1 className="text-2xl font-bold text-green-800 mb-1">PickleQueue</h1>
      <p className="text-gray-500 text-sm mb-6">Sign in to join the queue</p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit({ email, password });
        }}
        className="space-y-4"
      >
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full border rounded px-3 py-2 text-sm"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full border rounded px-3 py-2 text-sm"
        />
        <button
          type="submit"
          className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 text-sm font-medium"
        >
          Sign In
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-gray-500">
        No account?{" "}
        <button onClick={onSwitch} className="text-green-600 hover:underline">
          Sign up
        </button>
      </p>
    </div>
  );
}

// ── SignupForm ─────────────────────────────────────────────────────────────────

function SignupForm({
  onSubmit,
  onSwitch,
}: {
  onSubmit: (data: { email: string; password: string; display_name?: string }) => void;
  onSwitch: () => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h1 className="text-2xl font-bold text-green-800 mb-1">PickleQueue</h1>
      <p className="text-gray-500 text-sm mb-6">Create your player account</p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit({ email, password, display_name: displayName || undefined });
        }}
        className="space-y-4"
      >
        <input
          type="text"
          placeholder="Display name (optional)"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          className="w-full border rounded px-3 py-2 text-sm"
        />
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full border rounded px-3 py-2 text-sm"
        />
        <input
          type="password"
          placeholder="Password (min 6 chars)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          className="w-full border rounded px-3 py-2 text-sm"
        />
        <button
          type="submit"
          className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 text-sm font-medium"
        >
          Create Account
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-gray-500">
        Have an account?{" "}
        <button onClick={onSwitch} className="text-green-600 hover:underline">
          Sign in
        </button>
      </p>
    </div>
  );
}

// ── Quiz ───────────────────────────────────────────────────────────────────────

function Quiz({ onComplete }: { onComplete: (rating: number) => Promise<void> }) {
  const [answers, setAnswers] = useState({
    serveBehindBaseline: false,
    knowKitchenRules: false,
    sustainDinkRally10Plus: false,
    playedOrganizedLeague: false,
    comfortableWithSpinServe: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const questions: { key: keyof typeof answers; label: string }[] = [
    { key: "serveBehindBaseline", label: "Can you serve from behind the baseline?" },
    { key: "knowKitchenRules", label: "Do you know the non-volley zone (kitchen) rules?" },
    { key: "sustainDinkRally10Plus", label: "Can you sustain a dink rally of 10+ shots?" },
    { key: "playedOrganizedLeague", label: "Have you played in an organized league or tournament?" },
    { key: "comfortableWithSpinServe", label: "Are you comfortable with spin serves?" },
  ];

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    api
      .submitQuiz(answers)
      .then((res) => onComplete(res.rating))
      .catch((err: Error) => setError(err.message))
      .finally(() => setSubmitting(false));
  }

  return (
    <div className="min-h-screen bg-green-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow p-6 w-full max-w-md">
        <h1 className="text-2xl font-bold text-green-800 mb-1">Skill Assessment</h1>
        <p className="text-gray-500 text-sm mb-6">Answer honestly to get your initial rating</p>
        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded text-sm">{error}</div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          {questions.map((q) => (
            <label key={q.key} className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={answers[q.key]}
                onChange={(e) => setAnswers({ ...answers, [q.key]: e.target.checked })}
                className="mt-0.5 rounded border-gray-300"
              />
              <span className="text-sm text-gray-700">{q.label}</span>
            </label>
          ))}
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 text-sm font-medium disabled:opacity-50"
          >
            {submitting ? "Submitting..." : "Get My Rating"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Dashboard ──────────────────────────────────────────────────────────────────

function Dashboard({ auth, onLogout }: { auth: AuthState; onLogout: () => void }) {
  const [facility, setFacility] = useState<Facility | null>(null);
  const [queueStatus, setQueueStatus] = useState<QueueEntry | null>(null);
  const [leaderboard, setLeaderboard] = useState<Player[]>([]);
  const [ratingHistory, setRatingHistory] = useState<RatingChange[]>([]);
  const [waitTime, setWaitTime] = useState<number>(0);
  const [joining, setJoining] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [dashError, setDashError] = useState<string | null>(null);

  const fetchData = useCallback(() => {
    setDashError(null);
    Promise.allSettled([
      api.getFacility(FACILITY_ID),
      api.getMyQueueStatus(),
      api.getLeaderboard(FACILITY_ID),
      api.getRatingHistory(auth.user.id),
      api.getWaitTime(FACILITY_ID),
    ]).then(([facRes, qRes, lbRes, rhRes, wtRes]) => {
      if (facRes.status === "fulfilled") setFacility(facRes.value);
      if (qRes.status === "fulfilled") setQueueStatus(qRes.value ?? null);
      if (lbRes.status === "fulfilled") setLeaderboard(lbRes.value);
      if (rhRes.status === "fulfilled") setRatingHistory(rhRes.value);
      if (wtRes.status === "fulfilled") setWaitTime(wtRes.value.estimated_wait_minutes);
    }).catch(() => setDashError("Failed to load dashboard data"));
  }, [auth.user.id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Refresh wait time periodically
  useEffect(() => {
    if (!queueStatus) return;
    const interval = setInterval(() => {
      api.getWaitTime(FACILITY_ID)
        .then((res) => setWaitTime(res.estimated_wait_minutes))
        .catch(() => {});
    }, 30000);
    return () => clearInterval(interval);
  }, [queueStatus]);

  function handleJoinQueue() {
    setJoining(true);
    setDashError(null);
    api.joinQueue({ facility_id: FACILITY_ID })
      .then((entries) => {
        const entry = Array.isArray(entries) ? entries[0] : entries;
        setQueueStatus(entry ?? null);
      })
      .catch((e: Error) => setDashError(e.message))
      .finally(() => setJoining(false));
  }

  function handleLeaveQueue() {
    setLeaving(true);
    setDashError(null);
    api.leaveQueue(FACILITY_ID)
      .then(() => setQueueStatus(null))
      .catch((e: Error) => setDashError(e.message))
      .finally(() => setLeaving(false));
  }

  const skillBadge: Record<Player["skill_level"], string> = {
    beginner: "bg-gray-100 text-gray-600",
    intermediate: "bg-green-100 text-green-700",
    advanced: "bg-blue-100 text-blue-700",
    pro: "bg-purple-100 text-purple-700",
  };

  return (
    <div className="min-h-screen bg-green-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-green-800">
              {facility?.name ?? "PickleQueue"}
            </h1>
            <p className="text-xs text-gray-400">{auth.profile.display_name}</p>
          </div>
          <button
            onClick={onLogout}
            className="text-sm text-gray-500 hover:text-red-600"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {dashError && (
          <div className="p-3 bg-red-100 text-red-700 rounded text-sm">{dashError}</div>
        )}

        {/* Stats Card */}
        <section className="bg-white rounded-lg shadow p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-gray-500">Player Stats</p>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${skillBadge[auth.profile.skill_level]}`}>
              {auth.profile.skill_level}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-green-700">{auth.profile.rating.toFixed(1)}</p>
              <p className="text-xs text-gray-400">Rating</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-700">{auth.profile.total_games}</p>
              <p className="text-xs text-gray-400">Games</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-700">{auth.profile.win_streak}</p>
              <p className="text-xs text-gray-400">Streak</p>
            </div>
          </div>
        </section>

        {/* Queue Section */}
        <section className="bg-white rounded-lg shadow p-5">
          <p className="text-sm text-gray-500 mb-3">Queue</p>
          {queueStatus ? (
            <div className="space-y-3">
              <div className="space-y-1 text-sm">
                <p>
                  <span className="text-gray-500">Position: </span>
                  <span className="font-medium text-green-700">#{queueStatus.position}</span>
                </p>
                <p>
                  <span className="text-gray-500">Status: </span>
                  <span className={`font-medium ${queueStatus.status === "waiting" ? "text-yellow-600" : "text-green-600"}`}>
                    {queueStatus.status}
                  </span>
                </p>
                {waitTime > 0 && (
                  <p>
                    <span className="text-gray-500">Est. wait: </span>
                    <span className="font-medium">~{waitTime} min</span>
                  </p>
                )}
              </div>
              <button
                onClick={handleLeaveQueue}
                disabled={leaving}
                className="w-full bg-red-500 text-white py-2 rounded hover:bg-red-600 text-sm font-medium disabled:opacity-50"
              >
                {leaving ? "Leaving..." : "Leave Queue"}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {facility && (
                <div className="text-sm text-gray-600">
                  <p className="font-medium">{facility.name}</p>
                  {facility.address && <p className="text-xs text-gray-400">{facility.address}</p>}
                  <p className="text-xs text-gray-400">{facility.max_courts} courts</p>
                  {waitTime > 0 && (
                    <p className="text-xs text-yellow-600 mt-1">~{waitTime} min current wait</p>
                  )}
                </div>
              )}
              <button
                onClick={handleJoinQueue}
                disabled={joining}
                className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 text-sm font-medium disabled:opacity-50"
              >
                {joining ? "Joining..." : "Join Queue"}
              </button>
            </div>
          )}
        </section>

        {/* Leaderboard */}
        <section className="bg-white rounded-lg shadow p-5">
          <p className="text-sm text-gray-500 mb-3">Leaderboard</p>
          {leaderboard.length === 0 ? (
            <p className="text-sm text-gray-400">No players yet</p>
          ) : (
            <div className="space-y-2">
              {leaderboard.slice(0, 10).map((p, i) => (
                <div
                  key={p.id}
                  className={`flex items-center gap-3 text-sm py-1 ${p.id === auth.user.id ? "bg-green-50 -mx-2 px-2 rounded" : ""}`}
                >
                  <span className="w-6 text-center font-bold text-gray-400">{i + 1}</span>
                  <span className="flex-1 truncate">{p.display_name}</span>
                  <span className="font-medium text-green-700">{p.rating.toFixed(1)}</span>
                  <span className="text-gray-400 text-xs">{p.total_games}g</span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Rating History */}
        <section className="bg-white rounded-lg shadow p-5">
          <p className="text-sm text-gray-500 mb-3">Rating History</p>
          {ratingHistory.length === 0 ? (
            <p className="text-sm text-gray-400">No rating changes yet</p>
          ) : (
            <div className="space-y-2">
              {ratingHistory.map((rh) => {
                const change = rh.rating_after - rh.rating_before;
                return (
                  <div key={rh.id} className="flex items-center gap-3 text-sm">
                    <span className="text-xs text-gray-400 w-20 shrink-0">
                      {new Date(rh.created_at).toLocaleDateString()}
                    </span>
                    <span className="text-gray-600">{rh.rating_before.toFixed(1)} → {rh.rating_after.toFixed(1)}</span>
                    <span className={`font-medium ${change > 0 ? "text-green-600" : change < 0 ? "text-red-600" : "text-gray-500"}`}>
                      {change > 0 ? "+" : ""}{change.toFixed(1)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
