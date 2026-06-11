import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useStore } from "../data/store";
import { type Task, type TaskCategory } from "../types";
import { fullAddress } from "../utils/format";
import Overlay from "../components/Overlay";

const CATEGORY_RANK: Record<TaskCategory, number> = { urgent: 0, soon: 1, later: 2 };
const CATEGORY_LABEL: Record<TaskCategory, string> = { urgent: "Urgent", soon: "Soon", later: "Later" };
const CATEGORY_COLOR: Record<TaskCategory, string> = {
  urgent: "var(--red)",
  soon: "var(--yellow)",
  later: "var(--green)",
};
const CATEGORY_BG: Record<TaskCategory, string> = {
  urgent: "var(--red-bg)",
  soon: "var(--yellow-bg)",
  later: "var(--green-bg)",
};

export default function Tasks() {
  const { data, addTask, toggleTask } = useStore();
  const [searchParams, setSearchParams] = useSearchParams();

  const [showModal, setShowModal] = useState(() => searchParams.get("new") === "1");
  const [modalProperty, setModalProperty] = useState(() => data.properties[0]?.id ?? "");
  const [modalCategory, setModalCategory] = useState<TaskCategory>("urgent");
  const [inputText, setInputText] = useState("");
  const [completedExpanded, setCompletedExpanded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showModal) {
      const t = setTimeout(() => inputRef.current?.focus(), 80);
      return () => clearTimeout(t);
    }
  }, [showModal]);

  function closeModal() {
    setShowModal(false);
    setSearchParams({}, { replace: true });
    setInputText("");
  }

  function commitInput() {
    const text = inputText.trim();
    if (!text || !modalProperty) return;
    addTask({ propertyId: modalProperty, category: modalCategory, text });
    setInputText("");
    inputRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      commitInput();
    }
  }

  // Build sorted groups of active tasks
  const activeTasks = (data.tasks ?? []).filter((t) => !t.completedAt);

  const groupMap = new Map<string, Task[]>();
  for (const task of activeTasks) {
    const arr = groupMap.get(task.propertyId) ?? [];
    arr.push(task);
    groupMap.set(task.propertyId, arr);
  }

  const groups = Array.from(groupMap.entries())
    .map(([pid, tasks]) => {
      const prop = data.properties.find((p) => p.id === pid);
      const address = prop ? fullAddress(prop) : "Unknown Property";
      const minRank = Math.min(...tasks.map((t) => CATEGORY_RANK[t.category]));
      const sorted = [...tasks].sort((a, b) => {
        const dr = CATEGORY_RANK[a.category] - CATEGORY_RANK[b.category];
        return dr !== 0 ? dr : a.createdAt.localeCompare(b.createdAt);
      });
      return { pid, address, minRank, tasks: sorted };
    })
    .sort((a, b) => {
      if (a.minRank !== b.minRank) return a.minRank - b.minRank;
      return a.address.localeCompare(b.address);
    });

  const completedTasks = (data.tasks ?? [])
    .filter((t) => t.completedAt)
    .sort((a, b) => b.completedAt!.localeCompare(a.completedAt!));

  const properties = data.properties;

  return (
    <div style={{ padding: "16px 16px 96px" }}>
      {groups.length === 0 && completedTasks.length === 0 && (
        <div className="card" style={{ padding: "40px 24px", textAlign: "center", color: "var(--ink-soft)", fontSize: 15 }}>
          No tasks yet. Tap the button below to add one.
        </div>
      )}

      {groups.map(({ pid, address, tasks }) => (
        <div key={pid} style={{ marginBottom: 20 }}>
          <div className="task-property-heading">{address}</div>
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            {tasks.map((task, i) => (
              <div
                key={task.id}
                className="task-row"
                style={{
                  borderTop: i > 0 ? "1px solid var(--line)" : "none",
                  "--task-color": CATEGORY_COLOR[task.category],
                } as React.CSSProperties}
              >
                <div className="task-category-bar" />
                <span className="task-text">{task.text}</span>
                <span
                  className="task-category-pill"
                  style={{
                    background: CATEGORY_BG[task.category],
                    color: CATEGORY_COLOR[task.category],
                  }}
                >
                  {CATEGORY_LABEL[task.category]}
                </span>
                <input
                  type="checkbox"
                  checked={false}
                  onChange={() => toggleTask(task.id)}
                  className="task-checkbox"
                  aria-label={`Complete: ${task.text}`}
                />
              </div>
            ))}
          </div>
        </div>
      ))}

      {completedTasks.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <button
            className="task-completed-toggle"
            onClick={() => setCompletedExpanded((v) => !v)}
          >
            <span>Completed ({completedTasks.length})</span>
            <span style={{ fontSize: 12 }}>{completedExpanded ? "▲" : "▼"}</span>
          </button>
          {completedExpanded && (
            <div className="card" style={{ padding: 0, overflow: "hidden", marginTop: 8 }}>
              {completedTasks.map((task, i) => {
                const prop = data.properties.find((p) => p.id === task.propertyId);
                const addr = prop ? prop.street : "Unknown";
                return (
                  <div
                    key={task.id}
                    className="task-row task-row-completed"
                    style={{ borderTop: i > 0 ? "1px solid var(--line)" : "none" }}
                  >
                    <div className="task-category-bar" style={{ background: "var(--line)" }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="task-text" style={{ textDecoration: "line-through", color: "var(--ink-faint)" }}>
                        {task.text}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--ink-faint)", marginTop: 2 }}>{addr}</div>
                    </div>
                    <input
                      type="checkbox"
                      checked
                      onChange={() => toggleTask(task.id)}
                      className="task-checkbox"
                      aria-label={`Uncheck: ${task.text}`}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {showModal && (
        <Overlay className="modal-backdrop" onBackdropClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>New Task</h2>
              <button
                onClick={closeModal}
                style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "var(--ink-soft)", lineHeight: 1 }}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="field">
              <label>Which property?</label>
              {properties.length === 0 ? (
                <p style={{ color: "var(--ink-soft)", fontSize: 14, margin: "6px 0 0" }}>
                  No properties added yet — add one from the Properties tab first.
                </p>
              ) : (
                <select
                  value={modalProperty}
                  onChange={(e) => setModalProperty(e.target.value)}
                >
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {fullAddress(p)}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="field">
              <label>Category</label>
              <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                {(["urgent", "soon", "later"] as TaskCategory[]).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setModalCategory(cat)}
                    style={{
                      flex: 1,
                      padding: "8px 4px",
                      borderRadius: 8,
                      border: `1.5px solid ${modalCategory === cat ? CATEGORY_COLOR[cat] : "var(--line)"}`,
                      background: modalCategory === cat ? CATEGORY_BG[cat] : "transparent",
                      color: modalCategory === cat ? CATEGORY_COLOR[cat] : "var(--ink-soft)",
                      fontWeight: modalCategory === cat ? 700 : 400,
                      cursor: "pointer",
                      fontSize: 14,
                      transition: "all 0.12s",
                    }}
                  >
                    {CATEGORY_LABEL[cat]}
                  </button>
                ))}
              </div>
            </div>

            <div className="field">
              <label>Task — press Enter to add each line</label>
              <input
                ref={inputRef}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="e.g. Fix leaking faucet"
                disabled={properties.length === 0}
              />
            </div>

            <button
              className="btn btn-primary btn-block"
              style={{ marginTop: 8 }}
              onClick={closeModal}
            >
              Done
            </button>
          </div>
        </Overlay>
      )}
    </div>
  );
}
