import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useStore } from "../data/store";
import {
  currentMonthKey,
  rentStatusOf,
  type RentRecord,
  type RentStatus,
} from "../types";
import { fullAddress, money, monthLabel } from "../utils/format";
import Avatar from "../components/Avatar";
import NoteModal from "../components/NoteModal";
import PartialPaymentModal from "../components/PartialPaymentModal";
import {
  CheckIcon,
  PlusIcon,
  ScanIcon,
  SparkleIcon,
  WrenchIcon,
} from "../components/icons";

const STATUS_LABEL: Record<RentStatus, string> = {
  paid: "Paid",
  partial: "Partial",
  unpaid: "Unpaid",
};

export default function Dashboard() {
  const { data, recordPayment, undoPayment } = useStore();
  const navigate = useNavigate();
  const month = currentMonthKey();

  const [partialFor, setPartialFor] = useState<RentRecord | null>(null);
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

  const counts = useMemo(() => {
    const c = { paid: 0, partial: 0, unpaid: 0 };
    rows.forEach(({ record }) => c[rentStatusOf(record)]++);
    return c;
  }, [rows]);

  if (data.properties.length === 0) {
    return <Welcome />;
  }

  function markPaid(row: (typeof rows)[number]) {
    recordPayment(row.record.id, "full");
    setNoteFor({
      tenantId: row.tenant.id,
      propertyId: row.property.id,
      name: row.tenant.firstName,
    });
  }

  function submitPartial(amount: number) {
    if (!partialFor) return;
    const row = rows.find((r) => r.record.id === partialFor.id);
    recordPayment(partialFor.id, amount);
    setPartialFor(null);
    if (row) {
      setNoteFor({
        tenantId: row.tenant.id,
        propertyId: row.property.id,
        name: row.tenant.firstName,
      });
    }
  }

  return (
    <>
      <div className="stat-grid">
        <div className="stat s-green">
          <div className="num">{counts.paid}</div>
          <div className="lbl">Paid</div>
        </div>
        <div className="stat s-yellow">
          <div className="num">{counts.partial}</div>
          <div className="lbl">Partial</div>
        </div>
        <div className="stat s-red">
          <div className="num">{counts.unpaid}</div>
          <div className="lbl">Unpaid</div>
        </div>
      </div>

      <div className="section-title">
        <span>Rent — {monthLabel(month)}</span>
      </div>

      {rows.length === 0 && (
        <div className="card">
          <p style={{ color: "var(--ink-soft)", fontSize: 16 }}>
            No tenants yet — add a tenant to a property to start tracking rent.
          </p>
        </div>
      )}

      {rows.map((row) => {
        const status = rentStatusOf(row.record);
        const remaining = row.record.amountDue - row.record.amountPaid;
        return (
          <div
            key={row.record.id}
            className={`card rent-card status-${status}`}
            style={{ marginBottom: 10 }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Link to={`/tenants/${row.tenant.id}`}>
                <Avatar
                  first={row.tenant.firstName}
                  last={row.tenant.lastName}
                  photo={row.tenant.photoDataUrl}
                />
              </Link>
              <div className="row-body">
                <div className="row-title">
                  {row.tenant.firstName} {row.tenant.lastName}
                </div>
                <div className="row-sub">{fullAddress(row.property)}</div>
                <div style={{ marginTop: 5 }}>
                  <span className={`pill pill-${status}`}>
                    {STATUS_LABEL[status]}
                    {status === "partial" &&
                      ` — ${money(row.record.amountPaid)} of ${money(row.record.amountDue)}`}
                    {status === "unpaid" && ` — ${money(row.record.amountDue)} due`}
                    {status === "paid" && ` — ${money(row.record.amountDue)}`}
                  </span>
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              {status !== "paid" ? (
                <>
                  <button
                    className="btn btn-green btn-sm"
                    style={{ flex: 2 }}
                    onClick={() => markPaid(row)}
                  >
                    <CheckIcon size={16} />
                    {status === "partial"
                      ? `Collect ${money(remaining)}`
                      : "Mark paid"}
                  </button>
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ flex: 1.4 }}
                    onClick={() => setPartialFor(row.record)}
                  >
                    Partial…
                  </button>
                </>
              ) : (
                <>
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ flex: 1 }}
                    onClick={() =>
                      setNoteFor({
                        tenantId: row.tenant.id,
                        propertyId: row.property.id,
                        name: row.tenant.firstName,
                      })
                    }
                  >
                    + Note
                  </button>
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ flex: 1 }}
                    onClick={() => undoPayment(row.record.id)}
                  >
                    Undo
                  </button>
                </>
              )}
            </div>
          </div>
        );
      })}

      <div className="section-title">
        <span>Quick actions</span>
      </div>
      <div className="quick-actions">
        <button className="quick-action" onClick={() => navigate("/contractors")}>
          <span className="qa-icon">
            <WrenchIcon size={19} />
          </span>
          <span className="qa-label">Call a contractor</span>
          <span className="qa-sub">Your pros + nearby options</span>
        </button>
        <button
          className="quick-action"
          onClick={() => navigate("/contractors/prepare")}
        >
          <span className="qa-icon">
            <SparkleIcon size={19} />
          </span>
          <span className="qa-label">Prepare for a call</span>
          <span className="qa-sub">Script, causes & price guide</span>
        </button>
        <button className="quick-action" onClick={() => navigate("/scanner")}>
          <span className="qa-icon">
            <ScanIcon size={19} />
          </span>
          <span className="qa-label">Scan a receipt</span>
          <span className="qa-sub">For tax records</span>
        </button>
        <button
          className="quick-action"
          onClick={() => navigate("/properties/new")}
        >
          <span className="qa-icon">
            <PlusIcon size={19} />
          </span>
          <span className="qa-label">Add a property</span>
          <span className="qa-sub">House, rent & tenant info</span>
        </button>
      </div>

      {partialFor && (
        <PartialPaymentModal
          record={partialFor}
          tenantName={
            data.tenants.find((t) => t.id === partialFor.tenantId)?.firstName ?? ""
          }
          onSubmit={submitPartial}
          onClose={() => setPartialFor(null)}
        />
      )}

      {noteFor && (
        <NoteModal
          tenantId={noteFor.tenantId}
          propertyId={noteFor.propertyId}
          title={`Payment recorded ✅ — note about ${noteFor.name}?`}
          subtitle="Anything notable? Interactions, complaints, air filter replaced, new pet, money's tight… Your future self will thank you."
          defaultTags={["payment"]}
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
        Add your first property
      </button>
    </div>
  );
}
