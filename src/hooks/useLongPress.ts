import { useCallback, useRef } from "react";

interface Options {
  delay?: number; // default 600ms
  onLongPress: (e: React.PointerEvent) => void;
  moveThreshold?: number; // default 8px
}

export function useLongPress({ delay = 600, onLongPress, moveThreshold = 8 }: Options) {
  const timerRef = useRef<number>();
  const startPosRef = useRef({ x: 0, y: 0 });

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    startPosRef.current = { x: e.clientX, y: e.clientY };
    timerRef.current = window.setTimeout(() => {
      onLongPress(e);
    }, delay);
  }, [delay, onLongPress]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const dx = Math.abs(e.clientX - startPosRef.current.x);
    const dy = Math.abs(e.clientY - startPosRef.current.y);
    if (dx > moveThreshold || dy > moveThreshold) {
      window.clearTimeout(timerRef.current);
    }
  }, [moveThreshold]);

  const onPointerUp = useCallback(() => {
    window.clearTimeout(timerRef.current);
  }, []);

  const onPointerCancel = useCallback(() => {
    window.clearTimeout(timerRef.current);
  }, []);

  return { onPointerDown, onPointerMove, onPointerUp, onPointerCancel };
}
