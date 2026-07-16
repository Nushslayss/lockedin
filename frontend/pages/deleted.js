import { useState, useEffect } from "react";
import { useRouter } from "next/router";

const API_URL = "https://lockedinbackend.up.railway.app";
const PRIORITY_COLOR = { high: "#ff5f5f", medium: "#ffb648", low: "#5fd68a" };

export default function DeletedTasks() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reschedulingId, setReschedulingId] = useState(null);
  const router = useRouter();
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  useEffect(() => {
    if (!token) { router.push("/login"); return; }
    fetchDeleted();
  }, []);

  const fetchDeleted = async () => {
    try {
      const res = await fetch(`${API_URL}/api/tasks`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      const list = Array.isArray(data) ? data.filter((t) => t.status === "deleted") : [];
      setTasks(list);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  // Restore with the task's existing date, no changes
  const restoreTask = async (id) => {
    setTasks((prev) => prev.filter((t) => t._id !== id));
    await fetch(`${API_URL}/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status: "pending" }),
    });
  };

  // Restore AND push to a new due date at the same time
  const rescheduleAndRestore = async (id, newDate) => {
    setTasks((prev) => prev.filter((t) => t._id !== id));
    setReschedulingId(null);
    await fetch(`${API_URL}/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status: "pending", dueDate: newDate }),
    });
  };

  const permanentDelete = async (id) => {
    setTasks((prev) => prev.filter((t) => t._id !== id));
    await fetch(`${API_URL}/api/tasks/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
  };

  const formatDate = (d) => !d ? "No due date" : new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric" });

  return (
    <div style={{ padding: 24, maxWidth: 700, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <span className="wordmark" style={{ fontSize: "2rem" }}>Deleted tasks</span>
        <button
          onClick={() => router.push("/")}
          style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 999, padding: "10px 18px", fontFamily: "Quicksand", fontWeight: 700, cursor: "pointer" }}
        >
          ← Back
        </button>
      </div>

      {loading ? (
        <p style={{ fontFamily: "Quicksand", color: "var(--text-dim)" }}>Loading...</p>
      ) : tasks.length === 0 ? (
        <p style={{ fontFamily: "Quicksand", color: "var(--text-dim)" }}>Nothing here — deleted tasks show up in this list.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {tasks.map((task) => (
            <div key={task._id} style={{
              display: "flex", alignItems: "center", gap: 14,
              border: "1px solid var(--border)", borderRadius: 16, padding: "16px 18px",
              background: "var(--surface)", flexWrap: "wrap",
            }}>
              <span style={{
                background: PRIORITY_COLOR[task.priority || "medium"], color: "#fff",
                fontFamily: "Quicksand", fontWeight: 700, fontSize: 12, padding: "5px 12px", borderRadius: 999,
              }}>
                {(task.priority || "medium").toUpperCase()}
              </span>
              <span style={{ flex: 1, fontFamily: "Quicksand", fontWeight: 700, fontSize: 16, minWidth: 140 }}>
                {task.title}
              </span>
              <span style={{ fontFamily: "Poppins", fontSize: 13, color: "var(--text-dim)" }}>
                {formatDate(task.dueDate)}
              </span>

              {reschedulingId === task._id ? (
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input
                    type="date"
                    autoFocus
                    onChange={(e) => e.target.value && rescheduleAndRestore(task._id, e.target.value)}
                    style={{ padding: "6px 10px", borderRadius: 10, border: "1px solid var(--border)", fontFamily: "Quicksand", fontSize: 13 }}
                  />
                  <button
                    onClick={() => setReschedulingId(null)}
                    style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 12, padding: "8px 14px", fontFamily: "Quicksand", fontWeight: 700, fontSize: 13, cursor: "pointer" }}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <>
                  <button
                    onClick={() => restoreTask(task._id)}
                    style={{ background: "var(--primary)", color: "#fff", border: "none", borderRadius: 12, padding: "8px 14px", fontFamily: "Quicksand", fontWeight: 700, fontSize: 13, cursor: "pointer" }}
                  >
                    ↩ Restore
                  </button>
                  <button
                    onClick={() => setReschedulingId(task._id)}
                    style={{ background: "var(--surface-2)", border: "1px solid var(--primary)", color: "var(--primary-strong)", borderRadius: 12, padding: "8px 14px", fontFamily: "Quicksand", fontWeight: 700, fontSize: 13, cursor: "pointer" }}
                  >
                    🔄 Reschedule
                  </button>
                  <button
                    onClick={() => permanentDelete(task._id)}
                    style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "#ff5f5f", borderRadius: 12, padding: "8px 14px", fontFamily: "Quicksand", fontWeight: 700, fontSize: 13, cursor: "pointer" }}
                  >
                    🗑️ Delete forever
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}