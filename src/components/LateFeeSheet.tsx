import { useState } from "react";
import Modal from "./Modal";
import { money } from "../utils/format";

interface Props {
  tenantName: string;
  month: string; // YYYY-MM
  suggestedFee: number;
  onCharged: (amount: number) => void;
  onWaived: () => void;
  onClose: () => void;
}

function fmtMonth(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export default function LateFeeSheet({
  tenantName,
  month,
  suggestedFee,
  onCharged,
  onWaived,
  onClose,
}: Props) {
  const [step, setStep] = useState<"ask" | "amount">("ask");
  const [feeInput, setFeeInput] = useState(suggestedFee > 0 ? String(suggestedFee) : "");

  const parsedFee = parseFloat(feeInput);
  const validFee = !isNaN(parsedFee) && parsedFee > 0;

  return (
    <Modal
      title="Late Fee?"
      subtitle={`${tenantName} — ${fmtMonth(month)}`}
      onClose={onClose}
    >
      {step === "ask" ? (
        <>
          <p style={{ color: "var(--ink-soft)", fontSize: 14, marginBottom: 20 }}>
            This payment was recorded after the grace period. Was a late fee charged?
          </p>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              className="btn btn-ghost"
              style={{ flex: 1 }}
              onClick={() => { onWaived(); onClose(); }}
            >
              No — waived
            </button>
            <button
              className="btn btn-primary"
              style={{ flex: 1 }}
              onClick={() => setStep("amount")}
            >
              Yes — enter fee
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="field">
            <label>Late Fee Amount</label>
            <input
              autoFocus
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={feeInput}
              onChange={(e) => setFeeInput(e.target.value)}
            />
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              className="btn btn-ghost"
              style={{ flex: 1 }}
              onClick={() => setStep("ask")}
            >
              Back
            </button>
            <button
              className="btn btn-primary"
              style={{ flex: 1 }}
              disabled={!validFee}
              onClick={() => { onCharged(parsedFee); onClose(); }}
            >
              Save {validFee ? money(parsedFee) : "Fee"}
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}
