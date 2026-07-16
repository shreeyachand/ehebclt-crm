import { useEffect, useState } from "react";
import pb from "../pb.js";

export default function UnitsTab() {
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUnits() {
      try {
        const records = await pb.collection("unit").getFullList();
        setUnits(records);
        console.log("Fetching units from:", pb.baseUrl);
      } catch (err) {
        console.error("Failed to load units:", err);
      } finally {
        setLoading(false);
      }
    }

    loadUnits();
  }, []);

  if (loading) return <div>Loading units...</div>;

  return (
    <div>
      <h2>Units</h2>
      <ul>
        {units.map((u) => (
          <li key={u.id}>
            {u.id} — {u.name || "(no name field)"}
          </li>
        ))}
      </ul>
    </div>
  );
}
