import { useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useStore } from "../data/store";
import { PAYMENT_METHOD_LABEL } from "../types";
import { fullAddress, money } from "../utils/format";
import { lateFeeDate, lateFeeForMonth, monthName, prevMonthKey } from "../utils/tenantCalc";
import { BookIcon, ChevronLeft, DownloadIcon } from "../components/icons";
import {
  exportCSV,
  exportExcel,
  printLedger,
  type LedgerHeader,
  type LedgerRow,
} from "../utils/exportLedger";
import { printReceipt } from "../utils/reportExport";
import EmptyState, { FileTextIllustration } from "../components/EmptyState";

type StatusFilter = "all" | "paid" | "partial" | "unpaid" | "late-fee";

const PrinterIcon = ({ size = 15 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 6 2 18 2 18 9" />
    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
    <rect x="6" y="14" width="12" height="8" />
  </svg>
);

const ReceiptCheckIcon = ({ size = 15 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#15803D" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

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

  // Filter state
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [notesSearch, setNotesSearch] = useState("");
  const [receiptFlashId, setReceiptFlashId] = useState<number | null>(null);

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

  // Build display rows with balance-forward and late-fee synthetic rows injected.
  // Two-pass algorithm:
  //   Pass 1 — compute each month's opening balance (includes prior-year outstanding).
  //   Pass 2 — build display rows only for months that have ledger entries.
  const rows = useMemo((): LedgerRow[] => {
    const recordByMonth = new Map(yearRecords.map((r) => [r.month, r]));

    // All months with records this year, plus months appearing in entries
    const allYearMonths = [...new Set([
      ...yearRecords.map((r) => r.month),
      ...yearEntries.map((e) => e.month),
    ])].sort();

    // --- Pass 1: compute opening balance per month ---
    // Start with outstanding balance from ALL months before this year
    let bal = 0;
    for (const rec of data.rentRecords.filter(
      (r) => r.tenantId === tenant.id && r.month < `${year}-01`
    )) {
      const fee = lateFeeForMonth(tenant, rec.month, rec);
      bal += rec.amountDue + fee - rec.amountPaid;
    }
    const monthOpeningBalance = new Map<string, number>();
    for (const month of allYearMonths) {
      monthOpeningBalance.set(month, Math.max(0, bal));
      const rec = recordByMonth.get(month);
      const due = rec?.amountDue ?? 0;
      const fee = rec ? lateFeeForMonth(tenant, month, rec) : 0;
      const paid = yearEntries
        .filter((e) => e.month === month)
        .reduce((s, e) => s + e.amountPaid, 0);
      bal += due + fee - paid;
    }

    // Group entries by month
    const entriesByMonth = new Map<string, typeof yearEntries>();
    for (const e of yearEntries) {
      const arr = entriesByMonth.get(e.month) ?? [];
      arr.push(e);
      entriesByMonth.set(e.month, arr);
    }

    // --- Pass 2: build display rows ---
    const result: LedgerRow[] = [];
    let rowNum = 0;
    let runningBalance = 0;
    let balanceInitialized = false;

    for (const month of allYearMonths) {
      const entries = (entriesByMonth.get(month) ?? [])
        .slice()
        .sort((a, b) => a.date.localeCompare(b.date));
      if (entries.length === 0) continue; // no display rows for months with no payments

      const record = recordByMonth.get(month);
      const due = record?.amountDue ?? 0;
      const openingBalance = monthOpeningBalance.get(month) ?? 0;

      // Sync runningBalance to openingBalance on first month with entries,
      // or if it drifted (e.g. months with records but no entries in between).
      if (!balanceInitialized) {
        runningBalance = openingBalance;
        balanceInitialized = true;
      } else {
        // Advance runningBalance through any months between last processed and now
        // (they have no entries, so no display rows, but they add to the balance)
        runningBalance = openingBalance;
      }

      // Balance Forward synthetic row
      if (openingBalance > 0.005) {
        rowNum++;
        result.push({
          rowNum,
          date: `${month}-01T00:00:00.000Z`,
          month,
          amountDue: openingBalance,
          amountPaid: 0,
          balance: openingBalance,
          method: "—",
          notes: `Balance Forward from ${monthName(prevMonthKey(month))}`,
          isSynthetic: true,
        });
      }

      // Add current month's rent charge to running balance
      runningBalance += due;

      // Late Fee synthetic row
      const fee = record ? lateFeeForMonth(tenant, month, record) : 0;
      if (fee > 0.005) {
        runningBalance += fee;
        rowNum++;
        result.push({
          rowNum,
          date: lateFeeDate(month, tenant.lateFeeSettings?.gracePeriodDays ?? 5).toISOString(),
          month,
          amountDue: fee,
          amountPaid: 0,
          balance: runningBalance,
          method: "—",
          notes: "Late Fee",
          isSynthetic: true,
        });
      }

      // Real payment entries
      let firstForMonth = true;
      for (const entry of entries) {
        runningBalance -= entry.amountPaid;
        rowNum++;
        result.push({
          rowNum,
          date: entry.date,
          month,
          amountDue: firstForMonth ? due : 0,
          amountPaid: entry.amountPaid,
          balance: runningBalance,
          method: PAYMENT_METHOD_LABEL[entry.paymentMethod] ?? entry.paymentMethod,
          notes: entry.notes,
          isSynthetic: false,
        });
        firstForMonth = false;
      }
    }

    return result;
  }, [yearEntries, yearRecords, data.rentRecords, tenant, year]);

  // Receipt numbers: NNN = sequential index of an entry among ALL of this tenant's
  // entries sorted by date (1-based). Keyed by entry id.
  const receiptNumberByEntryId = useMemo(() => {
    const sorted = data.ledgerEntries
      .filter((e) => e.tenantId === tenant.id)
      .sort((a, b) => a.date.localeCompare(b.date));
    const map = new Map<string, number>();
    sorted.forEach((e, i) => map.set(e.id, i + 1));
    return map;
  }, [data.ledgerEntries, tenant.id]);

  // Resolve the underlying LedgerEntry for a real display row (match by date+amount+month).
  function entryForRow(row: LedgerRow) {
    return yearEntries.find(
      (e) => e.date === row.date && e.month === row.month && Math.abs(e.amountPaid - row.amountPaid) < 0.005,
    );
  }

  // Apply filters to display rows. Synthetic late-fee rows are shown only when
  // statusFilter === "late-fee"; other filters apply to all rows.
  const filtersActive =
    !!fromDate || !!toDate || statusFilter !== "all" || !!minAmount || !!maxAmount || !!notesSearch.trim();

  const filteredRows = useMemo(() => {
    if (!filtersActive) return rows;
    const min = minAmount ? parseFloat(minAmount) : null;
    const max = maxAmount ? parseFloat(maxAmount) : null;
    const needle = notesSearch.trim().toLowerCase();
    return rows.filter((r) => {
      const isLateFee = r.isSynthetic && r.notes === "Late Fee";
      // Status filter
      if (statusFilter === "late-fee") {
        if (!isLateFee) return false;
      } else if (statusFilter !== "all") {
        // balance-based status for non-synthetic interpretation
        if (r.isSynthetic) return false;
        const bal = r.balance;
        if (statusFilter === "paid" && bal > 0.005) return false;
        if (statusFilter === "unpaid" && r.amountPaid > 0.005) return false;
        if (statusFilter === "partial" && !(r.amountPaid > 0.005 && bal > 0.005)) return false;
      }
      // Date range (compare by YYYY-MM-DD)
      const day = r.date.slice(0, 10);
      if (fromDate && day < fromDate) return false;
      if (toDate && day > toDate) return false;
      // Amount range — uses amountPaid
      if (min !== null && r.amountPaid < min) return false;
      if (max !== null && r.amountPaid > max) return false;
      // Notes search
      if (needle && !(r.notes ?? "").toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [rows, filtersActive, fromDate, toDate, statusFilter, minAmount, maxAmount, notesSearch]);

  function clearFilters() {
    setFromDate("");
    setToDate("");
    setStatusFilter("all");
    setMinAmount("");
    setMaxAmount("");
    setNotesSearch("");
  }

  function printReceiptForRow(row: LedgerRow) {
    const entry = entryForRow(row);
    const landlordName = data.settings.landlordName || "DP Properties LLC";
    const seq = entry ? receiptNumberByEntryId.get(entry.id) ?? 1 : 1;
    const d = new Date(row.date);
    const yyyymmdd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
    // tenant is guaranteed non-null here (early return above catches the null case)
    const t = tenant!;
    const initials = `${t.firstName.charAt(0)}${t.lastName.charAt(0)}`.toUpperCase();
    const receiptNumber = `${yyyymmdd}-${initials}-${String(seq).padStart(3, "0")}`;
    printReceipt({
      receiptNumber,
      landlordName,
      propertyAddress: property ? fullAddress(property) : "—",
      tenantName: `${t.firstName} ${t.lastName}`,
      paymentDate: fmtLedgerDate(row.date),
      amountPaid: row.amountPaid,
      paymentMethod: row.method,
      notes: row.notes,
    });
  }

  // YTD summary — rent records + late fees for "due", ledger entries for "collected"
  const maxMonth =
    year === currentYear
      ? `${year}-${String(new Date().getMonth() + 1).padStart(2, "0")}`
      : `${year}-12`;
  const ytdDue = yearRecords
    .filter((r) => r.month <= maxMonth)
    .reduce((s, r) => s + r.amountDue + lateFeeForMonth(tenant, r.month, r), 0);
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
    try {
      fn();
    } catch (err) {
      // Guard: export errors (popup blocked, xlsx failure) should not crash the page
      alert("Export failed — please try again or use a different format.");
      console.error("Export error:", err);
    }
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
                    handleExport(() => printLedger(header, filteredRows, generatedAt))
                  }
                >
                  🖨 Print / Save as PDF
                </button>
                <button
                  className="export-menu-item"
                  onClick={() =>
                    handleExport(() => exportExcel(header, filteredRows, generatedAt))
                  }
                >
                  📊 Export Excel (.xlsx)
                </button>
                <button
                  className="export-menu-item"
                  onClick={() =>
                    handleExport(() => exportCSV(header, filteredRows, generatedAt))
                  }
                >
                  📄 Export CSV
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Filter bar */}
      <div style={{ marginBottom: 12 }}>
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => setFiltersOpen((o) => !o)}
        >
          {filtersOpen ? "▾" : "▸"} Filters{filtersActive ? " (active)" : ""}
        </button>
        {filtersOpen && (
          <div className="card" style={{ marginTop: 8 }}>
            <div className="field-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div className="field" style={{ marginBottom: 10 }}>
                <label>From</label>
                <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
              </div>
              <div className="field" style={{ marginBottom: 10 }}>
                <label>To</label>
                <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
              </div>
              <div className="field" style={{ marginBottom: 10 }}>
                <label>Min amount</label>
                <input type="number" inputMode="decimal" value={minAmount} onChange={(e) => setMinAmount(e.target.value)} placeholder="0" />
              </div>
              <div className="field" style={{ marginBottom: 10 }}>
                <label>Max amount</label>
                <input type="number" inputMode="decimal" value={maxAmount} onChange={(e) => setMaxAmount(e.target.value)} placeholder="—" />
              </div>
            </div>
            <div className="field" style={{ marginBottom: 10 }}>
              <label>Status</label>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}>
                <option value="all">All</option>
                <option value="paid">Paid</option>
                <option value="partial">Partial</option>
                <option value="unpaid">Unpaid</option>
                <option value="late-fee">Late Fee</option>
              </select>
            </div>
            <div className="field" style={{ marginBottom: 10 }}>
              <label>Notes contains</label>
              <input type="text" value={notesSearch} onChange={(e) => setNotesSearch(e.target.value)} placeholder="Search notes…" />
            </div>
            <button className="btn btn-ghost btn-sm" onClick={clearFilters} disabled={!filtersActive}>
              Clear Filters
            </button>
          </div>
        )}
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

      {filteredRows.length === 0 ? (
        filtersActive ? (
          <div className="card">
            <p style={{ color: "var(--ink-soft)", fontSize: 15 }}>
              No payments match the current filters.
            </p>
          </div>
        ) : (
          <EmptyState
            icon={<FileTextIllustration />}
            title="No payments recorded"
            subtitle="Payments will appear here once recorded"
          />
        )
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
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => {
                  const isOwed = row.balance > 0.005;
                  const isClear = row.balance < -0.005;
                  const balText = isClear
                    ? `${money(Math.abs(row.balance))} CR`
                    : money(Math.abs(row.balance));
                  return (
                    <tr
                      key={row.rowNum}
                      className="stagger-item"
                      style={{
                        ["--stagger-delay" as string]: `${Math.min(row.rowNum - 1, 10) * 40}ms`,
                        ...(row.isSynthetic ? { background: "#FFFBEB", fontStyle: "italic", opacity: 0.9 } : {}),
                      } as React.CSSProperties}
                    >
                      <td className="ledger-num">{row.rowNum}</td>
                      <td className="ledger-date">{fmtLedgerDate(row.date)}</td>
                      <td className="ledger-money">
                        {row.amountDue > 0.005 ? money(row.amountDue) : "—"}
                      </td>
                      <td className="ledger-money ledger-paid">
                        {row.amountPaid > 0.005 ? money(row.amountPaid) : "—"}
                      </td>
                      <td
                        className={`ledger-money ${isOwed ? "ledger-owed" : isClear ? "ledger-credit" : "ledger-clear"}`}
                      >
                        {balText}
                      </td>
                      <td className="ledger-method">{row.method}</td>
                      <td className="ledger-notes">{row.notes ?? ""}</td>
                      <td style={{ textAlign: "center", padding: "0 6px" }}>
                        {!row.isSynthetic && row.amountPaid > 0.005 && (
                          <button
                            className="btn btn-ghost btn-xs"
                            style={{ padding: "4px 6px" }}
                            title="Print receipt"
                            aria-label="Print receipt"
                            onClick={() => {
                              setReceiptFlashId(row.rowNum);
                              printReceiptForRow(row);
                              setTimeout(() => setReceiptFlashId(null), 500);
                            }}
                          >
                            {receiptFlashId === row.rowNum ? <ReceiptCheckIcon size={15} /> : <PrinterIcon size={15} />}
                          </button>
                        )}
                      </td>
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
