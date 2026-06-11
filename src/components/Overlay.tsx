import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

/**
 * Locks background scrolling while an overlay is open.
 * Uses the position:fixed body technique — the only approach that reliably
 * prevents scroll-behind and rubber-banding on iOS Safari.
 */
function useBodyScrollLock() {
  useEffect(() => {
    const scrollY = window.scrollY;
    const { style } = document.body;
    const prev = {
      position: style.position,
      top: style.top,
      left: style.left,
      right: style.right,
      width: style.width,
      overflow: style.overflow,
    };
    style.position = "fixed";
    style.top = `-${scrollY}px`;
    style.left = "0";
    style.right = "0";
    style.width = "100%";
    style.overflow = "hidden";
    return () => {
      style.position = prev.position;
      style.top = prev.top;
      style.left = prev.left;
      style.right = prev.right;
      style.width = prev.width;
      style.overflow = prev.overflow;
      window.scrollTo(0, scrollY);
    };
  }, []);
}

function readViewport() {
  const v = window.visualViewport;
  return v
    ? { top: v.offsetTop, height: v.height }
    : { top: 0, height: window.innerHeight };
}

/**
 * Tracks the *visible* viewport (visualViewport API) so overlays can shrink
 * and stay on-screen when the mobile keyboard opens, instead of being
 * clipped behind it. Falls back to window.innerHeight on old browsers.
 */
function useVisualViewport() {
  const [rect, setRect] = useState(readViewport);
  useEffect(() => {
    const update = () => setRect(readViewport());
    const v = window.visualViewport;
    v?.addEventListener("resize", update);
    v?.addEventListener("scroll", update);
    window.addEventListener("resize", update);
    return () => {
      v?.removeEventListener("resize", update);
      v?.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);
  return rect;
}

interface OverlayProps {
  className?: string;
  onBackdropClick?: () => void;
  children: ReactNode;
}

/**
 * Full-screen overlay container for modals/drawers. Rendered into
 * document.body via portal so position:fixed can never be broken by a
 * transformed or scrolling ancestor. Sized to the visual viewport so it
 * stays anchored to the screen when the page scrolls or the keyboard opens.
 */
export default function Overlay({ className, onBackdropClick, children }: OverlayProps) {
  useBodyScrollLock();
  const vv = useVisualViewport();
  return createPortal(
    <div
      className={className}
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        top: vv.top,
        height: vv.height,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onBackdropClick?.();
      }}
    >
      {children}
    </div>,
    document.body
  );
}
