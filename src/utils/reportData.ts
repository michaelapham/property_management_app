import type { AppData, RentRecord, Tenant } from "../types";
import { rentStatusOf } from "../types";
import { lateFeeForMonth } from "./tenantCalc";

export type CellStatus = "paid" | "partial" | "unpaid" | "na";

export interface MonthCell {
  status: CellStatus;
  amountDue: number;
  amountPaid: number;
  /** rent record for the month, if one exists */
  record?: RentRecord;
}

/**
 * Resolves a tenant's rent figures for a given month from rent records + late fees.
 * Returns "na" when there is no rent record for that month.
 */
export function monthCellFor(tenant: Tenant, month: string, data: AppData): MonthCell {
  const record = data.rentRecords.find(
    (r) => r.tenantId === tenant.id && r.month === month,
  );
  if (!record) return { status: "na", amountDue: 0, amountPaid: 0 };
  const fee = lateFeeForMonth(tenant, month, record);
  const amountDue = record.amountDue + fee;
  const amountPaid = record.amountPaid;
  return {
    status: rentStatusOf(record),
    amountDue,
    amountPaid,
    record,
  };
}

/**
 * Was the tenant active during the given calendar year?
 * Active = move-in on/before Dec 31 of the year AND
 *          (no lease end OR lease end on/after Jan 1 of the year) OR
 *          has any rent record in that year.
 */
export function tenantActiveInYear(tenant: Tenant, year: number, data: AppData): boolean {
  const hasRecord = data.rentRecords.some(
    (r) => r.tenantId === tenant.id && r.month.startsWith(String(year)),
  );
  if (hasRecord) return true;
  const yearStart = `${year}-01-01`;
  const yearEnd = `${year}-12-31`;
  if (tenant.moveInDate && tenant.moveInDate.slice(0, 10) > yearEnd) return false;
  if (tenant.leaseEndDate && tenant.leaseEndDate.slice(0, 10) < yearStart) return false;
  return true;
}

/** Days since the 1st of `month` (YYYY-MM) to today. 0 if month is in the future. */
export function daysOverdue(month: string): number {
  const [y, m] = month.split("-").map(Number);
  const first = new Date(y, m - 1, 1).getTime();
  return Math.max(0, Math.floor((Date.now() - first) / 86400000));
}

export type AgingBucket = "current" | "1-30" | "31-60" | "61-90" | "90+";

export function agingBucketFor(balance: number, days: number): AgingBucket {
  if (balance <= 0.005) return "current";
  if (days <= 0) return "current";
  if (days <= 30) return "1-30";
  if (days <= 60) return "31-60";
  if (days <= 90) return "61-90";
  return "90+";
}

export const AGING_LABEL: Record<AgingBucket, string> = {
  current: "Current",
  "1-30": "1–30 days",
  "31-60": "31–60 days",
  "61-90": "61–90 days",
  "90+": "90+ days",
};
