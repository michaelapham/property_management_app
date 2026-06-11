import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useStore } from "../data/store";
import {
  currentMonthKey,
  rentStatusOf,
  type AppData,
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
import { BarChart2Icon, CheckIcon, PlusIcon, UploadIcon } from "../components/icons";

// ---------- Roster snapshot types & helpers ----------

const ROSTER_KEY = "landlordhq-roster-v1";

interface RosterEntry {
  id: string;
  propertyId: string;
  firstName: string;
  lastName: string;
  rentAmount: number;
  photoDataUrl?: string;
  property: {
    id: string;
    street: string;
    city: string;
    state: string;
    zip: string;
  };
}

function loadRosters(): Record<string, RosterEntry[]> {
  try {
    return JSON.parse(localStorage.getItem(ROSTER_KEY) ?? "{}");
  } catch {
    return {};
  }
}

function buildRosterFromLive(data: AppData): RosterEntry[] {
  return data.tenants
    .flatMap((tenant) => {
      const property = data.properties.find((p) => p.id === tenant.propertyId);
      if (!property) return [];
      return [{
        id: tenant.id,
        propertyId: tenant.propertyId,
        firstName: tenant.firstName,
        lastName: tenant.lastName,
        rentAmount: tenant.rentAmount,
        photoDataUrl: tenant.photoDataUrl,
        property: {
          id: property.id,
          street: property.street,
          city: property.city,
          state: property.state,
          zip: property.zip,
        },
      }];
    });
}

// ---------- Dashboard ----------

const STATUS_LABEL: Record<RentStatus, string> = {
  paid: "Paid",
  partial: "Partial",
  unpaid: "Unpaid",
};

// Row uses loose structural types so both live and snapshot entries are accepted.
type TenantLike = {
  id: string;
  propertyId: string;
  firstName: string;
  lastName: string;
  rentAmount: number;
  photoDataUrl?: string;
};
type PropertyLike = {
  id: string;
  street: string;
  city: string;
  state: string;
  zip: string;
};
type Row = {
  tenant: TenantLike;
  record: RentRecord;
  property: PropertyLike;
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
  const [showKpi, setShowKpi] = useState(false);
  const [pendingConfirm, setPendingConfirm] = useState<{ action: () => void } | null>(null);
  const [paymentFor, setPaymentFor] = useState<{ row: Row; defaultMode: "full" | "partial" } | null>(null);
  const [noteFor, setNoteFor] = useState<{ tenantId: string; propertyId: string; name: string } | null>(null);

  // Roster snapshots: frozen tenant+property list per past/first-written month.
  const [rosters, setRosters] = useState<Record<string, RosterEntry[]>>(loadRosters);

  function persistRoster(month: string, entries: RosterEntry[]) {
    setRosters((prev) => {
      const next = { ...prev, [month]: entries };
      localStorage.setItem(ROSTER_KEY, JSON.stringify(next));
      return next;
    });
  }

  // On first navigation to a past month with no existing snapshot, freeze the current roster.
  useEffect(() => {
    const realNow = currentMonthKey();
    if (viewMonth >= realNow) return;      // current or future: no pre-freeze
    if (rosters[viewMonth]) return;        // already frozen
    persistRoster(viewMonth, buildRosterFromLive(data));
  }, [viewMonth]); // intentionally excludes data/rosters — we only want to run on month navigation

  function shiftMonth(delta: number) {
    setViewMonth((prev) => {
      const [y, m] = prev.split("-").map(Number);
      const d = new Date(y, m - 1 + delta);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    });
  }

  function withPastConfirm(action: () => void) {
    if (viewMonth < currentMonthKey()) {
      setPendingConfirm({ action });
    } else {
      action();
    }
  }

  // Ensure a future month gets a snapshot the first time any change is made to it.
  function ensureFutureSnapshot() {
    const realNow = currentMonthKey();
    if (viewMonth <= realNow) return;
    if (rosters[viewMonth]) return;
    persistRoster(viewMonth, buildRosterFromLive(data));
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

  const rows = useMemo((): Row[] => {
    const realNow = currentMonthKey();

    // Determine the roster source:
    // - Past month with snapshot → frozen list from snapshot
    // - Past month without snapshot yet → live (useEffect will freeze it shortly)
    // - Current month → always live (reflects additions/removals in real time)
    // - Future month → live at render time; only frozen once user makes a change
    let entries: RosterEntry[];
    if (viewMonth < realNow && rosters[viewMonth]) {
      entries = rosters[viewMonth];
    } else {
      entries = buildRosterFromLive(data);
    }

    return entries
      .map((entry) => {
        const record = data.rentRecords.find(
          (r) => r.tenantId === entry.id && r.month === viewMonth
        );
        const effectiveRecord: RentRecord = record ?? {
          id: `__virtual__${entry.id}__${viewMonth}`,
          tenantId: entry.id,
          month: viewMonth,
          amountDue: entry.rentAmount,
          amountPaid: 0,
        };
        return { tenant: entry, record: effectiveRecord, property: entry.property };
      })
      .sort((a, b) => {
        const sa = rentStatusOf(a.record);
        const sb = rentStatusOf(b.record);
        if (sa === "paid" && sb !== "paid") return 1;
        if (sb === "paid" && sa !== "paid") return -1;
        const order: Record<RentStatus, number> = { unpaid: 0, partial: 1, paid: 2 };
        return order[sa] - order[sb];
      });
  }, [data, viewMonth, rosters]);

  if (data.properties.length === 0) {
    return <Welcome />;
  }

  function submitPayment(amount: number | "full", method: PaymentMethod, notes: string) {
    if (!paymentFor) return;
    ensureFutureSnapshot();
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
        <button
          className="btn btn-xs"
          style={{
            background: showKpi ? "#15803D" : "#16A34A",
            color: "#fff",
            border: showKpi ? "2px solid #14532D" : "2px solid transparent",
            borderRadius: 8,
            fontWeight: 600,
          }}
          onClick={() => setShowKpi((v) => !v)}
        >
          <BarChart2Icon size={13} />
          Summary
        </button>
        <button className="btn btn-ghost btn-xs" onClick={() => importFileRef.current?.click()}>
          <UploadIcon size={13} />
          Import
        </button>
        <button className="btn btn-primary btn-xs" onClick={() => navigate("/properties/new")}>
          <PlusIcon size={13} />
          Add Property
        </button>
      </div>

      {showKpi ? (
        <KpiDashboard rows={rows} data={data} rosters={rosters} />
      ) : (
        <>

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
            // For StatusBadge we need a full Property; fall back to live store or a stub.
            const liveProperty = data.properties.find((p) => p.id === row.property.id);
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
                    {liveProperty && <StatusBadge property={liveProperty} />}
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
                          withPastConfirm(() => {
                            ensureFutureSnapshot();
                            undoPayment(row.record.id);
                          });
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

        </>
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
          tenant={paymentFor.row.tenant as ReturnType<typeof useStore>["data"]["tenants"][number]}
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

// ── Donut Chart ──────────────────────────────────────────────────────────────

function DonutChart({ pct }: { pct: number }) {
  const SIZE = 180;
  const STROKE = 16;
  const R = (SIZE - STROKE) / 2;
  const CIRC = 2 * Math.PI * R;
  const cx = SIZE / 2;
  const cy = SIZE / 2;

  const [animPct, setAnimPct] = useState(0);
  useEffect(() => {
    const raf = requestAnimationFrame(() => setAnimPct(pct));
    return () => cancelAnimationFrame(raf);
  }, [pct]);

  const dash = (animPct / 100) * CIRC;

  return (
    <div style={{ display: "flex", flexDirection: "column" as const, alignItems: "center", marginBottom: 16 }}>
      <svg width={SIZE} height={SIZE} style={{ overflow: "visible" }}>
        {/* track */}
        <circle
          cx={cx} cy={cy} r={R}
          fill="none"
          stroke="#E5E7EB"
          strokeWidth={STROKE}
        />
        {/* filled arc — starts from 12 o'clock */}
        <circle
          cx={cx} cy={cy} r={R}
          fill="none"
          stroke="#16A34A"
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${CIRC}`}
          strokeDashoffset={CIRC / 4}
          style={{ transition: "stroke-dasharray 0.8s ease-in-out" }}
        />
        {/* center text */}
        <text
          x={cx} y={cy - 8}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={36}
          fontWeight={700}
          fill="#15803D"
          fontFamily="inherit"
        >
          {pct}%
        </text>
        <text
          x={cx} y={cy + 20}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={13}
          fill="#6B7280"
          fontFamily="inherit"
        >
          collected
        </text>
      </svg>
    </div>
  );
}

// ── Revenue Bar ───────────────────────────────────────────────────────────────

function RevenueBar({ collected, outstanding, expected }: { collected: number; outstanding: number; expected: number }) {
  const fmt = (n: number) =>
    "$" + n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  const [animated, setAnimated] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 30);
    return () => clearTimeout(t);
  }, []);

  const collectedPct = expected > 0 ? (collected / expected) * 100 : 0;
  const outstandingPct = expected > 0 ? (outstanding / expected) * 100 : 0;

  // Labels show inside if segment wide enough (>22%), otherwise outside
  const collectedInside = collectedPct > 22;
  const outstandingInside = outstandingPct > 22;

  return (
    <div style={{ marginBottom: 16 }}>
      {/* Outside labels (shown when segment too narrow for inside text) */}
      {(!collectedInside || !outstandingInside) && (
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
          {!collectedInside && (
            <span style={{ fontSize: 12, fontWeight: 600, color: "#16A34A" }}>
              {fmt(collected)} collected
            </span>
          )}
          {!outstandingInside && (
            <span style={{ fontSize: 12, fontWeight: 600, color: "#DC2626", marginLeft: "auto" }}>
              {fmt(outstanding)} outstanding
            </span>
          )}
        </div>
      )}

      {/* Bar */}
      <div style={{
        display: "flex",
        height: 36,
        borderRadius: 99,
        overflow: "hidden",
        background: "#E5E7EB",
      }}>
        {/* Collected segment */}
        <div style={{
          width: animated ? `${collectedPct}%` : "0%",
          background: "#16A34A",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          transition: "width 0.6s ease-out",
          flexShrink: 0,
        }}>
          {collectedInside && (
            <span style={{ fontSize: 12, fontWeight: 600, color: "#fff", whiteSpace: "nowrap", padding: "0 10px" }}>
              {fmt(collected)} collected
            </span>
          )}
        </div>
        {/* Outstanding segment */}
        <div style={{
          width: animated ? `${outstandingPct}%` : "0%",
          background: "#DC2626",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          transition: "width 0.6s ease-out 0.05s",
          flexShrink: 0,
        }}>
          {outstandingInside && (
            <span style={{ fontSize: 12, fontWeight: 600, color: "#fff", whiteSpace: "nowrap", padding: "0 10px" }}>
              {fmt(outstanding)} outstanding
            </span>
          )}
        </div>
      </div>

      <div style={{ marginTop: 5, fontSize: 12, color: "var(--ink-soft)" }}>
        Expected: {fmt(expected)} total
      </div>
    </div>
  );
}

// ── Streak Counter ────────────────────────────────────────────────────────────

function computeStreak(data: AppData, rosters: Record<string, RosterEntry[]>): number {
  const now = currentMonthKey();
  let streak = 0;
  let month = now;

  while (true) {
    // Get roster for this month
    const [y, m] = month.split("-").map(Number);
    const prevDate = new Date(y, m - 2);
    const prevMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}`;

    let entries: RosterEntry[];
    if (month < now && rosters[month]) {
      entries = rosters[month];
    } else if (month <= now) {
      entries = buildRosterFromLive(data);
    } else {
      break;
    }

    if (entries.length === 0) break;

    const allPaid = entries.every((entry) => {
      const record = data.rentRecords.find((r) => r.tenantId === entry.id && r.month === month);
      if (!record) return false;
      return rentStatusOf(record) === "paid";
    });

    if (!allPaid) break;
    streak++;
    month = prevMonth;

    // Safety: don't go back more than 5 years
    if (streak > 60) break;
  }

  return streak;
}

function StreakCounter({ data, rosters, unitsRemaining }: {
  data: AppData;
  rosters: Record<string, RosterEntry[]>;
  unitsRemaining: number;
}) {
  const streak = computeStreak(data, rosters);
  const now = currentMonthKey();

  // Check if current month alone is 100%
  const currentEntries = buildRosterFromLive(data);
  const currentMonthPerfect = currentEntries.length > 0 && currentEntries.every((entry) => {
    const record = data.rentRecords.find((r) => r.tenantId === entry.id && r.month === now);
    return record && rentStatusOf(record) === "paid";
  });

  const cardBase = {
    borderRadius: 16,
    padding: "16px 18px",
    boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
  };

  if (streak >= 2) {
    return (
      <div style={{ ...cardBase, background: "#F0FDF4" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 32, lineHeight: 1 }}>🔥</span>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, color: "#15803D" }}>
              {streak}-month perfect collection streak!
            </div>
            <div style={{ fontSize: 13, color: "#166534", marginTop: 2 }}>
              Every tenant paid on time for {streak} months in a row.
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (streak === 1 || currentMonthPerfect) {
    return (
      <div style={{ ...cardBase, background: "#F0FDF4" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 28, lineHeight: 1 }}>✅</span>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#15803D" }}>
              Perfect month so far!
            </div>
            <div style={{ fontSize: 13, color: "#166534", marginTop: 2 }}>
              Keep it up to build a streak next month.
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ ...cardBase, background: "#fff" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 26, lineHeight: 1 }}>📅</span>
        <div>
          <div style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)" }}>
            {unitsRemaining} unit{unitsRemaining !== 1 ? "s" : ""} remaining
          </div>
          <div style={{ fontSize: 13, color: "var(--ink-soft)", marginTop: 2 }}>
            Complete this month to start a streak
          </div>
        </div>
      </div>
    </div>
  );
}

// ── KPI Dashboard ─────────────────────────────────────────────────────────────

function KpiDashboard({ rows, data, rosters }: {
  rows: Row[];
  data: AppData;
  rosters: Record<string, RosterEntry[]>;
}) {
  const hasRentAmounts = rows.some((r) => r.record.amountDue > 0);

  const totalExpected = rows.reduce((s, r) => s + r.record.amountDue, 0);
  const totalCollected = rows.reduce((s, r) => s + r.record.amountPaid, 0);
  const unitsPaid = rows.filter((r) => rentStatusOf(r.record) === "paid").length;
  const unitsUnpaid = rows.filter((r) => rentStatusOf(r.record) === "unpaid").length;
  const outstanding = totalExpected - totalCollected;
  const collectionRate = totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : 0;

  const fmt = (n: number) =>
    "$" + n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  const cardBase = {
    borderRadius: 16,
    padding: "18px 16px 14px",
    boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
    display: "flex",
    flexDirection: "column" as const,
    gap: 4,
  };

  return (
    <div>
      {!hasRentAmounts && (
        <p style={{ fontSize: 13, color: "var(--ink-soft)", marginBottom: 12, textAlign: "center" }}>
          Add rent amounts to tenants to see accurate totals.
        </p>
      )}

      {/* Donut */}
      <DonutChart pct={collectionRate} />

      {/* Revenue bar */}
      <RevenueBar collected={totalCollected} outstanding={outstanding} expected={totalExpected} />

      {/* Streak */}
      <div style={{ marginBottom: 14 }}>
        <StreakCounter data={data} rosters={rosters} unitsRemaining={unitsUnpaid} />
      </div>

      {/* KPI cards grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(2, 1fr)",
        gap: 10,
      }}
        className="kpi-grid"
      >
        {/* Total Rent Expected — neutral */}
        <div style={{ ...cardBase, background: "#fff" }}>
          <span style={{ fontSize: 24, fontWeight: 700, color: "var(--ink)", lineHeight: 1 }}>
            {fmt(totalExpected)}
          </span>
          <span style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 2 }}>Total Expected</span>
        </div>

        {/* Total Collected — green */}
        <div style={{ ...cardBase, background: "#F0FDF4" }}>
          <span style={{ fontSize: 24, fontWeight: 700, color: "#15803D", lineHeight: 1 }}>
            {fmt(totalCollected)}
          </span>
          <span style={{ fontSize: 12, color: "#166534", marginTop: 2 }}>Total Collected</span>
        </div>

        {/* Collection Rate — green, full-width */}
        <div style={{ ...cardBase, background: "#F0FDF4", gridColumn: "1 / -1" }}>
          <span style={{ fontSize: 28, fontWeight: 700, color: "#15803D", lineHeight: 1 }}>
            {collectionRate}%
          </span>
          <span style={{ fontSize: 12, color: "#166534", marginTop: 2, marginBottom: 6 }}>Collection Rate</span>
          <div style={{ height: 6, borderRadius: 99, background: "#D1FAE5", overflow: "hidden" }}>
            <div
              style={{
                height: "100%",
                width: `${collectionRate}%`,
                background: "#16A34A",
                borderRadius: 99,
                transition: "width 0.4s ease",
              }}
            />
          </div>
        </div>

        {/* Units Paid — green */}
        <div style={{ ...cardBase, background: "#F0FDF4" }}>
          <span style={{ fontSize: 24, fontWeight: 700, color: "#15803D", lineHeight: 1 }}>
            {unitsPaid} / {rows.length}
          </span>
          <span style={{ fontSize: 12, color: "#166534", marginTop: 2 }}>Units Paid</span>
        </div>

        {/* Units Unpaid — red */}
        <div style={{ ...cardBase, background: "#FEF2F2" }}>
          <span style={{ fontSize: 24, fontWeight: 700, color: "#B91C1C", lineHeight: 1 }}>
            {unitsUnpaid}
          </span>
          <span style={{ fontSize: 12, color: "#991B1B", marginTop: 2 }}>Units Unpaid</span>
        </div>

        {/* Outstanding Balance — red */}
        <div style={{ ...cardBase, background: "#FEF2F2", gridColumn: "1 / -1" }}>
          <span style={{ fontSize: 24, fontWeight: 700, color: "#B91C1C", lineHeight: 1 }}>
            {fmt(outstanding)}
          </span>
          <span style={{ fontSize: 12, color: "#991B1B", marginTop: 2 }}>Outstanding Balance</span>
        </div>
      </div>
    </div>
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
