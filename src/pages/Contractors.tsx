import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useStore } from "../data/store";
import {
  getNearbyContractors,
  type NearbyContractor,
} from "../data/nearbyContractors";
import type { Trade } from "../types";
import CallButton from "../components/CallButton";
import Modal from "../components/Modal";
import { PlusIcon, SparkleIcon, StarIcon, TrashIcon } from "../components/icons";

export const TRADES: { value: Trade; label: string; emoji: string }[] = [
  { value: "plumber", label: "Plumber", emoji: "🔧" },
  { value: "hvac", label: "HVAC tech", emoji: "❄️" },
  { value: "electrician", label: "Electrician", emoji: "⚡" },
  { value: "handyman", label: "Handyman", emoji: "🔨" },
  { value: "roofer", label: "Roofer", emoji: "🏠" },
  { value: "landscaper", label: "Landscaper", emoji: "🌿" },
  { value: "pest-control", label: "Pest control", emoji: "🐜" },
  { value: "appliance", label: "Appliance repair", emoji: "🧺" },
  { value: "other", label: "Other", emoji: "🛠️" },
];

export function tradeLabel(t: Trade): string {
  return TRADES.find((x) => x.value === t)?.label ?? t;
}

export default function Contractors() {
  const { data, addContractor, removeContractor } = useStore();
  const [selectedTrade, setSelectedTrade] = useState<Trade>("plumber");
  const [showAdd, setShowAdd] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const cityLabel = useMemo(() => {
    const p = data.properties[0];
    return p ? `${p.city}, ${p.state}` : "your area";
  }, [data.properties]);

  const saved = data.contractors.filter((c) => c.trade === selectedTrade);
  const nearby = useMemo(
    () => getNearbyContractors(selectedTrade, cityLabel),
    [selectedTrade, cityLabel]
  );

  return (
    <>
      <Link to="/contractors/prepare" className="card" style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, background: "var(--accent-bg)", borderColor: "var(--brand)" }}>
        <span style={{ color: "var(--brand)" }}><SparkleIcon /></span>
        <div className="row-body">
          <div className="row-title">Prepare for a call</div>
          <div className="row-sub" style={{ color: "var(--ink-soft)" }}>
            Describe the problem → get a script, likely causes & fair-price guide
          </div>
        </div>
      </Link>

      <div className="tag-chip-row" style={{ overflowX: "auto", flexWrap: "nowrap", paddingBottom: 4 }}>
        {TRADES.map((t) => (
          <button
            key={t.value}
            className={`tag-chip${selectedTrade === t.value ? " on" : ""}`}
            style={{ whiteSpace: "nowrap" }}
            onClick={() => setSelectedTrade(t.value)}
          >
            {t.emoji} {t.label}
          </button>
        ))}
      </div>

      <div className="section-title">
        <span>My {tradeLabel(selectedTrade).toLowerCase()}s</span>
        <button className="btn btn-ghost btn-sm" onClick={() => setShowAdd(true)}>
          <PlusIcon size={14} /> Add
        </button>
      </div>

      {saved.length === 0 ? (
        <div className="card">
          <p style={{ color: "var(--ink-soft)", fontSize: 15 }}>
            No saved {tradeLabel(selectedTrade).toLowerCase()} yet — save the
            ones you trust for one-tap calling. Until then, here are nearby
            options below.
          </p>
        </div>
      ) : (
        saved.map((c) => (
          <div key={c.id} className="card" style={{ marginBottom: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div className="row-body">
                <div className="row-title">{c.name}</div>
                <div className="contractor-meta">
                  {c.hours && <span>🕐 {c.hours}</span>}
                  {c.rating !== undefined && (
                    <span><StarIcon size={12} /> {c.rating.toFixed(1)}</span>
                  )}
                  {c.notes && <span>{c.notes}</span>}
                </div>
              </div>
              <button
                className="btn btn-ghost btn-sm"
                aria-label="Remove"
                onClick={() => setDeletingId(c.id)}
              >
                <TrashIcon size={15} />
              </button>
            </div>
            <div style={{ marginTop: 10 }}>
              <CallButton
                phone={c.phone}
                label={`Call — ${c.phone}`}
                calleeName={c.name}
                variant="green"
                block
                small
              />
            </div>
          </div>
        ))
      )}

      <div className="section-title">
        <span>Nearby {tradeLabel(selectedTrade).toLowerCase()}s · {cityLabel}</span>
      </div>
      <p className="banner">
        Demo listings with estimated rates (averaged for the area, outliers
        excluded). Live data via a places provider is on the roadmap. Sorted
        by availability → rating → price.
      </p>
      {nearby.map((c) => (
        <NearbyCard
          key={c.id}
          contractor={c}
          onSave={() =>
            addContractor({
              name: c.name,
              trade: c.trade,
              phone: c.phone,
              hours: c.hoursToday,
              rating: c.rating,
            })
          }
        />
      ))}

      {showAdd && (
        <AddContractorModal
          defaultTrade={selectedTrade}
          onAdd={(c) => {
            addContractor(c);
            setShowAdd(false);
          }}
          onClose={() => setShowAdd(false)}
        />
      )}

      {deletingId && (
        <Modal
          title="Remove this contractor?"
          subtitle={data.contractors.find((c) => c.id === deletingId)?.name}
          onClose={() => setDeletingId(null)}
        >
          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setDeletingId(null)}>
              Cancel
            </button>
            <button
              className="btn btn-danger"
              style={{ flex: 1 }}
              onClick={() => {
                removeContractor(deletingId);
                setDeletingId(null);
              }}
            >
              Remove
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}

function NearbyCard({
  contractor: c,
  onSave,
}: {
  contractor: NearbyContractor;
  onSave: () => void;
}) {
  const [saved, setSaved] = useState(false);
  return (
    <div className="card" style={{ marginBottom: 10 }}>
      <div className="row-title">{c.name}</div>
      <div className="contractor-meta">
        <span>
          <span className={`open-dot ${c.openNow ? "open" : "closed"}`} />
          {c.openNow ? "Open now" : "Closed"} · {c.hoursToday}
        </span>
        <span>
          <StarIcon size={12} /> {c.rating.toFixed(1)} ({c.reviewCount})
        </span>
        <span>📍 {c.distanceMi} mi</span>
      </div>
      <div className="contractor-meta" style={{ marginTop: 6 }}>
        <span>Weekday {c.weekdayRate}</span>
        <span>Weekend {c.weekendRate}</span>
      </div>
      <div style={{ fontSize: 14, color: "var(--ink-soft)", marginTop: 6 }}>
        {c.services.join(" · ")}
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 11 }}>
        <div style={{ flex: 2 }}>
          <CallButton
            phone={c.phone}
            label="Call"
            calleeName={c.name}
            variant="green"
            block
            small
          />
        </div>
        <button
          className="btn btn-ghost btn-sm"
          style={{ flex: 1 }}
          disabled={saved}
          onClick={() => {
            onSave();
            setSaved(true);
          }}
        >
          {saved ? "Saved ✓" : "Save"}
        </button>
      </div>
    </div>
  );
}

function AddContractorModal({
  defaultTrade,
  onAdd,
  onClose,
}: {
  defaultTrade: Trade;
  onAdd: (c: { name: string; trade: Trade; phone: string; hours?: string; notes?: string }) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [trade, setTrade] = useState<Trade>(defaultTrade);
  const [phone, setPhone] = useState("");
  const [hours, setHours] = useState("");
  const [notes, setNotes] = useState("");

  return (
    <Modal title="Add a contractor" subtitle="Save your trusted pros for one-tap calls." onClose={onClose}>
      <div className="field">
        <label>Name / business</label>
        <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Joe's Plumbing" />
      </div>
      <div className="field-row">
        <div className="field">
          <label>Trade</label>
          <select value={trade} onChange={(e) => setTrade(e.target.value as Trade)}>
            {TRADES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Phone</label>
          <input inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(555) 123-4567" />
        </div>
      </div>
      <div className="field">
        <label>Hours (optional)</label>
        <input value={hours} onChange={(e) => setHours(e.target.value)} placeholder="Mon–Fri 8–5" />
      </div>
      <div className="field">
        <label>Notes (optional)</label>
        <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Did the water heater in 2024, fair prices" />
      </div>
      <button
        className="btn btn-green btn-block"
        disabled={!name.trim() || !phone.trim()}
        onClick={() =>
          onAdd({
            name: name.trim(),
            trade,
            phone: phone.trim(),
            hours: hours.trim() || undefined,
            notes: notes.trim() || undefined,
          })
        }
      >
        Save contractor
      </button>
    </Modal>
  );
}
