import { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useStore } from "../data/store";
import { currentMonthKey } from "../types";
import { fullAddress, money, monthLabel } from "../utils/format";
import { ChevronLeft, DownloadIcon } from "../components/icons";
import { lateFeeForMonth } from "../utils/tenantCalc";
import {
  AGING_LABEL,
  agingBucketFor,
  daysOverdue,
  type AgingBucket,
} from "../utils/reportData";
import {
  csvCell,
  downloadCSV,
  escHtml,
  fmtMoney,
  openPrintWindow,
} from "../utils/reportExport";

const BUCKET_ORDER: AgingBucket[] = ["current", "1-30", "31-60", "61-90", "90+"];

const BUCKET_BG: Record<AgingBucket, string> = {
  current: "#F0FDF4",
  "1-30": "#FFFBEB",
  "31-60": "#FFF7ED",
  "61-90": "#FEF2F2",
  "90+": "#FEE2E2",
};

const BUCKET_PRINT_CLASS: Record<AgingBucket, string> = {
  current: "paid",
  "1-30": "partial",
  "31-60": "partial",
  "61-90": "unpaid",
  "90+": "unpaid",
};

export default function DelinquencyReport() {
  const { data } = useStore();
  const [params] = useSearchParams();
  const month = params.get("month") || currentMonthKey();
  const companyName = data.settings.landlordName || "DP Properties LLC";
  const days = daysOverdue(month);
  const monthTitle = monthLabel(month);

  const rows = useMemo(() => {
    return data.rentRecords
      .filter((r) => r.month === month)
      .map((r) => {
        const tenant = data.tenants.find((t) => t.id === r.tenantId);
        if (!tenant) return null;
        const property = data.properties.find((p) => p.id === tenant.propertyId);
        const fee = lateFeeForMonth(tenant, month, r);
        const due = r.amountDue + fee;
        const balance = due - r.amountPaid;
        const bucket = agingBucketFor(balance, days);
        return { tenant, property, rent: r.amountDue, paid: r.amountPaid, balance, bucket };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
      .sort((a, b) => b.balance - a.balance);
  }, [data, month, days]);

  const bucketTotals = useMemo(() => {
    const totals: Record<AgingBucket, number> = { current: 0, "1-30": 0, "31-60": 0, "61-90": 0, "90+": 0 };
    rows.forEach((r) => {
      if (r.balance > 0.005) totals[r.bucket] += r.balance;
    });
    return totals;
  }, [rows]);

  const totalOutstanding = BUCKET_ORDER.reduce((s, b) => s + bucketTotals[b], 0);

  const fullName = (r: typeof rows[number]) => `${r.tenant.firstName} ${r.tenant.lastName}`;
  const propAddr = (r: typeof rows[number]) => (r.property ? fullAddress(r.property) : "—");

  function exportCsv() {
    const lines: string[] = [
      [csvCell("Delinquency Aging Report"), csvCell(monthTitle)].join(","),
      "",
      [csvCell("Total Outstanding"), csvCell(totalOutstanding.toFixed(2))].join(","),
      ...BUCKET_ORDER.map((b) => [csvCell(AGING_LABEL[b]), csvCell(bucketTotals[b].toFixed(2))].join(",")),
      "",
      [csvCell("Tenant Name"), csvCell("Property"), csvCell("Monthly Rent"), csvCell("Amount Paid"), csvCell("Balance"), csvCell("Days Overdue"), csvCell("Aging Bucket")].join(","),
      ...rows.map((r) =>
        [csvCell(fullName(r)), csvCell(propAddr(r)), csvCell(r.rent.toFixed(2)), csvCell(r.paid.toFixed(2)), csvCell(r.balance.toFixed(2)), csvCell(r.balance > 0.005 ? days : 0), csvCell(AGING_LABEL[r.bucket])].join(","),
      ),
    ];
    downloadCSV(lines, `delinquency-${month}.csv`);
  }

  function exportPdf() {
    const summary = BUCKET_ORDER.map(
      (b) => `<div class="stat-box"><div class="v">${fmtMoney(bucketTotals[b])}</div><div class="l">${escHtml(AGING_LABEL[b])}</div></div>`,
    ).join("");
    const body = rows
      .map((r) => `<tr><td>${escHtml(fullName(r))}</td><td>${escHtml(propAddr(r))}</td><td class="money">${fmtMoney(r.rent)}</td><td class="money">${fmtMoney(r.paid)}</td><td class="money">${fmtMoney(r.balance)}</td><td class="center">${r.balance > 0.005 ? days : 0}</td><td class="center ${BUCKET_PRINT_CLASS[r.bucket]}">${escHtml(AGING_LABEL[r.bucket])}</td></tr>`)
      .join("");
    openPrintWindow(
      `Delinquency Aging Report — ${monthTitle}`,
      `<h1>Delinquency Aging Report — ${escHtml(monthTitle)}</h1>
       <p class="sub">${escHtml(companyName)}</p>
       <div class="stats"><div class="stat-box"><div class="v">${fmtMoney(totalOutstanding)}</div><div class="l">Total Outstanding</div></div>${summary}</div>
       <table class="rpt"><thead>
         <tr><th>Tenant Name</th><th>Property</th><th class="money">Rent</th><th class="money">Paid</th><th class="money">Balance</th><th class="center">Days Overdue</th><th class="center">Aging</th></tr>
       </thead><tbody>${body || `<tr><td colspan="7" class="center na" style="padding:18px">No rent records for ${escHtml(monthTitle)}.</td></tr>`}</tbody></table>
       <p class="footer">${escHtml(companyName)}</p>`,
    );
  }

  return (
    <>
      <Link className="back-link" to="/">
        <ChevronLeft size={16} /> Dashboard
      </Link>

      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
        <h2 style={{ flex: 1, minWidth: 160 }}>Delinquency Aging</h2>
        <button className="btn btn-ghost btn-sm" onClick={exportPdf}><DownloadIcon size={14} /> PDF</button>
        <button className="btn btn-ghost btn-sm" onClick={exportCsv}><DownloadIcon size={14} /> CSV</button>
      </div>

      <p style={{ color: "var(--ink-soft)", fontSize: 15, marginBottom: 12 }}>{monthTitle}</p>

      <div className="stat-grid">
        <div className="stat s-red"><div className="num" style={{ fontSize: 16 }}>{money(totalOutstanding)}</div><div className="lbl">Total Outstanding</div></div>
        {BUCKET_ORDER.map((b) => (
          <div className="stat" key={b}><div className="num" style={{ fontSize: 15 }}>{money(bucketTotals[b])}</div><div className="lbl">{AGING_LABEL[b]}</div></div>
        ))}
      </div>

      <div className="card" style={{ padding: 0, overflow: "hidden", marginTop: 12 }}>
        <div style={{ overflowX: "auto" }}>
          <table className="ledger-table" style={{ minWidth: 720 }}>
            <thead>
              <tr><th>Tenant</th><th>Property</th><th style={{ textAlign: "right" }}>Rent</th><th style={{ textAlign: "right" }}>Paid</th><th style={{ textAlign: "right" }}>Balance</th><th style={{ textAlign: "center" }}>Days</th><th style={{ textAlign: "center" }}>Aging</th></tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: "center", color: "var(--ink-soft)", padding: 18 }}>No rent records for {monthTitle}.</td></tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.tenant.id} style={{ background: BUCKET_BG[r.bucket] }}>
                    <td>{fullName(r)}</td>
                    <td>{propAddr(r)}</td>
                    <td style={{ textAlign: "right" }}>{money(r.rent)}</td>
                    <td style={{ textAlign: "right" }}>{money(r.paid)}</td>
                    <td style={{ textAlign: "right", fontWeight: 600 }}>{money(r.balance)}</td>
                    <td style={{ textAlign: "center" }}>{r.balance > 0.005 ? days : 0}</td>
                    <td style={{ textAlign: "center", fontWeight: 600 }}>{AGING_LABEL[r.bucket]}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
