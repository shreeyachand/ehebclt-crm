import { useState } from "react";
import ResidentsTab from "./tabs/ResidentsTab";
import DashboardTab from "./tabs/DashboardTab";
import PropertiesTab from "./tabs/PropertiesTab";
import pb from "./pb";

const NAV_ITEMS = [
  { key: "dashboard", label: "Dashboard", icon: "/icons/home.svg" },
  { key: "properties", label: "Properties", icon: "/icons/building.svg" },
  { key: "residents", label: "Residents", icon: "/icons/users.svg" },
  { key: "programs", label: "Programs", icon: "/icons/program.svg" },
];

export default function App({ onLogout }) {
  const [tab, setTab] = useState("dashboard");

  const userName = pb.authStore.model?.name || pb.authStore.model?.email || "User";
  const userEmail = pb.authStore.model?.email || "";
  const initials = (userName || "U")
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div>
      <div className="sidebar">
        <div className="org-block">
          <div className="org-badge">EH</div>
          <div>
            <div className="org-name">EHEBCLT</div>
            <div className="org-subtitle">Community Land Trust</div>
          </div>
        </div>

        {NAV_ITEMS.map((item) => (
          <a
            key={item.key}
            className={`nav-item${tab === item.key ? " active" : ""}`}
            onClick={() => setTab(item.key)}
          >
            <img className="icon" src={item.icon} />
            {item.label}
          </a>
        ))}

        <div className="sidebar-user">
          <div className="user-avatar-fallback">{initials}</div>
          <div>
            <div className="user-name">{userName}</div>
            <div className="user-email">{userEmail}</div>
          </div>
          {onLogout && (
            <button className="logout-btn" onClick={onLogout}>
              Log out
            </button>
          )}
        </div>
      </div>

      <div className="main">
        {tab === "dashboard" && (
          <DashboardTab setTab={setTab} userName={userName} />
        )}

        {tab === "properties" && <PropertiesTab />}

        {tab === "residents" && <ResidentsTab />}
      </div>
    </div>
  );
}