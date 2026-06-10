import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useStore } from "../data/store";
import { currentMonthKey, rentStatusOf } from "../types";
import { fullAddress, money, monthLabel, shortDate } from "../utils/format";
import Avatar from "../components/Avatar";
import CallButton from "../components/CallButton";
import NoteModal from "../components/NoteModal";
import { BookIcon, ChevronLeft, PlusIcon, TrashIcon } from "../components/icons";

export default function TenantDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, removeTenant, updateTenant } = useStore();
  const [showNote, setShowNote] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Lease date editing
  const [editingLease, setEditingLease] = useState(false);
  const [leaseStart, setLeaseStart] = useState("");
  const [leaseEnd, setLeaseEnd] = useState("");

  const tenant = data.tenants.find((t) => t.id === id);
  if (!tenant) {
    return (
      <div className="empty-state">
        <h3>Tenant not found</h3>
        <Link className="btn btn-ghost" to="/tenants">Back to tenants</Link>
      </div>
    );
  }

  const property = data.properties.find((p) => p.id === tenant.propertyId);
  const record = data.rentRecords.find(
    (r) => r.tenantId === tenant.id && r.month === currentMonthKey()
  );
  const status = record ? rentStatusOf(record) : "unpaid";
  const notes = data.notes.filter((n) => n.tenantId === tenant.id);
  const history = data.rentRecords
    .filter((r) => r.tenantId === tenant.id)
    .sort((a, b) => b.month.localeCompare(a.month));

  function openLeaseEdit() {
    setLeaseStart(
      tenant!.moveInDate ? new Date(tenant!.moveInDate).toISOString().slice(0, 10) : ""
    );
    setLeaseEnd(
      tenant!.leaseEndDate ? new Date(tenant!.leaseEndDate).toISOString().slice(0, 10) : ""
    );
    setEditingLease(true);
  }

  function saveLease() {
    updateTenant(tenant!.id, {
      moveInDate: leaseStart ? new Date(leaseStart).toISOString() : undefined,
      leaseEndDate: leaseEnd ? new Date(leaseEnd).toISOString() : undefined,
    });
    setEditingLease(false);
  }

  return (
    <>
      <Link className="back-link" to="/tenants">
        <ChevronLeft size={16} /> Tenants
      </Link>

      <div className="card" style={{ textAlign: "center" }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 10 }}>
          <Avatar
            large
            first={tenant.firstName}
            last={tenant.lastName}
            photo={tenant.photoDataUrl}
          />
        </div>
        <h2>
          {tenant.firstName} {tenant.lastName}
        </h2>
        <p style={{ color: "var(--ink-soft)", fontSize: 15, marginTop: 4 }}>
          {property ? fullAddress(property) : "No property assigned"}
        </p>
        <div style={{ marginTop: 8 }}>
          <span className={`pill pill-${status}`}>
            {monthLabel(currentMonthKey())}:{" "}
            {status === "paid"
              ? "Paid"
              : status === "partial"
                ? `Partial — ${money(record?.amountPaid)} of ${money(record?.amountDue)}`
                : `Unpaid — ${money(record?.amountDue)} due`}
          </span>
          {tenant.petOnFile && (
            <span className="pill pill-partial" style={{ marginLeft: 6 }}>
              🐾 Pet on file
            </span>
          )}
        </div>
        {/* View Ledger button */}
        <div style={{ marginTop: 12 }}>
          <Link to={`/tenants/${tenant.id}/ledger`} className="btn btn-ghost btn-sm">
            <BookIcon size={15} /> View Ledger
          </Link>
        </div>
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <table className="kv-table">
          <tbody>
            <tr>
              <td>Rent</td>
              <td>{money(tenant.rentAmount)}/mo</td>
            </tr>
            <tr>
              <td>Email</td>
              <td>
                {tenant.email ? (
                  <a href={`mailto:${tenant.email}`} style={{ color: "var(--green)" }}>
                    {tenant.email}
                  </a>
                ) : "—"}
              </td>
            </tr>
            <tr>
              <td>Emergency contact</td>
              <td>{tenant.emergencyContactName || "—"}</td>
            </tr>
          </tbody>
        </table>
        <div style={{ display: "grid", gap: 9, marginTop: 14 }}>
          {tenant.phone && (
            <CallButton
              phone={tenant.phone}
              label={`Call ${tenant.firstName} — ${tenant.phone}`}
              calleeName={`${tenant.firstName} ${tenant.lastName}`}
              variant="green"
              block
            />
          )}
          {tenant.emergencyContactPhone && (
            <CallButton
              phone={tenant.emergencyContactPhone}
              label={`Emergency contact — ${tenant.emergencyContactPhone}`}
              calleeName={tenant.emergencyContactName || "Emergency contact"}
              variant="ghost"
              block
            />
          )}
        </div>
      </div>

      {/* Lease dates */}
      <div className="section-title">
        <span>Lease Dates</span>
        {!editingLease && (
          <button className="btn btn-ghost btn-sm" onClick={openLeaseEdit}>
            Edit
          </button>
        )}
      </div>
      <div className="card">
        {editingLease ? (
          <>
            <div className="field-row">
              <div className="field">
                <label>Lease Start</label>
                <input
                  type="date"
                  value={leaseStart}
                  onChange={(e) => setLeaseStart(e.target.value)}
                />
              </div>
              <div className="field">
                <label>Lease End</label>
                <input
                  type="date"
                  value={leaseEnd}
                  onChange={(e) => setLeaseEnd(e.target.value)}
                />
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setEditingLease(false)}
              >
                Cancel
              </button>
              <button className="btn btn-primary btn-sm" onClick={saveLease}>
                Save
              </button>
            </div>
          </>
        ) : (
          <table className="kv-table">
            <tbody>
              <tr>
                <td>Lease start</td>
                <td>{shortDate(tenant.moveInDate)}</td>
              </tr>
              <tr>
                <td>Lease end</td>
                <td>{tenant.leaseEndDate ? shortDate(tenant.leaseEndDate) : "Ongoing"}</td>
              </tr>
            </tbody>
          </table>
        )}
      </div>

      <div className="section-title">
        <span>Notes & History</span>
        <button className="btn btn-ghost btn-sm" onClick={() => setShowNote(true)}>
          <PlusIcon size={14} /> Note
        </button>
      </div>
      <div className="card">
        {notes.length === 0 && (
          <p style={{ color: "var(--ink-soft)", fontSize: 15 }}>
            No notes yet. Jot down interactions, complaints, maintenance —
            future you will be glad.
          </p>
        )}
        {notes.map((n) => (
          <div key={n.id} className="note-item">
            <div className="note-meta">
              <span>{shortDate(n.date)}</span>
              {n.tags.map((t) => (
                <span key={t}>#{t}</span>
              ))}
            </div>
            {n.text && <div className="note-text">{n.text}</div>}
          </div>
        ))}
      </div>

      <div className="section-title">
        <span>Rent History</span>
      </div>
      <div className="card">
        <table className="kv-table">
          <tbody>
            {history.map((r) => {
              const s = rentStatusOf(r);
              return (
                <tr key={r.id}>
                  <td>{monthLabel(r.month)}</td>
                  <td>
                    <span className={`pill pill-${s}`}>
                      {money(r.amountPaid)} / {money(r.amountDue)}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 20 }}>
        {!confirmDelete ? (
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setConfirmDelete(true)}
          >
            <TrashIcon size={15} /> Remove Tenant
          </button>
        ) : (
          <div style={{ display: "flex", gap: 8 }}>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setConfirmDelete(false)}
            >
              Cancel
            </button>
            <button
              className="btn btn-danger btn-sm"
              onClick={() => {
                removeTenant(tenant.id);
                navigate("/tenants");
              }}
            >
              Confirm — Remove {tenant.firstName} & Their History
            </button>
          </div>
        )}
      </div>

      {showNote && (
        <NoteModal
          tenantId={tenant.id}
          propertyId={tenant.propertyId}
          onClose={() => setShowNote(false)}
        />
      )}
    </>
  );
}
