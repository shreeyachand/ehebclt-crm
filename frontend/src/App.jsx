import { useState } from "react";
import Sidebar from "./components/Sidebar";
import UnitsTab from "./tabs/UnitsTab";
import TenantsTab from "./tabs/TenantsTab";
import BuildingsTab from "./tabs/BuildingsTab";
import ExtrasTab from "./tabs/ExtrasTab";

export default function App() {
  const [tab, setTab] = useState("units");

  return (
    <div className="app-layout">
      <Sidebar setTab={setTab} />

      <div className="content">
        {tab === "units" && <UnitsTab />}
        {tab === "tenants" && <TenantsTab />}
        {tab === "buildings" && <BuildingsTab />}
        {tab === "extras" && <ExtrasTab />}
      </div>
    </div>
  );
}
