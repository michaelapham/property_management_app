import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useStore } from "../data/store";
import { analyzeIssue, type CallPrepResult } from "../data/issueKnowledge";
import { fullAddress } from "../utils/format";
import CallButton from "../components/CallButton";
import { tradeLabel } from "./Contractors";
import { ChevronLeft, MicIcon, SparkleIcon } from "../components/icons";

// Web Speech API (Chrome/Safari) — typed loosely since lib.dom omits it
type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

function getSpeechRecognition(): SpeechRecognitionLike | null {
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  return Ctor ? new Ctor() : null;
}

export default function CallPrep() {
  const { data } = useStore();
  const [description, setDescription] = useState("");
  const [propertyId, setPropertyId] = useState<string>(
    data.properties[0]?.id ?? ""
  );
  const [result, setResult] = useState<CallPrepResult | null>(null);
  const [listening, setListening] = useState(false);
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const speechSupported = useRef<boolean>(false);

  useEffect(() => {
    recRef.current = getSpeechRecognition();
    speechSupported.current = recRef.current !== null;
    return () => recRef.current?.stop();
  }, []);

  function toggleDictation() {
    const rec = recRef.current;
    if (!rec) return;
    if (listening) {
      rec.stop();
      setListening(false);
      return;
    }
    rec.lang = "en-US";
    rec.interimResults = false;
    rec.continuous = true;
    rec.onresult = (event) => {
      const last = event.results[event.results.length - 1];
      const transcript = last[0].transcript;
      setDescription((d) => (d ? d + " " : "") + transcript.trim());
    };
    rec.onend = () => setListening(false);
    rec.start();
    setListening(true);
  }

  function analyze() {
    const property = data.properties.find((p) => p.id === propertyId);
    const tenant = data.tenants.find((t) => t.propertyId === propertyId);
    setResult(
      analyzeIssue(description, {
        address: property ? fullAddress(property) : undefined,
        tenantName: tenant ? tenant.firstName : undefined,
      })
    );
  }

  const matchedTradePros = result?.profile
    ? data.contractors.filter((c) => c.trade === result.profile!.trade)
    : [];

  return (
    <>
      <Link className="back-link" to="/contractors">
        <ChevronLeft size={16} /> Contractors
      </Link>

      <h2 style={{ marginBottom: 4 }}>Prepare for this call</h2>
      <p style={{ color: "var(--ink-soft)", fontSize: 16, marginBottom: 16 }}>
        Describe the problem (type or dictate). You'll get a call script,
        safety steps, the top likely causes, and a fair-price frame of
        reference before you dial.
      </p>

      <div className="card">
        {data.properties.length > 0 && (
          <div className="field">
            <label>Which property?</label>
            <select value={propertyId} onChange={(e) => setPropertyId(e.target.value)}>
              {data.properties.map((p) => (
                <option key={p.id} value={p.id}>{fullAddress(p)}</option>
              ))}
            </select>
          </div>
        )}
        <div className="field">
          <label>What's the problem?</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Tenant says the AC is running but blowing warm air since yesterday afternoon…"
          />
        </div>
        <div style={{ display: "flex", gap: 9 }}>
          <button
            className={`btn ${listening ? "btn-danger" : "btn-ghost"}`}
            onClick={toggleDictation}
            disabled={!speechSupported.current}
            title={speechSupported.current ? "Voice dictation" : "Dictation not supported in this browser"}
          >
            <MicIcon size={17} />
            {listening ? "Stop" : "Dictate"}
          </button>
          <button
            className="btn btn-accent"
            style={{ flex: 1 }}
            disabled={description.trim().length < 5}
            onClick={analyze}
          >
            <SparkleIcon size={17} />
            Prepare me for this call
          </button>
        </div>
      </div>

      {result && (
        <>
          {result.profile ? (
            <>
              <div className="section-title">
                <span>⚠️ Safety first</span>
              </div>
              {result.profile.safety.map((s, i) => (
                <div key={i} className="safety-line">{s}</div>
              ))}

              <div className="section-title">
                <span>📞 Your call script</span>
              </div>
              <div className="card">
                {result.script.map((line, i) => (
                  <div key={i} className="script-line">{line}</div>
                ))}
              </div>

              <div className="section-title">
                <span>🔍 Top {result.profile.causes.length} likely causes</span>
              </div>
              {result.profile.causes.map((c, i) => (
                <div key={i} className="cause-card" style={{ background: "var(--surface)" }}>
                  <h4>{i + 1}. {c.cause}</h4>
                  <div className="cause-detail">🛠 Fix: {c.solution}</div>
                  <div className="cause-detail">🧾 Parts: {c.partsEstimate}</div>
                  <div className="cause-detail">👷 Labor: {c.laborEstimate}</div>
                </div>
              ))}
              <div className="card" style={{ background: "var(--green-bg)", boxShadow: "none" }}>
                <strong style={{ fontSize: 15 }}>💰 Fair-price frame:</strong>{" "}
                <span style={{ fontSize: 15 }}>{result.profile.typicalTotal}</span>
              </div>

              <div className="section-title">
                <span>Call a {tradeLabel(result.profile.trade).toLowerCase()}</span>
              </div>
              {matchedTradePros.length > 0 ? (
                matchedTradePros.map((c) => (
                  <div key={c.id} className="card" style={{ marginBottom: 10 }}>
                    <div className="row-title" style={{ marginBottom: 8 }}>{c.name}</div>
                    <CallButton
                      phone={c.phone}
                      label={`Call — ${c.phone}`}
                      calleeName={c.name}
                      variant="green"
                      block
                      small
                    />
                  </div>
                ))
              ) : (
                <Link to="/contractors" className="btn btn-primary btn-block">
                  Find a {tradeLabel(result.profile.trade).toLowerCase()} nearby
                </Link>
              )}
            </>
          ) : (
            <div className="card">
              <p style={{ fontSize: 16, color: "var(--ink-soft)" }}>
                Couldn't match this to a known issue yet — try adding more
                detail (e.g. "AC blowing warm", "breaker keeps tripping",
                "water leaking under sink"). A general script:
              </p>
              <div style={{ marginTop: 10 }}>
                {result.script.map((line, i) => (
                  <div key={i} className="script-line">{line}</div>
                ))}
              </div>
            </div>
          )}
          <p className="hint" style={{ marginTop: 14 }}>
            Estimates are typical U.S. ranges for context — not quotes. Local
            prices vary; always confirm with the contractor.
          </p>
        </>
      )}
    </>
  );
}
