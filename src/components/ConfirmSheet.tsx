import Modal from "./Modal";

interface Props {
  title: string;
  body: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  singleAction?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmSheet({
  title,
  body,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  singleAction = false,
  onConfirm,
  onCancel,
}: Props) {
  return (
    <Modal title={title} subtitle={body} onClose={onCancel}>
      <div style={{ display: "flex", flexDirection: "column", gap: 12, paddingBottom: 8 }}>
        <button
          className="btn btn-block"
          style={{
            background: destructive ? "var(--red)" : "var(--green)",
            color: "#fff",
            borderRadius: 12,
            padding: "14px",
            fontSize: 15,
            fontWeight: 700,
          }}
          onClick={onConfirm}
        >
          {confirmLabel}
        </button>
        {!singleAction && (
          <button
            className="btn btn-ghost btn-block"
            style={{ borderRadius: 12, padding: "14px", fontSize: 15 }}
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
        )}
      </div>
    </Modal>
  );
}
