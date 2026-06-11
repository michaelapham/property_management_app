import { useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useStore } from "../data/store";
import {
  currentMonthKey,
  rentStatusOf,
  type PaymentMethod,
  type Property,
  type RentRecord,
  type RentStatus,
  type Tenant,
} from "../types";
import { fullAddress, money, monthLabel } from "../utils/format";
import Avatar from "../components/Avatar";
import NoteModal from "../components/NoteModal";
import Overlay from "../components/Overlay";
import PaymentModal from "../components/PaymentModal";
import { CheckIcon, PlusIcon, UploadIcon } from "../components/icons";

const STATUS_LABEL: Record<RentStatus, string> = {
  paid: "Paid",
  partial: "Partial",
  unpaid: "Unpaid",
};

type Row = {
  tenant: ReturnType<typeof useStore>["data"]["tenants"][number];
  record: RentRecord;
  property: ReturnType<typeof useStore>["data"]["properties"][number];
};

type PropStatus = "occupied" | "vacant" | "pending";

function propStatusOf(property: Property, tenants: Tenant[]): PropStatus {
  if (property.propertyStatus === "pending") return "pending";
  return tenants.some((t) => t.propertyId === property.id) ? "occupied" : "vacant";
}

function daysSince(isoDate?: string): number {
  if (!isoDate) return 0;
  return Math.floor((Date.now() - new Date(isoDate).getTime()) / 86400000);
}

function StatusBadge({ property }: { property: Property }) {
  const { data, updateProperty } = useStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const status = propStatusOf(property, data.tenants);
  const days = status === "vacant" ? daysSince(property.lastOccupiedDate) : null;
  return (
    <div
      style={{ position: "relative", flexShrink: 0 }}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        className={`status-badge status-badge-${status}`}
        onClick={() => setMenuOpen((v) => !v)}
      >
        <span className={`status-dot dot-${status}`} />
        {status === "occupied" && "Occupied"}
        {status === "vacant" && (days && days > 0 ? `Vacant · ${days}d` : "Vacant")}
        {status === "pending" && "Pending"}
      </button>
      {menuOpen && (
        <div className="status-menu">
          <button
            className="status-menu-item"
            onClick={() => {
              updateProperty(property.id, {
                propertyStatus: status === "pending" ? undefined : "pending",
              });
              setMenuOpen(false);
            }}
          >
            {status === "pending" ? "Clear Pending" : "Set Pending"}
          </button>
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const { data, undoPayment, addNote, importData, recordPaymentForMonth } = useStore();
  const navigate = useNavigate();
  const importFileRef = useRef<HTMLInputElement>(null);

  const [viewMonth, setViewMonth] = useState(currentMonthKey);
  const [pendingConfirm, setPendingConfirm] = useState<{ action: () => void } | null>(null);
  const [paymentFor, setPaymentFor] = useState<{ row: Row; defaultMode: "full" | "partial" } | null>(null);
  const [noteFor, setNoteFor] = useState<{ tenantId: string; propertyId: string; name: string } | null>(null);

  function shiftMonth(delta: number) {
    setViewMonth((prev) => {
      const [y, m] = prev.split("-").map(Number);
      const d = new Date(y, m - 1 + delta);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    });
  }

  // Gate any payment/undo action on past months behind a confirmation modal.
  function withPastConfirm(action: () => void) {
    if (viewMonth < currentMonthKey()) {
      setPendingConfirm({ action });
    } else {
      action();
    }
  }

  function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string);
        if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.properties)) {
          alert("Invalid backup file — please choose a LandlordHQ .json export.");
          return;
        }
        if (confirm("Replace all current data with this backup?")) {
          importData(parsed);
        }
      } catch {
        alert("Could not read the file. Make sure it's a valid JSON backup.");
      }
      e.target.value = "";
    };
    reader.readAsText(file);
  }

  const rows = useMemo(() => {
    return data.tenants
      .map((tenant) => {
        const property = data.properties.find((p) => p.id === tenant.propertyId);
        if (!property) return null;
        const record = data.rentRecords.find(
          (r) => r.tenantId === tenant.id && r.month === viewMonth
        );
        // If no stored record, show as virtual unpaid (correct for past, present, and future).
        const effectiveRecord: RentRecord = record ?? {
          id: `__virtual__${tenant.id}__${viewMonth}`,
          tenantId: tenant.id,
          month: viewMonth,
          amountDue: tenant.rentAmount,
          amountPaid: 0,
        };
        return { tenant, record: effectiveRecord, property };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
      .sort((a, b) => {
        const sa = rentStatusOf(a.record);
        const sb = rentStatusOf(b.record);
        // Paid rows sink to the bottom.
        if (sa === "paid" && sb !== "paid") return 1;
        if (sb === "paid" && sa !== "paid") return -1;
        const order: Record<RentStatus, number> = { unpaid: 0, partial: 1, paid: 2 };
        return order[sa] - order[sb];
      });
  }, [data, viewMonth]);

  if (data.properties.length === 0) {
    return <Welcome />;
  }

  function submitPayment(amount: number | "full", method: PaymentMethod, notes: string) {
    if (!paymentFor) return;
    const { row } = paymentFor;
    recordPaymentForMonth(row.tenant.id, viewMonth, amount, method, notes.trim() || undefined);
    if (notes.trim()) {
      addNote({
        tenantId: row.tenant.id,
        propertyId: row.property.id,
        date: new Date().toISOString(),
        text: notes.trim(),
        tags: ["payment"],
      });
    }
    setPaymentFor(null);
  }

  return (
    <>
      <input
        ref={importFileRef}
        type="file"
        accept=".json"
        style={{ display: "none" }}
        onChange={handleImportFile}
      />

      {/* Month navigation */}
      <div className="month-nav-bar">
        <div style={{ display: "flex", gap: 4 }}>
          <button className="month-nav-btn" onClick={() => shiftMonth(-12)} aria-label="Back 1 year">«</button>
          <button className="month-nav-btn" onClick={() => shiftMonth(-1)} aria-label="Back 1 month">‹</button>
        </div>
        <span className={`month-nav-label month-nav-label-${viewMonth < currentMonthKey() ? "past" : viewMonth > currentMonthKey() ? "future" : "current"}`}>
          RENT — {monthLabel(viewMonth).toUpperCase()}
        </span>
        <div style={{ display: "flex", gap: 4 }}>
          <button className="month-nav-btn" onClick={() => shiftMonth(1)} aria-label="Forward 1 month">›</button>
          <button className="month-nav-btn" onClick={() => shiftMonth(12)} aria-label="Forward 1 year">»</button>
        </div>
      </div>

      {/* Import / Add Property */}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 6, marginBottom: 12 }}>
        <button className="btn btn-ghost btn-xs" onClick={() => importFileRef.current?.click()}>
          <UploadIcon size={13} />
          Import
        </button>
        <button className="btn btn-primary btn-xs" onClick={() => navigate("/properties/new")}>
          <PlusIcon size={13} />
          Add Property
        </button>
      </div>

      {rows.length === 0 && (
        <div className="card">
          <p style={{ color: "var(--ink-soft)", fontSize: 16 }}>
            No tenants yet — add a tenant to a property to start tracking rent.
          </p>
        </div>
      )}

      {rows.length > 0 && (
        <div className="rent-table">
          {rows.map((row, i) => {
            const status = rentStatusOf(row.record);
            const remaining = row.record.amountDue - row.record.amountPaid;
            return (
              <div
                key={row.record.id}
                className={`rent-row${i % 2 === 1 ? " rent-row-alt" : ""}`}
                style={{ cursor: "pointer", opacity: status === "paid" ? 0.45 : 1 }}
                onClick={() => navigate(`/tenants/${row.tenant.id}`)}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <Link
                    to={`/tenants/${row.tenant.id}`}
                    style={{ flexShrink: 0 }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Avatar
                      first={row.tenant.firstName}
                      last={row.tenant.lastName}
                      photo={row.tenant.photoDataUrl}
                    />
                  </Link>
                  <div className="row-body">
                    <div className="row-title" style={{ fontSize: 15 }}>
                      {row.tenant.firstName} {row.tenant.lastName}
                    </div>
                    <div className="row-sub" style={{ fontSize: 13 }}>
                      {fullAddress(row.property)}
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 5, flexShrink: 0 }}>
                    <span className={`pill pill-${status}`} style={{ fontSize: 12 }}>
                      {STATUS_LABEL[status]}
                      {status === "partial" &&
                        ` — ${money(row.record.amountPaid)} of ${money(row.record.amountDue)}`}
                      {status === "unpaid" && ` — ${money(row.record.amountDue)} due`}
                      {status === "paid" && ` — ${money(row.record.amountDue)}`}
                    </span>
                    <StatusBadge property={row.property} />
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                  {status !== "paid" ? (
                    <>
                      <button
                        className="btn btn-green btn-sm"
                        style={{ flex: 2 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          withPastConfirm(() => setPaymentFor({ row, defaultMode: "full" }));
                        }}
                      >
                        <CheckIcon size={16} />
                        {status === "partial" ? `Collect ${money(remaining)}` : "Mark Paid"}
                      </button>
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ flex: 1.4 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          withPastConfirm(() => setPaymentFor({ row, defaultMode: "partial" }));
                        }}
                      >
                        Partial…
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ flex: 1 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setNoteFor({
                            tenantId: row.tenant.id,
                            propertyId: row.property.id,
                            name: row.tenant.firstName,
                          });
                        }}
                      >
                        + Note
                      </button>
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ flex: 1 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          withPastConfirm(() => undoPayment(row.record.id));
                        }}
                      >
                        Undo
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Past-month edit confirmation */}
      {pendingConfirm && (
        <Overlay className="modal-backdrop" onBackdropClick={() => setPendingConfirm(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 10 }}>Edit Past Month?</h2>
            <p style={{ color: "var(--ink-soft)", fontSize: 15, marginBottom: 20 }}>
              You're editing a past month ({monthLabel(viewMonth)}). Are you sure?
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                className="btn btn-ghost"
                style={{ flex: 1 }}
                onClick={() => setPendingConfirm(null)}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                style={{ flex: 1 }}
                onClick={() => {
                  pendingConfirm.action();
                  setPendingConfirm(null);
                }}
              >
                Confirm
              </button>
            </div>
          </div>
        </Overlay>
      )}

      {paymentFor && (
        <PaymentModal
          record={paymentFor.row.record}
          tenant={paymentFor.row.tenant}
          defaultMode={paymentFor.defaultMode}
          onSubmit={submitPayment}
          onClose={() => setPaymentFor(null)}
        />
      )}

      {noteFor && (
        <NoteModal
          tenantId={noteFor.tenantId}
          propertyId={noteFor.propertyId}
          title={`Add a Note — ${noteFor.name}`}
          onClose={() => setNoteFor(null)}
        />
      )}
    </>
  );
}

function Welcome() {
  const navigate = useNavigate();
  return (
    <div className="empty-state" style={{ paddingTop: 70 }}>
      <div className="big">🏡</div>
      <h3>Welcome to LandlordHQ</h3>
      <p>
        Ditch the notes app and the spreadsheet. Track rent in one tap, keep
        tenant notes, find contractors, and scan receipts — all in one place.
      </p>
      <button
        className="btn btn-primary btn-lg"
        onClick={() => navigate("/properties/new")}
      >
        <PlusIcon size={20} />
        Add Your First Property
      </button>
    </div>
  );
}
