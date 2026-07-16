import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./theme.css";

import pb from "./pb";

// Make pb visible in browser console for debugging
window.pb = pb;

// Log in as superuser so your frontend can access collections
pb.admins
  .authWithPassword("yunjun505@gmail.com", "12345678")
  .then(() => console.log("Superuser logged in"))
  .catch((err) => console.error("Failed to login:", err));

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
