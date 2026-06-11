// Shared helpers for report views (annual summary, month reconciliation, YTD,
// delinquency aging) and rent receipts. Print approach mirrors printLedger in
// exportLedger.ts — open a window, write HTML, print on load.

export function escHtml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function fmtMoney(n: number): string {
  const safe = isFinite(n) ? n : 0;
  return safe.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function csvCell(v: string | number): string {
  return `"${String(v).replace(/"/g, '""')}"`;
}

export function downloadCSV(lines: string[], filename: string): void {
  const blob = new Blob([lines.join("\r\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function safeName(s: string): string {
  return s.replace(/\s+/g, "-").replace(/[^a-zA-Z0-9-]/g, "");
}

export interface ReceiptData {
  receiptNumber: string;
  landlordName: string;
  propertyAddress: string;
  tenantName: string;
  paymentDate: string;
  amountPaid: number;
  paymentMethod: string;
  notes?: string;
}

/** Opens a compact (half-page) rent receipt print window. */
export function printReceipt(r: ReceiptData): void {
  const w = window.open("", "_blank");
  if (!w) {
    alert("Popup blocked — please allow popups for this site to print.");
    return;
  }
  const row = (label: string, value: string) =>
    `<tr><td class="lbl">${escHtml(label)}</td><td>${escHtml(value)}</td></tr>`;
  w.document.write(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Rent Receipt — ${escHtml(r.receiptNumber)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; margin: 0; color: #000; }
  .receipt { max-width: 560px; margin: 0 auto; padding: 28px 30px; border: 1.5px solid #999; border-radius: 6px; }
  h1 { font-size: 18pt; text-align: center; margin: 0 0 2px; letter-spacing: 0.08em; }
  .company { text-align: center; font-weight: bold; font-size: 12pt; margin: 0 0 2px; }
  .addr { text-align: center; font-size: 10pt; color: #444; margin: 0 0 14px; }
  .rno { text-align: center; font-size: 9.5pt; color: #666; margin: 0 0 16px; }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 6px 4px; font-size: 11pt; vertical-align: top; border-bottom: 1px solid #eee; }
  td.lbl { font-weight: bold; width: 140px; color: #333; }
  .amount { font-size: 15pt; font-weight: bold; }
  .footer { text-align: center; font-size: 10pt; color: #555; margin-top: 16px; font-style: italic; }
  @media print { @page { margin: 1.2cm; } .receipt { border: 1.5px solid #999; } }
</style>
</head>
<body>
<div class="receipt">
  <h1>RENT RECEIPT</h1>
  <p class="company">${escHtml(r.landlordName)}</p>
  <p class="addr">${escHtml(r.propertyAddress)}</p>
  <p class="rno">Receipt No. ${escHtml(r.receiptNumber)}</p>
  <table>
    ${row("Tenant", r.tenantName)}
    ${row("Payment Date", r.paymentDate)}
    <tr><td class="lbl">Amount Paid</td><td class="amount">${escHtml(fmtMoney(r.amountPaid))}</td></tr>
    ${row("Payment Method", r.paymentMethod)}
    ${r.notes ? row("Notes", r.notes) : ""}
    ${row("Received by", r.landlordName)}
  </table>
  <p class="footer">Thank you for your payment.</p>
</div>
<script>window.onload = function() { window.print(); };<\/script>
</body>
</html>`);
  w.document.close();
}

/** Opens a print window with the given <body> HTML and a standard report stylesheet. */
export function openPrintWindow(title: string, bodyHtml: string): void {
  const w = window.open("", "_blank");
  if (!w) {
    alert("Popup blocked — please allow popups for this site to print.");
    return;
  }
  w.document.write(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${escHtml(title)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 11pt; margin: 0; color: #000; }
  .page { max-width: 1000px; margin: 0 auto; padding: 32px 28px; }
  h1 { font-size: 16pt; text-align: center; margin: 0 0 6px; letter-spacing: 0.03em; }
  .sub { text-align: center; color: #444; font-size: 11pt; margin: 0 0 18px; }
  table.rpt { width: 100%; border-collapse: collapse; margin-bottom: 14px; }
  table.rpt th {
    background: #f0f0f0; border: 1px solid #bbb; padding: 6px 8px;
    font-size: 9.5pt; text-align: left; white-space: nowrap;
  }
  table.rpt td { border: 1px solid #ddd; padding: 6px 8px; font-size: 9.5pt; vertical-align: top; }
  table.rpt tbody tr:nth-child(even) td { background: #fafafa; }
  table.rpt tfoot td { font-weight: bold; background: #f0f0f0; border-top: 2px solid #999; }
  .money { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
  .center { text-align: center; }
  .paid { color: #15803D; font-weight: bold; }
  .partial { color: #B45309; font-weight: bold; }
  .unpaid { color: #B91C1C; font-weight: bold; }
  .na { color: #999; }
  .section-h { font-weight: bold; font-size: 11.5pt; margin: 18px 0 8px; }
  .stats { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 18px; }
  .stat-box { border: 1px solid #ccc; border-radius: 6px; padding: 8px 14px; min-width: 120px; }
  .stat-box .v { font-size: 14pt; font-weight: bold; }
  .stat-box .l { font-size: 8.5pt; color: #666; text-transform: uppercase; letter-spacing: 0.04em; }
  .footer { font-size: 9pt; color: #777; text-align: center; margin-top: 16px; border-top: 1px solid #ddd; padding-top: 10px; }
  @media print {
    @page { margin: 1.6cm 1.2cm; }
    body { font-size: 9.5pt; }
    .page { padding: 0; }
  }
</style>
</head>
<body>
<div class="page">
${bodyHtml}
</div>
<script>window.onload = function() { window.print(); };<\/script>
</body>
</html>`);
  w.document.close();
}
