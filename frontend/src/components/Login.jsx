import { useState } from "react";

export default function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (ev) => {
    ev.preventDefault();
    setError("");
    setBusy(true);
    try {
      await onLogin(email, password);
    } catch (err) {
      setError("Invalid credentials. Please try again.");
      console.error("Login failed:", err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-wrap">
      <form className="login-card" onSubmit={submit}>
        <div className="org-badge">EH</div>
        <div className="login-title">EHEBCLT CRM</div>
        <div className="login-subtitle">Sign in with your staff account</div>
        <input
          className="login-input"
          type="email"
          placeholder="Email"
          value={email}
          onChange={(ev) => setEmail(ev.target.value)}
          autoComplete="username"
          required
        />
        <input
          className="login-input"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(ev) => setPassword(ev.target.value)}
          autoComplete="current-password"
          required
        />
        {error && <div className="login-error">{error}</div>}
        <button className="login-btn" type="submit" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}