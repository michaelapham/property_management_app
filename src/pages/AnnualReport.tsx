import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useStore } from "../data/store";
import { fullAddress, money } from "../utils/format";
import { ChevronLeft, DownloadIcon } from "../components/icons";
import { monthCellFor, tenantActiveInYear, type MonthCell } from "../utils/reportData";
import {
  csvCell,
  downloadCSV,
  escHtml,
  fmtMoney,
  openPrintWindow,
  safeName,
} from "../utils/reportExport";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function AnnualReport() {
  const { propertyId } = useParams();
  const { data } = useStore();
  const [year, setYear] = useState(new Date().getFullYear());

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

  const tenants = useMemo(
    () =>
      data.tenants
        .filter((t) => t.propertyId === property.id && tenantActiveInYear(t, year, data))
        .sort((a, b) => `${a.lastName}${a.firstName}`.localeCompare(`${b.lastName}${b.firstName}`)),
    [data, property.id, year],
  );

  // rows[tenantId] = MonthCell[12]
  const grid = useMemo(() => {
    return tenants.map((t) => {
      const cells: MonthCell[] = MONTHS.map((_, i) => {
        const month = `${year}-${String(i + 1).padStart(2, "0")}`;
        return monthCellFor(t, month, data);
      });
      const ytd = cells.reduce((s, c) => s + c.amountPaid, 0);
      return { tenant: t, cells, ytd };
    });
  }, [tenants, data, year]);

  // Per-month totals
  const monthTotals = MONTHS.map((_, i) => {
    let due = 0;
    let paid = 0;
    grid.forEach(({ cells }) => {
      if (cells[i].status !== "na") {
        due += cells[i].amountDue;
        paid += cells[i].amountPaid;
      }
    });
    return { due, paid, rate: due > 0 ? Math.round((paid / due) * 100) : null };
  });

  const totalExpected = monthTotals.reduce((s, m) => s + m.due, 0);
  const totalCollected = monthTotals.reduce((s, m) => s + m.paid, 0);

  function exportCsv() {
    const lines: string[] = [
      [csvCell("Annual Rent Summary"), csvCell(`${fullAddress(property!)} — ${year}`)].join(","),
      "",
      [csvCell("Tenant"), ...MONTHS.map((m) => csvCell(m)), csvCell("YTD Total")].join(","),
      ...grid.map(({ tenant, cells, ytd }) =>
        [
          csvCell(`${tenant.firstName} ${tenant.lastName}`),
          ...cells.map((c) => csvCell(c.status === "na" ? "" : c.amountPaid.toFixed(2))),
          csvCell(ytd.toFixed(2)),
        ].join(","),
      ),
      "",
      [csvCell("Total Collected"), ...monthTotals.map((m) => csvCell(m.paid.toFixed(2))), csvCell(totalCollected.toFixed(2))].join(","),
      [csvCell("Total Expected"), ...monthTotals.map((m) => csvCell(m.due.toFixed(2))), csvCell(totalExpected.toFixed(2))].join(","),
      [csvCell("Collection Rate"), ...monthTotals.map((m) => csvCell(m.rate === null ? "" : `${m.rate}%`)), csvCell(totalExpected > 0 ? `${Math.round((totalCollected / totalExpected) * 100)}%` : "")].join(","),
    ];
    downloadCSV(lines, `annual-rent-${safeName(property!.street)}-${year}.csv`);
  }

  function cellHtml(c: MonthCell): string {
    if (c.status === "na") return `<td class="center na">N/A</td>`;
    if (c.status === "paid") return `<td class="center paid">Paid</td>`;
    if (c.status === "partial")
      return `<td class="center partial">${fmtMoney(c.amountPaid)}<br>Partial</td>`;
    return `<td class="center unpaid">Unpaid</td>`;
  }

  function exportPdf() {
    const head = `<tr><th>Tenant</th>${MONTHS.map((m) => `<th class="center">${m}</th>`).join("")}<th class="money">YTD</th></tr>`;
    const body = grid
      .map(
        ({ tenant, cells, ytd }) =>
          `<tr><td>${escHtml(`${tenant.firstName} ${tenant.lastName}`)}</td>${cells.map(cellHtml).join("")}<td class="money">${fmtMoney(ytd)}</td></tr>`,
      )
      .join("");
    const foot = `
      <tr><td>Total Expected</td>${monthTotals.map((m) => `<td class="money">${fmtMoney(m.due)}</td>`).join("")}<td class="money">${fmtMoney(totalExpected)}</td></tr>
      <tr><td>Total Collected</td>${monthTotals.map((m) => `<td class="money">${fmtMoney(m.paid)}</td>`).join("")}<td class="money">${fmtMoney(totalCollected)}</td></tr>
      <tr><td>Collection Rate</td>${monthTotals.map((m) => `<td class="center">${m.rate === null ? "—" : `${m.rate}%`}</td>`).join("")}<td class="center">${totalExpected > 0 ? `${Math.round((totalCollected / totalExpected) * 100)}%` : "—"}</td></tr>`;
    openPrintWindow(
      `Annual Rent Summary — ${year}`,
      `<h1>Annual Rent Summary</h1>
       <p class="sub">${escHtml(fullAddress(property!))} — ${year}</p>
       <table class="rpt"><thead>${head}</thead><tbody>${body || `<tr><td colspan="14" class="center na" style="padding:18px">No tenants for ${year}.</td></tr>`}</tbody><tfoot>${foot}</tfoot></table>
       <p class="footer">${escHtml(companyName)}</p>`,
    );
  }

  return (
    <>
      <Link className="back-link" to={`/properties/${property.id}`}>
        <ChevronLeft size={16} /> {property.street}
      </Link>

      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
        <h2 style={{ flex: 1, minWidth: 160 }}>Annual Report</h2>
        <button className="btn btn-ghost btn-sm" onClick={exportPdf}>
          <DownloadIcon size={14} /> PDF
        </button>
        <button className="btn btn-ghost btn-sm" onClick={exportCsv}>
          <DownloadIcon size={14} /> CSV
        </button>
      </div>

      <div className="card" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 18, marginBottom: 12 }}>
        <button className="btn btn-ghost btn-sm" onClick={() => setYear((y) => y - 1)} aria-label="Previous year">←</button>
        <span style={{ fontSize: 20, fontWeight: 700 }}>{year}</span>
        <button className="btn btn-ghost btn-sm" onClick={() => setYear((y) => y + 1)} aria-label="Next year">→</button>
      </div>

      <p style={{ color: "var(--ink-soft)", fontSize: 14, marginBottom: 10 }}>
        {fullAddress(property)}
      </p>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table className="ledger-table" style={{ minWidth: 760 }}>
            <thead>
              <tr>
                <th>Tenant</th>
                {MONTHS.map((m) => <th key={m} style={{ textAlign: "center" }}>{m}</th>)}
                <th style={{ textAlign: "right" }}>YTD</th>
              </tr>
            </thead>
            <tbody>
              {grid.length === 0 ? (
                <tr><td colSpan={14} style={{ textAlign: "center", color: "var(--ink-soft)", padding: 18 }}>No tenants active in {year}.</td></tr>
              ) : (
                grid.map(({ tenant, cells, ytd }) => (
                  <tr key={tenant.id}>
                    <td>{tenant.firstName} {tenant.lastName}</td>
                    {cells.map((c, i) => (
                      <td key={i} style={{ textAlign: "center", ...cellStyle(c.status) }}>
                        {c.status === "na" ? "N/A"
                          : c.status === "paid" ? "Paid"
                          : c.status === "partial" ? <span>{money(c.amountPaid)}<br />Partial</span>
                          : "Unpaid"}
                      </td>
                    ))}
                    <td style={{ textAlign: "right" }}>{money(ytd)}</td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot>
              <tr style={{ fontWeight: 700 }}>
                <td>Expected</td>
                {monthTotals.map((m, i) => <td key={i} style={{ textAlign: "center" }}>{money(m.due)}</td>)}
                <td style={{ textAlign: "right" }}>{money(totalExpected)}</td>
              </tr>
              <tr style={{ fontWeight: 700 }}>
                <td>Collected</td>
                {monthTotals.map((m, i) => <td key={i} style={{ textAlign: "center" }}>{money(m.paid)}</td>)}
                <td style={{ textAlign: "right" }}>{money(totalCollected)}</td>
              </tr>
              <tr style={{ fontWeight: 700 }}>
                <td>Rate</td>
                {monthTotals.map((m, i) => <td key={i} style={{ textAlign: "center" }}>{m.rate === null ? "—" : `${m.rate}%`}</td>)}
                <td style={{ textAlign: "right" }}>{totalExpected > 0 ? `${Math.round((totalCollected / totalExpected) * 100)}%` : "—"}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </>
  );
}

function cellStyle(status: MonthCell["status"]): React.CSSProperties {
  switch (status) {
    case "paid": return { color: "var(--green)", fontWeight: 600 };
    case "partial": return { color: "var(--yellow)", fontWeight: 600 };
    case "unpaid": return { color: "var(--red)", fontWeight: 600 };
    default: return { color: "var(--ink-faint)" };
  }
}
