import { useEffect, useState } from "react";
import pb from "../pb.js";

export default function BuildingsTab() {
  const [buildings, setBuildings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadBuildings() {
      try {
        const records = await pb.collection("building").getFullList();
        setBuildings(records);
      } catch (err) {
        console.error("Failed to load buildings:", err);
      } finally {
        setLoading(false);
      }
    }

    loadBuildings();
  }, []);

  if (loading) return <div>Loading buildings...</div>;

  return (
    <div>
      <h2>Buildings</h2>
      <ul>
        {buildings.map((b) => (
          <li key={b.id}>
            {b.name || "(no name field)"} — ID: {b.id}
          </li>
        ))}
      </ul>
    </div>
  );
}
