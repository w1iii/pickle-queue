import { useState, useEffect, useCallback } from "react";
import type { Facility, QueueEntry, Court } from "@pickle-queue/shared";
import { api, setToken, getToken, initApi } from "@pickle-queue/shared";

initApi(import.meta.env.VITE_API_URL ?? "http://localhost:3000");

type Auth = { user: { id: string }; profile: { display_name: string } };

export default function App() {
  const [auth, setAuth] = useState<Auth | null>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Console state
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [facilityId, setFacilityId] = useState<string | null>(null);
  const [queue, setQueue] = useState<QueueEntry[]>([]);
  const [courts, setCourts] = useState<Court[]>([]);
  const [matching, setMatching] = useState(false);
  const [matchResult, setMatchResult] = useState<string | null>(null);

  // Restore session
  useEffect(() => {
    if (!getToken()) { setLoading(false); return; }
    api.me().then((res) => {
      setAuth({ user: res.user as Auth["user"], profile: res.profile as Auth["profile"] });
    }).catch(() => setToken(null)).finally(() => setLoading(false));
  }, []);

  // Load facilities after auth
  useEffect(() => {
    if (!auth) return;
    api.getMyFacilities().then((f) => {
      setFacilities(f);
      if (f.length > 0 && !facilityId) setFacilityId(f[0].id);
    }).catch(() => {});
  }, [auth]);

  // Load queue + courts when facility changes
  const refreshData = useCallback(() => {
    if (!facilityId) return;
    api.getQueueList(facilityId).then(setQueue).catch(() => setQueue([]));
    api.getCourts(facilityId).then(setCourts).catch(() => setCourts([]));
  }, [facilityId]);

  useEffect(() => { refreshData(); }, [refreshData]);

  // Auto-refresh every 10s
  useEffect(() => {
    if (!facilityId) return;
    const id = setInterval(refreshData, 10000);
    return () => clearInterval(id);
  }, [facilityId, refreshData]);

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    api.login({ email, password }).then((res) => {
      setToken(res.session.access_token);
      return api.me();
    }).then((res) => {
      setAuth({ user: res.user as Auth["user"], profile: res.profile as Auth["profile"] });
    }).catch((err: Error) => setError(err.message));
  }

  function handleLogout() {
    api.logout().catch(() => {});
    setToken(null);
    setAuth(null);
  }

  function handleTriggerMatch() {
    if (!facilityId) return;
    setMatching(true);
    setMatchResult(null);
    api.triggerMatch(facilityId).then((res) => {
      setMatchResult(res.matched ? `Matched ${res.games.length} game(s)` : "No matches possible");
      refreshData();
    }).catch((err: Error) => setMatchResult(err.message))
      .finally(() => setMatching(false));
  }

  // ── Derived stats ──────────────────────────────────────────────────────────
  const queueSize = queue.filter((q) => q.status === "waiting").length;
  const activeGames = queue.filter((q) => q.status === "matched" || q.status === "playing");
  const availableCourts = courts.filter((c) => c.is_active);

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  // ── Login ──────────────────────────────────────────────────────────────────
  if (!auth) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow p-6 w-full max-w-sm">
          <h1 className="text-xl font-bold mb-1">Staff Console</h1>
          <p className="text-gray-500 text-sm mb-6">Sign in with your staff account</p>
          {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded text-sm">{error}</div>}
          <form onSubmit={handleLogin} className="space-y-4">
            <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full border rounded px-3 py-2 text-sm" />
            <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full border rounded px-3 py-2 text-sm" />
            <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 text-sm font-medium">Sign In</button>
          </form>
        </div>
      </div>
    );
  }

  // ── Console ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold">Staff Console</h1>
            <p className="text-xs text-gray-500">{auth.profile.display_name}</p>
          </div>
          <button onClick={handleLogout} className="text-sm text-gray-500 hover:text-red-600">Sign out</button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Facility Selector */}
        {facilities.length > 1 && (
          <div className="bg-white rounded-lg shadow p-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Facility</label>
            <select
              value={facilityId ?? ""}
              onChange={(e) => setFacilityId(e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm"
            >
              {facilities.map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">Queue Size</p>
            <p className="text-2xl font-bold text-green-600">{queueSize}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">Active Games</p>
            <p className="text-2xl font-bold text-blue-600">{activeGames.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">Available Courts</p>
            <p className="text-2xl font-bold text-indigo-600">{availableCourts.length}</p>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleTriggerMatch}
            disabled={!facilityId || matching}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
          >
            {matching ? "Matching..." : "Trigger Match"}
          </button>
          {matchResult && <span className="text-sm text-gray-600">{matchResult}</span>}
        </div>

        {/* Queue Board */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="font-bold mb-3">Live Queue Board</h2>
          {queue.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">No players in queue</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b">
                    <th className="pb-2 pr-4">#</th>
                    <th className="pb-2 pr-4">Player</th>
                    <th className="pb-2 pr-4">Status</th>
                    <th className="pb-2">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {queue.map((entry) => (
                    <tr key={entry.id} className="border-b last:border-0">
                      <td className="py-2 pr-4 font-medium">{entry.position}</td>
                      <td className="py-2 pr-4">
                        <span className="font-mono text-xs text-gray-500">{entry.player_id.slice(0, 8)}</span>
                      </td>
                      <td className="py-2 pr-4">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                          entry.status === "waiting" ? "bg-yellow-100 text-yellow-800" :
                          entry.status === "matched" ? "bg-blue-100 text-blue-800" :
                          entry.status === "playing" ? "bg-green-100 text-green-800" :
                          entry.status === "completed" ? "bg-gray-100 text-gray-600" :
                          "bg-red-100 text-red-800"
                        }`}>
                          {entry.status}
                        </span>
                      </td>
                      <td className="py-2 text-gray-500 text-xs">
                        {new Date(entry.joined_at).toLocaleTimeString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Active Games */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="font-bold mb-3">Active Matches</h2>
          {activeGames.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">No active matches</p>
          ) : (
            <div className="space-y-2">
              {activeGames.map((g) => (
                <div key={g.id} className="flex justify-between items-center text-sm border-b pb-2">
                  <div>
                    <span className="font-medium">Court {g.position}</span>
                    <span className="ml-2 text-gray-500">• {g.status}</span>
                  </div>
                  <span className="font-mono text-xs text-gray-400">{g.player_id.slice(0, 8)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Courts */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="font-bold mb-3">Courts</h2>
          {courts.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">No courts configured</p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {courts.map((court) => (
                <div key={court.id} className="border rounded p-3">
                  <div className="flex justify-between items-start">
                    <span className="font-medium text-sm">{court.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded ${court.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                      {court.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1 capitalize">{court.surface_type}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
