export type FoundationType =
  | "slab"
  | "crawlspace"
  | "basement"
  | "pier-and-beam"
  | "unknown";

export type ConstructionType =
  | "brick"
  | "wood-frame"
  | "vinyl-siding"
  | "stucco"
  | "stone"
  | "mixed"
  | "unknown";

export type FenceType =
  | "none"
  | "chainlink"
  | "wood"
  | "vinyl"
  | "wrought-iron"
  | "mixed"
  | "unknown";

export interface Property {
  id: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  photoDataUrl?: string;
  beds?: number;
  baths?: number;
  sqft?: number;
  lotSqft?: number;
  yearBuilt?: number;
  foundation: FoundationType;
  construction: ConstructionType;
  fence: FenceType;
  valueEstimate?: number;
  prevYearTaxValue?: number;
  airFilterLastReplaced?: string;
  propertyStatus?: "pending";
  lastOccupiedDate?: string;
  createdAt: string;
}

export interface Tenant {
  id: string;
  propertyId: string;
  firstName: string;
  lastName: string;
  rentAmount: number;
  photoDataUrl?: string;
  email?: string;
  phone?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  petOnFile?: boolean;
  moveInDate?: string;
  leaseEndDate?: string;
  createdAt: string;
}

export type RentStatus = "paid" | "partial" | "unpaid";

export interface RentRecord {
  id: string;
  tenantId: string;
  month: string;
  amountDue: number;
  amountPaid: number;
  paidDate?: string;
}

export type NoteTag =
  | "air-filter"
  | "new-pet"
  | "complaint"
  | "maintenance"
  | "payment"
  | "request"
  | "general";

export interface Note {
  id: string;
  tenantId?: string;
  propertyId?: string;
  date: string;
  text: string;
  tags: NoteTag[];
}

export type Trade =
  | "plumber"
  | "hvac"
  | "electrician"
  | "handyman"
  | "roofer"
  | "landscaper"
  | "pest-control"
  | "appliance"
  | "other";

export interface Contractor {
  id: string;
  name: string;
  trade: Trade;
  phone: string;
  hours?: string;
  rating?: number;
  notes?: string;
}

export interface Receipt {
  id: string;
  date: string;
  imageDataUrl: string;
  description: string;
  amount?: number;
  category?: string;
  propertyId?: string;
}

export type PaymentMethod = "cash" | "check" | "venmo" | "zelle" | "other";

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  cash: "Cash",
  check: "Check",
  venmo: "Venmo",
  zelle: "Zelle",
  other: "Other",
};

export interface LedgerEntry {
  id: string;
  tenantId: string;
  propertyId: string;
  rentRecordId: string;
  /** ISO timestamp — when the payment was recorded */
  date: string;
  /** YYYY-MM — which rent period this payment applies to */
  month: string;
  /** Actual dollars received in this single transaction */
  amountPaid: number;
  paymentMethod: PaymentMethod;
  notes?: string;
}

export interface AppSettings {
  landlordName: string;
}

export type TaskCategory = "urgent" | "soon" | "later";

export interface Task {
  id: string;
  propertyId: string;
  category: TaskCategory;
  text: string;
  createdAt: string;
  completedAt?: string;
}

export interface AppData {
  properties: Property[];
  tenants: Tenant[];
  rentRecords: RentRecord[];
  notes: Note[];
  contractors: Contractor[];
  receipts: Receipt[];
  ledgerEntries: LedgerEntry[];
  tasks: Task[];
  settings: AppSettings;
}

export function rentStatusOf(r: RentRecord): RentStatus {
  if (r.amountPaid >= r.amountDue && r.amountDue > 0) return "paid";
  if (r.amountPaid > 0) return "partial";
  return "unpaid";
}

export function currentMonthKey(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
