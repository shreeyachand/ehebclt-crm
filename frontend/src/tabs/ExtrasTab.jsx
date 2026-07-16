import { useEffect, useState } from "react";
import pb from "../pb.js";

export default function ExtrasTab() {
  const [expiring, setExpiring] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadExpiringLeases() {
      try {
        const leases = await pb.collection("lease").getFullList();

        const soon = leases.filter((l) => {
          const end = new Date(l.end_date);
          const now = new Date();
          const diff = end - now;
          const days = diff / (1000 * 60 * 60 * 24);
          return days <= 30; // expiring within 30 days
        });

        setExpiring(soon);
      } catch (err) {
        console.error("Failed to load leases:", err);
      } finally {
        setLoading(false);
      }
    }

    loadExpiringLeases();
  }, []);

  if (loading) return <div>Loading expiring leases...</div>;

  return (
    <div>
      <h2>Expiring Leases (Next 30 Days)</h2>
      <ul>
        {expiring.map((l) => (
          <li key={l.id}>
            <strong>Lease ID:</strong> {l.id}<br />
            <strong>Tenant:</strong> {l.tenant || "(no tenant field)"}<br />
            <strong>Unit:</strong> {l.unit || "(no unit field)"}<br />
            <strong>End Date:</strong> {l.end_date}<br />
            <strong>Start Date:</strong> {l.start_date}<br />
            <strong>Rent:</strong> {l.rent || "(no rent field)"}
            <hr />
          </li>
        ))}
      </ul>
    </div>
  );
}
