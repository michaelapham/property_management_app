import type { ComponentType } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ChevronLeft, ClipboardIcon, PlusIcon } from "./icons";
import { CheckIcon } from "./icons";

type FabConfig = {
  icon: ComponentType<{ size?: number }>;
  action: () => void;
  label: string;
};

export default function FAB() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  let cfg: FabConfig | null = null;

  if (pathname === "/") {
    cfg = { icon: CheckIcon, action: () => navigate("/tasks?new=1"), label: "Open Tasks" };
  } else if (pathname.startsWith("/properties")) {
    cfg = { icon: PlusIcon, action: () => navigate("/properties/new"), label: "Add Property" };
  } else if (pathname.startsWith("/contractors")) {
    cfg = { icon: ClipboardIcon, action: () => navigate("/contractors/prepare"), label: "Prepare for Call" };
  } else if (pathname === "/tasks") {
    cfg = { icon: ChevronLeft, action: () => navigate("/"), label: "Back to Today" };
  }

  if (!cfg) return null;

  const Icon = cfg.icon;
  return (
    <div className="speed-dial-root">
      <button
        className="speed-dial-fab"
        aria-label={cfg.label}
        onClick={cfg.action}
      >
        <Icon size={22} />
      </button>
    </div>
  );
}
