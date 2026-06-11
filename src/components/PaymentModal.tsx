import { useState } from "react";
import Modal from "./Modal";
import { money } from "../utils/format";
import { PAYMENT_METHOD_LABEL, type PaymentMethod, type RentRecord, type Tenant } from "../types";

interface Props {
  record: RentRecord;
  tenant: Tenant;
  defaultMode?: "full" | "partial";
  onSubmit: (amount: number | "full", method: PaymentMethod, notes: string) => void;
  onClose: () => void;
}

export default function PaymentModal({
  record,
  tenant,
  defaultMode = "full",
  onSubmit,
  onClose,
}: Props) {
  const remaining = record.amountDue - record.amountPaid;
  const [mode, setMode] = useState<"full" | "partial">(defaultMode);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [notes, setNotes] = useState("");
  // Guard: prevent double-tap from creating duplicate ledger entries
  const [submitting, setSubmitting] = useState(false);

  const parsedAmount = parseFloat(amount);
  const isValidPartial = !Number.isNaN(parsedAmount) && parsedAmount > 0;
  const canSubmit = !submitting && (mode === "full" || isValidPartial);
  const displayAmount = mode === "full" ? remaining : (isValidPartial ? parsedAmount : 0);

  function handleSubmit() {
    if (submitting) return;
    setSubmitting(true);
    // Guard: clamp partial amount to remaining balance so we never over-record
    const safeAmount = mode === "full" ? "full" : Math.min(parsedAmount, remaining);
    onSubmit(safeAmount, method, notes);
  }

  return (
    <Modal
      title="Record Payment"
      subtitle={`${tenant.firstName} ${tenant.lastName} — ${money(remaining)} remaining`}
      onClose={onClose}
    >
      <div className="tag-chip-row">
        <button
          type="button"
          className={`tag-chip${mode === "full" ? " on" : ""}`}
          onClick={() => setMode("full")}
        >
          Full — {money(remaining)}
        </button>
        <button
          type="button"
          className={`tag-chip${mode === "partial" ? " on" : ""}`}
          onClick={() => setMode("partial")}
        >
          Partial amount
        </button>
      </div>

      {mode === "partial" && (
        <div className="field">
          <label>Amount received</label>
          <input
            autoFocus
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          {isValidPartial && parsedAmount >= remaining && (
            <p className="hint">✅ This covers the full remaining balance.</p>
          )}
        </div>
      )}

      <div className="field">
        <label>Payment Method</label>
        <select
          value={method}
          onChange={(e) => setMethod(e.target.value as PaymentMethod)}
        >
          {(Object.entries(PAYMENT_METHOD_LABEL) as [PaymentMethod, string][]).map(
            ([v, label]) => (
              <option key={v} value={v}>{label}</option>
            )
          )}
        </select>
      </div>

      <div className="field">
        <label>Notes (Optional)</label>
        <textarea
          placeholder="Anything notable about this payment…"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          maxLength={500}
          style={{ minHeight: 64 }}
        />
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        <button className="btn btn-ghost" style={{ flex: 1 }} onClick={onClose}>
          Cancel
        </button>
        <button
          className="btn btn-green"
          style={{ flex: 2 }}
          disabled={!canSubmit}
          onClick={handleSubmit}
        >
          Record {displayAmount > 0 ? money(displayAmount) : "Payment"}
        </button>
      </div>
    </Modal>
  );
}
