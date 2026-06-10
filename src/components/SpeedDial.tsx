import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ClipboardIcon, PhoneIcon, PlusIcon } from "./icons";

// Arc positions for 3 buttons radiating up-and-left from bottom-right corner.
// Angles measured from positive-x axis; radius in px from main button centre.
const RADIUS = 82;
const ACTIONS = [
  {
    label: "Emergency Call",
    angle: 148,
    color: "#f85149",
    bg: "rgba(248,81,73,0.18)",
    icon: PhoneIcon,
    action: () => { window.location.href = "tel:911"; },
  },
  {
    label: "Prepare for Call",
    angle: 112,
    color: "#58a6ff",
    bg: "rgba(88,166,255,0.18)",
    icon: ClipboardIcon,
    action: (navigate: ReturnType<typeof useNavigate>) => {
      navigate("/contractors/prepare");
    },
  },
  {
    label: "Add Contractor",
    angle: 76,
    color: "#3fb950",
    bg: "rgba(63,185,80,0.18)",
    icon: PlusIcon,
    action: (navigate: ReturnType<typeof useNavigate>) => {
      navigate("/contractors");
    },
  },
] as const;

function angleToDelta(deg: number, r: number) {
  const rad = (deg * Math.PI) / 180;
  return {
    x: Math.cos(rad) * r,
    y: -Math.sin(rad) * r,
  };
}

export default function SpeedDial() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside tap/click
  useEffect(() => {
    if (!open) return;
    function onPointer(e: PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, [open]);

  return (
    <div ref={ref} className="speed-dial-root">
      {/* Backdrop blur-scrim so labels are readable */}
      <AnimatePresence>
        {open && (
          <motion.div
            className="speed-dial-scrim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onPointerDown={() => setOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Action buttons */}
      <AnimatePresence>
        {open &&
          ACTIONS.map((item, i) => {
            const { x, y } = angleToDelta(item.angle, RADIUS);
            return (
              <motion.div
                key={item.label}
                className="speed-dial-action"
                style={{ "--action-color": item.color, "--action-bg": item.bg } as React.CSSProperties}
                initial={{ x: 0, y: 0, opacity: 0, scale: 0.4 }}
                animate={{ x, y, opacity: 1, scale: 1 }}
                exit={{ x: 0, y: 0, opacity: 0, scale: 0.4 }}
                transition={{
                  type: "spring",
                  stiffness: 380,
                  damping: 28,
                  delay: open ? i * 0.04 : (ACTIONS.length - 1 - i) * 0.03,
                }}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  setOpen(false);
                  item.action(navigate as never);
                }}
              >
                <span className="speed-dial-action-icon">
                  <item.icon size={19} />
                </span>
                <span className="speed-dial-label">{item.label}</span>
              </motion.div>
            );
          })}
      </AnimatePresence>

      {/* Main FAB */}
      <motion.button
        className="speed-dial-fab"
        aria-label={open ? "Close speed dial" : "Open speed dial"}
        onPointerDown={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        animate={{ rotate: open ? 45 : 0 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
      >
        <PhoneIcon size={22} />
      </motion.button>
    </div>
  );
}
