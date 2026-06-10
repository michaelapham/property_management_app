import { useMemo, useState } from "react";
import Modal from "./Modal";
import { useStore } from "../data/store";
import type { NoteTag } from "../types";

const TAG_OPTIONS: { tag: NoteTag; label: string }[] = [
  { tag: "air-filter", label: "🌀 Air Filter Replaced" },
  { tag: "new-pet", label: "🐾 New Pet" },
  { tag: "complaint", label: "⚠️ Complaint" },
  { tag: "maintenance", label: "🔧 Maintenance" },
  { tag: "payment", label: "💵 Payment" },
  { tag: "request", label: "🙋 Request" },
];

/** Keywords that auto-suggest a tag while the user types. */
const KEYWORD_TAGS: [RegExp, NoteTag][] = [
  [/air ?filter/i, "air-filter"],
  [/\b(pet|dog|cat|puppy|kitten)\b/i, "new-pet"],
  [/\b(complain|complaint|upset|angry|noise)\b/i, "complaint"],
  [/\b(fix|repair|broke|broken|leak|maintenance)\b/i, "maintenance"],
  [/\b(paid|payment|rent|late|partial)\b/i, "payment"],
  [/\b(asked|request|can (i|we|they)|wants?)\b/i, "request"],
];

interface NoteModalProps {
  tenantId?: string;
  propertyId?: string;
  title?: string;
  subtitle?: string;
  defaultTags?: NoteTag[];
  onClose: () => void;
}

export default function NoteModal({
  tenantId,
  propertyId,
  title = "Add a Note",
  subtitle = "Even a quick note pays off later — interactions, complaints, maintenance, anything notable.",
  defaultTags = [],
  onClose,
}: NoteModalProps) {
  const { addNote } = useStore();
  const [text, setText] = useState("");
  const [tags, setTags] = useState<NoteTag[]>(defaultTags);

  const suggested = useMemo(() => {
    const found = new Set<NoteTag>();
    for (const [re, tag] of KEYWORD_TAGS) {
      if (re.test(text)) found.add(tag);
    }
    return found;
  }, [text]);

  function toggle(tag: NoteTag) {
    setTags((t) => (t.includes(tag) ? t.filter((x) => x !== tag) : [...t, tag]));
  }

  function save() {
    const allTags = new Set<NoteTag>([...tags]);
    if (allTags.size === 0) allTags.add("general");
    addNote({
      tenantId,
      propertyId,
      date: new Date().toISOString(),
      text: text.trim(),
      tags: [...allTags],
    });
    onClose();
  }

  return (
    <Modal title={title} subtitle={subtitle} onClose={onClose}>
      <div className="tag-chip-row">
        {TAG_OPTIONS.map(({ tag, label }) => (
          <button
            key={tag}
            type="button"
            className={`tag-chip${tags.includes(tag) ? " on" : ""}`}
            onClick={() => toggle(tag)}
          >
            {label}
            {suggested.has(tag) && !tags.includes(tag) ? " ✨" : ""}
          </button>
        ))}
      </div>
      <div className="field">
        <textarea
          autoFocus
          placeholder="e.g. Replaced the air filter, tenant mentioned car trouble so rent may be tight, asked about a pool…"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        {tags.includes("air-filter") && (
          <p className="hint">
            ✨ This will update the property record: Air filter — last replaced
            today.
          </p>
        )}
        {tags.includes("new-pet") && (
          <p className="hint">✨ Tenant will be flagged: pet on file (fee may apply).</p>
        )}
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <button className="btn btn-ghost" style={{ flex: 1 }} onClick={onClose}>
          Skip
        </button>
        <button
          className="btn btn-green"
          style={{ flex: 2 }}
          onClick={save}
          disabled={text.trim().length === 0 && tags.length === 0}
        >
          Save Note
        </button>
      </div>
    </Modal>
  );
}
