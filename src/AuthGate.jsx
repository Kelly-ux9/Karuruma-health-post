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
    const { data: available, error: availabilityError } = await supabase.rpc("khp_bootstrap_available");
    setHasUsers(availabilityError ? true : !available);
    setChecking(false);
  }

  useEffect(() => {
    refresh();
    const { data } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession || null);
      if (event === "PASSWORD_RECOVERY") {
        setMode("reset");
        setPassword("");
        setError("");
        setMessage("");
        setChecking(false);
      } else if (nextSession) setChecking(false);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  async function login(e) {
    e?.preventDefault(); setLoading(true); setError(""); setMessage("");
    try {
      const { data: emailData, error: lookupError } = await supabase.rpc("khp_get_login_email", { p_username: username });
      if (lookupError || !emailData) throw new Error("Incorrect username or password.");
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: emailData, password });
      if (signInError) throw signInError;
    } catch (e) { setError(e?.message || "Unable to sign in."); }
    finally { setLoading(false); }
  }

  async function forgotPassword(e) {
    e?.preventDefault(); setLoading(true); setError(""); setMessage("");
    try {
      if (!email.trim()) throw new Error("Enter the email address connected to your account.");
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: window.location.origin });
      if (resetError) throw resetError;
      setMessage("Password reset email sent. Check your inbox and open the reset link.");
    } catch (e) { setError(e?.message || "Unable to send password reset email."); }
    finally { setLoading(false); }
  }

  async function updatePassword(e) {
    e?.preventDefault(); setLoading(true); setError(""); setMessage("");
    try {
      if (password.length < 8) throw new Error("Your new password must be at least 8 characters.");
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      await supabase.auth.signOut(); setSession(null); setPassword(""); setMode("login");
      setMessage("Password updated successfully. You can now sign in with your new password.");
    } catch (e) { setError(e?.message || "Unable to update password."); }
    finally { setLoading(false); }
  }

  async function bootstrap(e) {
    e?.preventDefault(); setLoading(true); setError(""); setMessage("");
    try {
      const { data: available, error: availabilityError } = await supabase.rpc("khp_bootstrap_available");
      if (availabilityError || !available) throw new Error("Administrator setup has already been completed.");
      if (!username.trim() || !name.trim() || !email.trim() || password.length < 8) throw new Error("Enter a name, username, valid email, and a password of at least 8 characters.");
      const { data, error: signUpError } = await supabase.auth.signUp({ email: email.trim(), password, options: { data: { username: username.trim(), name: name.trim() } } });
      if (signUpError) throw signUpError;
      if (!data.session) { setMessage("Administrator account created. Check the email inbox and confirm the email before signing in."); setMode("login"); }
      else setMessage("Administrator account created successfully.");
      setHasUsers(true);
    } catch (e) { setError(e?.message || "Unable to create administrator."); }
    finally { setLoading(false); }
  }

  if (checking) return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-teal-700">Loading Karuruma Health Post…</div>;
  if (session && mode !== "reset") return <App />;

  return <div className="min-h-screen bg-gradient-to-br from-teal-800 via-teal-700 to-emerald-700 flex items-center justify-center p-4" style={{ fontFamily: "system-ui, sans-serif" }}>
    <div className="w-full max-w-md">
      <div className="text-center mb-6"><div className="w-16 h-16 rounded-2xl bg-white/15 flex items-center justify-center mx-auto mb-3 border border-white/20 text-white text-3xl">✚</div><h1 className="text-white text-2xl font-extrabold">Karuruma Health Post</h1><p className="text-teal-100 text-sm mt-1">Health Post Management System</p></div>
      <div className="bg-white rounded-2xl shadow-xl p-7">
        {mode !== "reset" && <div className="flex gap-2 mb-5"><button onClick={() => { setMode("login"); setError(""); setMessage(""); }} className={`flex-1 py-2 rounded-xl text-sm font-bold ${mode === "login" ? "bg-teal-700 text-white" : "bg-slate-100 text-slate-500"}`}>Sign in</button>{!hasUsers && <button onClick={() => { setMode("bootstrap"); setError(""); setMessage(""); }} className={`flex-1 py-2 rounded-xl text-sm font-bold ${mode === "bootstrap" ? "bg-teal-700 text-white" : "bg-slate-100 text-slate-500"}`}>First Admin</button>}</div>}
        {error && <div className="mb-4 bg-rose-50 text-rose-700 px-3 py-2.5 rounded-xl text-sm">{error}</div>}{message && <div className="mb-4 bg-emerald-50 text-emerald-700 px-3 py-2.5 rounded-xl text-sm">{message}</div>}
        {mode === "login" && <form onSubmit={login}><label className="block text-sm font-medium text-slate-600 mb-4">Username<input className={input + " mt-1.5"} value={username} onChange={e => setUsername(e.target.value)} autoFocus required /></label><label className="block text-sm font-medium text-slate-600 mb-2">Password<input type="password" className={input + " mt-1.5"} value={password} onChange={e => setPassword(e.target.value)} required /></label><div className="text-right mb-5"><button type="button" onClick={() => { setMode("forgot"); setError(""); setMessage(""); setEmail(""); }} className="text-sm font-semibold text-teal-700 hover:text-teal-900">Forgot password?</button></div><button disabled={loading} className="w-full py-2.5 rounded-xl bg-teal-700 text-white font-bold disabled:opacity-50">{loading ? "Signing in…" : "Sign In"}</button></form>}
        {mode === "forgot" && <form onSubmit={forgotPassword}><h2 className="text-lg font-bold text-slate-800 mb-1">Reset your password</h2><p className="text-sm text-slate-500 mb-5">Enter the email address linked to your account. We will send you a secure reset link.</p><label className="block text-sm font-medium text-slate-600 mb-5">Email<input type="email" className={input + " mt-1.5"} value={email} onChange={e => setEmail(e.target.value)} autoFocus required /></label><button disabled={loading} className="w-full py-2.5 rounded-xl bg-teal-700 text-white font-bold disabled:opacity-50">{loading ? "Sending…" : "Send Reset Link"}</button><button type="button" onClick={() => { setMode("login"); setError(""); setMessage(""); }} className="w-full mt-3 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-semibold">Back to Sign In</button></form>}
        {mode === "reset" && <form onSubmit={updatePassword}><h2 className="text-lg font-bold text-slate-800 mb-1">Create a new password</h2><p className="text-sm text-slate-500 mb-5">Choose a new password for your Karuruma Health Post account.</p><label className="block text-sm font-medium text-slate-600 mb-5">New password<input type="password" minLength={8} className={input + " mt-1.5"} value={password} onChange={e => setPassword(e.target.value)} autoFocus required /></label><button disabled={loading} className="w-full py-2.5 rounded-xl bg-teal-700 text-white font-bold disabled:opacity-50">{loading ? "Updating…" : "Update Password"}</button></form>}
        {mode === "bootstrap" && <form onSubmit={bootstrap}><p className="text-xs text-slate-500 mb-4">This option is available only while the Health Post has no users. The first account becomes the administrator.</p><label className="block text-sm font-medium text-slate-600 mb-4">Full name<input className={input + " mt-1.5"} value={name} onChange={e => setName(e.target.value)} required /></label><label className="block text-sm font-medium text-slate-600 mb-4">Username<input className={input + " mt-1.5"} value={username} onChange={e => setUsername(e.target.value)} required /></label><label className="block text-sm font-medium text-slate-600 mb-4">Email<input type="email" className={input + " mt-1.5"} value={email} onChange={e => setEmail(e.target.value)} required /></label><label className="block text-sm font-medium text-slate-600 mb-5">Password<input type="password" minLength={8} className={input + " mt-1.5"} value={password} onChange={e => setPassword(e.target.value)} required /></label><button disabled={loading} className="w-full py-2.5 rounded-xl bg-teal-700 text-white font-bold disabled:opacity-50">{loading ? "Creating…" : "Create Administrator"}</button></form>}
      </div>
    </div>
  </div>;
}
