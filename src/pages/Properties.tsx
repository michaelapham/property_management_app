import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useStore } from "../data/store";
import { money } from "../utils/format";
import { ChevronRight, PlusIcon, TrashIcon } from "../components/icons";
import EmptyState, { HomeIllustration } from "../components/EmptyState";
import SwipeRow from "../components/SwipeRow";
import Modal from "../components/Modal";
import { useLongPress } from "../hooks/useLongPress";
import ContextMenu from "../components/ContextMenu";
import { CtxEyeIcon, CtxPencilIcon, CtxTrashIcon } from "../components/ctxIcons";

function PropertyRow({
  children,
  onLongPress,
}: {
  children: React.ReactNode;
  onLongPress: (rect: DOMRect) => void;
}) {
  const lp = useLongPress({
    onLongPress: (e) => {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      onLongPress(rect);
    },
  });
  return <div {...lp}>{children}</div>;
}

export default function Properties() {
  const { data, removeProperty } = useStore();
  const navigate = useNavigate();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [menuFor, setMenuFor] = useState<{ id: string; rect: DOMRect } | null>(null);

  const [ready, setReady] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 200);
    return () => clearTimeout(t);
  }, []);

  if (data.properties.length > 0 && !ready) {
    return (
      <div>
        <div className="skeleton-row" />
        <div className="skeleton-row" />
        <div className="skeleton-row" />
      </div>
    );
  }

  return (
    <>
      {data.properties.length === 0 ? (
        <EmptyState
          icon={<HomeIllustration />}
          title="No properties yet"
          subtitle="Add your first property to get started"
          cta={{ label: "Add Property", onClick: () => navigate("/properties/new") }}
        />
      ) : (
        <>
          {data.properties.map((p, i) => {
            const tenants = data.tenants.filter((t) => t.propertyId === p.id);
            return (
              <div
                key={p.id}
                className="stagger-item"
                style={{ ["--stagger-delay" as string]: `${Math.min(i, 10) * 40}ms` } as React.CSSProperties}
              >
              <PropertyRow onLongPress={(rect) => setMenuFor({ id: p.id, rect })}>
              <SwipeRow
                revealWidth={88}
                actions={
                  <button
                    aria-label="Delete property"
                    onClick={() => setDeletingId(p.id)}
                    style={{
                      flex: 1,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 4,
                      background: "var(--red-soft)",
                      color: "#fff",
                      fontSize: 12,
                      fontWeight: 600,
                      borderRadius: 0,
                    }}
                  >
                    <TrashIcon size={20} />
                    Delete
                  </button>
                }
              >
                <Link to={`/properties/${p.id}`} className="list-row" style={{ marginTop: 0 }}>
                  {p.photoDataUrl ? (
                    <img
                      src={p.photoDataUrl}
                      alt=""
                      style={{
                        width: 54,
                        height: 54,
                        borderRadius: 10,
                        objectFit: "cover",
                        flexShrink: 0,
                      }}
                    />
                  ) : (
                    <div className="avatar" style={{ borderRadius: 10 }}>🏠</div>
                  )}
                  <div className="row-body">
                    <div className="row-title">{p.street}</div>
                    <div className="row-sub">
                      {p.city}, {p.state} ·{" "}
                      {tenants.length > 0
                        ? `${tenants.map((t) => t.firstName).join(", ")} · ${money(
                            tenants.reduce((s, t) => s + t.rentAmount, 0)
                          )}/mo`
                        : "Vacant"}
                    </div>
                  </div>
                  <span className="chevron">
                    <ChevronRight />
                  </span>
                </Link>
              </SwipeRow>
              </PropertyRow>
              </div>
            );
          })}
        </>
      )}

      {menuFor && (
        <ContextMenu
          anchorRect={menuFor.rect}
          onClose={() => setMenuFor(null)}
          items={[
            {
              label: "View Details",
              icon: <CtxEyeIcon />,
              onClick: () => navigate(`/properties/${menuFor.id}`),
            },
            {
              label: "Edit Property",
              icon: <CtxPencilIcon />,
              onClick: () => navigate(`/properties/${menuFor.id}`),
            },
            {
              label: "Delete Property",
              icon: <CtxTrashIcon />,
              destructive: true,
              onClick: () => setDeletingId(menuFor.id),
            },
          ]}
        />
      )}

      {deletingId && (
        <Modal
          title="Delete this property?"
          subtitle={data.properties.find((p) => p.id === deletingId)?.street}
          onClose={() => setDeletingId(null)}
        >
          <p style={{ color: "var(--ink-soft)", fontSize: 14, marginBottom: 16 }}>
            This removes the property and its tenants from your records.
          </p>
          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setDeletingId(null)}>
              Cancel
            </button>
            <button
              className="btn btn-danger"
              style={{ flex: 1 }}
              onClick={() => {
                removeProperty(deletingId);
                setDeletingId(null);
              }}
            >
              Delete
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
