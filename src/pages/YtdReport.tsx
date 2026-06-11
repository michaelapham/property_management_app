import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { useStore } from "../data/store";
import { fullAddress, money } from "../utils/format";
import { ChevronLeft, DownloadIcon } from "../components/icons";
import { lateFeeForMonth } from "../utils/tenantCalc";
import {
  csvCell,
  downloadCSV,
  escHtml,
  fmtMoney,
  openPrintWindow,
  safeName,
} from "../utils/reportExport";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function YtdReport() {
  const { propertyId } = useParams();
  const { data } = useStore();
  const year = new Date().getFullYear();

  const property = data.properties.find((p) => p.id === propertyId);
  if (!property) {
    return (
      <div className="empty-state">
        <h3>Property not found</h3>
        <Link className="btn btn-ghost" to="/properties">Back to properties</Link>
      </div>
    );
  }

  const companyName = data.settings.landlordName || "DP Properties LLC";

  const monthRows = useMemo(() => {
    const tenantIds = new Set(data.tenants.filter((t) => t.propertyId === property.id).map((t) => t.id));
    return MONTHS.map((label, i) => {
      const month = `${year}-${String(i + 1).padStart(2, "0")}`;
      let expected = 0;
      let collected = 0;
      data.rentRecords
        .filter((r) => tenantIds.has(r.tenantId) && r.month === month)
        .forEach((r) => {
          const tenant = data.tenants.find((t) => t.id === r.tenantId)!;
          expected += r.amountDue + lateFeeForMonth(tenant, month, r);
          collected += r.amountPaid;
        });
      const outstanding = Math.max(0, expected - collected);
      const rate = expected > 0 ? Math.round((collected / expected) * 100) : null;
      return { label, month, expected, collected, outstanding, rate };
    });
  }, [data, property.id, year]);

  const totExpected = monthRows.reduce((s, m) => s + m.expected, 0);
  const totCollected = monthRows.reduce((s, m) => s + m.collected, 0);
  const totOutstanding = Math.max(0, totExpected - totCollected);
  const totRate = totExpected > 0 ? Math.round((totCollected / totExpected) * 100) : null;

  function exportCsv() {
    const lines: string[] = [
      [csvCell("YTD Income Report"), csvCell(`${fullAddress(property!)} — ${year}`)].join(","),
      "",
      [csvCell("Month"), csvCell("Expected"), csvCell("Collected"), csvCell("Outstanding"), csvCell("Collection Rate")].join(","),
      ...monthRows.map((m) =>
        [csvCell(m.label), csvCell(m.expected.toFixed(2)), csvCell(m.collected.toFixed(2)), csvCell(m.outstanding.toFixed(2)), csvCell(m.rate === null ? "" : `${m.rate}%`)].join(","),
      ),
      "",
      [csvCell("YTD Total"), csvCell(totExpected.toFixed(2)), csvCell(totCollected.toFixed(2)), csvCell(totOutstanding.toFixed(2)), csvCell(totRate === null ? "" : `${totRate}%`)].join(","),
    ];
    downloadCSV(lines, `ytd-income-${safeName(property!.street)}-${year}.csv`);
  }

  function exportPdf() {
    const body = monthRows
      .map((m) => `<tr><td>${m.label}</td><td class="money">${fmtMoney(m.expected)}</td><td class="money">${fmtMoney(m.collected)}</td><td class="money">${fmtMoney(m.outstanding)}</td><td class="center">${m.rate === null ? "—" : `${m.rate}%`}</td></tr>`)
      .join("");
    openPrintWindow(
      `YTD Income Report — ${year}`,
      `<h1>YTD Income Report ${year}</h1>
       <p class="sub">${escHtml(fullAddress(property!))}</p>
       <table class="rpt"><thead>
         <tr><th>Month</th><th class="money">Expected</th><th class="money">Collected</th><th class="money">Outstanding</th><th class="center">Rate</th></tr>
       </thead><tbody>${body}</tbody>
       <tfoot><tr><td>YTD Total</td><td class="money">${fmtMoney(totExpected)}</td><td class="money">${fmtMoney(totCollected)}</td><td class="money">${fmtMoney(totOutstanding)}</td><td class="center">${totRate === null ? "—" : `${totRate}%`}</td></tr></tfoot>
       </table>
       <p class="footer">${escHtml(companyName)}</p>`,
    );
  }

  return (
    <>
      <Link className="back-link" to={`/properties/${property.id}`}>
        <ChevronLeft size={16} /> {property.street}
      </Link>

      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
        <h2 style={{ flex: 1, minWidth: 160 }}>YTD Income Report {year}</h2>
        <button className="btn btn-ghost btn-sm" onClick={exportPdf}><DownloadIcon size={14} /> PDF</button>
        <button className="btn btn-ghost btn-sm" onClick={exportCsv}><DownloadIcon size={14} /> CSV</button>
      </div>

      <p style={{ color: "var(--ink-soft)", fontSize: 14, marginBottom: 12 }}>{fullAddress(property)}</p>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table className="ledger-table" style={{ minWidth: 560 }}>
            <thead>
              <tr><th>Month</th><th style={{ textAlign: "right" }}>Expected</th><th style={{ textAlign: "right" }}>Collected</th><th style={{ textAlign: "right" }}>Outstanding</th><th style={{ textAlign: "center" }}>Rate</th></tr>
            </thead>
            <tbody>
              {monthRows.map((m) => (
                <tr key={m.month}>
                  <td>{m.label}</td>
                  <td style={{ textAlign: "right" }}>{money(m.expected)}</td>
                  <td style={{ textAlign: "right", color: "var(--green)" }}>{money(m.collected)}</td>
                  <td style={{ textAlign: "right", color: m.outstanding > 0.005 ? "var(--red)" : undefined }}>{money(m.outstanding)}</td>
                  <td style={{ textAlign: "center" }}>{m.rate === null ? "—" : `${m.rate}%`}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ fontWeight: 700 }}>
                <td>YTD Total</td>
                <td style={{ textAlign: "right" }}>{money(totExpected)}</td>
                <td style={{ textAlign: "right" }}>{money(totCollected)}</td>
                <td style={{ textAlign: "right" }}>{money(totOutstanding)}</td>
                <td style={{ textAlign: "center" }}>{totRate === null ? "—" : `${totRate}%`}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </>
  );
}
