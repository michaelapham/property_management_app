import { useCallback, useEffect, useId, useRef } from "react";
import { useSwipeContext } from "../contexts/SwipeContext";

const REVEAL_WIDTH = 100;
const SPRING = "transform 280ms cubic-bezier(0.34, 1.56, 0.64, 1)";

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * Swipe-left to reveal action buttons on a list row.
 * The returned `rowRef` must be attached to the translating content element,
 * and the touch handlers wired to that same element.
 */
export function useSwipeReveal(revealWidth: number = REVEAL_WIDTH) {
  const rowRef = useRef<HTMLDivElement>(null);
  const startX = useRef(0);
  const startY = useRef(0);
  const currentX = useRef(0);
  const dragging = useRef(false); // horizontal drag confirmed
  const decided = useRef(false); // gesture direction locked
  const revealed = useRef(false);
  const rowId = useId();

  const { openRowId, setOpenRowId } = useSwipeContext();

  const reduce = prefersReducedMotion();

  const setTransform = useCallback(
    (x: number, animate: boolean) => {
      const el = rowRef.current;
      if (!el) return;
      el.style.transition = animate && !reduce ? SPRING : "none";
      el.style.transform = `translateX(${x}px)`;
    },
    [reduce]
  );

  const close = useCallback(() => {
    revealed.current = false;
    setTransform(0, true);
  }, [setTransform]);

  // When another row opens, close this one.
  useEffect(() => {
    if (openRowId !== rowId && revealed.current) {
      close();
    }
  }, [openRowId, rowId, close]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    currentX.current = revealed.current ? -REVEAL_WIDTH : 0;
    dragging.current = false;
    decided.current = false;
  }, []);

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      const dx = e.touches[0].clientX - startX.current;
      const dy = e.touches[0].clientY - startY.current;

      // Lock gesture direction once movement exceeds threshold.
      if (!decided.current) {
        if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
        // Horizontal only when clearly more horizontal than vertical.
        dragging.current = Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy);
        decided.current = true;
      }
      if (!dragging.current) return;

      const base = revealed.current ? -REVEAL_WIDTH : 0;
      const clamped = Math.min(0, Math.max(-200, base + dx));
      currentX.current = clamped;
      setTransform(clamped, false);
    },
    [setTransform]
  );

  const handleTouchEnd = useCallback(() => {
    if (!dragging.current) return;
    const dx = currentX.current;
    if (dx < -60) {
      revealed.current = true;
      setTransform(-revealWidth, true);
      setOpenRowId(rowId);
    } else {
      revealed.current = false;
      setTransform(0, true);
      if (openRowId === rowId) setOpenRowId(null);
    }
  }, [revealWidth, setTransform, setOpenRowId, rowId, openRowId]);

  return { rowRef, handleTouchStart, handleTouchMove, handleTouchEnd, close };
}
