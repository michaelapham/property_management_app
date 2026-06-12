interface MenuItem {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  destructive?: boolean;
}

interface Props {
  items: MenuItem[];
  anchorRect: DOMRect;
  onClose: () => void;
}

export default function ContextMenu({ items, anchorRect, onClose }: Props) {
  // Compute position: below and aligned to anchor, flip if would overflow viewport
  const menuWidth = 220;
  const menuHeight = items.length * 44 + 16;
  let left = anchorRect.left;
  let top = anchorRect.bottom + 8;
  if (left + menuWidth > window.innerWidth - 8) left = window.innerWidth - menuWidth - 8;
  if (left < 8) left = 8;
  if (top + menuHeight > window.innerHeight - 8) top = anchorRect.top - menuHeight - 8;
  if (top < 8) top = 8;

  return (
    <>
      {/* Backdrop */}
      <div style={{ position: "fixed", inset: 0, zIndex: 199 }} onClick={onClose} />
      {/* Menu */}
      <div
        style={{
          position: "fixed", left, top,
          width: menuWidth,
          background: "var(--surface)",
          border: "1px solid var(--line)",
          borderRadius: 16,
          boxShadow: "0 8px 30px rgba(0,0,0,0.12)",
          zIndex: 200,
          padding: "8px 0",
          animation: "ctxMenuIn 280ms cubic-bezier(0.25, 0.46, 0.45, 0.94) both",
        }}
      >
        {items.map((item, i) => (
          <button
            key={i}
            style={{
              display: "flex", alignItems: "center", gap: 12,
              width: "100%", padding: "10px 16px",
              fontSize: 15, fontWeight: 500,
              color: item.destructive ? "var(--red)" : "var(--ink)",
              borderTop: item.destructive && i > 0 ? "1px solid var(--line)" : undefined,
              background: "none", cursor: "pointer",
            }}
            onClick={() => { item.onClick(); onClose(); }}
          >
            <span style={{ color: item.destructive ? "var(--red)" : "var(--ink-soft)", flexShrink: 0 }}>
              {item.icon}
            </span>
            {item.label}
          </button>
        ))}
      </div>
    </>
  );
}
