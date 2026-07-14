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
  "🎯 Task completed! Great job!",
  "✓ Well done! Moving forward!",
  "💪 You got it! Keep pushing!",
  "🚀 Success! Onward and upward!",
  "⭐ Excellent work! Keep it up!",
];

const FAILURE_MESSAGES = [
  "Girl, it's giving 'next time energy!' 💋",
  "No worries bestie, you'll absolutely crush it next! 🎉",
  "It's a no from me but you're still that girl! 👑",
  "Oop! Not this one sis, but you're still slaying! 💖",
  "This ain't it, but you'll get the yes babe! ✨",
  "Girlie, we can do better! Let's try again! 💪",
  "Not today honey, but you got this! 🌟",
  "Plot twist: You're still amazing! Try again! 🎊",
  "That's okay! You'll get it next time! 💪",
  "No problem! Keep trying! 🌟",
  "Don't worry! You've got this! 💖",
  "It's all good! Give it another shot! ↺",
  "All good! You can do this! ✨",
  "That happens! Keep going! 🚀",
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

  const showToast = (text, kind) => {
    setToast({ text, kind });
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

  const markDone = async (task) => {
    try {
      await fetch(`${API_URL}/api/tasks/${task._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: "done", completed: true }),
      });
      const msg = MOTIVATIONAL_MESSAGES[Math.floor(Math.random() * MOTIVATIONAL_MESSAGES.length)];
      showToast(msg, "success");
      fetchTasks();
    } catch (err) {
      console.error(err);
    }
  };

  const markFailed = async (task) => {
    try {
      await fetch(`${API_URL}/api/tasks/${task._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: "failed" }),
      });
      const msg = FAILURE_MESSAGES[Math.floor(Math.random() * FAILURE_MESSAGES.length)];
      showToast(msg, "failure");
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
          text: "Heyyy! ✨ I'm your lockedin assistant. Tell me what's on your mind — I can add tasks, split them into steps, mark them done, or clear stuff out for you. What are we tackling today?",
        },
      ]);
    }
  };

  const sendChat = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() || chatLoading) return;
    const userMsg = chatInput;
    setMessages((prev) => [...prev, { role: "user", text: userMsg }]);
    setChatInput("");
    setChatLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message: userMsg }),
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

  const grouped = { high: [], medium: [], low: [] };
  tasks.forEach((t) => grouped[t.priority || "medium"].push(t));

  return (
    <div style={styles.page}>
      {toast && (
        <div
          style={{
            ...styles.toast,
            background: toast.kind === "success" ? "var(--primary)" : "#8a5480",
          }}
        >
          {toast.text}
        </div>
      )}

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
          placeholder="Add a task... (AI will sort the priority)"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          style={styles.addInput}
        />
        <button type="submit" style={styles.addBtn}>+ Add</button>
      </form>

      {loading ? (
        <p style={{ color: "var(--text-dim)", fontFamily: "Quicksand", textAlign: "center", marginTop: 60 }}>
          Loading your tasks...
        </p>
      ) : tasks.length === 0 ? (
        <p style={{ color: "var(--text-dim)", fontFamily: "Quicksand", textAlign: "center", marginTop: 60 }}>
          No tasks yet — add one above, or ask the chat bestie for help ✨
        </p>
      ) : (
        <div style={styles.columns}>
          {["high", "medium", "low"].map((level) => (
            <div key={level} style={styles.column}>
              <div style={{ ...styles.columnHeader, background: PRIORITY_COLOR[level] }}>
                {level.toUpperCase()} ({grouped[level].length})
              </div>
              {grouped[level].map((task) => (
                <div
                  key={task._id}
                  style={{
                    ...styles.taskCard,
                    opacity: task.status === "failed" ? 0.6 : 1,
                    borderColor: task.status === "done" ? "#5fd68a" : task.status === "failed" ? "#ff5f5f" : "var(--border)",
                  }}
                >
                  <p
                    style={{
                      margin: "0 0 8px 0",
                      fontFamily: "Quicksand",
                      fontWeight: 600,
                      textDecoration: task.status === "done" ? "line-through" : "none",
                      color: "var(--text)",
                    }}
                  >
                    {task.title}
                  </p>

                  {task.subtasks?.length > 0 && (
                    <ul style={{ margin: "0 0 10px 0", paddingLeft: 18 }}>
                      {task.subtasks.map((s) => (
                        <li key={s._id} style={{ fontSize: 12, color: "var(--text-dim)", fontFamily: "Poppins" }}>
                          {s.title}
                        </li>
                      ))}
                    </ul>
                  )}

                  <div style={styles.actionRow}>
                    <button onClick={() => markDone(task)} style={{ ...styles.actionBtn, color: "#5fd68a" }}>
                      ✓ Done
                    </button>
                    <button onClick={() => markFailed(task)} style={{ ...styles.actionBtn, color: "#ff9f5f" }}>
                      ✗ Failed
                    </button>
                    <button onClick={() => deleteTask(task._id)} style={{ ...styles.actionBtn, color: "#ff5f5f" }}>
                      🗑 Delete
                    </button>
                  </div>
                </div>
              ))}
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
            <span style={{ fontFamily: "Quicksand", fontWeight: 700 }}>✨ lockedin assistant</span>
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
    color: "#fff", padding: "12px 22px", borderRadius: 999, fontFamily: "Quicksand",
    fontWeight: 600, fontSize: 14, zIndex: 200, boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
    maxWidth: "90%", textAlign: "center",
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
  columns: { display: "flex", gap: 20, flexWrap: "wrap", justifyContent: "center" },
  column: { flex: "1 1 280px", maxWidth: 340 },
  columnHeader: {
    color: "#fff", fontFamily: "Quicksand", fontWeight: 700, fontSize: 13,
    padding: "8px 14px", borderRadius: 12, marginBottom: 12, textAlign: "center",
  },
  taskCard: {
    background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16,
    padding: "14px 16px", marginBottom: 12, boxShadow: "0 4px 16px rgba(0,0,0,0.05)",
  },
  actionRow: { display: "flex", gap: 8, marginTop: 6 },
  actionBtn: {
    flex: 1, background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 10,
    padding: "6px 4px", fontFamily: "Quicksand", fontWeight: 600, fontSize: 11.5, cursor: "pointer",
  },
  chatFab: {
    position: "fixed", bottom: 24, right: 24, width: 60, height: 60, borderRadius: "50%",
    background: "linear-gradient(135deg, var(--primary-strong), var(--primary))", border: "none",
    fontSize: 24, color: "#fff", cursor: "pointer", boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
  },
  chatPanel: {
    position: "fixed", bottom: 0, right: 0, width: "100%", maxWidth: 380, height: "70vh", maxHeight: 560,
    background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "20px 20px 0 0",
    boxShadow: "0 -8px 40px rgba(0,0,0,0.2)", display: "flex", flexDirection: "column", zIndex: 100,
  },
  chatHeader: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "14px 18px", borderBottom: "1px solid var(--border)", color: "var(--text)",
  },
  chatClose: { background: "transparent", border: "none", fontSize: 22, color: "var(--text-dim)", cursor: "pointer" },
  chatBody: { flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 10 },
  chatBubble: {
    maxWidth: "80%", padding: "10px 14px", borderRadius: 16, fontFamily: "Poppins", fontSize: 13.5,
  },
  chatInputRow: { display: "flex", gap: 8, padding: 14, borderTop: "1px solid var(--border)" },
  chatInput: {
    flex: 1, padding: "10px 14px", borderRadius: 999, border: "1px solid var(--border)",
    background: "var(--surface-2)", color: "var(--text)", fontFamily: "Poppins", fontSize: 13, outline: "none",
  },
  chatSend: {
    width: 40, height: 40, borderRadius: "50%", border: "none",
    background: "var(--primary)", color: "#fff", fontSize: 16, cursor: "pointer",
  },
};