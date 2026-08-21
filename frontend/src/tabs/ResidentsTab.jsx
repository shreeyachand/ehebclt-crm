import { useEffect, useState } from "react";
import pb from "../pb";

function getAge(dob) {
  if (!dob) return "";
  const birth = new Date(dob);
  const now = new Date();
  return now.getFullYear() - birth.getFullYear();
}

function getInitials(first, last) {
  return `${(first || "?")[0] || ""}${(last || "")[0] || ""}`.toUpperCase();
}

const AVATAR_COLORS = [
  "#2f4b7c", // navy
  "#8c3a3a", // maroon
  "#4a5c2f", // olive
  "#6d28d9", // purple
  "#0f5c52", // teal
  "#7c4a03", // brown
  "#374151", // slate
];

function getAvatarColor(id) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function capitalize(s) {
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// A tenant can have more than one lease record over time (renewals, etc.),
// so pick the active one if there is one, otherwise the most recently
// started lease.
function pickLease(t) {
  const leases = t.expand?.lease_via_tenant_id || [];
  if (leases.length === 0) return null;
  const active = leases.find((l) => l.status === "active");
  if (active) return active;
  return [...leases].sort(
    (a, b) => new Date(b.start_date) - new Date(a.start_date)
  )[0];
}

const EMPTY_FORM = {
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  dob: "",
  role: "leaseholder",
  building_id: "",
};

export default function ResidentsTab() {
  const [residents, setResidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState(null);
  const [sortDir, setSortDir] = useState("asc");

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [buildings, setBuildings] = useState([]);

  async function load() {
    setLoading(true);
    const records = await pb.collection("tenant").getFullList({
      expand:
        "building_id,lease_via_tenant_id.unit_id.building_id,lease_via_tenant_id.subsidy_via_lease_id,lease_via_tenant_id.income_certification_via_lease_id",
    });

    // Resolve the relevant lease + derived stats for each tenant once, up
    // front, so both rendering and sorting can use them directly.
    records.forEach((t) => {
      const lease = pickLease(t);
      const unit = lease?.expand?.unit_id || null;
      const building = unit?.expand?.building_id || t.expand?.building_id || null;
      const subsidies = lease?.expand?.subsidy_via_lease_id || [];
      const certs = lease?.expand?.income_certification_via_lease_id || [];

      t._lease = lease;
      t._unit = unit;
      t._building = building;
      t.program_count =
        subsidies.filter((s) => s.status === "active").length + certs.length;
    });

    setResidents(records);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  // Search filter
  const filtered = residents.filter((t) => {
    const fullName = `${t.first_name} ${t.last_name}`.toLowerCase();
    return (
      fullName.includes(search.toLowerCase()) ||
      (t.email || "").toLowerCase().includes(search.toLowerCase())
    );
  });

  // Sorting
  const sorted = [...filtered].sort((a, b) => {
    if (!sortField) return 0;

    let A, B;

    if (sortField === "program_count") {
      A = a.program_count || 0;
      B = b.program_count || 0;
    } else if (sortField === "last_name") {
      A = a.last_name?.toLowerCase() || "";
      B = b.last_name?.toLowerCase() || "";
    } else if (sortField === "unit_number") {
      A = a._unit?.unit_number || "";
      B = b._unit?.unit_number || "";
    } else {
      A = a[sortField] || "";
      B = b[sortField] || "";
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

  async function openModal() {
    setForm(EMPTY_FORM);
    setFormError("");
    setBuildings([]);
    setShowModal(true);
    try {
      const buildingRecords = await pb.collection("building").getFullList();
      setBuildings(buildingRecords);
    } catch {
      setBuildings([]);
    }
  }

  function closeModal() {
    if (saving) return;
    setShowModal(false);
  }

  function updateField(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleAddResident(e) {
    e.preventDefault();
    setFormError("");

    if (!form.first_name.trim() || !form.last_name.trim()) {
      setFormError("First and last name are required.");
      return;
    }

    setSaving(true);
    try {
      const selectedBuildingId = form.building_id || null;

      const payload = {
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        dob: form.dob || null,
        role: form.role,
        building_id: selectedBuildingId,
      };

      const created = await pb.collection("tenant").create(payload);

      // New tenant has no lease yet, so give it the same derived shape as
      // the rest of the rows and drop it straight into state — no need to
      // refetch the whole list.
      created._lease = null;
      created._unit = null;
      created._building = buildings.find((b) => b.id === selectedBuildingId) || null;
      created.program_count = 0;

      setResidents((prev) => [created, ...prev]);
      setShowModal(false);
    } catch (err) {
      console.error("Failed to create resident:", err);
      setFormError(
        err?.data?.message || err?.message || "Failed to add resident. Please try again."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h2>Residents</h2>
        </div>
        <button className="btn-green" onClick={openModal}>
          + Add Resident
        </button>
      </div>

      {/* Total count */}
      <div className="page-subtitle" style={{ marginTop: "4px", marginBottom: "16px" }}>
        {filtered.length} head-of-household tenants
      </div>

      {/* Search bar */}
      <input
        className="search-bar"
        placeholder="Search by name or email..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {/* Table */}
      {loading ? (
        <div className="text-muted">Loading residents...</div>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th onClick={() => toggleSort("last_name")}>
                <div className="th-filter">
                  RESIDENT
                  <SortIcon field="last_name" />
                </div>
              </th>

              <th>
                <div className="th-filter">CONTACT</div>
              </th>

              <th onClick={() => toggleSort("unit_number")}>
                <div className="th-filter">
                  PROPERTY / UNIT
                  <SortIcon field="unit_number" />
                </div>
              </th>

              <th>
                <div className="th-filter">LEASE</div>
              </th>

              <th onClick={() => toggleSort("program_count")}>
                <div className="th-filter">
                  PROGRAMS
                  <SortIcon field="program_count" />
                </div>
              </th>
            </tr>
          </thead>

          <tbody>
            {sorted.map((t) => {
              const lease = t._lease;
              const unit = t._unit;
              const building = t._building;

              return (
                <tr key={t.id}>
                  <td>
                    <div className="resident-cell">
                      <div
                        className="avatar"
                        style={{ background: getAvatarColor(t.id) }}
                      >
                        {getInitials(t.first_name, t.last_name)}
                      </div>
                      <div>
                        <div className="resident-name">
                          {t.first_name} {t.last_name}
                        </div>
                        <div className="resident-age">
                          {t.dob ? `Age ${getAge(t.dob)}` : "Age —"}
                        </div>
                      </div>
                    </div>
                  </td>

                  <td>
                    {t.email || "No email"}
                    <br />
                    {t.phone || "No phone"}
                  </td>

                  <td>
                    {building?.name || building?.address || "N/A"}
                    <br />
                    Unit {unit?.unit_number || "N/A"}
                  </td>

                  <td>
                    {lease ? (
                      <span className={`status-badge status-${lease.status}`}>
                        <span className="status-dot" />
                        {capitalize(lease.status)}
                      </span>
                    ) : (
                      <span className="text-muted">N/A</span>
                    )}
                  </td>

                  <td>
                    {t.program_count > 0 ? (
                      <span className="pill">{t.program_count} active</span>
                    ) : (
                      <span className="text-muted">none</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {/* Add Resident modal */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3>Add Resident</h3>
            <div className="modal-subtitle">
              Creates a new tenant record. You can attach a lease and unit later.
            </div>

            {formError && <div className="form-error">{formError}</div>}

            <form onSubmit={handleAddResident}>
              <div className="form-grid">
                <div className="form-field">
                  <label>First name *</label>
                  <input
                    value={form.first_name}
                    onChange={(e) => updateField("first_name", e.target.value)}
                    autoFocus
                  />
                </div>

                <div className="form-field">
                  <label>Last name *</label>
                  <input
                    value={form.last_name}
                    onChange={(e) => updateField("last_name", e.target.value)}
                  />
                </div>

                <div className="form-field">
                  <label>Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => updateField("email", e.target.value)}
                  />
                </div>

                <div className="form-field">
                  <label>Phone</label>
                  <input
                    value={form.phone}
                    onChange={(e) => updateField("phone", e.target.value)}
                  />
                </div>

                <div className="form-field">
                  <label>Date of birth</label>
                  <input
                    type="date"
                    value={form.dob}
                    onChange={(e) => updateField("dob", e.target.value)}
                  />
                </div>

                <div className="form-field">
                  <label>Role</label>
                  <select
                    value={form.role}
                    onChange={(e) => updateField("role", e.target.value)}
                  >
                    <option value="leaseholder">Leaseholder</option>
                    <option value="co_signer">Co-signer</option>
                  </select>
                </div>

                <div className="form-field">
                  <label>Building</label>
                  <select
                    value={form.building_id}
                    onChange={(e) => updateField("building_id", e.target.value)}
                  >
                    <option value="">-- Select a building --</option>
                    {buildings.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name || b.address}
                      </option>
                    ))}
                  </select>
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
                  {saving ? "Saving..." : "Add Resident"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}