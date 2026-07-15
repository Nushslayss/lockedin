// INDEX.JSX - LOCKEDIN HOME/TASK MANAGER PAGE
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";

const API_URL = "https://lockedinbackend.up.railway.app";
const PRIORITY_COLOR = { high: "#ff5f5f", medium: "#ffb648", low: "#5fd68a" };

const MOTIVATIONAL_MESSAGES = [
  "🎉 Slay queen! That's what I'm talking about!",
  "✨ Periodt! You just ate and left no crumbs!",
  "🔥 Girl boss energy! Absolutely killing it!",
  "👑 Crown stays on! You're unstoppable!",
  "💖 Bestie, you just served LOOKS and TALENT!",
];

export default function Home() {
  const [theme, setTheme] = useState("light");
  const [tasks, setTasks] = useState([]);
  const [newTitle, setNewTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const router = useRouter();
  const chatEndRef = useRef(null);
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") || "light";
    setTheme(savedTheme);
    document.documentElement.setAttribute("data-theme", savedTheme);
    if (!token) { router.push("/login"); return; }
    fetchTasks();
    setMessages([{
      role: "assistant",
      text: "Heyyy! ✨ I'm your lockedin assistant — I can chat about anything, add tasks, split them into steps, or clear stuff out. What's up?",
      quickReplies: null, taskOptions: null,
    }]);
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
  };

  const fetchTasks = async () => {
    try {
      const res = await fetch(`${API_URL}/api/tasks`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setTasks(Array.isArray(data) ? data : []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const showToast = (text) => { setToast(text); setTimeout(() => setToast(null), 2800); };

  const addTask = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    await fetch(`${API_URL}/api/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ title: newTitle }),
    });
    setNewTitle("");
    fetchTasks();
  };

  const setStatus = async (task, status) => {
    await fetch(`${API_URL}/api/tasks/${task._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status, completed: status === "done" }),
    });
    if (status === "done") showToast(MOTIVATIONAL_MESSAGES[Math.floor(Math.random() * MOTIVATIONAL_MESSAGES.length)]);
    fetchTasks();
  };

  const deleteTask = async (id, skipConfirm) => {
    if (!skipConfirm && !window.confirm("Delete this task? This can't be undone.")) return;
    await fetch(`${API_URL}/api/tasks/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    showToast("🗑️ Deleted!");
    fetchTasks();
  };

  const logout = () => { localStorage.removeItem("token"); router.push("/login"); };

  const sendChat = async (textOverride) => {
    const text = (textOverride ?? chatInput).trim();
    if (!text || chatLoading) return;
    const historyToSend = messages;
    setMessages((prev) => [...prev, { role: "user", text }]);
    setChatInput("");
    setChatLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message: text, history: historyToSend }),
      });
      const data = await res.json();
      setMessages((prev) => [...prev, {
        role: "assistant", text: data.reply || "Done!",
        quickReplies: data.quickReplies, taskOptions: data.taskOptions,
      }]);
      if (data.tasksChanged) fetchTasks();
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", text: "Hmm, something glitched. Try again?" }]);
    } finally { setChatLoading(false); }
  };

  const handleTaskOptionAction = async (opt, kind) => {
    if (kind === "delete") await deleteTask(opt.id, true);
    if (kind === "done") {
      const task = tasks.find((t) => t._id === opt.id);
      if (task) await setStatus(task, "done");
    }
    setMessages((prev) => [...prev, { role: "assistant", text: `Got it — "${opt.title}" ${kind === "delete" ? "deleted" : "marked done"}! ✨` }]);
  };

  const sortedTasks = [...tasks].sort((a, b) => {
    if (!a.dueDate && !b.dueDate) return 0;
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    return new Date(a.dueDate) - new Date(b.dueDate);
  });

  const formatDate = (d) => !d ? "No due date" : new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric" });

  return (
    <div style={styles.wrap}>
      {toast && <div style={styles.toast}>{toast}</div>}

      <div style={styles.mainCol}>
        <header style={styles.header}>
          <span className="wordmark" style={{ fontSize: "3rem" }}>lockedin</span>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <button onClick={toggleTheme} style={styles.iconBtn}>{theme === "light" ? "🌙" : "☀️"}</button>
            <button onClick={logout} style={styles.logoutBtn}>Log out</button>
          </div>
        </header>

        <form onSubmit={addTask} style={styles.addRow}>
          <input type="text" placeholder="Quick add a task..." value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)} style={styles.addInput} />
          <button type="submit" style={styles.addBtn}>+ Add</button>
        </form>

        {loading ? (
          <p style={styles.emptyText}>Loading your tasks...</p>
        ) : sortedTasks.length === 0 ? (
          <p style={styles.emptyText}>No tasks yet — add one above, or ask the chat bestie ✨</p>
        ) : (
          <div style={styles.list}>
            {sortedTasks.map((task) => (
              <div key={task._id} style={{ ...styles.row, opacity: task.status === "done" ? 0.6 : 1 }}>
                <span style={{ ...styles.priorityBadge, background: PRIORITY_COLOR[task.priority || "medium"] }}>
                  {(task.priority || "medium").toUpperCase()}
                </span>
                <span style={{ ...styles.rowTitle, textDecoration: task.status === "done" ? "line-through" : "none" }}>
                  {task.title}
                </span>
                <span style={styles.rowDate}>{formatDate(task.dueDate)}</span>
                <button onClick={() => setStatus(task, "done")} style={{ ...styles.rowBtn, color: task.status === "done" ? "#5fd68a" : "var(--text-dim)" }}>✓ Done</button>
                <button onClick={() => setStatus(task, "pending")} style={{ ...styles.rowBtn, color: "var(--text-dim)" }}>○ Not done</button>
                <button onClick={() => deleteTask(task._id)} style={{ ...styles.rowBtn, color: "#ff5f5f" }}>🗑️</button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={styles.chatPanel}>
        <div style={styles.chatHeader}>✨ lockedin assistant</div>
        <div style={styles.chatBody}>
          {messages.map((m, i) => (
            <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: m.role === "user" ? "flex-end" : "flex-start", gap: 8 }}>
              <div style={{
                ...styles.chatBubble,
                background: m.role === "user" ? "var(--primary)" : "var(--surface-2)",
                color: m.role === "user" ? "#fff" : "var(--text)",
              }}>
                {m.text}
              </div>

              {m.quickReplies && (
                <div style={styles.pillRow}>
                  {m.quickReplies.map((qr) => (
                    <button key={qr} onClick={() => sendChat(qr)} style={styles.pillBtn}>{qr}</button>
                  ))}
                </div>
              )}

              {m.taskOptions && (
                <div style={styles.optionList}>
                  {m.taskOptions.map((opt) => (
                    <div key={opt.id} style={styles.optionCard}>
                      <div style={{ flex: 1 }}>
                        <span style={{ ...styles.priorityBadge, background: PRIORITY_COLOR[opt.priority || "medium"], fontSize: 9 }}>
                          {(opt.priority || "medium").toUpperCase()}
                        </span>
                        <p style={{ margin: "4px 0 0 0", fontFamily: "Quicksand", fontWeight: 600, fontSize: 14 }}>{opt.title}</p>
                        <p style={{ margin: 0, fontFamily: "Poppins", fontSize: 11, color: "var(--text-dim)" }}>{formatDate(opt.dueDate)}</p>
                      </div>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={() => handleTaskOptionAction(opt, "done")} style={styles.miniBtn}>✓</button>
                        <button onClick={() => handleTaskOptionAction(opt, "delete")} style={{ ...styles.miniBtn, color: "#ff5f5f" }}>🗑️</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
          {chatLoading && <div style={{ ...styles.chatBubble, background: "var(--surface-2)", alignSelf: "flex-start" }}>typing...</div>}
          <div ref={chatEndRef} />
        </div>
        <form onSubmit={(e) => { e.preventDefault(); sendChat(); }} style={styles.chatInputRow}>
          <input type="text" placeholder="Ask me anything..." value={chatInput}
            onChange={(e) => setChatInput(e.target.value)} style={styles.chatInput} />
          <button type="submit" style={styles.chatSend}>➤</button>
        </form>
      </div>
    </div>
  );
}

const styles = {
  wrap: { minHeight: "100vh", display: "flex", flexWrap: "wrap" },
  mainCol: { flex: "1 1 500px", padding: "24px 24px 60px" },
  toast: {
    position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)",
    background: "var(--primary)", color: "#fff", padding: "14px 24px", borderRadius: 999,
    fontFamily: "Quicksand", fontWeight: 700, fontSize: 16, zIndex: 300,
    boxShadow: "0 8px 24px rgba(0,0,0,0.25)", maxWidth: "90%", textAlign: "center",
  },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 },
  iconBtn: { background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: "50%", width: 46, height: 46, fontSize: 20, cursor: "pointer" },
  logoutBtn: { background: "transparent", border: "1px solid var(--border)", borderRadius: 999, padding: "10px 18px", fontFamily: "Quicksand", fontWeight: 700, fontSize: 15, color: "var(--text-dim)", cursor: "pointer" },
  addRow: { display: "flex", gap: 10, marginBottom: 28 },
  addInput: { flex: 1, padding: "16px 18px", borderRadius: 16, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text)", fontFamily: "Poppins", fontSize: 16, outline: "none" },
  addBtn: { padding: "16px 24px", borderRadius: 16, border: "none", background: "linear-gradient(90deg, var(--primary-strong), var(--primary))", color: "#fff", fontFamily: "Quicksand", fontWeight: 700, fontSize: 16, cursor: "pointer" },
  emptyText: { color: "var(--text-dim)", fontFamily: "Quicksand", fontSize: 17, textAlign: "center", marginTop: 60 },
  list: { display: "flex", flexDirection: "column", gap: 12 },
  row: { display: "flex", alignItems: "center", gap: 14, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: "16px 18px", boxShadow: "0 4px 14px rgba(0,0,0,0.05)", flexWrap: "wrap" },
  priorityBadge: { color: "#fff", fontFamily: "Quicksand", fontWeight: 700, fontSize: 12, padding: "5px 12px", borderRadius: 999, whiteSpace: "nowrap" },
  rowTitle: { flex: 1, fontFamily: "Quicksand", fontWeight: 700, fontSize: 17, color: "var(--text)", minWidth: 140 },
  rowDate: { fontFamily: "Poppins", fontSize: 14, color: "var(--text-dim)", whiteSpace: "nowrap" },
  rowBtn: { background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 12, padding: "8px 14px", fontFamily: "Quicksand", fontWeight: 700, fontSize: 13, cursor: "pointer" },
  chatPanel: {
    flex: "1 1 380px", maxWidth: 460, minWidth: 340, background: "var(--surface)",
    borderLeft: "3px solid var(--primary)", display: "flex", flexDirection: "column",
    height: "100vh", position: "sticky", top: 0,
  },
  chatHeader: { padding: "22px 22px", fontFamily: "Quicksand", fontWeight: 800, fontSize: 22, color: "var(--text)", background: "var(--surface-2)", borderBottom: "1px solid var(--border)" },
  chatBody: { flex: 1, overflowY: "auto", padding: 20, display: "flex", flexDirection: "column", gap: 16 },
  chatBubble: { maxWidth: "88%", padding: "14px 18px", borderRadius: 20, fontFamily: "Poppins", fontSize: 16, lineHeight: 1.4 },
  pillRow: { display: "flex", gap: 8, flexWrap: "wrap" },
  pillBtn: { background: "var(--surface-2)", border: "2px solid var(--primary)", borderRadius: 999, padding: "9px 18px", fontFamily: "Quicksand", fontWeight: 700, fontSize: 14, color: "var(--primary-strong)", cursor: "pointer" },
  optionList: { display: "flex", flexDirection: "column", gap: 8, width: "100%" },
  optionCard: { display: "flex", alignItems: "center", gap: 10, background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 14, padding: "10px 14px" },
  miniBtn: { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, width: 32, height: 32, cursor: "pointer", fontSize: 14 },
  chatInputRow: { display: "flex", gap: 10, padding: 18, borderTop: "1px solid var(--border)" },
  chatInput: { flex: 1, padding: "14px 18px", borderRadius: 999, border: "1px solid var(--border)", background: "var(--surface-2)", color: "var(--text)", fontFamily: "Poppins", fontSize: 15, outline: "none" },
  chatSend: { width: 48, height: 48, borderRadius: "50%", border: "none", background: "var(--primary)", color: "#fff", fontSize: 20, cursor: "pointer" },
};