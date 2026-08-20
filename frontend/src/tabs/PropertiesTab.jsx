import { useEffect, useState } from "react";
import pb from "../pb";

// The unit schema (see DBML) only defines UnitStatus as
// vacant | occupied | offline — there's no "maintenance" concept yet.
// Until that's added to the schema, Maintenance is shown as a filler 0
// (renders as "—") rather than being derived from real data.
const MAINTENANCE_FILLER = 0;

const EMPTY_FORM = {
  name: "",
  address: "",
  city: "",
  state: "",
  zip: "",
  total_units: "",
};

export default function PropertiesTab() {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState("address");
  const [sortDir, setSortDir] = useState("asc");

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  async function load() {
    setLoading(true);
    const [buildings, units] = await Promise.all([
      pb.collection("building").getFullList(),
      pb.collection("unit").getFullList(),
    ]);

    buildings.forEach((b) => {
      const buildingUnits = units.filter((u) => u.building_id === b.id);
      b._totalUnits = buildingUnits.length;
      b._occupied = buildingUnits.filter((u) => u.status === "occupied").length;
      b._vacant = buildingUnits.filter((u) => u.status === "vacant").length;
      b._maintenance = MAINTENANCE_FILLER;
    });

    setProperties(buildings);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = properties.filter((b) => {
    const haystack = `${b.address} ${b.city} ${b.state} ${b.zip}`.toLowerCase();
    return haystack.includes(search.toLowerCase());
  });

  const sorted = [...filtered].sort((a, b) => {
    let A, B;
    if (sortField === "units") {
      A = a._totalUnits;
      B = b._totalUnits;
    } else if (sortField === "occupied") {
      A = a._occupied;
      B = b._occupied;
    } else if (sortField === "vacant") {
      A = a._vacant;
      B = b._vacant;
    } else if (sortField === "maintenance") {
      A = a._maintenance;
      B = b._maintenance;
    } else {
      A = (a.address || "").toLowerCase();
      B = (b.address || "").toLowerCase();
    }
    if (sortDir === "asc") return A > B ? 1 : -1;
    return A < B ? 1 : -1;
  });

  function toggleSort(field) {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  }

  function SortIcon({ field }) {
    if (sortField !== field) return <span className="sort-icon muted">&#8597;</span>;
    return (
      <span className="sort-icon active">
        {sortDir === "asc" ? "\u2191" : "\u2193"}
      </span>
    );
  }

  function openModal() {
    setForm(EMPTY_FORM);
    setFormError("");
    setFieldErrors({});
    setShowModal(true);
  }

  function closeModal() {
    if (saving) return;
    setShowModal(false);
  }

  function updateField(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
    // clear inline error while user retypes
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  }

  function validateField(name, value) {
    if (name === "city" && value.trim() && !/^[a-zA-Z\s]+$/.test(value.trim())) {
      setFieldErrors((prev) => ({ ...prev, city: "Invalid input. Please use alphabetic characters only for city." }));
    } else if (name === "zip" && value.trim()) {
      if (!/^\d+$/.test(value.trim())) {
        setFieldErrors((prev) => ({ ...prev, zip: "Invalid input. Please use numeric values for zip code." }));
      } else if (value.trim().length !== 5) {
        setFieldErrors((prev) => ({ ...prev, zip: "ZIP code must be 5 digits." }));
      }
    }
  }

  async function handleAddProperty(e) {
    e.preventDefault();
    setFormError("");

    if (!form.name.trim() || !form.address.trim() || !form.city.trim() || !form.state.trim() || !form.zip.trim()) {
      setFormError("Name, address, city, state, and zip are required.");
      return;
    }

    if (form.zip.trim().length !== 5) {
      setFormError("ZIP code must be exactly 5 digits.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        address: form.address.trim(),
        city: form.city.trim(),
        state: form.state.trim(),
        zip: form.zip.trim(),
        total_units: form.total_units ? Number(form.total_units) : 0,
      };

      const created = await pb.collection("building").create(payload);

      created._totalUnits = 0;
      created._occupied = 0;
      created._vacant = 0;
      created._maintenance = MAINTENANCE_FILLER;

      setProperties((prev) => [created, ...prev]);
      setShowModal(false);
    } catch (err) {
      console.error("Failed to create property:", err);
      setFormError(
        err?.data?.message || err?.message || "Failed to add property. Please try again."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Properties</h2>
        </div>
        <button className="btn-green" onClick={openModal}>
          + Add Property
        </button>
      </div>

      <div className="page-subtitle" style={{ marginTop: "4px", marginBottom: "16px" }}>
        {filtered.length} buildings managed
      </div>

      <input
        className="search-bar"
        placeholder="Search by address or city..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {loading ? (
        <div className="text-muted">Loading properties...</div>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th onClick={() => toggleSort("address")}>
                <div className="th-filter">
                  ADDRESS
                  <SortIcon field="address" />
                </div>
              </th>
              <th onClick={() => toggleSort("units")}>
                <div className="th-filter">
                  UNITS
                  <SortIcon field="units" />
                </div>
              </th>
              <th onClick={() => toggleSort("occupied")}>
                <div className="th-filter">
                  OCCUPIED
                  <SortIcon field="occupied" />
                </div>
              </th>
              <th onClick={() => toggleSort("vacant")}>
                <div className="th-filter">
                  VACANT
                  <SortIcon field="vacant" />
                </div>
              </th>
              <th onClick={() => toggleSort("maintenance")}>
                <div className="th-filter">
                  MAINTENANCE
                  <SortIcon field="maintenance" />
                </div>
              </th>
              <th>
                <div className="th-filter">NOTES</div>
              </th>
            </tr>
          </thead>

          <tbody>
            {sorted.map((b) => (
              <tr key={b.id}>
                <td>
                  <div className="property-address">{b.name || b.address}</div>
                  <div className="property-citystate">
                    {b.address}, {b.city}, {b.state} {b.zip}
                  </div>
                </td>

                <td>{b._totalUnits}</td>

                <td>
                  {b._occupied > 0 ? (
                    <span className="stat-cell">
                      <span className="status-badge status-occupied">
                        <span className="status-dot" />
                        Occupied
                      </span>
                      <span className="stat-count">{b._occupied}</span>
                    </span>
                  ) : (
                    <span className="text-muted">&mdash;</span>
                  )}
                </td>

                <td>
                  {b._vacant > 0 ? (
                    <span className="stat-cell">
                      <span className="status-badge status-vacant">
                        <span className="status-dot" />
                        Vacant
                      </span>
                      <span className="stat-count">{b._vacant}</span>
                    </span>
                  ) : (
                    <span className="text-muted">&mdash;</span>
                  )}
                </td>

                <td>
                  {b._maintenance > 0 ? (
                    <span className="stat-cell">
                      <span className="status-badge status-maintenance">
                        <span className="status-dot" />
                        Maintenance
                      </span>
                      <span className="stat-count">{b._maintenance}</span>
                    </span>
                  ) : (
                    <span className="text-muted">&mdash;</span>
                  )}
                </td>

                <td>
                  <span className="text-muted">&mdash;</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3>Add Property</h3>
            <div className="modal-subtitle">
              Creates a new building record. Units can be added to it afterward.
            </div>

            {formError && <div className="form-error">{formError}</div>}

            <form onSubmit={handleAddProperty}>
              <div className="form-grid">
                <div className="form-field full">
                  <label>Name *</label>
                  <input
                    value={form.name}
                    onChange={(e) => updateField("name", e.target.value)}
                    autoFocus
                  />
                </div>

                <div className="form-field full">
                  <label>Address *</label>
                  <input
                    value={form.address}
                    onChange={(e) => updateField("address", e.target.value)}
                  />
                </div>

                <div className={`form-field${fieldErrors.city ? " error" : ""}`}>
                  <label>City *</label>
                  <input
                    value={form.city}
                    onChange={(e) => updateField("city", e.target.value)}
                    onBlur={(e) => validateField("city", e.target.value)}
                  />
                  {fieldErrors.city && <div className="field-error">{fieldErrors.city}</div>}
                </div>

                <div className="form-field">
                  <label>State *</label>
                  <input
                    value={form.state}
                    onChange={(e) => updateField("state", e.target.value)}
                    maxLength={2}
                    placeholder="CA"
                  />
                </div>

                <div className={`form-field${fieldErrors.zip ? " error" : ""}`}>
                  <label>ZIP *</label>
                  <input
                    value={form.zip}
                    onChange={(e) => updateField("zip", e.target.value)}
                    onBlur={(e) => validateField("zip", e.target.value)}
                  />
                  {fieldErrors.zip && <div className="field-error">{fieldErrors.zip}</div>}
                </div>

                <div className="form-field">
                  <label>Total units</label>
                  <input
                    type="number"
                    min="0"
                    value={form.total_units}
                    onChange={(e) => updateField("total_units", e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={closeModal}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-green" disabled={saving}>
                  {saving ? "Saving..." : "Add Property"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}