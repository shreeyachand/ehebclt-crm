import { useEffect, useState } from "react";
import pb from "../pb";

export default function DashboardTab({ setTab, userName }) {
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    async function load() {
      const buildings = await pb.collection("building").getFullList();
      const units = await pb.collection("unit").getFullList();
      const tenants = await pb.collection("tenant").getFullList();
      const subsidies = await pb.collection("subsidy").getFullList();
      const certs = await pb.collection("income_certification").getFullList();

      const totalUnits = units.length;
      const occupied = units.filter((u) => u.status === "occupied").length;
      const vacant = units.filter((u) => u.status === "vacant").length;

      const maintenance = 2; // filler

      // NOTE: this is the same query used for the "Residents" count on the
      // Residents tab (role === "leaseholder"). If ResidentsTab.jsx uses a
      // different filter for its header count, update this to match.
      const residents = tenants.filter((t) => t.role === "leaseholder").length;

      const activePrograms =
        subsidies.filter((s) => s.status === "active").length +
        certs.length;

      setSummary({
        totalUnits,
        properties: buildings.length,
        occupied,
        vacant,
        maintenance,
        residents,
        activePrograms,
      });
    }

    load();
  }, []);

  const attentionUnits = [
    {
      unit: "2B",
      address: "2847 Fruitvale Ave",
      issue: "HVAC replacement — est. completion Nov 15",
    },
    {
      unit: "3B",
      address: "1534 International Blvd",
      issue: "Water damage repair in progress",
    },
  ];

  if (!summary) return <div>Loading dashboard...</div>;

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const statCards = [
    {
      label: "Total Units",
      value: summary.totalUnits,
      detail: `across ${summary.properties} properties`,
      color: "green",
    },
    {
      label: "Occupied",
      value: summary.occupied,
      detail: `${Math.round((summary.occupied / summary.totalUnits) * 100)}% occupancy`,
      color: "green",
    },
    {
      label: "Vacant",
      value: summary.vacant,
      detail: "ready to lease",
      color: "dark",
    },
    {
      label: "Maintenance",
      value: summary.maintenance,
      detail: "units in progress",
      color: "orange",
    },
  ];

  const wideCards = [
    {
      label: "Residents",
      value: summary.residents,
      detail: "active head-of-household",
      color: "purple",
    },
    {
      label: "Active Programs",
      value: summary.activePrograms,
      detail: "subsidy enrollments",
      color: "orange",
    },
  ];

  return (
    <div>
      <div className="page-date">{today}</div>

      <h2>Good morning, {userName}.</h2>
      <div className="page-subtitle">
        Here&rsquo;s a snapshot of your portfolio today.
      </div>

      <div className="dashboard-grid">
        {statCards.map((c) => (
          <div className="dash-card" key={c.label}>
            <p className="dash-card-label">{c.label}</p>
            <h3 className={`dash-card-value color-${c.color}`}>{c.value}</h3>
            <span>{c.detail}</span>
          </div>
        ))}

        {wideCards.map((c) => (
          <div className="dash-card span-2" key={c.label}>
            <p className="dash-card-label">{c.label}</p>
            <h3 className={`dash-card-value color-${c.color}`}>{c.value}</h3>
            <span>{c.detail}</span>
          </div>
        ))}
      </div>

      <div className="dashboard-panels">
        <div className="panel">
          <h3>Units Needing Attention</h3>
          <div className="attention-list">
            {attentionUnits.map((u, i) => (
              <div key={i} className="attention-item">
                <span className="warning-icon">&#9888;</span>
                <div>
                  <strong>Unit {u.unit}</strong> — {u.address}
                  <br />
                  <span className="attention-issue">{u.issue}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <h3>Quick Actions</h3>
          <div className="quick-actions">
            <button onClick={() => setTab("properties")}>
              <div>
                <div className="qa-title">View all properties</div>
                <div className="qa-subtitle">{summary.properties} buildings</div>
              </div>
              <span className="qa-arrow">&#8594;</span>
            </button>

            <button onClick={() => setTab("residents")}>
              <div>
                <div className="qa-title">View all residents</div>
                <div className="qa-subtitle">{summary.residents} tenants</div>
              </div>
              <span className="qa-arrow">&#8594;</span>
            </button>

            <button onClick={() => setTab("programs")}>
              <div>
                <div className="qa-title">View all programs</div>
                <div className="qa-subtitle">{summary.activePrograms} active enrollments</div>
              </div>
              <span className="qa-arrow">&#8594;</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}