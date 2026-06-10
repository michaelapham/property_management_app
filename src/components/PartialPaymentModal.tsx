import { useState } from "react";
import Modal from "./Modal";
import { money } from "../utils/format";
import type { RentRecord } from "../types";

interface Props {
  record: RentRecord;
  tenantName: string;
  onSubmit: (amount: number) => void;
  onClose: () => void;
}

export default function PartialPaymentModal({
  record,
  tenantName,
  onSubmit,
  onClose,
}: Props) {
  const [value, setValue] = useState("");
  const remaining = record.amountDue - record.amountPaid;
  const amount = parseFloat(value);
  const valid = !Number.isNaN(amount) && amount > 0;

  return (
    <Modal
      title="Partial payment"
      subtitle={`${tenantName} — ${money(remaining)} remaining of ${money(record.amountDue)}`}
      onClose={onClose}
    >
      <div className="field">
        <label>Amount received</label>
        <input
          autoFocus
          type="number"
          inputMode="decimal"
          min="0"
          step="0.01"
          placeholder="0.00"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        {valid && amount >= remaining && (
          <p className="hint">✅ This covers the full remaining balance — will be marked paid.</p>
        )}
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <button className="btn btn-ghost" style={{ flex: 1 }} onClick={onClose}>
          Cancel
        </button>
        <button
          className="btn btn-green"
          style={{ flex: 2 }}
          disabled={!valid}
          onClick={() => onSubmit(amount)}
        >
          Record {valid ? money(amount) : "payment"}
        </button>
      </div>
    </Modal>
  );
}
