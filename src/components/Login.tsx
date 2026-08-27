import { useState } from "react";
import { login } from "@/lib/hermesApi";

export function Login({ onOk }: { onOk: () => void }) {
  const [u, setU] = useState("");
  const [p, setP] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      await login(u, p);
      onOk();
    } catch (e: any) {
      setErr(e?.message ?? "Sign-in failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login">
      <form className="login-card" onSubmit={submit}>
        <h1>Cockpit</h1>
        <p>By JTT — Hermes command center</p>
        <label htmlFor="u">Username</label>
        <input
          id="u"
          value={u}
          autoFocus
          onChange={(e) => setU(e.target.value)}
          autoComplete="username"
        />
        <label htmlFor="p">Password</label>
        <input
          id="p"
          type="password"
          value={p}
          onChange={(e) => setP(e.target.value)}
          autoComplete="current-password"
        />
        <button className="btn-primary" type="submit" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
        <div className="login-error">{err}</div>
      </form>
    </div>
  );
}
