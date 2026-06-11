import { useRef } from "react";
import { useLocation } from "react-router-dom";

interface Props {
  children: React.ReactNode;
}

/**
 * Wraps page content and runs a spring enter animation whenever the route
 * changes. Keying the wrapper on location.key remounts it on navigation,
 * replaying the CSS enter animation. Only transform + opacity are animated.
 * Back navigation (history idx decreased) reverses the slide direction.
 */
export default function PageTransition({ children }: Props) {
  const location = useLocation();
  const prevIdxRef = useRef<number>((window.history.state?.idx as number) ?? 0);

  const idx = (window.history.state?.idx as number) ?? 0;
  const back = idx < prevIdxRef.current;
  prevIdxRef.current = idx;

  const cls = back
    ? "page-transition page-enter-back"
    : "page-transition page-enter";

  return (
    <div key={location.key} className={cls}>
      {children}
    </div>
  );
}
