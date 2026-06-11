import { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useStore } from "../data/store";
import { currentMonthKey, rentStatusOf, type RentStatus } from "../types";
import { fullAddress, money, monthLabel } from "../utils/format";
import { ChevronLeft, DownloadIcon } from "../components/icons";
import { lateFeeForMonth } from "../utils/tenantCalc";
import { daysOverdue, monthCellFor } from "../utils/reportData";
import {
  csvCell,
  downloadCSV,
  escHtml,
  fmtMoney,
  openPrintWindow,
} from "../utils/reportExport";

const STATUS_LABEL: Record<RentStatus, string> = {
  paid: "Paid",
  partial: "Partial",
  unpaid: "Unpaid",
};

export default function MonthSummary() {
  const { data } = useStore();
  const [params] = useSearchParams();
  const month = params.get("month") || currentMonthKey();
  const companyName = data.settings.landlordName || "DP Properties LLC";

  const rows = useMemo(() => {
    return data.tenants
      .map((t) => {
        const property = data.properties.find((p) => p.id === t.propertyId);
        const cell = monthCellFor(t, month, data);
        const record = data.rentRecords.find((r) => r.tenantId === t.id && r.month === month);
        const due = record ? record.amountDue + lateFeeForMonth(t, month, record) : t.rentAmount;
        const paid = record ? record.amountPaid : 0;
        const balance = due - paid;
        const status: RentStatus = record ? rentStatusOf(record) : "unpaid";
        const lateFee = record ? lateFeeForMonth(t, month, record) > 0 : false;
        return { tenant: t, property, due, paid, balance, status, lateFee, hasRecord: !!cell.record };
      })
      .sort((a, b) =>
        `${a.tenant.lastName}${a.tenant.firstName}`.localeCompare(`${b.tenant.lastName}${b.tenant.firstName}`),
      );
  }, [data, month]);

  const totalUnits = rows.length;
  const totalExpected = rows.reduce((s, r) => s + r.due, 0);
  const totalCollected = rows.reduce((s, r) => s + r.paid, 0);
  const totalOutstanding = Math.max(0, totalExpected - totalCollected);
  const collectionRate = totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : 0;

  const delinquent = rows.filter((r) => r.balance > 0.005);
  const overdueDays = daysOverdue(month);
  const monthTitle = monthLabel(month);

  const fullName = (r: typeof rows[number]) => `${r.tenant.firstName} ${r.tenant.lastName}`;
  const propAddr = (r: typeof rows[number]) => (r.property ? fullAddress(r.property) : "—");

  function exportCsv() {
    const lines: string[] = [
      [csvCell("Rent Reconciliation"), csvCell(monthTitle)].join(","),
      "",
      [csvCell("Total Units"), csvCell(totalUnits)].join(","),
      [csvCell("Total Expected"), csvCell(totalExpected.toFixed(2))].join(","),
      [csvCell("Total Collected"), csvCell(totalCollected.toFixed(2))].join(","),
      [csvCell("Total Outstanding"), csvCell(totalOutstanding.toFixed(2))].join(","),
      [csvCell("Collection Rate"), csvCell(`${collectionRate}%`)].join(","),
      "",
      [csvCell("Name"), csvCell("Property"), csvCell("Rent Due"), csvCell("Amount Paid"), csvCell("Balance"), csvCell("Status")].join(","),
      ...rows.map((r) =>
        [csvCell(fullName(r)), csvCell(propAddr(r)), csvCell(r.due.toFixed(2)), csvCell(r.paid.toFixed(2)), csvCell(r.balance.toFixed(2)), csvCell(STATUS_LABEL[r.status])].join(","),
      ),
      "",
      [csvCell("Delinquent Tenants")].join(","),
      [csvCell("Name"), csvCell("Property"), csvCell("Amount Owed"), csvCell("Days Overdue"), csvCell("Late Fee")].join(","),
      ...delinquent.map((r) =>
        [csvCell(fullName(r)), csvCell(propAddr(r)), csvCell(r.balance.toFixed(2)), csvCell(overdueDays), csvCell(r.lateFee ? "Y" : "N")].join(","),
      ),
    ];
    downloadCSV(lines, `month-summary-${month}.csv`);
  }

  function exportPdf() {
    const table1 = `
      <table class="rpt"><thead>
        <tr><th>Name</th><th>Property</th><th class="money">Rent Due</th><th class="money">Paid</th><th class="money">Balance</th><th>Status</th></tr>
      </thead><tbody>
        ${rows.map((r) => `<tr><td>${escHtml(fullName(r))}</td><td>${escHtml(propAddr(r))}</td><td class="money">${fmtMoney(r.due)}</td><td class="money">${fmtMoney(r.paid)}</td><td class="money">${fmtMoney(r.balance)}</td><td class="${r.status}">${STATUS_LABEL[r.status]}</td></tr>`).join("") || `<tr><td colspan="6" class="center na" style="padding:18px">No tenants.</td></tr>`}
      </tbody></table>`;
    const table2 = `
      <div class="section-h">Delinquent Tenants</div>
      <table class="rpt"><thead>
        <tr><th>Name</th><th>Property</th><th class="money">Amount Owed</th><th class="center">Days Overdue</th><th class="center">Late Fee</th></tr>
      </thead><tbody>
        ${delinquent.map((r) => `<tr><td>${escHtml(fullName(r))}</td><td>${escHtml(propAddr(r))}</td><td class="money unpaid">${fmtMoney(r.balance)}</td><td class="center">${overdueDays}</td><td class="center">${r.lateFee ? "Yes" : "No"}</td></tr>`).join("") || `<tr><td colspan="5" class="center na" style="padding:18px">No delinquent tenants — all rent collected.</td></tr>`}
      </tbody></table>`;
    openPrintWindow(
      `Rent Reconciliation — ${monthTitle}`,
      `<h1>Rent Reconciliation — ${escHtml(monthTitle)}</h1>
       <p class="sub">${escHtml(companyName)}</p>
       <div class="stats">
         <div class="stat-box"><div class="v">${totalUnits}</div><div class="l">Total Units</div></div>
         <div class="stat-box"><div class="v">${fmtMoney(totalExpected)}</div><div class="l">Expected</div></div>
         <div class="stat-box"><div class="v">${fmtMoney(totalCollected)}</div><div class="l">Collected</div></div>
         <div class="stat-box"><div class="v">${fmtMoney(totalOutstanding)}</div><div class="l">Outstanding</div></div>
         <div class="stat-box"><div class="v">${collectionRate}%</div><div class="l">Collection Rate</div></div>
       </div>
       ${table1}
       ${table2}
       <p class="footer">${escHtml(companyName)}</p>`,
    );
  }

  return (
    <>
      <Link className="back-link" to="/">
        <ChevronLeft size={16} /> Dashboard
      </Link>

      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
        <h2 style={{ flex: 1, minWidth: 160 }}>Rent Reconciliation</h2>
        <button className="btn btn-ghost btn-sm" onClick={exportPdf}><DownloadIcon size={14} /> PDF</button>
        <button className="btn btn-ghost btn-sm" onClick={exportCsv}><DownloadIcon size={14} /> CSV</button>
      </div>

      <p style={{ color: "var(--ink-soft)", fontSize: 15, marginBottom: 12 }}>{monthTitle}</p>

      <div className="stat-grid">
        <div className="stat"><div className="num" style={{ fontSize: 18 }}>{totalUnits}</div><div className="lbl">Units</div></div>
        <div className="stat"><div className="num" style={{ fontSize: 16 }}>{money(totalExpected)}</div><div className="lbl">Expected</div></div>
        <div className="stat s-green"><div className="num" style={{ fontSize: 16 }}>{money(totalCollected)}</div><div className="lbl">Collected</div></div>
        <div className="stat s-red"><div className="num" style={{ fontSize: 16 }}>{money(totalOutstanding)}</div><div className="lbl">Outstanding</div></div>
        <div className="stat"><div className="num" style={{ fontSize: 18 }}>{collectionRate}%</div><div className="lbl">Rate</div></div>
      </div>

      <div className="section-title"><span>All Tenants</span></div>
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table className="ledger-table" style={{ minWidth: 640 }}>
            <thead>
              <tr><th>Name</th><th>Property</th><th style={{ textAlign: "right" }}>Due</th><th style={{ textAlign: "right" }}>Paid</th><th style={{ textAlign: "right" }}>Balance</th><th>Status</th></tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: "center", color: "var(--ink-soft)", padding: 18 }}>No tenants.</td></tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.tenant.id}>
                    <td>{fullName(r)}</td>
                    <td>{propAddr(r)}</td>
                    <td style={{ textAlign: "right" }}>{money(r.due)}</td>
                    <td style={{ textAlign: "right" }}>{money(r.paid)}</td>
                    <td style={{ textAlign: "right" }}>{money(r.balance)}</td>
                    <td><span className={`pill pill-${r.status}`}>{STATUS_LABEL[r.status]}</span></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="section-title"><span>Delinquent Tenants</span></div>
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table className="ledger-table" style={{ minWidth: 560 }}>
            <thead>
              <tr><th>Name</th><th>Property</th><th style={{ textAlign: "right" }}>Owed</th><th style={{ textAlign: "center" }}>Days Overdue</th><th style={{ textAlign: "center" }}>Late Fee</th></tr>
            </thead>
            <tbody>
              {delinquent.length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign: "center", color: "var(--ink-soft)", padding: 18 }}>No delinquent tenants.</td></tr>
              ) : (
                delinquent.map((r) => (
                  <tr key={r.tenant.id}>
                    <td>{fullName(r)}</td>
                    <td>{propAddr(r)}</td>
                    <td style={{ textAlign: "right", color: "var(--red)", fontWeight: 600 }}>{money(r.balance)}</td>
                    <td style={{ textAlign: "center" }}>{overdueDays}</td>
                    <td style={{ textAlign: "center" }}>{r.lateFee ? "Yes" : "No"}</td>
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
