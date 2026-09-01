import React, { useEffect, useState } from "react";
import App from "../karuruma-health-post.jsx";
import LocationBridge from "./LocationBridge";
import { supabase } from "./supabase";

// Authentication gate: admin registration is controlled by the Supabase users profile.
const input = "w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white";

export default function AuthGate() {
  const [session, setSession] = useState(null);
  const [checking, setChecking] = useState(true);
  const [mode, setMode] = useState("login");
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("staff");
  const [isAdmin, setIsAdmin] = useState(false);
  const [showUserForm, setShowUserForm] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function loadProfile(nextSession) {
    if (!nextSession?.user?.id) { setIsAdmin(false); return; }
    const { data } = await supabase.from("users").select("role,active").eq("auth_user_id", nextSession.user.id).maybeSingle();
    setIsAdmin(data?.active === true && data?.role === "admin");
  }

  async function refresh() {
    const { data } = await supabase.auth.getSession();
    const next = data.session || null;
    setSession(next);
    await loadProfile(next);
    setChecking(false);
  }

  useEffect(() => {
    refresh();
    const { data } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession || null);
      if (event === "PASSWORD_RECOVERY") {
        setMode("reset"); setPassword(""); setError(""); setMessage(""); setChecking(false);
      } else if (nextSession) {
        setChecking(false);
        setTimeout(() => loadProfile(nextSession), 0);
      } else setIsAdmin(false);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  function switchMode(nextMode) {
    setMode(nextMode); setError(""); setMessage(""); setPassword("");
  }

  async function login(e) {
    e?.preventDefault(); setLoading(true); setError(""); setMessage("");
    try {
      if (!username.trim() || !password) throw new Error("Enter your username and password.");
      const { data: emailData, error: lookupError } = await supabase.rpc("khp_get_login_email", { p_username: username.trim() });
      if (lookupError || !emailData) throw new Error("Incorrect username or password.");
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: emailData, password });
      if (signInError) throw signInError;
    } catch (e) { setError(e?.message || "Unable to sign in."); }
    finally { setLoading(false); }
  }

  async function createUser(e) {
    e?.preventDefault(); setLoading(true); setError(""); setMessage("");
    try {
      if (!isAdmin) throw new Error("Only an active administrator can register users.");
      if (!name.trim() || !username.trim() || !email.trim() || password.length < 8) {
        throw new Error("Enter the full name, username, valid email, and a password of at least 8 characters.");
      }
      const { data, error: fnError } = await supabase.functions.invoke("admin-create-user", {
        body: { name: name.trim(), username: username.trim(), email: email.trim(), password, role }
      });
      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);
      setName(""); setUsername(""); setEmail(""); setPassword(""); setRole("staff");
      setMessage(`${role === "admin" ? "Administrator" : "Staff"} account created successfully. They can now sign in from any device.`);
    } catch (e) { setError(e?.message || "Unable to create account."); }
    finally { setLoading(false); }
  }

  async function forgotPassword(e) {
    e?.preventDefault(); setLoading(true); setError(""); setMessage("");
    try {
      if (!username.trim()) throw new Error("Enter the username you used when you registered.");
      const { data: registeredEmail, error: lookupError } = await supabase.rpc("khp_get_login_email", { p_username: username.trim() });
      if (lookupError || !registeredEmail) throw new Error("We could not find an account with that username.");
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(registeredEmail, { redirectTo: window.location.origin });
      if (resetError) throw resetError;
      setMessage("Password reset email sent to the email address you registered with. Check your inbox.");
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

  if (checking) return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-teal-700">Loading Karuruma Health Post…</div>;
  if (session && mode !== "reset") return <>
    <App /><LocationBridge />
    {isAdmin && <button onClick={() => { setShowUserForm(true); setError(""); setMessage(""); }} className="fixed bottom-5 right-5 z-50 rounded-xl bg-teal-700 px-4 py-3 text-sm font-bold text-white shadow-lg hover:bg-teal-800">＋ Register User</button>}
    {showUserForm && isAdmin && <div className="fixed inset-0 z-[60] bg-slate-900/50 flex items-center justify-center p-4" onMouseDown={e => { if (e.target === e.currentTarget) setShowUserForm(false); }}>
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl p-6">
        <div className="flex items-center justify-between mb-5"><div><h2 className="text-xl font-extrabold text-slate-800">Register User</h2><p className="text-sm text-slate-500">Administrator-only account creation</p></div><button onClick={() => setShowUserForm(false)} className="text-slate-400 text-2xl">×</button></div>
        {error && <div className="mb-4 bg-rose-50 text-rose-700 px-3 py-2.5 rounded-xl text-sm">{error}</div>}{message && <div className="mb-4 bg-emerald-50 text-emerald-700 px-3 py-2.5 rounded-xl text-sm">{message}</div>}
        <form onSubmit={createUser}>
          <label className="block text-sm font-medium text-slate-600 mb-4">Full name<input className={input + " mt-1.5"} value={name} onChange={e => setName(e.target.value)} required /></label>
          <label className="block text-sm font-medium text-slate-600 mb-4">Username<input className={input + " mt-1.5"} value={username} onChange={e => setUsername(e.target.value)} required /></label>
          <label className="block text-sm font-medium text-slate-600 mb-4">Email<input type="email" className={input + " mt-1.5"} value={email} onChange={e => setEmail(e.target.value)} required /></label>
          <label className="block text-sm font-medium text-slate-600 mb-4">Password<input type="password" minLength={8} className={input + " mt-1.5"} value={password} onChange={e => setPassword(e.target.value)} required /><span className="text-xs text-slate-400 mt-1 block">At least 8 characters.</span></label>
          <label className="block text-sm font-medium text-slate-600 mb-5">Account role<select className={input + " mt-1.5"} value={role} onChange={e => setRole(e.target.value)}><option value="staff">Staff</option><option value="admin">Administrator</option></select></label>
          <button disabled={loading} className="w-full py-2.5 rounded-xl bg-teal-700 text-white font-bold disabled:opacity-50">{loading ? "Creating account…" : "Create Account"}</button>
        </form>
      </div>
    </div>}
  </>;

  return <div className="min-h-screen bg-gradient-to-br from-teal-800 via-teal-700 to-emerald-700 flex items-center justify-center p-4" style={{ fontFamily: "system-ui, sans-serif" }}>
    <div className="w-full max-w-md">
      <div className="text-center mb-6"><div className="w-16 h-16 rounded-2xl bg-white/15 flex items-center justify-center mx-auto mb-3 border border-white/20 text-white text-3xl">✚</div><h1 className="text-white text-2xl font-extrabold">Karuruma Health Post</h1><p className="text-teal-100 text-sm mt-1">Health Post Management System</p></div>
      <div className="bg-white rounded-2xl shadow-xl p-7">
        {mode !== "reset" && <div className="flex gap-2 mb-5"><button onClick={() => switchMode("login")} className={`flex-1 py-2 rounded-xl text-sm font-bold ${mode === "login" ? "bg-teal-700 text-white" : "bg-slate-100 text-slate-500"}`}>Sign in</button><button onClick={() => switchMode("forgot")} className={`flex-1 py-2 rounded-xl text-sm font-bold ${mode === "forgot" ? "bg-teal-700 text-white" : "bg-slate-100 text-slate-500"}`}>Forgot password</button></div>}
        {error && <div className="mb-4 bg-rose-50 text-rose-700 px-3 py-2.5 rounded-xl text-sm">{error}</div>}{message && <div className="mb-4 bg-emerald-50 text-emerald-700 px-3 py-2.5 rounded-xl text-sm">{message}</div>}
        {mode === "login" && <form onSubmit={login}><label className="block text-sm font-medium text-slate-600 mb-4">Username<input className={input + " mt-1.5"} value={username} onChange={e => setUsername(e.target.value)} autoFocus required /></label><label className="block text-sm font-medium text-slate-600 mb-2">Password<input type="password" className={input + " mt-1.5"} value={password} onChange={e => setPassword(e.target.value)} required /></label><div className="text-right mb-5"><button type="button" onClick={() => switchMode("forgot")} className="text-sm font-semibold text-teal-700 hover:text-teal-900">Forgot password?</button></div><button disabled={loading} className="w-full py-2.5 rounded-xl bg-teal-700 text-white font-bold disabled:opacity-50">{loading ? "Signing in…" : "Sign In"}</button></form>}
        {mode === "forgot" && <form onSubmit={forgotPassword}><h2 className="text-lg font-bold text-slate-800 mb-1">Reset your password</h2><p className="text-sm text-slate-500 mb-5">Enter the username you used when you registered. We will send the reset link to your registered email address.</p><label className="block text-sm font-medium text-slate-600 mb-5">Username<input className={input + " mt-1.5"} value={username} onChange={e => setUsername(e.target.value)} autoFocus required /></label><button disabled={loading} className="w-full py-2.5 rounded-xl bg-teal-700 text-white font-bold disabled:opacity-50">{loading ? "Finding account…" : "Send Reset Link"}</button><button type="button" onClick={() => switchMode("login")} className="w-full mt-3 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-semibold">Back to Sign In</button></form>}
        {mode === "reset" && <form onSubmit={updatePassword}><h2 className="text-lg font-bold text-slate-800 mb-1">Create a new password</h2><p className="text-sm text-slate-500 mb-5">Choose a new password for your Karuruma Health Post account.</p><label className="block text-sm font-medium text-slate-600 mb-5">New password<input type="password" minLength={8} className={input + " mt-1.5"} value={password} onChange={e => setPassword(e.target.value)} autoFocus required /></label><button disabled={loading} className="w-full py-2.5 rounded-xl bg-teal-700 text-white font-bold disabled:opacity-50">{loading ? "Updating…" : "Update Password"}</button></form>}
      </div>
    </div>
  </div>;
}