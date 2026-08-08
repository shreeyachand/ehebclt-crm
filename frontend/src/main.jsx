import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./theme.css";

import pb from "./pb";

// Make pb visible in browser console for debugging
window.pb = pb;

// Log in as superuser so your frontend can access collections.
// Credentials come from environment variables (see .env.example) so they
// never end up committed to the repo.
const superuserEmail = import.meta.env.VITE_PB_SUPERUSER_EMAIL;
const superuserPassword = import.meta.env.VITE_PB_SUPERUSER_PASSWORD;

if (!superuserEmail || !superuserPassword) {
  console.error(
    "Missing VITE_PB_SUPERUSER_EMAIL / VITE_PB_SUPERUSER_PASSWORD. Copy .env.example to .env and fill in your credentials."
  );
} else {
  pb.admins
    .authWithPassword(superuserEmail, superuserPassword)
    .then(() => console.log("Superuser logged in"))
    .catch((err) => console.error("Failed to login:", err));
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);