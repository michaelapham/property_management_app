import type { ReactNode } from "react";
import Overlay from "./Overlay";

interface ModalProps {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
}

export default function Modal({ title, subtitle, onClose, children }: ModalProps) {
  return (
    <Overlay className="modal-backdrop" onBackdropClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title}>
        <h3>{title}</h3>
        {subtitle && <p className="modal-sub">{subtitle}</p>}
        {children}
      </div>
    </Overlay>
  );
}
