import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  type AppData,
  type AppSettings,
  type Contractor,
  type LedgerEntry,
  type Note,
  type PaymentMethod,
  type Property,
  type Receipt,
  type RentRecord,
  type Tenant,
  currentMonthKey,
} from "../types";

const STORAGE_KEY = "landlordhq-data-v1";

const EMPTY: AppData = {
  properties: [],
  tenants: [],
  rentRecords: [],
  notes: [],
  contractors: [],
  receipts: [],
  ledgerEntries: [],
  settings: { landlordName: "" },
};

export function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function load(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<AppData>;
    return {
      ...EMPTY,
      ...parsed,
      // Ensure new top-level keys exist for old stored data
      ledgerEntries: parsed.ledgerEntries ?? [],
      settings: parsed.settings ?? { landlordName: "" },
    };
  } catch {
    return EMPTY;
  }
}

function ensureCurrentMonthRecords(data: AppData): AppData {
  const month = currentMonthKey();
  const missing = data.tenants.filter(
    (t) => !data.rentRecords.some((r) => r.tenantId === t.id && r.month === month)
  );
  if (missing.length === 0) return data;
  const newRecords: RentRecord[] = missing.map((t) => ({
    id: uid(),
    tenantId: t.id,
    month,
    amountDue: t.rentAmount,
    amountPaid: 0,
  }));
  return { ...data, rentRecords: [...data.rentRecords, ...newRecords] };
}

interface StoreApi {
  data: AppData;
  addProperty: (p: Omit<Property, "id" | "createdAt">) => Property;
  updateProperty: (id: string, patch: Partial<Property>) => void;
  removeProperty: (id: string) => void;
  addTenant: (t: Omit<Tenant, "id" | "createdAt">) => Tenant;
  updateTenant: (id: string, patch: Partial<Tenant>) => void;
  removeTenant: (id: string) => void;
  recordPayment: (
    rentRecordId: string,
    amount: number | "full",
    method?: PaymentMethod,
    notes?: string
  ) => void;
  undoPayment: (rentRecordId: string) => void;
  addNote: (n: Omit<Note, "id">) => void;
  addContractor: (c: Omit<Contractor, "id">) => void;
  updateContractor: (id: string, patch: Partial<Contractor>) => void;
  removeContractor: (id: string) => void;
  addReceipt: (r: Omit<Receipt, "id">) => void;
  removeReceipt: (id: string) => void;
  updateSettings: (patch: Partial<AppSettings>) => void;
}

const StoreContext = createContext<StoreApi | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(() =>
    ensureCurrentMonthRecords(load())
  );

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      console.warn("localStorage write failed; data may exceed quota");
    }
  }, [data]);

  const addProperty = useCallback(
    (p: Omit<Property, "id" | "createdAt">): Property => {
      const prop: Property = { ...p, id: uid(), createdAt: new Date().toISOString() };
      setData((d) => ({ ...d, properties: [...d.properties, prop] }));
      return prop;
    },
    []
  );

  const updateProperty = useCallback((id: string, patch: Partial<Property>) => {
    setData((d) => ({
      ...d,
      properties: d.properties.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    }));
  }, []);

  const removeProperty = useCallback((id: string) => {
    setData((d) => {
      const tenantIds = d.tenants.filter((t) => t.propertyId === id).map((t) => t.id);
      return {
        ...d,
        properties: d.properties.filter((p) => p.id !== id),
        tenants: d.tenants.filter((t) => t.propertyId !== id),
        rentRecords: d.rentRecords.filter((r) => !tenantIds.includes(r.tenantId)),
        notes: d.notes.filter(
          (n) => n.propertyId !== id && !(n.tenantId && tenantIds.includes(n.tenantId))
        ),
        ledgerEntries: d.ledgerEntries.filter((e) => e.propertyId !== id),
      };
    });
  }, []);

  const addTenant = useCallback((t: Omit<Tenant, "id" | "createdAt">): Tenant => {
    const tenant: Tenant = { ...t, id: uid(), createdAt: new Date().toISOString() };
    const record: RentRecord = {
      id: uid(),
      tenantId: tenant.id,
      month: currentMonthKey(),
      amountDue: tenant.rentAmount,
      amountPaid: 0,
    };
    setData((d) => ({
      ...d,
      tenants: [...d.tenants, tenant],
      rentRecords: [...d.rentRecords, record],
    }));
    return tenant;
  }, []);

  const updateTenant = useCallback((id: string, patch: Partial<Tenant>) => {
    setData((d) => ({
      ...d,
      tenants: d.tenants.map((t) => (t.id === id ? { ...t, ...patch } : t)),
      rentRecords:
        patch.rentAmount !== undefined
          ? d.rentRecords.map((r) =>
              r.tenantId === id && r.month === currentMonthKey() && r.amountPaid === 0
                ? { ...r, amountDue: patch.rentAmount! }
                : r
            )
          : d.rentRecords,
    }));
  }, []);

  const removeTenant = useCallback((id: string) => {
    setData((d) => {
      const tenant = d.tenants.find((t) => t.id === id);
      const remainingForProperty = d.tenants.filter(
        (t) => t.id !== id && t.propertyId === tenant?.propertyId
      );
      const properties =
        tenant && remainingForProperty.length === 0
          ? d.properties.map((p) =>
              p.id === tenant.propertyId
                ? { ...p, lastOccupiedDate: new Date().toISOString() }
                : p
            )
          : d.properties;
      return {
        ...d,
        properties,
        tenants: d.tenants.filter((t) => t.id !== id),
        rentRecords: d.rentRecords.filter((r) => r.tenantId !== id),
        notes: d.notes.filter((n) => n.tenantId !== id),
        ledgerEntries: d.ledgerEntries.filter((e) => e.tenantId !== id),
      };
    });
  }, []);

  const recordPayment = useCallback(
    (
      rentRecordId: string,
      amount: number | "full",
      method: PaymentMethod = "other",
      notes?: string
    ) => {
      setData((d) => {
        const rec = d.rentRecords.find((r) => r.id === rentRecordId);
        if (!rec) return d;

        const newAmountPaid =
          amount === "full"
            ? rec.amountDue
            : Math.min(rec.amountDue, rec.amountPaid + (amount as number));
        const delta = newAmountPaid - rec.amountPaid;
        if (delta <= 0) return d;

        const tenant = d.tenants.find((t) => t.id === rec.tenantId);
        const entry: LedgerEntry = {
          id: uid(),
          tenantId: rec.tenantId,
          propertyId: tenant?.propertyId ?? "",
          rentRecordId,
          date: new Date().toISOString(),
          month: rec.month,
          amountPaid: delta,
          paymentMethod: method,
          notes: notes?.trim() || undefined,
        };

        return {
          ...d,
          rentRecords: d.rentRecords.map((r) =>
            r.id === rentRecordId
              ? { ...r, amountPaid: newAmountPaid, paidDate: new Date().toISOString() }
              : r
          ),
          ledgerEntries: [...d.ledgerEntries, entry],
        };
      });
    },
    []
  );

  const undoPayment = useCallback((rentRecordId: string) => {
    setData((d) => ({
      ...d,
      rentRecords: d.rentRecords.map((r) =>
        r.id === rentRecordId ? { ...r, amountPaid: 0, paidDate: undefined } : r
      ),
      ledgerEntries: d.ledgerEntries.filter((e) => e.rentRecordId !== rentRecordId),
    }));
  }, []);

  const addNote = useCallback((n: Omit<Note, "id">) => {
    setData((d) => {
      let next: AppData = { ...d, notes: [{ ...n, id: uid() }, ...d.notes] };
      if (n.tags.includes("air-filter") && n.propertyId) {
        next = {
          ...next,
          properties: next.properties.map((p) =>
            p.id === n.propertyId ? { ...p, airFilterLastReplaced: n.date } : p
          ),
        };
      }
      if (n.tags.includes("new-pet") && n.tenantId) {
        next = {
          ...next,
          tenants: next.tenants.map((t) =>
            t.id === n.tenantId ? { ...t, petOnFile: true } : t
          ),
        };
      }
      return next;
    });
  }, []);

  const addContractor = useCallback((c: Omit<Contractor, "id">) => {
    setData((d) => ({ ...d, contractors: [...d.contractors, { ...c, id: uid() }] }));
  }, []);

  const updateContractor = useCallback((id: string, patch: Partial<Contractor>) => {
    setData((d) => ({
      ...d,
      contractors: d.contractors.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    }));
  }, []);

  const removeContractor = useCallback((id: string) => {
    setData((d) => ({
      ...d,
      contractors: d.contractors.filter((c) => c.id !== id),
    }));
  }, []);

  const addReceipt = useCallback((r: Omit<Receipt, "id">) => {
    setData((d) => ({ ...d, receipts: [{ ...r, id: uid() }, ...d.receipts] }));
  }, []);

  const removeReceipt = useCallback((id: string) => {
    setData((d) => ({ ...d, receipts: d.receipts.filter((r) => r.id !== id) }));
  }, []);

  const updateSettings = useCallback((patch: Partial<AppSettings>) => {
    setData((d) => ({ ...d, settings: { ...d.settings, ...patch } }));
  }, []);

  const api = useMemo<StoreApi>(
    () => ({
      data,
      addProperty,
      updateProperty,
      removeProperty,
      addTenant,
      updateTenant,
      removeTenant,
      recordPayment,
      undoPayment,
      addNote,
      addContractor,
      updateContractor,
      removeContractor,
      addReceipt,
      removeReceipt,
      updateSettings,
    }),
    [
      data,
      addProperty,
      updateProperty,
      removeProperty,
      addTenant,
      updateTenant,
      removeTenant,
      recordPayment,
      undoPayment,
      addNote,
      addContractor,
      updateContractor,
      removeContractor,
      addReceipt,
      removeReceipt,
      updateSettings,
    ]
  );

  return <StoreContext.Provider value={api}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreApi {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}
