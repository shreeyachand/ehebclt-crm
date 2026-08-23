import { useEffect, useState } from "react";
import pb from "../pb";

function getAge(dob) {
  if (!dob) return null;
  const dateOnly = typeof dob === "string" ? dob.slice(0, 10) : dob;
  const birth = new Date(dateOnly + "T00:00:00");
  const now = new Date();
  return now.getFullYear() - birth.getFullYear();
}

function getInitials(first, last) {
  return `${(first || "?")[0] || ""}${(last || "")[0] || ""}`.toUpperCase();
}

const AVATAR_COLORS = [
  "#2f4b7c",
  "#8c3a3a",
  "#4a5c2f",
  "#6d28d9",
  "#0f5c52",
  "#7c4a03",
  "#374151",
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

function pickLease(leases) {
  if (!leases || leases.length === 0) return null;
  const active = leases.find((l) => l.status === "active");
  if (active) return active;
  return [...leases].sort(
    (a, b) => new Date(b.start_date) - new Date(a.start_date)
  )[0];
}

function formatDate(d) {
  if (!d) return null;
  const dateOnly = typeof d === "string" ? d.slice(0, 10) : d;
  return new Date(dateOnly + "T00:00:00").toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatCurrency(n) {
  if (n == null) return null;
  return Number(n).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}

const EDIT_EMPTY = {
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  dob: "",
};

export default function ResidentDetail({ residentId, onBack }) {
  const [resident, setResident] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showEdit, setShowEdit] = useState(false);
  const [form, setForm] = useState(EDIT_EMPTY);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError("");
      try {
        const record = await pb.collection("tenant").getOne(residentId, {
          expand:
            "building_id,lease_via_tenant_id.unit_id.building_id,lease_via_tenant_id.subsidy_via_lease_id,lease_via_tenant_id.income_certification_via_lease_id",
        });

        if (cancelled) return;

        const leases = record.expand?.lease_via_tenant_id || [];
        const lease = pickLease(leases);
        const unit = lease?.expand?.unit_id || null;
        const building =
          unit?.expand?.building_id || record.expand?.building_id || null;

        record._lease = lease;
        record._unit = unit;
        record._building = building;

        setResident(record);
      } catch (err) {
        if (cancelled) return;
        console.error("Failed to load resident:", err);
        setError(
          err?.data?.message || err?.message || "Failed to load resident."
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [residentId]);

  function openEdit() {
    if (!resident) return;
    setForm({
      first_name: resident.first_name || "",
      last_name: resident.last_name || "",
      email: resident.email || "",
      phone: resident.phone || "",
      dob: resident.dob || "",
    });
    setFormError("");
    setShowEdit(true);
  }

  function closeEdit() {
    if (saving) return;
    setShowEdit(false);
  }

  function updateField(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleEditSubmit(e) {
    e.preventDefault();
    setFormError("");

    if (!form.first_name.trim() || !form.last_name.trim()) {
      setFormError("First and last name are required.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        dob: form.dob || null,
      };

      const updated = await pb
        .collection("tenant")
        .update(residentId, payload);

      setResident((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          first_name: updated.first_name,
          last_name: updated.last_name,
          email: updated.email,
          phone: updated.phone,
          dob: updated.dob,
        };
      });

      setShowEdit(false);
    } catch (err) {
      console.error("Failed to update resident:", err);
      setFormError(
        err?.data?.message ||
          err?.message ||
          "Failed to update resident. Please try again."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div>
        <a className="back-link" onClick={onBack}>
          <span className="back-arrow">&larr;</span> Back to Residents
        </a>
        <div className="text-muted" style={{ marginTop: 24 }}>
          Loading resident...
        </div>
      </div>
    );
  }

  if (error || !resident) {
    return (
      <div>
        <a className="back-link" onClick={onBack}>
          <span className="back-arrow">&larr;</span> Back to Residents
        </a>
        <div className="text-muted" style={{ marginTop: 24 }}>
          {error || "Resident not found."}
        </div>
      </div>
    );
  }

  const lease = resident._lease;
  const unit = resident._unit;
  const building = resident._building;
  const age = getAge(resident.dob);

  return (
    <div>
      <a className="back-link" onClick={onBack}>
        <span className="back-arrow">&larr;</span> Back to Residents
      </a>

      <div className="detail-header">
        <div className="detail-header-inner">
          <div
            className="detail-avatar"
            style={{ background: getAvatarColor(resident.id) }}
          >
            {getInitials(resident.first_name, resident.last_name)}
          </div>

          <div className="detail-info">
            <div className="detail-name">
              {resident.first_name} {resident.last_name}
            </div>
            <div className="detail-meta">
              {resident.dob && (
                <span>
                  {formatDate(resident.dob)}
                  {age != null ? ` \u00b7 Age ${age}` : ""}
                </span>
              )}
              {!resident.dob && (
                <span className="detail-placeholder">No date of birth on file</span>
              )}
            </div>
            <div className="detail-meta">
              {resident.email || (
                <span className="detail-placeholder">No email on file</span>
              )}
            </div>
            <div className="detail-meta">
              {resident.phone || (
                <span className="detail-placeholder">No phone on file</span>
              )}
            </div>
          </div>

          <button className="btn-green" onClick={openEdit}>
            Edit
          </button>
        </div>
      </div>

      <div className="detail-section">
        <h3 className="detail-section-title">Lease &amp; Unit</h3>

        <div className="detail-fields">
          <div className="detail-field">
            <div className="detail-label">Building</div>
            <div className="detail-value">
              {building?.name || building?.address || (
                <span className="detail-placeholder">No building on file</span>
              )}
            </div>
          </div>

          <div className="detail-field">
            <div className="detail-label">Unit</div>
            <div className="detail-value">
              {unit ? (
                <>
                  {unit.unit_number}
                  {unit.bedrooms != null && (
                    <span className="detail-unit-extra">
                      {" "}
                      · {unit.bedrooms} bed{unit.bedrooms !== 1 ? "s" : ""}
                    </span>
                  )}
                  {unit.sqft != null && (
                    <span className="detail-unit-extra">
                      , {unit.sqft.toLocaleString()} sq ft
                    </span>
                  )}
                </>
              ) : (
                <span className="detail-placeholder">No unit assigned</span>
              )}
            </div>
          </div>

          <div className="detail-field">
            <div className="detail-label">Unit Status</div>
            <div className="detail-value">
              {unit?.status ? (
                <span className={`status-badge status-${unit.status}`}>
                  <span className="status-dot" />
                  {capitalize(unit.status)}
                </span>
              ) : (
                <span className="detail-placeholder">No unit on file</span>
              )}
            </div>
          </div>

          <div className="detail-field">
            <div className="detail-label">Lease Type</div>
            <div className="detail-value">
              {lease?.lease_type ? (
                capitalize(lease.lease_type.replace(/_/g, " "))
              ) : (
                <span className="detail-placeholder">No lease on file</span>
              )}
            </div>
          </div>

          <div className="detail-field">
            <div className="detail-label">Lease Status</div>
            <div className="detail-value">
              {lease ? (
                <span className={`status-badge status-${lease.status}`}>
                  <span className="status-dot" />
                  {capitalize(lease.status)}
                </span>
              ) : (
                <span className="detail-placeholder">No lease on file</span>
              )}
            </div>
          </div>

          <div className="detail-field">
            <div className="detail-label">Start Date</div>
            <div className="detail-value">
              {lease?.start_date ? (
                formatDate(lease.start_date)
              ) : (
                <span className="detail-placeholder">No start date on file</span>
              )}
            </div>
          </div>

          <div className="detail-field">
            <div className="detail-label">Monthly Rent</div>
            <div className="detail-value">
              {lease?.monthly_rent != null ? (
                formatCurrency(lease.monthly_rent)
              ) : (
                <span className="detail-placeholder">No monthly rent on file</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {showEdit && (
        <div className="modal-overlay" onClick={closeEdit}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3>Edit Resident</h3>
            <div className="modal-subtitle">
              Update {resident.first_name} {resident.last_name}&rsquo;s
              profile information.
            </div>

            {formError && <div className="form-error">{formError}</div>}

            <form onSubmit={handleEditSubmit}>
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

                <div className="form-field full">
                  <label>Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => updateField("email", e.target.value)}
                  />
                </div>

                <div className="form-field full">
                  <label>Phone</label>
                  <input
                    value={form.phone}
                    onChange={(e) => updateField("phone", e.target.value)}
                  />
                </div>

                <div className="form-field full">
                  <label>Date of birth</label>
                  <input
                    type="date"
                    value={form.dob}
                    onChange={(e) => updateField("dob", e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={closeEdit}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-green" disabled={saving}>
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}