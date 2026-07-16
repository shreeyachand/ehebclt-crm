import { useEffect, useState } from "react";
import pb from "../pb.js";
export default function TenantsTab() {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadTenants() {
      try {
        const records = await pb.collection("tenant").getFullList();
        setTenants(records);
      } catch (err) {
        console.error("Failed to load tenants:", err);
      } finally {
        setLoading(false);
      }
    }

    loadTenants();
  }, []);

  if (loading) return <div>Loading tenants...</div>;

  return (
    <div>
      <h2>Tenants</h2>
      <ul>
        {tenants.map((t) => (
          <li key={t.id}>
            {t.id} — {t.name || "(no name field)"}
          </li>
        ))}
      </ul>
    </div>
  );
}
