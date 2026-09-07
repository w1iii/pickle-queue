import { useState, useEffect } from "react";
import type { Player, Facility } from "@pickle-queue/shared";
import { api, setToken, getToken, initApi } from "@pickle-queue/shared";

initApi(import.meta.env.VITE_API_URL ?? "http://localhost:3000");

// ── Types ──────────────────────────────────────────────────────────────────

interface FacilityWithCourts extends Facility {
  courtCount: number;
}

// ── Component ──────────────────────────────────────────────────────────────

export default function App() {
  const [auth, setAuth] = useState<{ user: { id: string }; profile: Player } | null>(null);
  const [loading, setLoading] = useState(true);

  // Login form
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Dashboard data
  const [facilities, setFacilities] = useState<FacilityWithCourts[]>([]);
  const [leaderboard, setLeaderboard] = useState<Player[]>([]);
  const [myFacilities, setMyFacilities] = useState<FacilityWithCourts[]>([]);
  const [dataLoading, setDataLoading] = useState(false);

  // ── Auth ──────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!getToken()) {
      setLoading(false);
      return;
    }
    api.me()
      .then((res) => {
        setAuth({ user: res.user as { id: string }, profile: res.profile as unknown as Player });
      })
      .catch(() => setToken(null))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!auth) return;
    setDataLoading(true);

    Promise.all([
      api.getFacilities(),
      api.getLeaderboard(),
      api.getMyFacilities().catch(() => [] as Facility[]),
    ])
      .then(async ([allFacilities, players, mine]) => {
        // Enrich facilities with court counts
        const enriched = await Promise.all(
          allFacilities.map(async (f) => {
            const courts = await api.getFacilityCourts(f.id).catch(() => []);
            return { ...f, courtCount: courts.length };
          }),
        );
        setFacilities(enriched);

        setLeaderboard(players);

        const enrichedMine = await Promise.all(
          mine.map(async (f) => {
            const courts = await api.getFacilityCourts(f.id).catch(() => []);
            return { ...f, courtCount: courts.length };
          }),
        );
        setMyFacilities(enrichedMine);
      })
      .catch(() => {})
      .finally(() => setDataLoading(false));
  }, [auth]);

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    api.login({ email, password })
      .then((res) => {
        setToken(res.session.access_token);
        return api.me();
      })
      .then((res) => {
        setAuth({ user: res.user as { id: string }, profile: res.profile as unknown as Player });
      })
      .catch((err: Error) => setError(err.message));
  }

  function handleLogout() {
    api.logout().catch(() => {});
    setToken(null);
    setAuth(null);
    setFacilities([]);
    setLeaderboard([]);
    setMyFacilities([]);
  }

  // ── Derived stats ─────────────────────────────────────────────────────

  const totalPlayers = leaderboard.length;
  const activeFacilities = facilities.filter((f) => f.is_active).length;
  const totalCourts = facilities.reduce((sum, f) => sum + f.courtCount, 0);

  // ── Loading state ─────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  // ── Login form ────────────────────────────────────────────────────────

  if (!auth) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow p-6 w-full max-w-sm">
          <h1 className="text-xl font-bold mb-1">Admin Dashboard</h1>
          <p className="text-gray-500 text-sm mb-6">Sign in with your admin account</p>
          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded text-sm">{error}</div>
          )}
          <form onSubmit={handleLogin} className="space-y-4">
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
              className="w-full bg-purple-600 text-white py-2 rounded hover:bg-purple-700 text-sm font-medium"
            >
              Sign In
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ── Dashboard ─────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold">Admin Dashboard</h1>
            <p className="text-xs text-gray-500">{auth.profile.display_name}</p>
          </div>
          <button
            onClick={handleLogout}
            className="text-sm text-gray-500 hover:text-red-600"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Stats cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard label="Total Players" value={totalPlayers} color="purple" loading={dataLoading} />
          <StatCard label="Active Facilities" value={activeFacilities} color="green" loading={dataLoading} />
          <StatCard label="Total Courts" value={totalCourts} color="blue" loading={dataLoading} />
        </div>

        {/* Facilities table */}
        <Section title="Facilities" loading={dataLoading} empty={facilities.length === 0} emptyText="No facilities found">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-500">
                  <th className="pb-2 font-medium">Name</th>
                  <th className="pb-2 font-medium">Address</th>
                  <th className="pb-2 font-medium">Courts</th>
                  <th className="pb-2 font-medium">Algorithm</th>
                  <th className="pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {facilities.map((f) => (
                  <tr key={f.id} className="border-b last:border-0">
                    <td className="py-2 font-medium">{f.name}</td>
                    <td className="py-2 text-gray-500">{f.address || "—"}</td>
                    <td className="py-2">{f.courtCount}</td>
                    <td className="py-2 capitalize">{f.queue_algorithm.replace("_", " ")}</td>
                    <td className="py-2">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${f.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                        {f.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        {/* Leaderboard */}
        <Section title="Leaderboard" loading={dataLoading} empty={leaderboard.length === 0} emptyText="No players yet">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-500">
                  <th className="pb-2 font-medium">Rank</th>
                  <th className="pb-2 font-medium">Name</th>
                  <th className="pb-2 font-medium">Rating</th>
                  <th className="pb-2 font-medium">Skill</th>
                  <th className="pb-2 font-medium">Games</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((p, i) => (
                  <tr key={p.id} className="border-b last:border-0">
                    <td className="py-2 font-medium text-purple-600">#{i + 1}</td>
                    <td className="py-2">{p.display_name}</td>
                    <td className="py-2">{Math.round(p.rating)}</td>
                    <td className="py-2 capitalize">{p.skill_level}</td>
                    <td className="py-2">{p.total_games}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        {/* My Facilities */}
        {myFacilities.length > 0 && (
          <Section title="My Facilities" loading={dataLoading} empty={false} emptyText="">
            <div className="space-y-3">
              {myFacilities.map((f) => (
                <FacilityCard key={f.id} facility={f} />
              ))}
            </div>
          </Section>
        )}
      </main>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────

function StatCard({ label, value, color, loading }: {
  label: string;
  value: number;
  color: "purple" | "green" | "blue";
  loading: boolean;
}) {
  const colorMap = {
    purple: "text-purple-600",
    green: "text-green-600",
    blue: "text-blue-600",
  };

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`text-2xl font-bold ${colorMap[color]}`}>
        {loading ? "—" : value}
      </p>
    </div>
  );
}

function Section({ title, loading, empty, emptyText, children }: {
  title: string;
  loading: boolean;
  empty: boolean;
  emptyText: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="font-bold mb-3">{title}</h2>
      {loading ? (
        <p className="text-gray-400 text-sm text-center py-8">Loading...</p>
      ) : empty ? (
        <p className="text-gray-400 text-sm text-center py-8">{emptyText}</p>
      ) : (
        children
      )}
    </div>
  );
}

function FacilityCard({ facility }: { facility: FacilityWithCourts }) {
  return (
    <div className="border rounded-lg p-4">
      <div className="flex items-start justify-between mb-2">
        <div>
          <h3 className="font-medium">{facility.name}</h3>
          <p className="text-sm text-gray-500">{facility.address || "No address"}</p>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded font-medium ${facility.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
          {facility.is_active ? "Active" : "Inactive"}
        </span>
      </div>
      <div className="flex gap-4 text-sm text-gray-600">
        <span>{facility.courtCount} courts</span>
        <span className="capitalize">{facility.queue_algorithm.replace("_", " ")} queue</span>
      </div>
    </div>
  );
}
