import { type AppData, type RentRecord, type Tenant, rentStatusOf } from "../types";

/**
 * Returns the late fee owed for a given month, or 0 if not applicable.
 * - Returns 0 if settings are disabled or rent is fully paid.
 * - Returns 0 if today is still within the grace period.
 */
export function lateFeeForMonth(
  tenant: Tenant,
  month: string,
  record: RentRecord | undefined,
): number {
  const s = tenant.lateFeeSettings;
  if (!s?.enabled || !s.feeAmount || s.feeAmount <= 0) return 0;
  if (!record) return 0;
  if (rentStatusOf(record) === "paid") return 0;

  const [y, m] = month.split("-").map(Number);
  const graceCutoff = new Date(y, m - 1, 1 + s.gracePeriodDays);
  if (Date.now() < graceCutoff.getTime()) return 0;

  if (s.feeType === "percent") {
    return Math.round(tenant.rentAmount * s.feeAmount) / 100;
  }
  return s.feeAmount;
}

/**
 * Date the late fee becomes effective (day after grace period).
 */
export function lateFeeDate(month: string, gracePeriodDays: number): Date {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m - 1, 1 + gracePeriodDays);
}

/**
 * Returns the ISO string for the month immediately before `month`.
 */
export function prevMonthKey(month: string): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Human-readable label for a month key, e.g. "May 2026".
 */
export function monthName(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

/**
 * Computes the total outstanding balance from all months strictly before
 * `beforeMonth` for the given tenant. Used for balance-forward rows.
 */
export function computeOpeningBalance(
  tenantId: string,
  beforeMonth: string,
  data: AppData,
  tenant: Tenant,
): number {
  const priorRecords = data.rentRecords.filter(
    (r) => r.tenantId === tenantId && r.month < beforeMonth,
  );
  let balance = 0;
  for (const rec of priorRecords) {
    const fee = lateFeeForMonth(tenant, rec.month, rec);
    const delta = rec.amountDue + fee - rec.amountPaid;
    // Guard: skip NaN deltas from corrupted records to avoid poisoning the balance
    if (isFinite(delta)) balance += delta;
  }
  return Math.max(0, balance);
}
