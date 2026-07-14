// INDEX.JSX - LOCKEDIN HOME/TASK MANAGER PAGE
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";

const API_URL = "https://lockedinbackend.up.railway.app";

const PRIORITY_COLOR = { high: "#ff5f5f", medium: "#ffb648", low: "#5fd68a" };

const MOTIVATIONAL_MESSAGES = [
  "🎉 Slay queen! That's what I'm talking about!",
  "✨ Periodt! You just ate and left no crumbs!",
  "🔥 Girl boss energy! Absolutely killing it!",
  "💋 That's it girl! You're giving main character!",
  "👑 Crown stays on! You're unstoppable!",
  "💖 Bestie, you just served LOOKS and TALENT!",
  "✨ Werk it! You're literally glowing!",
  "🎊 Diva alert! That's how you do it!",
  "🌟 You're that girl! Period!",
  "💥 Absolutely ate! No notes!",
];

export default function Home() {
  const [theme, setTheme] = useState("light");
  const [tasks, setTasks] = useState([]);
  const [newTitle, setNewTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);
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
    if (!token) {
      router.push("/login");
      return;
    }
    fetchTasks();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, chatOpen]);

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
  };

  const fetchTasks = async () => {
    try {
      const res = await fetch(`${API_URL}/api/tasks`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setTasks(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (text) => {
    setToast(text);
    setTimeout(() => setToast(null), 3000);
  };

  const addTask = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    try {
      await fetch(`${API_URL}/api/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: newTitle }),
      });
      setNewTitle("");
      fetchTasks();
    } catch (err) {
      console.error(err);
    }
  };

  const toggleDone = async (task) => {
    const newStatus = task.status === "done" ? "pending" : "done";
    try {
      await fetch(`${API_URL}/api/tasks/${task._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: newStatus, completed: newStatus === "done" }),
      });
      if (newStatus === "done") {
        showToast(MOTIVATIONAL_MESSAGES[Math.floor(Math.random() * MOTIVATIONAL_MESSAGES.length)]);
      }
      fetchTasks();
    } catch (err) {
      console.error(err);
    }
  };

  const deleteTask = async (id) => {
    const confirmed = window.confirm("Delete this task? This can't be undone.");
    if (!confirmed) return;
    try {
      await fetch(`${API_URL}/api/tasks/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchTasks();
    } catch (err) {
      console.error(err);
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    router.push("/login");
  };

  const openChat = () => {
    setChatOpen(true);
    if (messages.length === 0) {
      setMessages([
        {
          role: "assistant",
          text: "Heyyy! ✨ I'm your lockedin assistant. Tell me what task is on your mind and I'll ask for the priority and due date, then add it for you!",
        },
      ]);
    }
  };

  const sendChat = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() || chatLoading) return;
    const userMsg = chatInput;
    const historyToSend = messages;
    setMessages((prev) => [...prev, { role: "user", text: userMsg }]);
    setChatInput("");
    setChatLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message: userMsg, history: historyToSend }),
      });
      const data = await res.json();
      setMessages((prev) => [...prev, { role: "assistant", text: data.reply || "Done!" }]);
      if (data.tasksChanged) fetchTasks();
    } catch (err) {
      setMessages((prev) => [...prev, { role: "assistant", text: "Hmm, something glitched. Try again?" }]);
    } finally {
      setChatLoading(false);
    }
  };

  const sortedTasks = [...tasks].sort((a, b) => {
    if (!a.dueDate && !b.dueDate) return 0;
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    return new Date(a.dueDate) - new Date(b.dueDate);
  });

  const formatDate = (d) => {
    if (!d) return "No due date";
    return new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  };

  return (
    <div style={styles.page}>
      {toast && <div style={styles.toast}>{toast}</div>}

      <header style={styles.header}>
        <span className="wordmark" style={{ fontSize: "2.2rem" }}>lockedin</span>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button onClick={toggleTheme} style={styles.iconBtn}>
            {theme === "light" ? "🌙" : "☀️"}
          </button>
          <button onClick={logout} style={styles.logoutBtn}>Log out</button>
        </div>
      </header>

      <form onSubmit={addTask} style={styles.addRow}>
        <input
          type="text"
          placeholder="Quick add a task..."
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          style={styles.addInput}
        />
        <button type="submit" style={styles.addBtn}>+ Add</button>
      </form>

      {loading ? (
        <p style={styles.emptyText}>Loading your tasks...</p>
      ) : sortedTasks.length === 0 ? (
        <p style={styles.emptyText}>No tasks yet — add one above, or ask the chat bestie ✨</p>
      ) : (
        <div style={styles.list}>
          {sortedTasks.map((task) => (
            <div
              key={task._id}
              style={{
                ...styles.row,
                opacity: task.status === "done" ? 0.65 : 1,
              }}
            >
              <span style={{ ...styles.priorityBadge, background: PRIORITY_COLOR[task.priority || "medium"] }}>
                {(task.priority || "medium").toUpperCase()}
              </span>
              <span
                style={{
                  ...styles.rowTitle,
                  textDecoration: task.status === "done" ? "line-through" : "none",
                }}
              >
                {task.title}
              </span>
              <span style={styles.rowDate}>{formatDate(task.dueDate)}</span>
              <button onClick={() => toggleDone(task)} style={{ ...styles.rowBtn, color: task.status === "done" ? "#5fd68a" : "var(--text-dim)" }}>
                {task.status === "done" ? "✓" : "○"}
              </button>
              <button onClick={() => deleteTask(task._id)} style={{ ...styles.rowBtn, color: "#ff5f5f" }}>🗑</button>
            </div>
          ))}
        </div>
      )}

      {!chatOpen && (
        <button onClick={openChat} style={styles.chatFab}>💬</button>
      )}

      {chatOpen && (
        <div style={styles.chatPanel}>
          <div style={styles.chatHeader}>
            <span style={{ fontFamily: "Quicksand", fontWeight: 700, fontSize: 17 }}>✨ lockedin assistant</span>
            <button onClick={() => setChatOpen(false)} style={styles.chatClose}>×</button>
          </div>
          <div style={styles.chatBody}>
            {messages.map((m, i) => (
              <div
                key={i}
                style={{
                  ...styles.chatBubble,
                  alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                  background: m.role === "user" ? "var(--primary)" : "var(--surface-2)",
                  color: m.role === "user" ? "#fff" : "var(--text)",
                }}
              >
                {m.text}
              </div>
            ))}
            {chatLoading && (
              <div style={{ ...styles.chatBubble, alignSelf: "flex-start", background: "var(--surface-2)" }}>
                typing...
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
          <form onSubmit={sendChat} style={styles.chatInputRow}>
            <input
              type="text"
              placeholder="Ask me anything..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              style={styles.chatInput}
            />
            <button type="submit" style={styles.chatSend}>➤</button>
          </form>
        </div>
      )}
    </div>
  );
}

const styles = {
  page: { minHeight: "100vh", padding: "20px 20px 100px", position: "relative" },
  toast: {
    position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)",
    background: "var(--primary)", color: "#fff", padding: "12px 22px", borderRadius: 999,
    fontFamily: "Quicksand", fontWeight: 600, fontSize: 14, zIndex: 200,
    boxShadow: "0 8px 24px rgba(0,0,0,0.25)", maxWidth: "90%", textAlign: "center",
  },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 },
  iconBtn: {
    background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: "50%",
    width: 40, height: 40, fontSize: 16, cursor: "pointer",
  },
  logoutBtn: {
    background: "transparent", border: "1px solid var(--border)", borderRadius: 999,
    padding: "8px 16px", fontFamily: "Quicksand", fontWeight: 600, color: "var(--text-dim)", cursor: "pointer",
  },
  addRow: { display: "flex", gap: 10, marginBottom: 24, maxWidth: 600, margin: "0 auto 24px" },
  addInput: {
    flex: 1, padding: "12px 16px", borderRadius: 14, border: "1px solid var(--border)",
    background: "var(--surface)", color: "var(--text)", fontFamily: "Poppins", fontSize: 14, outline: "none",
  },
  addBtn: {
    padding: "12px 20px", borderRadius: 14, border: "none",
    background: "linear-gradient(90deg, var(--primary-strong), var(--primary))",
    color: "#fff", fontFamily: "Quicksand", fontWeight: 700, cursor: "pointer",
  },
  emptyText: { color: "var(--text-dim)", fontFamily: "Quicksand", textAlign: "center", marginTop: 60 },
  list: { maxWidth: 700, margin: "0 auto", display: "flex", flexDirection: "column", gap: 10 },
  row: {
    display: "flex", alignItems: "center", gap: 12, background: "var(--surface)",
    border: "1px solid var(--border)", borderRadius: 14, padding: "12px 16px",
    boxShadow: "0 4px 14px rgba(0,0,0,0.05)", flexWrap: "wrap",
  },
  priorityBadge: {
    color: "#fff", fontFamily: "Quicksand", fontWeight: 700, fontSize: 10.5,
    padding: "4px 10px", borderRadius: 999, whiteSpace: "nowrap",
  },
  rowTitle: { flex: 1, fontFamily: "Quicksand", fontWeight: 600, color: "var(--text)", minWidth: 120 },
  rowDate: { fontFamily: "Poppins", fontSize: 12, color: "var(--text-dim)", whiteSpace: "nowrap" },
  rowBtn: {
    background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 10,
    width: 32, height: 32, fontSize: 14, cursor: "pointer",
  },
  chatFab: {
    position: "fixed", bottom: 24, right: 24, width: 64, height: 64, borderRadius: "50%",
    background: "linear-gradient(135deg, var(--primary-strong), var(--primary))", border: "none",
    fontSize: 26, color: "#fff", cursor: "pointer", boxShadow: "0 8px 28px rgba(0,0,0,0.25)",
  },
  chatPanel: {
    position: "fixed", bottom: 0, right: 0, width: "100%", maxWidth: 460, height: "82vh", maxHeight: 700,
    background: "var(--surface)", border: "3px solid var(--primary)", borderRadius: "24px 24px 0 0",
    boxShadow: "0 -10px 50px rgba(0,0,0,0.3), 0 0 30px var(--primary)", display: "flex",
    flexDirection: "column", zIndex: 100,
  },
  chatHeader: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "18px 20px", borderBottom: "1px solid var(--border)", color: "var(--text)",
    background: "var(--surface-2)", borderRadius: "22px 22px 0 0",
  },
  chatClose: { background: "transparent", border: "none", fontSize: 26, color: "var(--text-dim)", cursor: "pointer" },
  chatBody: { flex: 1, overflowY: "auto", padding: 18, display: "flex", flexDirection: "column", gap: 12 },
  chatBubble: {
    maxWidth: "82%", padding: "12px 16px", borderRadius: 18, fontFamily: "Poppins", fontSize: 15,
  },
  chatInputRow: { display: "flex", gap: 10, padding: 16, borderTop: "1px solid var(--border)" },
  chatInput: {
    flex: 1, padding: "12px 16px", borderRadius: 999, border: "1px solid var(--border)",
    background: "var(--surface-2)", color: "var(--text)", fontFamily: "Poppins", fontSize: 14, outline: "none",
  },
  chatSend: {
    width: 44, height: 44, borderRadius: "50%", border: "none",
    background: "var(--primary)", color: "#fff", fontSize: 18, cursor: "pointer",
  },
};