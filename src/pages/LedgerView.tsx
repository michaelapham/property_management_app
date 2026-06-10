import { useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useStore } from "../data/store";
import { PAYMENT_METHOD_LABEL } from "../types";
import { fullAddress, money } from "../utils/format";
import { BookIcon, ChevronLeft, DownloadIcon } from "../components/icons";
import {
  exportCSV,
  exportExcel,
  printLedger,
  type LedgerHeader,
  type LedgerRow,
} from "../utils/exportLedger";

function fmtLedgerDate(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}/${d.getFullYear()}`;
}

function fmtShortDate(iso: string | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function LedgerView() {
  const { id } = useParams();
  const { data } = useStore();
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [exportOpen, setExportOpen] = useState(false);
  const exportBtnRef = useRef<HTMLButtonElement>(null);

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

  // Available years: current + any year that has a ledger entry for this tenant
  const years = useMemo(() => {
    const y = new Set<number>([currentYear]);
    data.ledgerEntries
      .filter((e) => e.tenantId === tenant.id)
      .forEach((e) => y.add(parseInt(e.month.slice(0, 4))));
    return [...y].sort((a, b) => b - a);
  }, [data.ledgerEntries, tenant.id, currentYear]);

  // Rent records for this tenant × this year, sorted chronologically
  const yearRecords = useMemo(
    () =>
      data.rentRecords
        .filter((r) => r.tenantId === tenant.id && r.month.startsWith(String(year)))
        .sort((a, b) => a.month.localeCompare(b.month)),
    [data.rentRecords, tenant.id, year]
  );

  // Ledger entries for this tenant × this year, sorted chronologically
  const yearEntries = useMemo(
    () =>
      data.ledgerEntries
        .filter((e) => e.tenantId === tenant.id && e.month.startsWith(String(year)))
        .sort((a, b) => a.date.localeCompare(b.date)),
    [data.ledgerEntries, tenant.id, year]
  );

  // Build the display rows, computing a running balance that accounts for
  // all months including unpaid ones.
  const rows = useMemo((): LedgerRow[] => {
    const recordByMonth = new Map(yearRecords.map((r) => [r.month, r]));
    const allMonths = yearRecords.map((r) => r.month).sort();
    const countedMonths = new Set<string>();
    let runningBalance = 0;
    const result: LedgerRow[] = [];

    for (const entry of yearEntries) {
      // Accumulate charges for all months up to (and including) this entry's month
      for (const month of allMonths) {
        if (month > entry.month) break;
        if (!countedMonths.has(month)) {
          countedMonths.add(month);
          runningBalance += recordByMonth.get(month)?.amountDue ?? 0;
        }
      }

      // Show "Due" only on the first payment entry for each month
      const isFirstForMonth = !result.some((r) => r.month === entry.month);
      const amountDue = isFirstForMonth
        ? (recordByMonth.get(entry.month)?.amountDue ?? 0)
        : 0;

      runningBalance -= entry.amountPaid;

      result.push({
        rowNum: result.length + 1,
        date: entry.date,
        month: entry.month,
        amountDue,
        amountPaid: entry.amountPaid,
        balance: runningBalance,
        method: PAYMENT_METHOD_LABEL[entry.paymentMethod] ?? entry.paymentMethod,
        notes: entry.notes,
      });
    }

    return result;
  }, [yearEntries, yearRecords]);

  // YTD summary — use rent records for "due", ledger entries for "collected"
  const maxMonth =
    year === currentYear
      ? `${year}-${String(new Date().getMonth() + 1).padStart(2, "0")}`
      : `${year}-12`;
  const ytdDue = yearRecords
    .filter((r) => r.month <= maxMonth)
    .reduce((s, r) => s + r.amountDue, 0);
  const ytdPaid = yearEntries.reduce((s, e) => s + e.amountPaid, 0);
  const ytdOutstanding = ytdDue - ytdPaid;

  const generatedAt = new Date().toLocaleString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  const header: LedgerHeader = {
    propertyAddress: property ? fullAddress(property) : "—",
    tenantName: `${tenant.firstName} ${tenant.lastName}`,
    leaseStart: fmtShortDate(tenant.moveInDate),
    leaseEnd: tenant.leaseEndDate ? fmtShortDate(tenant.leaseEndDate) : "Ongoing",
    landlordName: data.settings.landlordName,
    year,
  };

  function handleExport(fn: () => void) {
    fn();
    setExportOpen(false);
  }

  return (
    <>
      <Link className="back-link" to={`/tenants/${tenant.id}`}>
        <ChevronLeft size={16} /> {tenant.firstName} {tenant.lastName}
      </Link>

      {/* Title row + year selector + export */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <BookIcon size={20} />
        <h2 style={{ flex: 1 }}>Rent Ledger</h2>

        <select
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          style={{
            background: "var(--surface-2)",
            border: "1px solid var(--line)",
            color: "var(--ink)",
            borderRadius: 8,
            padding: "7px 10px",
            fontSize: 15,
          }}
        >
          {years.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>

        <div style={{ position: "relative" }}>
          <button
            ref={exportBtnRef}
            className="btn btn-ghost btn-sm"
            onClick={() => setExportOpen((o) => !o)}
          >
            <DownloadIcon size={14} /> Export
          </button>
          {exportOpen && (
            <>
              <div
                style={{ position: "fixed", inset: 0, zIndex: 99 }}
                onClick={() => setExportOpen(false)}
              />
              <div className="export-menu">
                <button
                  className="export-menu-item"
                  onClick={() =>
                    handleExport(() => printLedger(header, rows, generatedAt))
                  }
                >
                  🖨 Print / Save as PDF
                </button>
                <button
                  className="export-menu-item"
                  onClick={() =>
                    handleExport(() => exportExcel(header, rows, generatedAt))
                  }
                >
                  📊 Export Excel (.xlsx)
                </button>
                <button
                  className="export-menu-item"
                  onClick={() =>
                    handleExport(() => exportCSV(header, rows, generatedAt))
                  }
                >
                  📄 Export CSV
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Legal header */}
      <div className="card">
        <p
          style={{
            textAlign: "center",
            fontWeight: 700,
            fontSize: 15,
            marginBottom: 12,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}
        >
          Rent Payment Ledger
        </p>
        <table className="kv-table">
          <tbody>
            <tr><td>Property</td><td>{header.propertyAddress}</td></tr>
            <tr><td>Tenant</td><td>{header.tenantName}</td></tr>
            <tr>
              <td>Lease period</td>
              <td>{header.leaseStart} – {header.leaseEnd}</td>
            </tr>
            <tr>
              <td>Landlord</td>
              <td>
                {header.landlordName || (
                  <Link
                    to="/settings"
                    style={{ color: "var(--brand)", textDecoration: "underline" }}
                  >
                    Add in Settings
                  </Link>
                )}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* YTD summary */}
      <div className="stat-grid" style={{ marginTop: 12 }}>
        <div className="stat">
          <div className="num" style={{ fontSize: 15, letterSpacing: "-0.02em" }}>
            {money(ytdDue)}
          </div>
          <div className="lbl">Due YTD</div>
        </div>
        <div className="stat s-green">
          <div className="num" style={{ fontSize: 15, letterSpacing: "-0.02em" }}>
            {money(ytdPaid)}
          </div>
          <div className="lbl">Collected</div>
        </div>
        <div className={`stat ${ytdOutstanding > 0.005 ? "s-red" : "s-green"}`}>
          <div className="num" style={{ fontSize: 15, letterSpacing: "-0.02em" }}>
            {money(Math.abs(ytdOutstanding))}
          </div>
          <div className="lbl">
            {ytdOutstanding > 0.005 ? "Outstanding" : ytdOutstanding < -0.005 ? "Overpaid" : "Settled"}
          </div>
        </div>
      </div>

      {/* Ledger table */}
      <div className="section-title">
        <span>Payment History — {year}</span>
      </div>

      {rows.length === 0 ? (
        <div className="card">
          <p style={{ color: "var(--ink-soft)", fontSize: 15 }}>
            No payments recorded for {year}. Payments logged from the dashboard appear here automatically.
          </p>
        </div>
      ) : (
        <div
          className="card"
          style={{ padding: 0, overflow: "hidden" }}
        >
          <div style={{ overflowX: "auto" }}>
            <table className="ledger-table">
              <thead>
                <tr>
                  <th className="ledger-th-num">#</th>
                  <th>Date</th>
                  <th className="ledger-th-money">Due</th>
                  <th className="ledger-th-money">Paid</th>
                  <th className="ledger-th-money">Balance</th>
                  <th>Method</th>
                  <th className="ledger-th-notes">Notes</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const isOwed = row.balance > 0.005;
                  const isClear = row.balance < -0.005;
                  const balText = isClear
                    ? `${money(Math.abs(row.balance))} CR`
                    : money(Math.abs(row.balance));
                  return (
                    <tr key={row.rowNum}>
                      <td className="ledger-num">{row.rowNum}</td>
                      <td className="ledger-date">{fmtLedgerDate(row.date)}</td>
                      <td className="ledger-money">
                        {row.amountDue > 0.005 ? money(row.amountDue) : "—"}
                      </td>
                      <td className="ledger-money ledger-paid">{money(row.amountPaid)}</td>
                      <td
                        className={`ledger-money ${isOwed ? "ledger-owed" : isClear ? "ledger-credit" : "ledger-clear"}`}
                      >
                        {balText}
                      </td>
                      <td className="ledger-method">{row.method}</td>
                      <td className="ledger-notes">{row.notes ?? ""}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Generation timestamp */}
      <p className="hint" style={{ textAlign: "center", marginTop: 14 }}>
        Generated on {generatedAt}
      </p>
    </>
  );
}
