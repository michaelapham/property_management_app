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
  type Contractor,
  type Note,
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
};

export function uid(): string {
  return (
    Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
  );
}

function load(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<AppData>;
    return { ...EMPTY, ...parsed };
  } catch {
    return EMPTY;
  }
}

/** Ensure every tenant has a rent record for the current month. */
function ensureCurrentMonthRecords(data: AppData): AppData {
  const month = currentMonthKey();
  const missing = data.tenants.filter(
    (t) =>
      !data.rentRecords.some((r) => r.tenantId === t.id && r.month === month)
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
  recordPayment: (rentRecordId: string, amount: number | "full") => void;
  undoPayment: (rentRecordId: string) => void;
  addNote: (n: Omit<Note, "id">) => void;
  addContractor: (c: Omit<Contractor, "id">) => void;
  updateContractor: (id: string, patch: Partial<Contractor>) => void;
  removeContractor: (id: string) => void;
  addReceipt: (r: Omit<Receipt, "id">) => void;
  removeReceipt: (id: string) => void;
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
      // Storage full (likely large photos) — drop receipt images last resort.
      console.warn("localStorage write failed; data may exceed quota");
    }
  }, [data]);

  const addProperty = useCallback(
    (p: Omit<Property, "id" | "createdAt">): Property => {
      const prop: Property = {
        ...p,
        id: uid(),
        createdAt: new Date().toISOString(),
      };
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
      const tenantIds = d.tenants
        .filter((t) => t.propertyId === id)
        .map((t) => t.id);
      return {
        ...d,
        properties: d.properties.filter((p) => p.id !== id),
        tenants: d.tenants.filter((t) => t.propertyId !== id),
        rentRecords: d.rentRecords.filter((r) => !tenantIds.includes(r.tenantId)),
        notes: d.notes.filter(
          (n) => n.propertyId !== id && !(n.tenantId && tenantIds.includes(n.tenantId))
        ),
      };
    });
  }, []);

  const addTenant = useCallback((t: Omit<Tenant, "id" | "createdAt">): Tenant => {
    const tenant: Tenant = {
      ...t,
      id: uid(),
      createdAt: new Date().toISOString(),
    };
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
      // Keep the current month's amount due in sync if rent changed and nothing paid yet
      rentRecords:
        patch.rentAmount !== undefined
          ? d.rentRecords.map((r) =>
              r.tenantId === id &&
              r.month === currentMonthKey() &&
              r.amountPaid === 0
                ? { ...r, amountDue: patch.rentAmount! }
                : r
            )
          : d.rentRecords,
    }));
  }, []);

  const removeTenant = useCallback((id: string) => {
    setData((d) => ({
      ...d,
      tenants: d.tenants.filter((t) => t.id !== id),
      rentRecords: d.rentRecords.filter((r) => r.tenantId !== id),
      notes: d.notes.filter((n) => n.tenantId !== id),
    }));
  }, []);

  const recordPayment = useCallback(
    (rentRecordId: string, amount: number | "full") => {
      setData((d) => ({
        ...d,
        rentRecords: d.rentRecords.map((r) => {
          if (r.id !== rentRecordId) return r;
          const paid =
            amount === "full" ? r.amountDue : Math.max(0, r.amountPaid + amount);
          return {
            ...r,
            amountPaid: Math.min(paid, r.amountDue),
            paidDate: new Date().toISOString(),
          };
        }),
      }));
    },
    []
  );

  const undoPayment = useCallback((rentRecordId: string) => {
    setData((d) => ({
      ...d,
      rentRecords: d.rentRecords.map((r) =>
        r.id === rentRecordId ? { ...r, amountPaid: 0, paidDate: undefined } : r
      ),
    }));
  }, []);

  const addNote = useCallback((n: Omit<Note, "id">) => {
    setData((d) => {
      let next: AppData = { ...d, notes: [{ ...n, id: uid() }, ...d.notes] };
      // Smart tags update structured records automatically
      if (n.tags.includes("air-filter") && n.propertyId) {
        next = {
          ...next,
          properties: next.properties.map((p) =>
            p.id === n.propertyId
              ? { ...p, airFilterLastReplaced: n.date }
              : p
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

  const updateContractor = useCallback(
    (id: string, patch: Partial<Contractor>) => {
      setData((d) => ({
        ...d,
        contractors: d.contractors.map((c) =>
          c.id === id ? { ...c, ...patch } : c
        ),
      }));
    },
    []
  );

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
    ]
  );

  return <StoreContext.Provider value={api}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreApi {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}
