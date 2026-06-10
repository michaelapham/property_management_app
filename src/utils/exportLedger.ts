import * as XLSX from "xlsx";

export interface LedgerHeader {
  propertyAddress: string;
  tenantName: string;
  leaseStart: string;
  leaseEnd: string;
  landlordName: string;
  year: number;
}

export interface LedgerRow {
  rowNum: number;
  /** ISO timestamp */
  date: string;
  month: string;
  /** New charge this row (monthly rent, shown only on first row per month) */
  amountDue: number;
  amountPaid: number;
  balance: number;
  method: string;
  notes?: string;
}

// MM/DD/YYYY
function fmtDate(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}/${d.getFullYear()}`;
}

function fmtMoney(n: number): string {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function safeFilename(name: string, year: number, ext: string): string {
  return `rent-ledger-${name.replace(/\s+/g, "-").replace(/[^a-zA-Z0-9-]/g, "")}-${year}.${ext}`;
}

// ─── CSV ─────────────────────────────────────────────────────────────────────

export function exportCSV(
  header: LedgerHeader,
  rows: LedgerRow[],
  generatedAt: string
): void {
  function cell(v: string | number): string {
    return `"${String(v).replace(/"/g, '""')}"`;
  }

  const lines: string[] = [
    cell("Rent Payment Ledger"),
    "",
    [cell("Property"), cell(header.propertyAddress)].join(","),
    [cell("Tenant"), cell(header.tenantName)].join(","),
    [cell("Lease Period"), cell(`${header.leaseStart} – ${header.leaseEnd}`)].join(","),
    [cell("Landlord"), cell(header.landlordName || "—")].join(","),
    [cell("Year"), cell(header.year)].join(","),
    "",
    [cell("#"), cell("Date"), cell("Due"), cell("Paid"), cell("Balance"), cell("Method"), cell("Notes")].join(","),
    ...rows.map((r) =>
      [
        cell(r.rowNum),
        cell(fmtDate(r.date)),
        cell(r.amountDue > 0 ? r.amountDue.toFixed(2) : ""),
        cell(r.amountPaid.toFixed(2)),
        cell(r.balance.toFixed(2)),
        cell(r.method),
        cell(r.notes || ""),
      ].join(",")
    ),
    "",
    [cell("Generated on"), cell(generatedAt)].join(","),
  ];

  downloadBlob(
    new Blob([lines.join("\r\n")], { type: "text/csv;charset=utf-8;" }),
    safeFilename(header.tenantName, header.year, "csv")
  );
}

// ─── Excel ───────────────────────────────────────────────────────────────────

export function exportExcel(
  header: LedgerHeader,
  rows: LedgerRow[],
  generatedAt: string
): void {
  const aoa: (string | number | null)[][] = [
    ["Rent Payment Ledger"],
    [],
    ["Property", header.propertyAddress],
    ["Tenant", header.tenantName],
    ["Lease Period", `${header.leaseStart} – ${header.leaseEnd}`],
    ["Landlord", header.landlordName || "—"],
    ["Year", header.year],
    [],
    ["#", "Date", "Due ($)", "Paid ($)", "Balance ($)", "Method", "Notes"],
    ...rows.map((r) => [
      r.rowNum,
      fmtDate(r.date),
      r.amountDue > 0 ? r.amountDue : null,
      r.amountPaid,
      r.balance,
      r.method,
      r.notes || "",
    ]),
    [],
    ["Generated on", generatedAt],
  ];

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws["!cols"] = [
    { wch: 4 },
    { wch: 12 },
    { wch: 11 },
    { wch: 11 },
    { wch: 12 },
    { wch: 10 },
    { wch: 40 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Rent Ledger");
  XLSX.writeFile(wb, safeFilename(header.tenantName, header.year, "xlsx"));
}

// ─── PDF (browser print) ─────────────────────────────────────────────────────

export function printLedger(
  header: LedgerHeader,
  rows: LedgerRow[],
  generatedAt: string
): void {
  const w = window.open("", "_blank");
  if (!w) {
    alert("Popup blocked — please allow popups for this site to print.");
    return;
  }

  const rowsHtml = rows
    .map((r) => {
      const balClass = r.balance > 0.005 ? "owed" : "clear";
      const balText =
        r.balance < -0.005
          ? `${fmtMoney(Math.abs(r.balance))} CR`
          : fmtMoney(Math.abs(r.balance));
      return `
        <tr>
          <td class="num">${r.rowNum}</td>
          <td>${fmtDate(r.date)}</td>
          <td class="money">${r.amountDue > 0.005 ? fmtMoney(r.amountDue) : "—"}</td>
          <td class="money">${fmtMoney(r.amountPaid)}</td>
          <td class="money ${balClass}">${balText}</td>
          <td>${r.method}</td>
          <td class="notes">${r.notes ? escHtml(r.notes) : ""}</td>
        </tr>`;
    })
    .join("");

  const emptyRow = `
    <tr>
      <td colspan="7" style="text-align:center;color:#999;padding:18px;">
        No payments recorded for ${header.year}.
      </td>
    </tr>`;

  w.document.write(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Rent Payment Ledger — ${escHtml(header.tenantName)} — ${header.year}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 11pt; margin: 0; color: #000; }
  .page { max-width: 800px; margin: 0 auto; padding: 32px 28px; }
  h1 { font-size: 16pt; text-align: center; margin: 0 0 20px; letter-spacing: 0.03em; }
  .legal-header { border: 1.5px solid #aaa; border-radius: 4px; padding: 14px 18px; margin-bottom: 20px; }
  .legal-header table { border-collapse: collapse; width: 100%; }
  .legal-header td { padding: 4px 8px; font-size: 10.5pt; }
  .legal-header td:first-child { font-weight: bold; width: 130px; color: #333; }
  table.ledger { width: 100%; border-collapse: collapse; margin-bottom: 14px; }
  table.ledger th {
    background: #f0f0f0; border: 1px solid #bbb; padding: 6px 8px;
    font-size: 10pt; text-align: left; white-space: nowrap;
  }
  table.ledger td { border: 1px solid #ddd; padding: 6px 8px; font-size: 10pt; vertical-align: top; }
  table.ledger tbody tr:nth-child(even) td { background: #fafafa; }
  .money { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
  .num { text-align: center; }
  .owed { color: #c0392b; font-weight: bold; }
  .clear { color: #27ae60; }
  .notes { font-size: 9.5pt; color: #444; max-width: 200px; }
  .footer { font-size: 9pt; color: #777; text-align: center; margin-top: 16px; border-top: 1px solid #ddd; padding-top: 10px; }
  @media print {
    @page { margin: 1.8cm 1.5cm; }
    body { font-size: 10pt; }
    .page { padding: 0; }
  }
</style>
</head>
<body>
<div class="page">
  <h1>Rent Payment Ledger</h1>
  <div class="legal-header">
    <table>
      <tr><td>Property:</td><td>${escHtml(header.propertyAddress)}</td></tr>
      <tr><td>Tenant:</td><td>${escHtml(header.tenantName)}</td></tr>
      <tr><td>Lease Period:</td><td>${escHtml(header.leaseStart)} – ${escHtml(header.leaseEnd)}</td></tr>
      <tr><td>Landlord:</td><td>${escHtml(header.landlordName || "—")}</td></tr>
      <tr><td>Year:</td><td>${header.year}</td></tr>
    </table>
  </div>
  <table class="ledger">
    <thead>
      <tr>
        <th class="num">#</th>
        <th>Date</th>
        <th class="money">Due</th>
        <th class="money">Paid</th>
        <th class="money">Balance</th>
        <th>Method</th>
        <th>Notes</th>
      </tr>
    </thead>
    <tbody>
      ${rows.length > 0 ? rowsHtml : emptyRow}
    </tbody>
  </table>
  <p class="footer">Generated on ${escHtml(generatedAt)}</p>
</div>
<script>window.onload = function() { window.print(); };<\/script>
</body>
</html>`);
  w.document.close();
}

function escHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
