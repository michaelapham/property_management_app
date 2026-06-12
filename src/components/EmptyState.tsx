interface Props {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  cta?: { label: string; onClick: () => void };
}

export default function EmptyState({ icon, title, subtitle, cta }: Props) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: 200,
        gap: 12,
        padding: "48px 24px",
        animation: "fadeIn 300ms ease both",
      }}
    >
      <div style={{ color: "#D1D5DB" }}>{icon}</div>
      <p style={{ fontWeight: 700, fontSize: 17, color: "var(--ink)", margin: 0 }}>
        {title}
      </p>
      <p
        style={{
          fontSize: 14,
          color: "var(--ink-soft)",
          margin: 0,
          textAlign: "center",
        }}
      >
        {subtitle}
      </p>
      {cta && (
        <button className="btn btn-primary" onClick={cta.onClick} style={{ marginTop: 4 }}>
          {cta.label}
        </button>
      )}
    </div>
  );
}

// ---- Empty-state illustration icons (48×48, Lucide-style) ----

export const UsersIllustration = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

export const HomeIllustration = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
    <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);

export const WrenchIllustration = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
  </svg>
);

export const FileTextIllustration = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>
);
