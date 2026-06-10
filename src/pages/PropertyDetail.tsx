import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useStore } from "../data/store";
import { money, shortDate } from "../utils/format";
import Avatar from "../components/Avatar";
import NoteModal from "../components/NoteModal";
import { ChevronLeft, ChevronRight, PlusIcon, TrashIcon } from "../components/icons";
import type { Property } from "../types";

const FOUNDATION_LABEL: Record<Property["foundation"], string> = {
  slab: "Slab",
  crawlspace: "Crawlspace",
  basement: "Basement",
  "pier-and-beam": "Pier & beam",
  unknown: "—",
};

const CONSTRUCTION_LABEL: Record<Property["construction"], string> = {
  brick: "Brick",
  "wood-frame": "Wood frame",
  "vinyl-siding": "Vinyl siding",
  stucco: "Stucco",
  stone: "Stone",
  mixed: "Mixed",
  unknown: "—",
};

const FENCE_LABEL: Record<Property["fence"], string> = {
  none: "No fence",
  chainlink: "Chainlink",
  wood: "Wood",
  vinyl: "Vinyl",
  "wrought-iron": "Wrought iron",
  mixed: "Mixed",
  unknown: "—",
};

export default function PropertyDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, removeProperty } = useStore();
  const [showNote, setShowNote] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const property = data.properties.find((p) => p.id === id);
  if (!property) {
    return (
      <div className="empty-state">
        <h3>Property not found</h3>
        <Link className="btn btn-ghost" to="/properties">Back to properties</Link>
      </div>
    );
  }

  const tenants = data.tenants.filter((t) => t.propertyId === property.id);
  const notes = data.notes.filter((n) => n.propertyId === property.id);
  const fmtNum = (n?: number) => (n !== undefined ? n.toLocaleString() : "—");

  return (
    <>
      <Link className="back-link" to="/properties">
        <ChevronLeft size={16} /> Properties
      </Link>

      {property.photoDataUrl ? (
        <img className="prop-photo" src={property.photoDataUrl} alt={property.street} />
      ) : (
        <div
          className="prop-photo"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 46,
          }}
        >
          🏠
        </div>
      )}

      <h2 style={{ marginTop: 14 }}>{property.street}</h2>
      <p style={{ color: "var(--ink-soft)", fontSize: 16 }}>
        {property.city}, {property.state} {property.zip}
      </p>

      <div className="section-title">
        <span>Maintenance record</span>
      </div>
      <div className="card">
        <table className="kv-table">
          <tbody>
            <tr>
              <td>🌀 Air filter — last replaced</td>
              <td>
                {property.airFilterLastReplaced
                  ? shortDate(property.airFilterLastReplaced)
                  : "No record — tag a note with “Air filter replaced” to track it"}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="section-title">
        <span>Property record</span>
      </div>
      <div className="card">
        <table className="kv-table">
          <tbody>
            <tr><td>Beds</td><td>{fmtNum(property.beds)}</td></tr>
            <tr><td>Baths</td><td>{fmtNum(property.baths)}</td></tr>
            <tr><td>House sq ft</td><td>{fmtNum(property.sqft)}</td></tr>
            <tr><td>Lot sq ft</td><td>{fmtNum(property.lotSqft)}</td></tr>
            <tr><td>Year built</td><td>{fmtNum(property.yearBuilt)}</td></tr>
            <tr><td>Foundation</td><td>{FOUNDATION_LABEL[property.foundation]}</td></tr>
            <tr><td>Construction</td><td>{CONSTRUCTION_LABEL[property.construction]}</td></tr>
            <tr><td>Fence</td><td>{FENCE_LABEL[property.fence]}</td></tr>
            <tr><td>Value estimate</td><td>{money(property.valueEstimate)}</td></tr>
            <tr><td>Prev. year tax value</td><td>{money(property.prevYearTaxValue)}</td></tr>
          </tbody>
        </table>
        <p className="hint" style={{ marginTop: 10 }}>
          Public-record auto-fill (county assessor data) is on the roadmap —
          for now these stay editable by you.
        </p>
      </div>

      <div className="section-title">
        <span>Tenants here</span>
      </div>
      {tenants.length === 0 ? (
        <div className="card">
          <p style={{ color: "var(--ink-soft)", fontSize: 15 }}>Currently vacant.</p>
        </div>
      ) : (
        tenants.map((t) => (
          <Link key={t.id} to={`/tenants/${t.id}`} className="list-row">
            <Avatar first={t.firstName} last={t.lastName} photo={t.photoDataUrl} />
            <div className="row-body">
              <div className="row-title">
                {t.firstName} {t.lastName}
              </div>
              <div className="row-sub">{money(t.rentAmount)}/mo</div>
            </div>
            <span className="chevron"><ChevronRight /></span>
          </Link>
        ))
      )}

      <div className="section-title">
        <span>Property notes</span>
        <button className="btn btn-ghost btn-sm" onClick={() => setShowNote(true)}>
          <PlusIcon size={14} /> Note
        </button>
      </div>
      <div className="card">
        {notes.length === 0 && (
          <p style={{ color: "var(--ink-soft)", fontSize: 15 }}>No notes yet.</p>
        )}
        {notes.map((n) => (
          <div key={n.id} className="note-item">
            <div className="note-meta">
              <span>{shortDate(n.date)}</span>
              {n.tags.map((t) => <span key={t}>#{t}</span>)}
            </div>
            {n.text && <div className="note-text">{n.text}</div>}
          </div>
        ))}
      </div>

      <div style={{ marginTop: 20 }}>
        {!confirmDelete ? (
          <button className="btn btn-ghost btn-sm" onClick={() => setConfirmDelete(true)}>
            <TrashIcon size={15} /> Remove Property
          </button>
        ) : (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setConfirmDelete(false)}>
              Cancel
            </button>
            <button
              className="btn btn-danger btn-sm"
              onClick={() => {
                removeProperty(property.id);
                navigate("/properties");
              }}
            >
              Confirm — Remove {property.street}, Its Tenants & History
            </button>
          </div>
        )}
      </div>

      {showNote && (
        <NoteModal propertyId={property.id} onClose={() => setShowNote(false)} />
      )}
    </>
  );
}
