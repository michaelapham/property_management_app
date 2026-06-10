import { useRef, useState } from "react";
import { useStore } from "../data/store";
import { fullAddress, money, shortDate } from "../utils/format";
import Modal from "../components/Modal";
import { CameraIcon, TrashIcon } from "../components/icons";

/**
 * Receipt / document scanner.
 * Capture via camera or file picker, auto-enhance ("flatten") with a
 * grayscale + adaptive contrast pass that makes paper white and text crisp,
 * then file it with amount/category for tax records.
 */

type Enhancement = "scan" | "original";

const CATEGORIES = [
  "Repairs & maintenance",
  "Supplies",
  "Utilities",
  "Insurance",
  "Property tax",
  "Mortgage interest",
  "Professional services",
  "Travel & mileage",
  "Other",
];

export default function Scanner() {
  const { data, addReceipt, removeReceipt } = useStore();
  const [working, setWorking] = useState<{
    original: string;
    enhanced: string;
  } | null>(null);
  const [mode, setMode] = useState<Enhancement>("scan");
  const [rotation, setRotation] = useState(0);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [propertyId, setPropertyId] = useState("");
  const [viewing, setViewing] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    const original = await fileToDataUrl(file, 1400);
    const enhanced = await enhanceDocument(original);
    setWorking({ original, enhanced });
    setMode("scan");
    setRotation(0);
    setDescription("");
    setAmount("");
  }

  async function save() {
    if (!working) return;
    let image = mode === "scan" ? working.enhanced : working.original;
    if (rotation !== 0) image = await rotateImage(image, rotation);
    addReceipt({
      date: new Date().toISOString(),
      imageDataUrl: image,
      description: description.trim() || "Receipt",
      amount: parseFloat(amount) || undefined,
      category,
      propertyId: propertyId || undefined,
    });
    setWorking(null);
  }

  const totalThisYear = data.receipts
    .filter((r) => new Date(r.date).getFullYear() === new Date().getFullYear())
    .reduce((s, r) => s + (r.amount ?? 0), 0);

  return (
    <>
      {!working && (
        <>
          <div className="card" style={{ textAlign: "center", padding: "28px 16px" }}>
            <div style={{ fontSize: 38, marginBottom: 8 }}>🧾</div>
            <h3 style={{ marginBottom: 6 }}>Scan a receipt or document</h3>
            <p style={{ color: "var(--ink-soft)", fontSize: 14, marginBottom: 16 }}>
              Snap a photo — it gets straightened into a clean, high-contrast
              scan and filed for tax time.
            </p>
            <button className="btn btn-primary btn-lg" onClick={() => fileRef.current?.click()}>
              <CameraIcon size={20} />
              Scan now
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              style={{ display: "none" }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
                e.target.value = "";
              }}
            />
          </div>

          <div className="section-title">
            <span>Saved receipts ({data.receipts.length})</span>
            {totalThisYear > 0 && (
              <span style={{ fontWeight: 600, textTransform: "none", letterSpacing: 0 }}>
                {money(totalThisYear)} this year
              </span>
            )}
          </div>
          {data.receipts.length === 0 ? (
            <div className="card">
              <p style={{ color: "var(--ink-soft)", fontSize: 14 }}>
                Nothing saved yet. Every scanned receipt lands here, organized
                for record-keeping and taxes.
              </p>
            </div>
          ) : (
            <div className="receipt-grid">
              {data.receipts.map((r) => (
                <button key={r.id} className="receipt-card" onClick={() => setViewing(r.id)}>
                  <img src={r.imageDataUrl} alt={r.description} />
                  <div className="receipt-body">
                    <div className="receipt-title">{r.description}</div>
                    <div className="receipt-sub">
                      {shortDate(r.date)}
                      {r.amount !== undefined && ` · ${money(r.amount)}`}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {working && (
        <>
          <div className="tag-chip-row">
            <button className={`tag-chip${mode === "scan" ? " on" : ""}`} onClick={() => setMode("scan")}>
              ✨ Enhanced scan
            </button>
            <button className={`tag-chip${mode === "original" ? " on" : ""}`} onClick={() => setMode("original")}>
              Original photo
            </button>
            <button className="tag-chip" onClick={() => setRotation((r) => (r + 90) % 360)}>
              ↻ Rotate
            </button>
          </div>
          <div className="scanner-canvas-wrap">
            <img
              src={mode === "scan" ? working.enhanced : working.original}
              alt="Scanned document"
              style={{ transform: `rotate(${rotation}deg)` }}
            />
          </div>

          <div className="card" style={{ marginTop: 14 }}>
            <div className="field">
              <label>What's this receipt for?</label>
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Water heater parts — Home Depot"
              />
            </div>
            <div className="field-row">
              <div className="field">
                <label>Amount ($)</label>
                <input
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="86.42"
                />
              </div>
              <div className="field">
                <label>Category</label>
                <select value={category} onChange={(e) => setCategory(e.target.value)}>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>
            {data.properties.length > 0 && (
              <div className="field">
                <label>Property (optional)</label>
                <select value={propertyId} onChange={(e) => setPropertyId(e.target.value)}>
                  <option value="">— None / general —</option>
                  {data.properties.map((p) => (
                    <option key={p.id} value={p.id}>{fullAddress(p)}</option>
                  ))}
                </select>
              </div>
            )}
            <div style={{ display: "flex", gap: 10 }}>
              <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setWorking(null)}>
                Discard
              </button>
              <button className="btn btn-green" style={{ flex: 2 }} onClick={save}>
                Save receipt
              </button>
            </div>
          </div>
        </>
      )}

      {viewing && (() => {
        const r = data.receipts.find((x) => x.id === viewing);
        if (!r) return null;
        const prop = data.properties.find((p) => p.id === r.propertyId);
        return (
          <Modal title={r.description} subtitle={`${shortDate(r.date)}${r.amount !== undefined ? ` · ${money(r.amount)}` : ""}${r.category ? ` · ${r.category}` : ""}${prop ? ` · ${prop.street}` : ""}`} onClose={() => setViewing(null)}>
            <img src={r.imageDataUrl} alt={r.description} style={{ width: "100%", borderRadius: 10 }} />
            <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
              <button
                className="btn btn-danger btn-sm"
                onClick={() => {
                  removeReceipt(r.id);
                  setViewing(null);
                }}
              >
                <TrashIcon size={15} /> Delete
              </button>
              <a className="btn btn-ghost btn-sm" href={r.imageDataUrl} download={`receipt-${shortDate(r.date)}.jpg`} style={{ flex: 1 }}>
                Download
              </a>
            </div>
          </Modal>
        );
      })()}
    </>
  );
}

function fileToDataUrl(file: File, maxDim: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read image"));
    };
    img.src = url;
  });
}

/**
 * Document "flatten" pass: grayscale, then adaptive contrast stretch so the
 * paper reads white and ink reads black — the same trick notes-app scanners
 * use after dewarping.
 */
function enhanceDocument(dataUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const px = imageData.data;

      // Build luminance histogram
      const hist = new Array<number>(256).fill(0);
      const lum = new Uint8ClampedArray(px.length / 4);
      for (let i = 0; i < px.length; i += 4) {
        const l = Math.round(0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2]);
        lum[i / 4] = l;
        hist[l]++;
      }
      // Percentile-based black/white points (clip 2% darkest, 1% lightest)
      const total = lum.length;
      let acc = 0;
      let black = 0;
      for (let v = 0; v < 256; v++) {
        acc += hist[v];
        if (acc > total * 0.02) { black = v; break; }
      }
      acc = 0;
      let white = 255;
      for (let v = 255; v >= 0; v--) {
        acc += hist[v];
        if (acc > total * 0.01) { white = v; break; }
      }
      const range = Math.max(1, white - black);
      // Slight gamma to lift the paper toward white
      for (let i = 0; i < lum.length; i++) {
        let v = (lum[i] - black) / range;
        v = Math.min(1, Math.max(0, v));
        v = Math.pow(v, 0.85) * 255;
        const j = i * 4;
        px[j] = px[j + 1] = px[j + 2] = v;
      }
      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.src = dataUrl;
  });
}

function rotateImage(dataUrl: string, degrees: number): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const swap = degrees % 180 !== 0;
      canvas.width = swap ? img.height : img.width;
      canvas.height = swap ? img.width : img.height;
      const ctx = canvas.getContext("2d")!;
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((degrees * Math.PI) / 180);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.src = dataUrl;
  });
}
