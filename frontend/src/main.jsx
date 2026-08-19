import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./theme.css";

import pb from "./pb";

// Make pb visible in browser console for debugging
window.pb = pb;

// Bootstrap auth: ask the server (PocketBase hook) for a short-lived
// superuser token. Credentials never enter the client bundle.
async function boot() {
  try {
    const res = await fetch(pb.baseUrl + "/api/_app_auth", { method: "POST" });
    if (!res.ok) throw new Error("auth failed: " + res.status);
    const data = await res.json();
    pb.authStore.save(data.token, data.record);
  } catch (err) {
    console.error("Bootstrap auth failed:", err);
  }

  ReactDOM.createRoot(document.getElementById("root")).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

boot();