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

const NOT_DONE_MESSAGES = [
  "Girl, it's giving 'next time energy!' 💋 No stress, come back to it whenever.",
  "It's a no from me right now, but you're still that girl! 👑",
  "Oop! Not today, but you're still slaying overall! 💖",
  "This ain't it yet, but you'll get there babe! ✨",
  "Girlie, we can circle back! Take your time! 💪",
];

export default function Home() {
  const [theme, setTheme] = useState("light");
  const [tasks, setTasks] = useState([]);
  const [newTitle, setNewTitle] = useState("");
  const [newPriority, setNewPriority] = useState("");
  const [newDueDate, setNewDueDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatDatePick, setChatDatePick] = useState("");
  const [toast, setToast] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editingField, setEditingField] = useState(null);
  const [reschedulingId, setReschedulingId] = useState(null);
  const [breakdownState, setBreakdownState] = useState({}); // { [messageIndex]: { checked: {i:bool}, dates: {i:str} } }
  const router = useRouter();
  const chatEndRef = useRef(null);
  const notifiedRef = useRef(false);
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") || "light";
    setTheme(savedTheme);
    document.documentElement.setAttribute("data-theme", savedTheme);
    if (!token) { router.push("/login"); return; }
    initialLoad();
    setMessages([{ role: "assistant", text: "Heyyy! ✨ I'm your lockedin assistant — I can chat about anything, add tasks, split them into steps, or clear stuff out. What's up?" }]);
  }, []);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
  };

  const initialLoad = async () => {
    const list = await fetchTasks();
    if (!notifiedRef.current && list) {
      notifiedRef.current = true;
      checkDueSoon(list);
    }
  };

  const checkDueSoon = (list) => {
    const now = new Date();
    const soon = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
    const upcoming = list.filter((t) => t.dueDate && t.status !== "done" && new Date(t.dueDate) <= soon && new Date(t.dueDate) >= now);
    upcoming.forEach((t) => {
      const d = new Date(t.dueDate).toLocaleDateString(undefined, { month: "short", day: "numeric" });
      setMessages((prev) => [...prev, { role: "assistant", text: `⏰ Heads up bestie — "${t.title}" is due ${d}!` }]);
    });
  };

  const fetchTasks = async () => {
    try {
      const res = await fetch(`${API_URL}/api/tasks`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
      setTasks(list);
      return list;
    } catch (err) { console.error(err); return []; }
    finally { setLoading(false); }
  };

  const showToast = (text) => { setToast(text); setTimeout(() => setToast(null), 2800); };

  const addTask = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    const body = { title: newTitle };
    if (newPriority) body.priority = newPriority;
    if (newDueDate) body.dueDate = newDueDate;
    await fetch(`${API_URL}/api/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    setNewTitle(""); setNewPriority(""); setNewDueDate("");
    fetchTasks();
  };

  const addTaskDirect = async (title, priority, dueDate) => {
    await fetch(`${API_URL}/api/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ title, priority, dueDate: dueDate || null }),
    });
  };

  const setStatus = async (task, status) => {
    await fetch(`${API_URL}/api/tasks/${task._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status, completed: status === "done" }),
    });
    if (status === "done") showToast(MOTIVATIONAL_MESSAGES[Math.floor(Math.random() * MOTIVATIONAL_MESSAGES.length)]);
    if (status === "failed") showToast(NOT_DONE_MESSAGES[Math.floor(Math.random() * NOT_DONE_MESSAGES.length)]);
    fetchTasks();
  };

  const rescheduleTask = async (taskId, newDate) => {
    await fetch(`${API_URL}/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status: "pending", completed: false, dueDate: newDate }),
    });
    setReschedulingId(null);
    showToast("🔄 Rescheduled! Back in the game.");
    fetchTasks();
  };

  const updateField = async (taskId, field, value) => {
    await fetch(`${API_URL}/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ [field]: value }),
    });
    setEditingId(null); setEditingField(null);
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
    setChatInput(""); setChatDatePick("");
    setChatLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message: text, history: historyToSend }),
      });
      const data = await res.json();
      setMessages((prev) => [...prev, {
        role: "assistant",
        text: data.reply || "Done!",
        askType: data.askType,
        taskOptions: data.taskOptions,
        breakdownItems: data.breakdownItems,
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

  // ---- Breakdown checklist helpers ----
  const toggleBreakdownCheck = (msgIndex, itemIndex) => {
    setBreakdownState((prev) => {
      const current = prev[msgIndex] || { checked: {}, dates: {} };
      return {
        ...prev,
        [msgIndex]: { ...current, checked: { ...current.checked, [itemIndex]: !current.checked[itemIndex] } },
      };
    });
  };

  const setBreakdownDate = (msgIndex, itemIndex, date) => {
    setBreakdownState((prev) => {
      const current = prev[msgIndex] || { checked: {}, dates: {} };
      return {
        ...prev,
        [msgIndex]: { ...current, dates: { ...current.dates, [itemIndex]: date } },
      };
    });
  };

  const confirmBreakdown = async (msgIndex, items) => {
    const state = breakdownState[msgIndex] || { checked: {}, dates: {} };
    const selected = items.filter((_, i) => state.checked[i]);
    if (selected.length === 0) {
      showToast("Tick at least one subtask first ✔️");
      return;
    }
    await Promise.all(
      items.map((item, i) =>
        state.checked[i] ? addTaskDirect(item.title, item.priority, state.dates[i] || item.dueDate) : null
      )
    );
    showToast(`✨ Added ${selected.length} task${selected.length > 1 ? "s" : ""}!`);
    setMessages((prev) => prev.map((m, i) => (i === msgIndex ? { ...m, breakdownItems: null, breakdownDone: true } : m)));
    fetchTasks();
  };

  const sortedTasks = [...tasks].sort((a, b) => {
    if (!a.dueDate && !b.dueDate) return 0;
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    return new Date(a.dueDate) - new Date(b.dueDate);
  });

  const formatDate = (d) => !d ? "No due date" : new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const toInputDate = (d) => d ? new Date(d).toISOString().split("T")[0] : "";

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

        <form onSubmit={addTask} style={styles.addForm}>
          <input type="text" placeholder="Task title..." value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)} style={styles.addInput} />
          <div style={styles.addRow2}>
            <select value={newPriority} onChange={(e) => setNewPriority(e.target.value)} style={styles.addSelect}>
              <option value="">Priority (AI decides)</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
            <input type="date" value={newDueDate} onChange={(e) => setNewDueDate(e.target.value)} style={styles.addSelect} />
            <button type="submit" style={styles.addBtn}>+ Add</button>
          </div>
        </form>

        {loading ? (
          <p style={styles.emptyText}>Loading your tasks...</p>
        ) : sortedTasks.length === 0 ? (
          <p style={styles.emptyText}>No tasks yet — add one above, or ask the chat bestie ✨</p>
        ) : (
          <div style={styles.list}>
            {sortedTasks.map((task) => (
              <div key={task._id} style={{
                ...styles.row,
                background: task.status === "failed" ? "var(--surface-2)" : "var(--surface)",
                filter: task.status === "failed" ? "grayscale(0.6)" : "none",
                opacity: task.status === "done" ? 0.6 : 1,
              }}>
                {editingId === task._id && editingField === "priority" ? (
                  <select autoFocus defaultValue={task.priority} onBlur={(e) => updateField(task._id, "priority", e.target.value)}
                    onChange={(e) => updateField(task._id, "priority", e.target.value)} style={styles.inlineSelect}>
                    <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
                  </select>
                ) : (
                  <span onClick={() => { setEditingId(task._id); setEditingField("priority"); }}
                    style={{ ...styles.priorityBadge, background: PRIORITY_COLOR[task.priority || "medium"], cursor: "pointer" }}>
                    {(task.priority || "medium").toUpperCase()}
                  </span>
                )}

                <span style={{ ...styles.rowTitle, textDecoration: task.status === "done" ? "line-through" : "none" }}>
                  {task.title}
                </span>

                {editingId === task._id && editingField === "date" ? (
                  <input type="date" autoFocus defaultValue={toInputDate(task.dueDate)}
                    onBlur={(e) => updateField(task._id, "dueDate", e.target.value)}
                    onChange={(e) => updateField(task._id, "dueDate", e.target.value)} style={styles.inlineSelect} />
                ) : (
                  <span onClick={() => { setEditingId(task._id); setEditingField("date"); }} style={{ ...styles.rowDate, cursor: "pointer" }}>
                    {formatDate(task.dueDate)} ✏️
                  </span>
                )}

                {task.status === "failed" ? (
                  reschedulingId === task._id ? (
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <input
                        type="date"
                        autoFocus
                        onChange={(e) => e.target.value && rescheduleTask(task._id, e.target.value)}
                        style={styles.inlineSelect}
                      />
                      <button onClick={() => setReschedulingId(null)} style={{ ...styles.rowBtn, color: "var(--text-dim)" }}>Cancel</button>
                    </div>
                  ) : (
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => setReschedulingId(task._id)} style={{ ...styles.rowBtn, color: "var(--primary-strong)" }}>
                        🔄 Reschedule
                      </button>
                      <button onClick={() => deleteTask(task._id)} style={{ ...styles.rowBtn, color: "#ff5f5f" }}>✕</button>
                    </div>
                  )
                ) : (
                  <>
                    <button onClick={() => setStatus(task, "done")} style={{ ...styles.rowBtn, color: task.status === "done" ? "#5fd68a" : "var(--text-dim)" }}>✓ Done</button>
                    <button onClick={() => setStatus(task, "failed")} style={{ ...styles.rowBtn, color: "var(--text-dim)" }}>○ Not done</button>
                    <button onClick={() => deleteTask(task._id)} style={{ ...styles.rowBtn, color: "#ff5f5f" }}>🗑️</button>
                  </>
                )}
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
              <div style={{ ...styles.chatBubble, background: m.role === "user" ? "var(--primary)" : "var(--surface-2)", color: m.role === "user" ? "#fff" : "var(--text)" }}>
                {m.text}
              </div>

              {m.askType === "priority" && (
                <div style={styles.pillRow}>
                  {["Low", "Medium", "High"].map((p) => (
                    <button key={p} onClick={() => sendChat(p)} style={styles.pillBtn}>{p}</button>
                  ))}
                </div>
              )}

              {m.askType === "date" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%" }}>
                  <div style={styles.pillRow}>
                    {["Today", "Tomorrow", "This week", "No due date", "You decide"].map((d) => (
                      <button key={d} onClick={() => sendChat(d)} style={styles.pillBtn}>{d}</button>
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input type="date" value={chatDatePick} onChange={(e) => setChatDatePick(e.target.value)} style={styles.chatDateInput} />
                    <button onClick={() => chatDatePick && sendChat(`Due on ${chatDatePick}`)} style={styles.pillBtn}>Set date</button>
                  </div>
                </div>
              )}

              {m.askType === "breakdown" && (
                <div style={styles.pillRow}>
                  <button onClick={() => sendChat("Yes, break it down")} style={styles.pillBtn}>Yes, split it up</button>
                  <button onClick={() => sendChat("No, just add it as one task")} style={styles.pillBtn}>No, keep it one task</button>
                </div>
              )}

              {m.breakdownItems && m.breakdownItems.length > 0 && (
                <div style={styles.breakdownList}>
                  {m.breakdownItems.map((item, itemIdx) => {
                    const state = breakdownState[i] || { checked: {}, dates: {} };
                    return (
                      <div key={itemIdx} style={styles.breakdownRow}>
                        <input
                          type="checkbox"
                          checked={!!state.checked[itemIdx]}
                          onChange={() => toggleBreakdownCheck(i, itemIdx)}
                          style={{ width: 18, height: 18 }}
                        />
                        <div style={{ flex: 1 }}>
                          <span style={{ ...styles.priorityBadge, background: PRIORITY_COLOR[item.priority || "medium"], fontSize: 9 }}>
                            {(item.priority || "medium").toUpperCase()}
                          </span>
                          <p style={{ margin: "4px 0 0 0", fontFamily: "Quicksand", fontWeight: 600, fontSize: 14 }}>{item.title}</p>
                        </div>
                        <input
                          type="date"
                          defaultValue={toInputDate(item.dueDate)}
                          onChange={(e) => setBreakdownDate(i, itemIdx, e.target.value)}
                          style={styles.inlineSelect}
                        />
                      </div>
                    );
                  })}
                  <button onClick={() => confirmBreakdown(i, m.breakdownItems)} style={styles.doneBtn}>
                    ✔ Done — Add Selected
                  </button>
                </div>
              )}

              {m.breakdownDone && (
                <p style={{ fontFamily: "Quicksand", fontSize: 13, color: "var(--text-dim)", fontStyle: "italic" }}>
                  Added to your list! ✨
                </p>
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
  toast: { position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)", background: "var(--primary)", color: "#fff", padding: "14px 24px", borderRadius: 999, fontFamily: "Quicksand", fontWeight: 700, fontSize: 16, zIndex: 300, boxShadow: "0 8px 24px rgba(0,0,0,0.25)", maxWidth: "90%", textAlign: "center" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 },
  iconBtn: { background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: "50%", width: 46, height: 46, fontSize: 20, cursor: "pointer" },
  logoutBtn: { background: "transparent", border: "1px solid var(--border)", borderRadius: 999, padding: "10px 18px", fontFamily: "Quicksand", fontWeight: 700, fontSize: 15, color: "var(--text-dim)", cursor: "pointer" },
  addForm: { display: "flex", flexDirection: "column", gap: 10, marginBottom: 28 },
  addInput: { padding: "16px 18px", borderRadius: 16, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text)", fontFamily: "Poppins", fontSize: 16, outline: "none" },
  addRow2: { display: "flex", gap: 10, flexWrap: "wrap" },
  addSelect: { flex: "1 1 140px", padding: "12px 14px", borderRadius: 14, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text)", fontFamily: "Quicksand", fontSize: 14 },
  addBtn: { padding: "12px 24px", borderRadius: 14, border: "none", background: "linear-gradient(90deg, var(--primary-strong), var(--primary))", color: "#fff", fontFamily: "Quicksand", fontWeight: 700, fontSize: 15, cursor: "pointer" },
  emptyText: { color: "var(--text-dim)", fontFamily: "Quicksand", fontSize: 17, textAlign: "center", marginTop: 60 },
  list: { display: "flex", flexDirection: "column", gap: 12 },
  row: { display: "flex", alignItems: "center", gap: 14, border: "1px solid var(--border)", borderRadius: 16, padding: "16px 18px", boxShadow: "0 4px 14px rgba(0,0,0,0.05)", flexWrap: "wrap", transition: "all 0.3s ease" },
  priorityBadge: { color: "#fff", fontFamily: "Quicksand", fontWeight: 700, fontSize: 12, padding: "5px 12px", borderRadius: 999, whiteSpace: "nowrap" },
  rowTitle: { flex: 1, fontFamily: "Quicksand", fontWeight: 700, fontSize: 17, color: "var(--text)", minWidth: 140 },
  rowDate: { fontFamily: "Poppins", fontSize: 14, color: "var(--text-dim)", whiteSpace: "nowrap" },
  rowBtn: { background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 12, padding: "8px 14px", fontFamily: "Quicksand", fontWeight: 700, fontSize: 13, cursor: "pointer" },
  inlineSelect: { padding: "6px 10px", borderRadius: 10, border: "1px solid var(--border)", fontFamily: "Quicksand", fontSize: 13 },
  chatPanel: { flex: "1 1 380px", maxWidth: 460, minWidth: 340, background: "var(--surface)", borderLeft: "3px solid var(--primary)", display: "flex", flexDirection: "column", height: "100vh", position: "sticky", top: 0 },
  chatHeader: { padding: "22px 22px", fontFamily: "Quicksand", fontWeight: 800, fontSize: 22, color: "var(--text)", background: "var(--surface-2)", borderBottom: "1px solid var(--border)" },
  chatBody: { flex: 1, overflowY: "auto", padding: 20, display: "flex", flexDirection: "column", gap: 16 },
  chatBubble: { maxWidth: "88%", padding: "14px 18px", borderRadius: 20, fontFamily: "Poppins", fontSize: 16, lineHeight: 1.4 },
  pillRow: { display: "flex", gap: 8, flexWrap: "wrap" },
  pillBtn: { background: "var(--surface-2)", border: "2px solid var(--primary)", borderRadius: 999, padding: "9px 18px", fontFamily: "Quicksand", fontWeight: 700, fontSize: 14, color: "var(--primary-strong)", cursor: "pointer" },
  chatDateInput: { padding: "9px 14px", borderRadius: 999, border: "2px solid var(--primary)", fontFamily: "Quicksand", fontSize: 13 },
  optionList: { display: "flex", flexDirection: "column", gap: 8, width: "100%" },
  optionCard: { display: "flex", alignItems: "center", gap: 10, background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 14, padding: "10px 14px" },
  miniBtn: { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, width: 32, height: 32, cursor: "pointer", fontSize: 14 },
  breakdownList: { display: "flex", flexDirection: "column", gap: 8, width: "100%", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 14, padding: 12 },
  breakdownRow: { display: "flex", alignItems: "center", gap: 10, background: "var(--surface)", borderRadius: 12, padding: "8px 10px" },
  doneBtn: { marginTop: 6, padding: "10px 16px", borderRadius: 999, border: "none", background: "linear-gradient(90deg, var(--primary-strong), var(--primary))", color: "#fff", fontFamily: "Quicksand", fontWeight: 700, fontSize: 14, cursor: "pointer" },
  chatInputRow: { display: "flex", gap: 10, padding: 18, borderTop: "1px solid var(--border)" },
  chatInput: { flex: 1, padding: "14px 18px", borderRadius: 999, border: "1px solid var(--border)", background: "var(--surface-2)", color: "var(--text)", fontFamily: "Poppins", fontSize: 15, outline: "none" },
  chatSend: { width: 48, height: 48, borderRadius: "50%", border: "none", background: "var(--primary)", color: "#fff", fontSize: 20, cursor: "pointer" },
};