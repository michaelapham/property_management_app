import type { ComponentType } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ChevronLeft, ClipboardIcon, PlusIcon } from "./icons";
import { CheckIcon } from "./icons";

type FabConfig = {
  icon: ComponentType<{ size?: number }>;
  action: () => void;
  label: string;
  bg: string;
  color: string;
  shadow: string;
};

export default function FAB() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  let cfg: FabConfig | null = null;

  if (pathname === "/") {
    cfg = {
      icon: CheckIcon,
      action: () => navigate("/tasks"),
      label: "Open Tasks",
      bg: "#EAB308",
      color: "#1a1200",
      shadow: "0 4px 18px rgba(234,179,8,0.40)",
    };
  } else if (pathname.startsWith("/properties")) {
    cfg = {
      icon: PlusIcon,
      action: () => navigate("/properties/new"),
      label: "Add Property",
      bg: "#16A34A",
      color: "#fff",
      shadow: "0 4px 18px rgba(22,163,74,0.35)",
    };
  } else if (pathname.startsWith("/contractors")) {
    cfg = {
      icon: ClipboardIcon,
      action: () => navigate("/contractors/prepare"),
      label: "Prepare for Call",
      bg: "#DC2626",
      color: "#fff",
      shadow: "0 4px 18px rgba(220,38,38,0.35)",
    };
  } else if (pathname === "/tasks") {
    cfg = {
      icon: ChevronLeft,
      action: () => navigate("/"),
      label: "Back to Today",
      bg: "#EAB308",
      color: "#1a1200",
      shadow: "0 4px 18px rgba(234,179,8,0.40)",
    };
  }

  if (!cfg) return null;

  const Icon = cfg.icon;
  return (
    <div className="speed-dial-root">
      <button
        className="speed-dial-fab"
        aria-label={cfg.label}
        onClick={cfg.action}
        style={{ background: cfg.bg, color: cfg.color, boxShadow: cfg.shadow }}
      >
        <Icon size={22} />
      </button>
    </div>
  );
}
