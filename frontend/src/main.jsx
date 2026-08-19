import React from "react";
import ReactDOM from "react-dom/client";
import { useEffect, useState } from "react";
import App from "./App";
import Login from "./components/Login";
import "./theme.css";

import pb from "./pb";

// Make pb visible in browser console for debugging
window.pb = pb;

async function mintSuperuserToken() {
  const data = await pb.send("/api/_app_auth", { method: "POST" });
  pb.authStore.save(data.token, data.record);
}

function AuthGate() {
  const [checking, setChecking] = useState(true);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        if (pb.authStore.isValid) {
          const isUser = pb.authStore.model?.collectionName === "users";
          if (isUser) await mintSuperuserToken();
          setAuthed(true);
        }
      } catch (err) {
        console.error("Bootstrap auth failed:", err);
        pb.authStore.clear();
      } finally {
        setChecking(false);
      }
    })();
  }, []);

  const handleLogin = async (email, password) => {
    await pb.collection("users").authWithPassword(email, password);
    await mintSuperuserToken();
    setAuthed(true);
  };

  const handleLogout = () => {
    pb.authStore.clear();
    setAuthed(false);
  };

  if (checking) {
    return <div className="login-wrap">Loading…</div>;
  }

  if (!authed) {
    return <Login onLogin={handleLogin} />;
  }

  return <App onLogout={handleLogout} />;
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthGate />
  </React.StrictMode>
);