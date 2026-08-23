import React, { useEffect, useState } from "react";
import App from "../karuruma-health-post.jsx";
import { supabase } from "./supabase";

const input = "w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white";

export default function AuthGate() {
  const [session, setSession] = useState(null);
  const [checking, setChecking] = useState(true);
  const [mode, setMode] = useState("login");
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasUsers, setHasUsers] = useState(true);

  async function refresh() {
    const { data } = await supabase.auth.getSession();
    setSession(data.session || null);
    const { count } = await supabase.from("users").select("id", { count: "exact", head: true });
    setHasUsers((count || 0) > 0);
    setChecking(false);
  }

  useEffect(() => {
    refresh();
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession || null);
      if (nextSession) setChecking(false);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  async function login(e) {
    e?.preventDefault();
    setLoading(true); setError(""); setMessage("");
    try {
      const { data: emailData, error: lookupError } = await supabase.rpc("khp_get_login_email", { p_username: username });
      if (lookupError || !emailData) throw new Error("Incorrect username or password.");
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: emailData, password });
      if (signInError) throw signInError;
    } catch (e) {
      setError(e?.message || "Unable to sign in.");
    } finally { setLoading(false); }
  }

  async function bootstrap(e) {
    e?.preventDefault();
    setLoading(true); setError(""); setMessage("");
    try {
      const { count } = await supabase.from("users").select("id", { count: "exact", head: true });
      if ((count || 0) > 0) throw new Error("Administrator setup has already been completed.");
      if (!username.trim() || !name.trim() || !email.trim() || password.length < 8) {
        throw new Error("Enter a name, username, valid email, and a password of at least 8 characters.");
      }
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(), password,
        options: { data: { username: username.trim(), name: name.trim() } }
      });
      if (signUpError) throw signUpError;
      if (!data.session) {
        setMessage("Administrator account created. Check the email inbox and confirm the email before signing in.");
        setMode("login");
      } else {
        setMessage("Administrator account created successfully.");
      }
      setHasUsers(true);
    } catch (e) {
      setError(e?.message || "Unable to create administrator.");
    } finally { setLoading(false); }
  }

  if (checking) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-teal-700">Loading Karuruma Health Post…</div>;
  }

  if (session) return <App />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-800 via-teal-700 to-emerald-700 flex items-center justify-center p-4" style={{ fontFamily: "system-ui, sans-serif" }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-white/15 flex items-center justify-center mx-auto mb-3 border border-white/20 text-white text-3xl">✚</div>
          <h1 className="text-white text-2xl font-extrabold">Karuruma Health Post</h1>
          <p className="text-teal-100 text-sm mt-1">Health Post Management System</p>
        </div>
        <div className="bg-white rounded-2xl shadow-xl p-7">
          <div className="flex gap-2 mb-5">
            <button onClick={() => { setMode("login"); setError(""); }} className={`flex-1 py-2 rounded-xl text-sm font-bold ${mode === "login" ? "bg-teal-700 text-white" : "bg-slate-100 text-slate-500"}`}>Sign in</button>
            {!hasUsers && <button onClick={() => { setMode("bootstrap"); setError(""); }} className={`flex-1 py-2 rounded-xl text-sm font-bold ${mode === "bootstrap" ? "bg-teal-700 text-white" : "bg-slate-100 text-slate-500"}`}>First Admin</button>}
          </div>
          {error && <div className="mb-4 bg-rose-50 text-rose-700 px-3 py-2.5 rounded-xl text-sm">{error}</div>}
          {message && <div className="mb-4 bg-emerald-50 text-emerald-700 px-3 py-2.5 rounded-xl text-sm">{message}</div>}
          {mode === "login" ? (
            <form onSubmit={login}>
              <label className="block text-sm font-medium text-slate-600 mb-4">Username<input className={input + " mt-1.5"} value={username} onChange={e => setUsername(e.target.value)} autoFocus required /></label>
              <label className="block text-sm font-medium text-slate-600 mb-5">Password<input type="password" className={input + " mt-1.5"} value={password} onChange={e => setPassword(e.target.value)} required /></label>
              <button disabled={loading} className="w-full py-2.5 rounded-xl bg-teal-700 text-white font-bold disabled:opacity-50">{loading ? "Signing in…" : "Sign In"}</button>
            </form>
          ) : (
            <form onSubmit={bootstrap}>
              <p className="text-xs text-slate-500 mb-4">This option is available only while the Health Post has no users. The first account becomes the administrator.</p>
              <label className="block text-sm font-medium text-slate-600 mb-4">Full name<input className={input + " mt-1.5"} value={name} onChange={e => setName(e.target.value)} required /></label>
              <label className="block text-sm font-medium text-slate-600 mb-4">Username<input className={input + " mt-1.5"} value={username} onChange={e => setUsername(e.target.value)} required /></label>
              <label className="block text-sm font-medium text-slate-600 mb-4">Email<input type="email" className={input + " mt-1.5"} value={email} onChange={e => setEmail(e.target.value)} required /></label>
              <label className="block text-sm font-medium text-slate-600 mb-5">Password<input type="password" minLength={8} className={input + " mt-1.5"} value={password} onChange={e => setPassword(e.target.value)} required /></label>
              <button disabled={loading} className="w-full py-2.5 rounded-xl bg-teal-700 text-white font-bold disabled:opacity-50">{loading ? "Creating…" : "Create Administrator"}</button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
