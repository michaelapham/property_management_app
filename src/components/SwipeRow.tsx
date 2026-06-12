import type { ReactNode } from "react";
import { useSwipeReveal } from "../hooks/useSwipeReveal";

interface Props {
  /** Action buttons revealed behind the row, on the right. */
  actions: ReactNode;
  /** Total px width of the revealed action area. */
  revealWidth?: number;
  children: ReactNode;
  marginBottom?: number;
}

/**
 * A swipeable list row: swipe left to reveal `actions`.
 * `children` is the visible row content (translated on swipe).
 */
export default function SwipeRow({
  actions,
  revealWidth = 100,
  children,
  marginBottom = 10,
}: Props) {
  const { rowRef, handleTouchStart, handleTouchMove, handleTouchEnd } =
    useSwipeReveal(revealWidth);

  return (
    <div
      style={{
        position: "relative",
        overflow: "hidden",
        borderRadius: "var(--radius)",
        marginBottom,
      }}
    >
      <div
        style={{
          position: "absolute",
          right: 0,
          top: 0,
          bottom: 0,
          width: revealWidth,
          display: "flex",
          alignItems: "stretch",
        }}
      >
        {actions}
      </div>
      <div
        ref={rowRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ position: "relative", willChange: "transform" }}
      >
        {children}
      </div>
    </div>
  );
}
