import { useState, useEffect } from "react";
import type { Player } from "@pickle-queue/shared";
import { api, setToken, getToken, initApi } from "@pickle-queue/shared";

initApi(import.meta.env.VITE_API_URL ?? "http://localhost:3000");

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

function Dashboard({ auth, onLogout }: { auth: AuthState; onLogout: () => void }) {
  return (
    <div className="min-h-screen bg-green-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-lg font-bold text-green-800">PickleQueue</h1>
          <button
            onClick={onLogout}
            className="text-sm text-gray-500 hover:text-red-600"
          >
            Sign out
          </button>
        </div>
      </header>
      <main className="max-w-lg mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <p className="text-sm text-gray-500">Welcome back</p>
          <p className="text-lg font-bold text-green-800">
            {auth.profile.display_name}
          </p>
          <div className="mt-3 flex items-center gap-4 text-sm text-gray-600">
            <span>
              Rating: <strong className="text-green-700">{auth.profile.rating.toFixed(1)}</strong>
            </span>
            <span>
              Games: <strong>{auth.profile.total_games}</strong>
            </span>
            <span>
              Streak: <strong>{auth.profile.win_streak}</strong>
            </span>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6 text-center text-gray-400 text-sm">
          Queue and game features coming soon
        </div>
      </main>
    </div>
  );
}
