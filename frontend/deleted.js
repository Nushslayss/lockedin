import { useState, useEffect } from "react";
import { useRouter } from "next/router";

const API_URL = "https://lockedinbackend.up.railway.app";
const PRIORITY_COLOR = { high: "#ff5f5f", medium: "#ffb648", low: "#5fd68a" };

export default function Deleted() {
  const [theme, setTheme] = useState("light");
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rescheduling, setRescheduling] = useState(null);
  const [newDate, setNewDate] = useState("");
  const [confirmForever, setConfirmForever] = useState(null);
  const router = useRouter();
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") || "light";
    setTheme(savedTheme);
    document.documentElement.setAttribute("data-theme", savedTheme);
    if (!token) { router.push("/login"); return; }
    fetchDeleted();
  }, []);

  const fetchDeleted = async () => {
    try {
      const res = await fetch(`${API_URL}/api/tasks/deleted`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setTasks(Array.isArray(data) ? data : []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const reschedule = async (id) => {
    if (!newDate) return;
    await fetch(`${API_URL}/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status: "pending", dueDate: newDate, deletedAt: null }),
    });
    setRescheduling(null); setNewDate("");
    fetchDeleted();
  };

  const deleteForever = async (id) => {
    await fetch(`${API_URL}/api/tasks/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    setConfirmForever(null);
    fetchDeleted();
  };

  const formatDate = (d) => !d ? "No due date" : new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric" });

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <span className="wordmark" style={{ fontSize: "2.4rem" }}>lockedin</span>
        <button onClick={() => router.push("/")} style={styles.backBtn}>← Back to tasks</button>
      </header>

      <h2 style={{ fontFamily: "Quicksand", color: "var(--text)", textAlign: "center" }}>🗑️ Deleted tasks</h2>

      {loading ? (
        <p style={styles.emptyText}>Loading...</p>
      ) : tasks.length === 0 ? (
        <p style={styles.emptyText}>Nothing here — your deleted tasks will show up in this list.</p>
      ) : (
        <div style={styles.list}>
          {tasks.map((task) => (
            <div key={task._id} style={styles.row}>
              <span style={{ ...styles.priorityBadge, background: PRIORITY_COLOR[task.priority || "medium"] }}>
                {(task.priority || "medium").toUpperCase()}
              </span>
              <span style={styles.rowTitle}>{task.title}</span>
              <span style={styles.rowDate}>was due: {formatDate(task.dueDate)}</span>

              {rescheduling === task._id ? (
                <div style={{ display: "flex", gap: 6 }}>
                  <input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} style={styles.dateInput} />
                  <button onClick={() => reschedule(task._id)} style={styles.rowBtn}>Save</button>
                </div>
              ) : (
                <button onClick={() => { setRescheduling(task._id); setNewDate(""); }} style={styles.rowBtn}>↺ Reschedule</button>
              )}

              <button onClick={() => setConfirmForever(task)} style={{ ...styles.rowBtn, color: "#ff5f5f" }}>Delete forever</button>
            </div>
          ))}
        </div>
      )}

      {confirmForever && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalCard}>
            <p style={{ fontFamily: "Quicksand", fontWeight: 700, fontSize: 17, margin: "0 0 8px" }}>Delete forever?</p>
            <p style={{ fontFamily: "Poppins", fontSize: 14, color: "var(--text-dim)", margin: "0 0 20px" }}>"{confirmForever.title}" will be permanently removed. This can't be undone.</p>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setConfirmForever(null)} style={styles.modalCancelBtn}>Cancel</button>
              <button onClick={() => deleteForever(confirmForever._id)} style={styles.modalDeleteBtn}>Delete forever</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  page: { minHeight: "100vh", padding: "24px" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  backBtn: { background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 999, padding: "10px 18px", fontFamily: "Quicksand", fontWeight: 700, color: "var(--text)", cursor: "pointer" },
  emptyText: { color: "var(--text-dim)", fontFamily: "Quicksand", fontSize: 16, textAlign: "center", marginTop: 60 },
  list: { maxWidth: 700, margin: "20px auto 0", display: "flex", flexDirection: "column", gap: 12 },
  row: { display: "flex", alignItems: "center", gap: 12, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: "14px 16px", flexWrap: "wrap" },
  priorityBadge: { color: "#fff", fontFamily: "Quicksand", fontWeight: 700, fontSize: 11, padding: "4px 10px", borderRadius: 999 },
  rowTitle: { flex: 1, fontFamily: "Quicksand", fontWeight: 700, fontSize: 15, color: "var(--text)", minWidth: 120 },
  rowDate: { fontFamily: "Poppins", fontSize: 12, color: "var(--text-dim)" },
  rowBtn: { background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 10, padding: "8px 12px", fontFamily: "Quicksand", fontWeight: 700, fontSize: 12, cursor: "pointer" },
  dateInput: { padding: "6px 10px", borderRadius: 10, border: "1px solid var(--border)", fontFamily: "Quicksand", fontSize: 12 },
  modalOverlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 400 },
  modalCard: { background: "var(--surface)", borderRadius: 20, padding: 24, maxWidth: 340, width: "90%" },
  modalCancelBtn: { flex: 1, padding: "12px 0", borderRadius: 12, border: "1px solid var(--border)", background: "transparent", color: "var(--text)", fontFamily: "Quicksand", fontWeight: 700, cursor: "pointer" },
  modalDeleteBtn: { flex: 1, padding: "12px 0", borderRadius: 12, border: "none", background: "#ff5f5f", color: "#fff", fontFamily: "Quicksand", fontWeight: 700, cursor: "pointer" },
};