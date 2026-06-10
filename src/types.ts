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
  /** Full street address line, e.g. "412 Maple Ave" */
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
  /** ISO date string of last air filter replacement, set automatically from notes */
  airFilterLastReplaced?: string;
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
  /** Pet on file requiring a fee — set automatically from "New pet" notes */
  petOnFile?: boolean;
  moveInDate?: string;
  createdAt: string;
}

export type RentStatus = "paid" | "partial" | "unpaid";

export interface RentRecord {
  id: string;
  tenantId: string;
  /** Month key, "YYYY-MM" */
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

export interface AppData {
  properties: Property[];
  tenants: Tenant[];
  rentRecords: RentRecord[];
  notes: Note[];
  contractors: Contractor[];
  receipts: Receipt[];
}

export function rentStatusOf(r: RentRecord): RentStatus {
  if (r.amountPaid >= r.amountDue && r.amountDue > 0) return "paid";
  if (r.amountPaid > 0) return "partial";
  return "unpaid";
}

export function currentMonthKey(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
