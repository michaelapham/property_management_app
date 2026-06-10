import { useState } from "react";
import Modal from "./Modal";
import { PhoneIcon } from "./icons";
import { telHref } from "../utils/format";

interface CallButtonProps {
  phone: string;
  label: string;
  /** Who/what is being called, shown in the confirmation */
  calleeName: string;
  variant?: "primary" | "ghost" | "green";
  block?: boolean;
  small?: boolean;
}

/** Tap-to-call with a confirmation step before the call is placed. */
export default function CallButton({
  phone,
  label,
  calleeName,
  variant = "primary",
  block,
  small,
}: CallButtonProps) {
  const [confirming, setConfirming] = useState(false);
  const cls = `btn btn-${variant === "primary" ? "primary" : variant}${
    block ? " btn-block" : ""
  }${small ? " btn-sm" : ""}`;

  return (
    <>
      <button className={cls} onClick={() => setConfirming(true)}>
        <PhoneIcon size={small ? 15 : 18} />
        {label}
      </button>
      {confirming && (
        <Modal
          title={`Call ${calleeName}?`}
          subtitle={phone}
          onClose={() => setConfirming(false)}
        >
          <div style={{ display: "flex", gap: 10 }}>
            <button
              className="btn btn-ghost"
              style={{ flex: 1 }}
              onClick={() => setConfirming(false)}
            >
              Cancel
            </button>
            <a
              className="btn btn-green"
              style={{ flex: 2 }}
              href={telHref(phone)}
              onClick={() => setConfirming(false)}
            >
              <PhoneIcon size={18} />
              Call now
            </a>
          </div>
        </Modal>
      )}
    </>
  );
}
