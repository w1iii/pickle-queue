import { useState, useEffect } from "react";
import type { Game, Player } from "@pickle-queue/shared";
import { api, setToken, getToken, initApi } from "@pickle-queue/shared";

initApi(import.meta.env.VITE_API_URL ?? "http://localhost:3000");

export default function App() {
  const [auth, setAuth] = useState<{ user: { id: string }; profile: Player } | null>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [activeGames] = useState<Game[]>([]);

  useEffect(() => {
    if (!getToken()) {
      setLoading(false);
      return;
    }
    api.me().then((res) => {
      setAuth({ user: res.user as { id: string }, profile: res.profile as unknown as Player });
    }).catch(() => setToken(null)).finally(() => setLoading(false));
  }, []);

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    api.login({ email, password }).then((res) => {
      setToken(res.session.access_token);
      return api.me();
    }).then((res) => {
      setAuth({ user: res.user as { id: string }, profile: res.profile as unknown as Player });
    }).catch((err: Error) => setError(err.message));
  }

  function handleLogout() {
    api.logout().catch(() => {});
    setToken(null);
    setAuth(null);
  }

  if (loading) {
    return <div className="min-h-screen bg-gray-100 flex items-center justify-center"><p className="text-gray-500">Loading...</p></div>;
  }

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

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold">Staff Console</h1>
            <p className="text-xs text-gray-500">{auth.profile.display_name}</p>
          </div>
          <button onClick={handleLogout} className="text-sm text-gray-500 hover:text-red-600">Sign out</button>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-6">
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">Active Games</p>
            <p className="text-2xl font-bold text-blue-600">{activeGames.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">Queue Size</p>
            <p className="text-2xl font-bold text-green-600">--</p>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="font-bold mb-3">Live Queue Board</h2>
          <p className="text-gray-400 text-sm text-center py-8">Queue board coming soon</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6 mt-4">
          <h2 className="font-bold mb-3">Active Matches</h2>
          {activeGames.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">No active matches</p>
          ) : (
            <div className="space-y-2">
              {activeGames.map((g) => (
                <div key={g.id} className="flex justify-between items-center text-sm border-b pb-2">
                  <span>Court {g.court_id}</span>
                  <span className="text-gray-500">{g.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
