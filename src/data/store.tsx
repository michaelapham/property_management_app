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
  type DepositDeduction,
  type DepositInfo,
  type LateFeeDecision,
  type LedgerEntry,
  type Note,
  type PaymentMethod,
  type Property,
  type Receipt,
  type RentHistoryEntry,
  type RentRecord,
  type Task,
  type TaskCategory,
  type Tenant,
  type TenantNotice,
  currentMonthKey,
} from "../types";

const STORAGE_KEY = "landlordhq-data-v1";

// Guard: sanitize currency amounts — reject NaN/Infinity/negative, round to 2dp
function sanitizeMoney(n: number, allowZero = true): number {
  if (!isFinite(n) || isNaN(n)) return 0;
  const rounded = Math.round(n * 100) / 100;
  return allowZero ? Math.max(0, rounded) : Math.max(0.01, rounded);
}

// Guard: strip currency symbols and commas before parsing (e.g. "$1,200" → 1200)
export function parseMoney(raw: string | number): number {
  if (typeof raw === "number") return sanitizeMoney(raw);
  const cleaned = String(raw).replace(/[$,\s]/g, "");
  return sanitizeMoney(parseFloat(cleaned) || 0);
}

const EMPTY: AppData = {
  properties: [],
  tenants: [],
  rentRecords: [],
  notes: [],
  contractors: [],
  receipts: [],
  ledgerEntries: [],
  tasks: [],
  settings: { landlordName: "" },
  lateFeeDecisions: [],
};

export function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function load(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<AppData>;
    // Guard: sanitize stored rent records — NaN amounts from old/corrupted data
    const rentRecords = (parsed.rentRecords ?? []).map((r) => ({
      ...r,
      amountDue: isFinite(r.amountDue) ? Math.max(0, r.amountDue) : 0,
      amountPaid: isFinite(r.amountPaid) ? Math.max(0, r.amountPaid) : 0,
    }));
    // Guard: sanitize tenant rent amounts
    const tenants = (parsed.tenants ?? []).map((t) => ({
      ...t,
      rentAmount: isFinite(t.rentAmount) ? Math.max(0, t.rentAmount) : 0,
    }));
    return {
      ...EMPTY,
      ...parsed,
      tenants,
      rentRecords,
      // Ensure new top-level keys exist for old stored data
      ledgerEntries: parsed.ledgerEntries ?? [],
      tasks: parsed.tasks ?? [],
      settings: parsed.settings ?? { landlordName: "" },
      lateFeeDecisions: parsed.lateFeeDecisions ?? [],
    };
  } catch {
    // Guard: corrupted localStorage — fall back to empty state rather than crashing
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
  recordPaymentForMonth: (
    tenantId: string,
    month: string,
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
  importData: (raw: Partial<AppData>) => void;
  addTask: (t: { propertyId: string; category: TaskCategory; text: string }) => void;
  toggleTask: (id: string) => void;
  updateTenantRent: (id: string, newAmount: number, note?: string) => void;
  updateDeposit: (tenantId: string, patch: Partial<DepositInfo>) => void;
  addDepositDeduction: (tenantId: string, d: Omit<DepositDeduction, "id">) => void;
  removeDepositDeduction: (tenantId: string, deductionId: string) => void;
  addTenantNotice: (tenantId: string, n: Omit<TenantNotice, "id">) => void;
  removeTenantNotice: (tenantId: string, noticeId: string) => void;
  recordLateFeeDecision: (tenantId: string, month: string, charged: boolean, amount?: number) => void;
}

const StoreContext = createContext<StoreApi | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(() =>
    ensureCurrentMonthRecords(load())
  );

  useEffect(() => {
    try {
      // Guard: never write undefined/null — JSON.stringify handles this but double-check
      if (!data) return;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (err) {
      // Guard: localStorage quota exceeded — alert user so data is not silently lost
      if (err instanceof DOMException && (
        err.name === "QuotaExceededError" ||
        err.name === "NS_ERROR_DOM_QUOTA_REACHED"
      )) {
        alert("Storage full — please export your data and clear old records.");
      } else {
        console.warn("localStorage write failed", err);
      }
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
    // Guard: sanitize rent amount — reject NaN/negative before persisting
    const tenant: Tenant = { ...t, id: uid(), createdAt: new Date().toISOString(), rentAmount: sanitizeMoney(t.rentAmount) };
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

        // Guard: sanitize payment amount — reject NaN/negative/zero before persisting
        const safeAmount = amount === "full" ? "full" : sanitizeMoney(amount as number, false);
        const newAmountPaid =
          safeAmount === "full"
            ? rec.amountDue
            : Math.min(rec.amountDue, rec.amountPaid + safeAmount);
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

  // Creates the rent record for the given month if it doesn't exist, then records payment.
  // Used by Dashboard's month navigation to handle both current and past/future months.
  const recordPaymentForMonth = useCallback(
    (
      tenantId: string,
      month: string,
      amount: number | "full",
      method: PaymentMethod = "other",
      notes?: string
    ) => {
      setData((d) => {
        let rec = d.rentRecords.find((r) => r.tenantId === tenantId && r.month === month);
        let records = d.rentRecords;
        if (!rec) {
          const tenant = d.tenants.find((t) => t.id === tenantId);
          rec = {
            id: uid(),
            tenantId,
            month,
            amountDue: tenant?.rentAmount ?? 0,
            amountPaid: 0,
          };
          records = [...records, rec];
        }
        // Guard: sanitize payment amount — reject NaN/negative before persisting
        const safePmt = amount === "full" ? "full" : sanitizeMoney(amount as number, false);
        const newAmountPaid =
          safePmt === "full"
            ? rec.amountDue
            : Math.min(rec.amountDue, rec.amountPaid + safePmt);
        const delta = newAmountPaid - rec.amountPaid;
        if (delta <= 0) return { ...d, rentRecords: records };
        const tenant = d.tenants.find((t) => t.id === tenantId);
        const entry: LedgerEntry = {
          id: uid(),
          tenantId,
          propertyId: tenant?.propertyId ?? "",
          rentRecordId: rec.id,
          date: new Date().toISOString(),
          month,
          amountPaid: delta,
          paymentMethod: method,
          notes: notes?.trim() || undefined,
        };
        return {
          ...d,
          rentRecords: records.map((r) =>
            r.id === rec!.id
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

  const importData = useCallback((raw: Partial<AppData>) => {
    const merged: AppData = {
      ...EMPTY,
      ...raw,
      ledgerEntries: raw.ledgerEntries ?? [],
      tasks: raw.tasks ?? [],
      settings: raw.settings ?? { landlordName: "" },
      lateFeeDecisions: raw.lateFeeDecisions ?? [],
    };
    setData(ensureCurrentMonthRecords(merged));
  }, []);

  const updateTenantRent = useCallback((id: string, newAmount: number, note?: string) => {
    setData((d) => {
      const existing = d.tenants.find((t) => t.id === id);
      // Guard: sanitize before storing — reject NaN/negative rent amounts
      const safeAmount = sanitizeMoney(newAmount);
      if (!existing || existing.rentAmount === safeAmount) return d;
      // Override with sanitized value
      newAmount = safeAmount;
      const histEntry: RentHistoryEntry = {
        id: uid(),
        date: new Date().toISOString(),
        previousAmount: existing.rentAmount,
        newAmount,
        note: note?.trim() || undefined,
      };
      return {
        ...d,
        tenants: d.tenants.map((t) =>
          t.id === id
            ? { ...t, rentAmount: newAmount, rentHistory: [...(t.rentHistory ?? []), histEntry] }
            : t
        ),
        rentRecords: d.rentRecords.map((r) =>
          r.tenantId === id && r.month === currentMonthKey() && r.amountPaid === 0
            ? { ...r, amountDue: newAmount }
            : r
        ),
      };
    });
  }, []);

  const updateDeposit = useCallback((tenantId: string, patch: Partial<DepositInfo>) => {
    setData((d) => ({
      ...d,
      tenants: d.tenants.map((t) => {
        if (t.id !== tenantId) return t;
        const base: DepositInfo = t.deposit ?? { amountCollected: 0, amountHeld: 0, deductions: [] };
        return { ...t, deposit: { ...base, ...patch } };
      }),
    }));
  }, []);

  const addDepositDeduction = useCallback((tenantId: string, ded: Omit<DepositDeduction, "id">) => {
    setData((d) => ({
      ...d,
      tenants: d.tenants.map((t) => {
        if (t.id !== tenantId) return t;
        const base: DepositInfo = t.deposit ?? { amountCollected: 0, amountHeld: 0, deductions: [] };
        return { ...t, deposit: { ...base, deductions: [...base.deductions, { ...ded, id: uid() }] } };
      }),
    }));
  }, []);

  const removeDepositDeduction = useCallback((tenantId: string, deductionId: string) => {
    setData((d) => ({
      ...d,
      tenants: d.tenants.map((t) => {
        if (t.id !== tenantId || !t.deposit) return t;
        return { ...t, deposit: { ...t.deposit, deductions: t.deposit.deductions.filter((x) => x.id !== deductionId) } };
      }),
    }));
  }, []);

  const addTenantNotice = useCallback((tenantId: string, n: Omit<TenantNotice, "id">) => {
    setData((d) => ({
      ...d,
      tenants: d.tenants.map((t) =>
        t.id === tenantId
          ? { ...t, notices: [{ ...n, id: uid() }, ...(t.notices ?? [])] }
          : t
      ),
    }));
  }, []);

  const recordLateFeeDecision = useCallback(
    (tenantId: string, month: string, charged: boolean, amount?: number) => {
      setData((d) => {
        // Guard: don't overwrite an existing decision for the same tenant+month
        if ((d.lateFeeDecisions ?? []).some((lf) => lf.tenantId === tenantId && lf.month === month)) return d;
        const decision: LateFeeDecision = {
          id: uid(),
          tenantId,
          month,
          charged,
          amount: charged ? (amount ?? 0) : undefined,
          recordedAt: new Date().toISOString(),
        };
        return { ...d, lateFeeDecisions: [...(d.lateFeeDecisions ?? []), decision] };
      });
    },
    []
  );

  const removeTenantNotice = useCallback((tenantId: string, noticeId: string) => {
    setData((d) => ({
      ...d,
      tenants: d.tenants.map((t) =>
        t.id === tenantId
          ? { ...t, notices: (t.notices ?? []).filter((x) => x.id !== noticeId) }
          : t
      ),
    }));
  }, []);

  const addTask = useCallback(
    (t: { propertyId: string; category: TaskCategory; text: string }) => {
      const task: Task = { ...t, id: uid(), createdAt: new Date().toISOString() };
      setData((d) => ({ ...d, tasks: [...d.tasks, task] }));
    },
    []
  );

  const toggleTask = useCallback((id: string) => {
    setData((d) => ({
      ...d,
      tasks: d.tasks.map((t) =>
        t.id === id
          ? t.completedAt
            ? { ...t, completedAt: undefined }
            : { ...t, completedAt: new Date().toISOString() }
          : t
      ),
    }));
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
      recordPaymentForMonth,
      undoPayment,
      addNote,
      addContractor,
      updateContractor,
      removeContractor,
      addReceipt,
      removeReceipt,
      updateSettings,
      importData,
      addTask,
      toggleTask,
      updateTenantRent,
      updateDeposit,
      addDepositDeduction,
      removeDepositDeduction,
      addTenantNotice,
      removeTenantNotice,
      recordLateFeeDecision,
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
      recordPaymentForMonth,
      undoPayment,
      addNote,
      addContractor,
      updateContractor,
      removeContractor,
      addReceipt,
      removeReceipt,
      updateSettings,
      importData,
      addTask,
      toggleTask,
      updateTenantRent,
      updateDeposit,
      addDepositDeduction,
      removeDepositDeduction,
      addTenantNotice,
      removeTenantNotice,
      recordLateFeeDecision,
    ]
  );

  return <StoreContext.Provider value={api}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreApi {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}
