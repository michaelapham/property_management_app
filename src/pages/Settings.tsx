import { useState } from "react";
import { Link } from "react-router-dom";
import { useStore } from "../data/store";
import { ChevronLeft } from "../components/icons";

export default function Settings() {
  const { data, updateSettings } = useStore();
  const [landlordName, setLandlordName] = useState(data.settings.landlordName);
  const [saved, setSaved] = useState(false);

  function save() {
    updateSettings({ landlordName: landlordName.trim() });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <>
      <Link className="back-link" to="/">
        <ChevronLeft size={16} /> Home
      </Link>

      <h2 style={{ marginBottom: 4 }}>Settings</h2>
      <p style={{ color: "var(--ink-soft)", fontSize: 15, marginBottom: 16 }}>
        App-wide configuration for LandlordHQ.
      </p>

      <div className="card">
        <div className="field">
          <label>Landlord Name</label>
          <input
            autoFocus
            value={landlordName}
            onChange={(e) => { setLandlordName(e.target.value); setSaved(false); }}
            placeholder="Your name or company name"
          />
          <p className="hint">
            Printed in the legal header of every rent ledger export.
          </p>
        </div>
        <button
          className={`btn btn-block ${saved ? "btn-ghost" : "btn-primary"}`}
          onClick={save}
          disabled={saved}
        >
          {saved ? "✓ Saved" : "Save Settings"}
        </button>
      </div>
    </>
  );
}
