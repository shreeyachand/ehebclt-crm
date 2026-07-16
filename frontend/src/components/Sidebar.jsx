export default function Sidebar({ setTab }) {
  return (
    <div className="sidebar">
      <button onClick={() => setTab("units")}>Units</button>
      <button onClick={() => setTab("tenants")}>Tenants</button>
      <button onClick={() => setTab("buildings")}>Buildings</button>
      <button onClick={() => setTab("extras")}>Extras</button>
    </div>
  );
}
