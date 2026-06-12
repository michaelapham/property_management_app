import { useEffect } from "react";

export default function CheckmarkBurst({ size = 28, onDone }: { size?: number; onDone?: () => void  }) {
  useEffect(() => {
    const t = setTimeout(() => onDone?.(), 884);
    return () => clearTimeout(t);
  }, [onDone]);

  const r = (size / 2) - 2;
  const circ = 2 * Math.PI * r;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ overflow: "visible" }}>
      {/* Circle draws itself */}
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke="#15803D" strokeWidth={4}
        strokeDasharray={circ}
        strokeDashoffset={circ}
        style={{ animation: "circDraw 624ms cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards" }}
      />
      {/* Checkmark draws after circle */}
      <polyline
        points={`${size * 0.28},${size * 0.52} ${size * 0.44},${size * 0.66} ${size * 0.72},${size * 0.36}`}
        fill="none" stroke="#15803D" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round"
        strokeDasharray={size}
        strokeDashoffset={size}
        style={{ animation: "checkDraw 416ms cubic-bezier(0.25, 0.46, 0.45, 0.94) 260ms forwards" }}
      />
    </svg>
  );
}
