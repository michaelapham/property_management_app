import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useStore } from "../data/store";
import {
  currentMonthKey,
  rentStatusOf,
  NOTICE_METHOD_LABEL,
  NOTICE_TYPE_LABEL,
  type LateFeeSettings,
  type NoticeMethod,
  type NoticeType,
} from "../types";
import { fullAddress, money, monthLabel, shortDate } from "../utils/format";
import Avatar from "../components/Avatar";
import CallButton from "../components/CallButton";
import NoteModal from "../components/NoteModal";
import { BookIcon, ChevronLeft, PlusIcon, TrashIcon } from "../components/icons";

export default function TenantDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const {
    data,
    removeTenant,
    updateTenant,
    updateTenantRent,
    updateDeposit,
    addDepositDeduction,
    removeDepositDeduction,
    addTenantNotice,
    removeTenantNotice,
  } = useStore();

  const [showNote, setShowNote] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Lease date editing
  const [editingLease, setEditingLease] = useState(false);
  const [leaseStart, setLeaseStart] = useState("");
  const [leaseEnd, setLeaseEnd] = useState("");

  // Rent editing
  const [editingRent, setEditingRent] = useState(false);
  const [newRentAmount, setNewRentAmount] = useState("");
  const [rentChangeNote, setRentChangeNote] = useState("");

  // Late fee settings
  const [editingLateFee, setEditingLateFee] = useState(false);
  const [lfEnabled, setLfEnabled] = useState(false);
  const [lfGrace, setLfGrace] = useState(5);
  const [lfType, setLfType] = useState<"flat" | "percent">("flat");
  const [lfAmount, setLfAmount] = useState("");

  // Deposit editing
  const [editingDeposit, setEditingDeposit] = useState(false);
  const [depCollected, setDepCollected] = useState("");
  const [depDateCollected, setDepDateCollected] = useState("");
  const [depHeld, setDepHeld] = useState("");

  // Deposit deduction add
  const [showAddDed, setShowAddDed] = useState(false);
  const [dedDate, setDedDate] = useState(new Date().toISOString().slice(0, 10));
  const [dedReason, setDedReason] = useState("");
  const [dedAmount, setDedAmount] = useState("");

  // Notices
  const [showAddNotice, setShowAddNotice] = useState(false);
  const [notDate, setNotDate] = useState(new Date().toISOString().slice(0, 10));
  const [notType, setNotType] = useState<NoticeType>("late");
  const [notMethod, setNotMethod] = useState<NoticeMethod>("email");
  const [notNotes, setNotNotes] = useState("");

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
  const paymentHistory = data.rentRecords
    .filter((r) => r.tenantId === tenant.id)
    .sort((a, b) => b.month.localeCompare(a.month));

  // ── Lease helpers ──────────────────────────────────────────────────────────
  function openLeaseEdit() {
    setLeaseStart(tenant!.moveInDate ? new Date(tenant!.moveInDate).toISOString().slice(0, 10) : "");
    setLeaseEnd(tenant!.leaseEndDate ? new Date(tenant!.leaseEndDate).toISOString().slice(0, 10) : "");
    setEditingLease(true);
  }
  function saveLease() {
    updateTenant(tenant!.id, {
      moveInDate: leaseStart ? new Date(leaseStart).toISOString() : undefined,
      leaseEndDate: leaseEnd ? new Date(leaseEnd).toISOString() : undefined,
    });
    setEditingLease(false);
  }

  // ── Rent helpers ───────────────────────────────────────────────────────────
  function openRentEdit() {
    setNewRentAmount(String(tenant!.rentAmount));
    setRentChangeNote("");
    setEditingRent(true);
  }
  function saveRent() {
    const amt = parseFloat(newRentAmount);
    if (isNaN(amt) || amt < 0) return;
    updateTenantRent(tenant!.id, amt, rentChangeNote);
    setEditingRent(false);
  }

  // ── Late fee helpers ───────────────────────────────────────────────────────
  function openLateFeeEdit() {
    const s = tenant!.lateFeeSettings;
    setLfEnabled(s?.enabled ?? false);
    setLfGrace(s?.gracePeriodDays ?? 5);
    setLfType(s?.feeType ?? "flat");
    setLfAmount(String(s?.feeAmount ?? ""));
    setEditingLateFee(true);
  }
  function saveLateFee() {
    const settings: LateFeeSettings = {
      enabled: lfEnabled,
      gracePeriodDays: Math.max(0, lfGrace),
      feeType: lfType,
      feeAmount: parseFloat(lfAmount) || 0,
    };
    updateTenant(tenant!.id, { lateFeeSettings: settings });
    setEditingLateFee(false);
  }

  // ── Deposit helpers ────────────────────────────────────────────────────────
  function openDepositEdit() {
    const d = tenant!.deposit;
    setDepCollected(d ? String(d.amountCollected) : "");
    setDepDateCollected(d?.dateCollected ? new Date(d.dateCollected).toISOString().slice(0, 10) : "");
    setDepHeld(d ? String(d.amountHeld) : "");
    setEditingDeposit(true);
  }
  function saveDeposit() {
    updateDeposit(tenant!.id, {
      amountCollected: parseFloat(depCollected) || 0,
      dateCollected: depDateCollected ? new Date(depDateCollected).toISOString() : undefined,
      amountHeld: parseFloat(depHeld) || 0,
    });
    setEditingDeposit(false);
  }
  function submitDeduction() {
    if (!dedReason.trim() || !dedAmount) return;
    addDepositDeduction(tenant!.id, {
      date: new Date(dedDate).toISOString(),
      reason: dedReason.trim(),
      amount: parseFloat(dedAmount) || 0,
    });
    setDedDate(new Date().toISOString().slice(0, 10));
    setDedReason("");
    setDedAmount("");
    setShowAddDed(false);
  }

  // ── Notice helpers ─────────────────────────────────────────────────────────
  function submitNotice() {
    addTenantNotice(tenant!.id, {
      date: new Date(notDate).toISOString(),
      noticeType: notType,
      methodServed: notMethod,
      notes: notNotes.trim() || undefined,
    });
    setNotDate(new Date().toISOString().slice(0, 10));
    setNotNotes("");
    setShowAddNotice(false);
  }

  // ── Deposit summary ────────────────────────────────────────────────────────
  const deposit = tenant.deposit;
  const totalDeductions = deposit?.deductions.reduce((s, d) => s + d.amount, 0) ?? 0;
  const depositBalance = (deposit?.amountHeld ?? 0) - totalDeductions;

  return (
    <>
      <Link className="back-link" to="/tenants">
        <ChevronLeft size={16} /> Tenants
      </Link>

      {/* Header card */}
      <div className="card" style={{ textAlign: "center" }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 10 }}>
          <Avatar large first={tenant.firstName} last={tenant.lastName} photo={tenant.photoDataUrl} />
        </div>
        <h2>{tenant.firstName} {tenant.lastName}</h2>
        <p style={{ color: "var(--ink-soft)", fontSize: 15, marginTop: 4 }}>
          {property ? (
            <span
              style={{ cursor: "pointer", display: "inline-block", padding: "4px 10px", margin: "-4px -10px" }}
              onClick={() => navigate(`/properties/${property.id}`)}
            >
              {fullAddress(property)}
            </span>
          ) : "No property assigned"}
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
            <span className="pill pill-partial" style={{ marginLeft: 6 }}>🐾 Pet on file</span>
          )}
        </div>
        <div style={{ marginTop: 12 }}>
          <Link to={`/tenants/${tenant.id}/ledger`} className="btn btn-ghost btn-sm">
            <BookIcon size={15} /> View Ledger
          </Link>
        </div>
      </div>

      {/* Contact / rent info card */}
      <div className="card" style={{ marginTop: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-soft)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Details</span>
          {!editingRent && (
            <button className="btn btn-ghost btn-xs" onClick={openRentEdit}>Edit Rent</button>
          )}
        </div>
        {editingRent ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div className="field-row">
              <div className="field">
                <label>New Monthly Rent</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={newRentAmount}
                  onChange={(e) => setNewRentAmount(e.target.value)}
                />
              </div>
            </div>
            <div className="field">
              <label>Reason / Note (optional)</label>
              <input
                type="text"
                placeholder="e.g. Annual increase per lease terms"
                value={rentChangeNote}
                onChange={(e) => setRentChangeNote(e.target.value)}
              />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setEditingRent(false)}>Cancel</button>
              <button className="btn btn-primary btn-sm" onClick={saveRent}>Save</button>
            </div>
          </div>
        ) : (
          <>
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
                      <a href={`mailto:${tenant.email}`} style={{ color: "var(--green)" }}>{tenant.email}</a>
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
          </>
        )}
      </div>

      {/* Lease dates */}
      <div className="section-title">
        <span>Lease Dates</span>
        {!editingLease && (
          <button className="btn btn-ghost btn-sm" onClick={openLeaseEdit}>Edit</button>
        )}
      </div>
      <div className="card">
        {editingLease ? (
          <>
            <div className="field-row">
              <div className="field">
                <label>Lease Start</label>
                <input type="date" value={leaseStart} onChange={(e) => setLeaseStart(e.target.value)} />
              </div>
              <div className="field">
                <label>Lease End</label>
                <input type="date" value={leaseEnd} onChange={(e) => setLeaseEnd(e.target.value)} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setEditingLease(false)}>Cancel</button>
              <button className="btn btn-primary btn-sm" onClick={saveLease}>Save</button>
            </div>
          </>
        ) : (
          <table className="kv-table">
            <tbody>
              <tr><td>Lease start</td><td>{shortDate(tenant.moveInDate)}</td></tr>
              <tr><td>Lease end</td><td>{tenant.leaseEndDate ? shortDate(tenant.leaseEndDate) : "Ongoing"}</td></tr>
            </tbody>
          </table>
        )}
      </div>

      {/* Late Fee Settings */}
      <div className="section-title">
        <span>Late Fee Settings</span>
        {!editingLateFee && (
          <button className="btn btn-ghost btn-sm" onClick={openLateFeeEdit}>
            {tenant.lateFeeSettings ? "Edit" : "Set Up"}
          </button>
        )}
      </div>
      <div className="card">
        {editingLateFee ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 10, fontWeight: 600, fontSize: 15 }}>
              <input
                type="checkbox"
                checked={lfEnabled}
                onChange={(e) => setLfEnabled(e.target.checked)}
                style={{ width: 18, height: 18 }}
              />
              Enable late fees for this tenant
            </label>
            <div className="field-row">
              <div className="field">
                <label>Grace Period (days)</label>
                <input
                  type="number" min="0" max="30"
                  value={lfGrace}
                  onChange={(e) => setLfGrace(parseInt(e.target.value) || 0)}
                  disabled={!lfEnabled}
                />
              </div>
              <div className="field">
                <label>Fee Type</label>
                <select value={lfType} onChange={(e) => setLfType(e.target.value as "flat" | "percent")} disabled={!lfEnabled}>
                  <option value="flat">Flat $</option>
                  <option value="percent">% of rent</option>
                </select>
              </div>
              <div className="field">
                <label>{lfType === "percent" ? "Percent (%)" : "Amount ($)"}</label>
                <input
                  type="number" min="0" step="0.01"
                  value={lfAmount}
                  onChange={(e) => setLfAmount(e.target.value)}
                  disabled={!lfEnabled}
                />
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setEditingLateFee(false)}>Cancel</button>
              <button className="btn btn-primary btn-sm" onClick={saveLateFee}>Save</button>
            </div>
          </div>
        ) : (
          <table className="kv-table">
            <tbody>
              <tr>
                <td>Status</td>
                <td>
                  <span style={{
                    fontSize: 12, fontWeight: 600, padding: "2px 8px", borderRadius: 99,
                    background: tenant.lateFeeSettings?.enabled ? "var(--green-bg)" : "var(--surface-2)",
                    color: tenant.lateFeeSettings?.enabled ? "var(--green)" : "var(--ink-soft)",
                  }}>
                    {tenant.lateFeeSettings?.enabled ? "Enabled" : "Disabled"}
                  </span>
                </td>
              </tr>
              {tenant.lateFeeSettings?.enabled && (
                <>
                  <tr>
                    <td>Grace period</td>
                    <td>{tenant.lateFeeSettings.gracePeriodDays} day{tenant.lateFeeSettings.gracePeriodDays !== 1 ? "s" : ""}</td>
                  </tr>
                  <tr>
                    <td>Fee</td>
                    <td>
                      {tenant.lateFeeSettings.feeType === "percent"
                        ? `${tenant.lateFeeSettings.feeAmount}% of rent (${money(tenant.rentAmount * tenant.lateFeeSettings.feeAmount / 100)})`
                        : money(tenant.lateFeeSettings.feeAmount)}
                    </td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Security Deposit */}
      <div className="section-title">
        <span>Security Deposit</span>
        {!editingDeposit && (
          <button className="btn btn-ghost btn-sm" onClick={openDepositEdit}>
            {deposit ? "Edit" : "Add"}
          </button>
        )}
      </div>
      <div className="card">
        {editingDeposit ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div className="field-row">
              <div className="field">
                <label>Amount Collected ($)</label>
                <input type="number" min="0" step="0.01" value={depCollected} onChange={(e) => setDepCollected(e.target.value)} />
              </div>
              <div className="field">
                <label>Date Collected</label>
                <input type="date" value={depDateCollected} onChange={(e) => setDepDateCollected(e.target.value)} />
              </div>
              <div className="field">
                <label>Current Amount Held ($)</label>
                <input type="number" min="0" step="0.01" value={depHeld} onChange={(e) => setDepHeld(e.target.value)} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setEditingDeposit(false)}>Cancel</button>
              <button className="btn btn-primary btn-sm" onClick={saveDeposit}>Save</button>
            </div>
          </div>
        ) : deposit ? (
          <>
            <table className="kv-table">
              <tbody>
                <tr><td>Collected</td><td>{money(deposit.amountCollected)}{deposit.dateCollected ? ` on ${shortDate(deposit.dateCollected)}` : ""}</td></tr>
                <tr><td>Currently held</td><td>{money(deposit.amountHeld)}</td></tr>
                <tr><td>Deductions</td><td style={{ color: totalDeductions > 0 ? "var(--red)" : undefined }}>{totalDeductions > 0 ? `−${money(totalDeductions)}` : "None"}</td></tr>
                <tr>
                  <td style={{ fontWeight: 700 }}>Balance owed</td>
                  <td style={{ fontWeight: 700, color: depositBalance >= 0 ? "var(--green)" : "var(--red)" }}>
                    {money(Math.abs(depositBalance))}{depositBalance < 0 ? " overdue" : ""}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Deductions log */}
            {deposit.deductions.length > 0 && (
              <div style={{ marginTop: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-soft)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>Deductions</div>
                {deposit.deductions.map((d) => (
                  <div key={d.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid var(--line)" }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 500 }}>{d.reason}</div>
                      <div style={{ fontSize: 12, color: "var(--ink-soft)" }}>{shortDate(d.date)}</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ color: "var(--red)", fontWeight: 600 }}>−{money(d.amount)}</span>
                      <button
                        className="btn btn-ghost btn-xs"
                        style={{ padding: "2px 6px" }}
                        onClick={() => removeDepositDeduction(tenant.id, d.id)}
                      >
                        <TrashIcon size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add deduction */}
            {showAddDed ? (
              <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                <div className="field-row">
                  <div className="field">
                    <label>Date</label>
                    <input type="date" value={dedDate} onChange={(e) => setDedDate(e.target.value)} />
                  </div>
                  <div className="field" style={{ flex: 2 }}>
                    <label>Reason</label>
                    <input type="text" placeholder="e.g. Carpet cleaning" value={dedReason} onChange={(e) => setDedReason(e.target.value)} />
                  </div>
                  <div className="field">
                    <label>Amount ($)</label>
                    <input type="number" min="0" step="0.01" value={dedAmount} onChange={(e) => setDedAmount(e.target.value)} />
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => setShowAddDed(false)}>Cancel</button>
                  <button className="btn btn-primary btn-sm" onClick={submitDeduction}>Add Deduction</button>
                </div>
              </div>
            ) : (
              <button className="btn btn-ghost btn-sm" style={{ marginTop: 12 }} onClick={() => setShowAddDed(true)}>
                <PlusIcon size={13} /> Add Deduction
              </button>
            )}
          </>
        ) : (
          <p style={{ color: "var(--ink-soft)", fontSize: 15 }}>No deposit on file. Tap "Add" to record deposit details.</p>
        )}
      </div>

      {/* Notes */}
      <div className="section-title">
        <span>Notes & History</span>
        <button className="btn btn-ghost btn-sm" onClick={() => setShowNote(true)}>
          <PlusIcon size={14} /> Note
        </button>
      </div>
      <div className="card">
        {notes.length === 0 && (
          <p style={{ color: "var(--ink-soft)", fontSize: 15 }}>
            No notes yet. Jot down interactions, complaints, maintenance — future you will be glad.
          </p>
        )}
        {notes.map((n) => (
          <div key={n.id} className="note-item">
            <div className="note-meta">
              <span>{shortDate(n.date)}</span>
              {n.tags.map((t) => <span key={t}>#{t}</span>)}
            </div>
            {n.text && <div className="note-text">{n.text}</div>}
          </div>
        ))}
      </div>

      {/* Payment History (formerly "Rent History") */}
      <div className="section-title">
        <span>Payment History</span>
      </div>
      <div className="card">
        <table className="kv-table">
          <tbody>
            {paymentHistory.map((r) => {
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

      {/* Rent Rate History */}
      <div className="section-title">
        <span>Rent Rate History</span>
      </div>
      <div className="card">
        {!tenant.rentHistory || tenant.rentHistory.length === 0 ? (
          <p style={{ color: "var(--ink-soft)", fontSize: 15 }}>
            No rate changes recorded. Changes made via "Edit Rent" above are logged here automatically.
          </p>
        ) : (
          <table className="kv-table">
            <tbody>
              {[...tenant.rentHistory].reverse().map((h) => (
                <tr key={h.id}>
                  <td style={{ fontSize: 13, color: "var(--ink-soft)" }}>{shortDate(h.date)}</td>
                  <td>
                    <span style={{ color: "var(--ink-soft)", textDecoration: "line-through", marginRight: 6 }}>{money(h.previousAmount)}</span>
                    <span style={{ fontWeight: 600, color: "var(--green)" }}>→ {money(h.newAmount)}</span>
                  </td>
                  <td style={{ fontSize: 13, color: "var(--ink-soft)" }}>{h.note || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Notices */}
      <div className="section-title">
        <span>Notices</span>
        {!showAddNotice && (
          <button className="btn btn-ghost btn-sm" onClick={() => setShowAddNotice(true)}>
            <PlusIcon size={14} /> Add
          </button>
        )}
      </div>
      <div className="card">
        {showAddNotice && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16, paddingBottom: 16, borderBottom: "1px solid var(--line)" }}>
            <div className="field-row">
              <div className="field">
                <label>Date</label>
                <input type="date" value={notDate} onChange={(e) => setNotDate(e.target.value)} />
              </div>
              <div className="field">
                <label>Notice Type</label>
                <select value={notType} onChange={(e) => setNotType(e.target.value as NoticeType)}>
                  {(Object.keys(NOTICE_TYPE_LABEL) as NoticeType[]).map((k) => (
                    <option key={k} value={k}>{NOTICE_TYPE_LABEL[k]}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Method Served</label>
                <select value={notMethod} onChange={(e) => setNotMethod(e.target.value as NoticeMethod)}>
                  {(Object.keys(NOTICE_METHOD_LABEL) as NoticeMethod[]).map((k) => (
                    <option key={k} value={k}>{NOTICE_METHOD_LABEL[k]}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="field">
              <label>Notes (optional)</label>
              <input type="text" placeholder="Additional details…" value={notNotes} onChange={(e) => setNotNotes(e.target.value)} />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowAddNotice(false)}>Cancel</button>
              <button className="btn btn-primary btn-sm" onClick={submitNotice}>Save Notice</button>
            </div>
          </div>
        )}
        {!tenant.notices || tenant.notices.length === 0 ? (
          <p style={{ color: "var(--ink-soft)", fontSize: 15 }}>No notices logged yet.</p>
        ) : (
          tenant.notices.map((n) => (
            <div key={n.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "8px 0", borderBottom: "1px solid var(--line)" }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{NOTICE_TYPE_LABEL[n.noticeType]}</div>
                <div style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 2 }}>
                  {shortDate(n.date)} · {NOTICE_METHOD_LABEL[n.methodServed]}
                </div>
                {n.notes && <div style={{ fontSize: 13, color: "var(--ink)", marginTop: 3 }}>{n.notes}</div>}
              </div>
              <button
                className="btn btn-ghost btn-xs"
                style={{ padding: "2px 6px", flexShrink: 0, marginLeft: 8 }}
                onClick={() => removeTenantNotice(tenant.id, n.id)}
              >
                <TrashIcon size={12} />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Delete tenant */}
      <div style={{ marginTop: 20 }}>
        {!confirmDelete ? (
          <button className="btn btn-ghost btn-sm" onClick={() => setConfirmDelete(true)}>
            <TrashIcon size={15} /> Remove Tenant
          </button>
        ) : (
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setConfirmDelete(false)}>Cancel</button>
            <button
              className="btn btn-danger btn-sm"
              onClick={() => { removeTenant(tenant.id); navigate("/tenants"); }}
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
