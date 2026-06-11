import { useEffect, useRef, useState } from "react";

interface Props {
  value: string; // pre-formatted string like "$1,250.00" or "94%"
  className?: string;
  style?: React.CSSProperties;
}

export default function AnimatedNumber({ value, className, style }: Props) {
  const [displayed, setDisplayed] = useState(value);
  const [prev, setPrev] = useState<string | null>(null);
  const prevRef = useRef(value);

  useEffect(() => {
    if (value === prevRef.current) return;
    setPrev(prevRef.current);
    prevRef.current = value;
    // After exit animation, swap in new value
    const t = setTimeout(() => {
      setDisplayed(value);
      setPrev(null);
    }, 150);
    return () => clearTimeout(t);
  }, [value]);

  return (
    <span className={className} style={{ position: "relative", display: "inline-block", ...style }}>
      {prev !== null && (
        <span key={prev} style={{ position: "absolute", inset: 0, animation: "numExit 150ms forwards" }}>
          {prev}
        </span>
      )}
      <span key={displayed} style={{ animation: prev !== null ? "numEnter 150ms 100ms both" : undefined }}>
        {displayed}
      </span>
    </span>
  );
}
