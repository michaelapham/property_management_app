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
import PaymentModal from "../components/PaymentModal";
import {
  CheckIcon,
  PlusIcon,
  UploadIcon,
} from "../components/icons";

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
  const { data, recordPayment, undoPayment, addNote, importData } = useStore();
  const navigate = useNavigate();
  const month = currentMonthKey();
  const importFileRef = useRef<HTMLInputElement>(null);

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

  const [paymentFor, setPaymentFor] = useState<{
    row: Row;
    defaultMode: "full" | "partial";
  } | null>(null);
  const [noteFor, setNoteFor] = useState<{
    tenantId: string;
    propertyId: string;
    name: string;
  } | null>(null);

  const rows = useMemo(() => {
    return data.tenants
      .map((tenant) => {
        const record = data.rentRecords.find(
          (r) => r.tenantId === tenant.id && r.month === month
        );
        const property = data.properties.find((p) => p.id === tenant.propertyId);
        return record && property ? { tenant, record, property } : null;
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
      .sort((a, b) => {
        const order: Record<RentStatus, number> = { unpaid: 0, partial: 1, paid: 2 };
        return order[rentStatusOf(a.record)] - order[rentStatusOf(b.record)];
      });
  }, [data, month]);

  if (data.properties.length === 0) {
    return <Welcome />;
  }

  function submitPayment(amount: number | "full", method: PaymentMethod, notes: string) {
    if (!paymentFor) return;
    const { row } = paymentFor;
    recordPayment(row.record.id, amount, method, notes.trim() || undefined);
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
      <div className="section-title">
        <span>Rent — {monthLabel(month)}</span>
        <div style={{ display: "flex", gap: 6 }}>
          <button
            className="btn btn-ghost btn-xs"
            onClick={() => importFileRef.current?.click()}
          >
            <UploadIcon size={13} />
            Import
          </button>
          <button
            className="btn btn-primary btn-xs"
            onClick={() => navigate("/properties/new")}
          >
            <PlusIcon size={13} />
            Add Property
          </button>
        </div>
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
                style={{ cursor: "pointer" }}
                onClick={() => navigate(`/tenants/${row.tenant.id}`)}
              >
                {/* Top line: avatar · name + address + pill · status badge */}
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
                {/* Action buttons */}
                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                  {status !== "paid" ? (
                    <>
                      <button
                        className="btn btn-green btn-sm"
                        style={{ flex: 2 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setPaymentFor({ row, defaultMode: "full" });
                        }}
                      >
                        <CheckIcon size={16} />
                        {status === "partial"
                          ? `Collect ${money(remaining)}`
                          : "Mark Paid"}
                      </button>
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ flex: 1.4 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setPaymentFor({ row, defaultMode: "partial" });
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
                          undoPayment(row.record.id);
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
