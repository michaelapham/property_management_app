import { useRef, useState, type ReactNode } from "react";
import Overlay from "./Overlay";

interface ModalProps {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
}

export default function Modal({ title, subtitle, onClose, children }: ModalProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef(0);
  const startHoriz = useRef(0);
  const isDragging = useRef(false);
  const [closing, setClosing] = useState(false);

  function handleClose() {
    if (closing) return;
    setClosing(true);
    if (sheetRef.current) {
      sheetRef.current.style.transition =
        "transform 280ms cubic-bezier(0.32, 0.72, 0, 1)";
      sheetRef.current.style.transform = "translateY(100%)";
    }
    setTimeout(onClose, 250);
  }

  function onPointerDown(e: React.PointerEvent) {
    dragStart.current = e.clientY;
    startHoriz.current = e.clientX;
    isDragging.current = true;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!isDragging.current || !sheetRef.current) return;
    const dy = e.clientY - dragStart.current;
    const dx = Math.abs(e.clientX - startHoriz.current);
    if (dx > Math.abs(dy)) return;
    const clampedDy = Math.max(0, dy);
    sheetRef.current.style.transition = "none";
    sheetRef.current.style.transform = `translateY(${clampedDy}px)`;
  }

  function onPointerUp(e: React.PointerEvent) {
    if (!isDragging.current) return;
    isDragging.current = false;
    const dy = e.clientY - dragStart.current;
    const sheetHeight = sheetRef.current?.offsetHeight ?? 400;
    if (dy > sheetHeight * 0.3) {
      handleClose();
    } else if (sheetRef.current) {
      sheetRef.current.style.transition =
        "transform 320ms cubic-bezier(0.34, 1.56, 0.64, 1)";
      sheetRef.current.style.transform = "translateY(0)";
    }
  }

  return (
    <Overlay className="modal-backdrop" onBackdropClick={handleClose}>
      <div
        ref={sheetRef}
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div
          className="modal-drag-zone"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
        >
          <div className="modal-drag-handle" aria-hidden="true" />
          <h3>{title}</h3>
          {subtitle && <p className="modal-sub">{subtitle}</p>}
        </div>
        {children}
      </div>
    </Overlay>
  );
}
