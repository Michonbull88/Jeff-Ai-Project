"use client";
import { useState, type FormEvent } from "react";
import { LogIn, UserPlus } from "lucide-react";

export function LoginForm() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState(""); const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const response = await fetch("/api/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: mode, username, password }) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error || "Could not continue.");
      const next = new URLSearchParams(location.search).get("next"); location.href = next?.startsWith("/") ? next : "/";
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not continue."); setBusy(false); }
  }
  return <main className="login-page"><section className="login-card"><div className="login-brand">j<span>.</span></div><p className="login-eyebrow">PERSONAL INTELLIGENCE</p><h1>{mode === "login" ? "Welcome back." : "Create your JEFF account."}</h1><p>{mode === "login" ? "Log in to continue learning with JEFF." : "The first account created becomes the administrator. Later accounts are learners."}</p><form onSubmit={submit}><label>Username<input autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} required minLength={3} /></label><label>Password<input type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} value={password} onChange={(e) => setPassword(e.target.value)} required minLength={10} /></label>{error && <p role="alert" className="login-error">{error}</p>}<button disabled={busy}>{mode === "login" ? <LogIn size={17} /> : <UserPlus size={17} />}{busy ? "Please wait…" : mode === "login" ? "Log in" : "Create account"}</button></form><button className="login-switch" onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}>{mode === "login" ? "New here? Create an account" : "Already registered? Log in"}</button></section></main>;
}
