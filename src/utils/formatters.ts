// Thin formatting helpers. Currency aligns with the existing money() helper
// in format.ts; use money() for app-facing display (it shows "—" for
// undefined and drops cents on whole amounts). formatCurrency is for places
// that always want fixed 2-decimal output (e.g. exported reports/totals).
export { money } from "./format";

export function formatCurrency(amount: number): string {
  if (!isFinite(amount)) return "$0.00";
  return (
    "$" +
    Number(amount).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

export function formatPercent(value: number): string {
  if (!isFinite(value)) return "0.0%";
  return Number(value).toFixed(1) + "%";
}
