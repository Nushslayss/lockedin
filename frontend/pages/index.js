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

const DEFAULT_GREETING = { role: "assistant", text: "Heyyy! ✨ I'm your lockedin assistant — I can chat about anything, add tasks, split them into steps, or clear stuff out. What's up?" };

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
  const [editingId, setEditingId] = useState(null);
  const [editingField, setEditingField] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null);
  const [rescheduleTask, setRescheduleTask] = useState(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [fullScreenMsg, setFullScreenMsg] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [addingSubtaskId, setAddingSubtaskId] = useState(null);
  const [newSubtaskDraft, setNewSubtaskDraft] = useState({ title: "", priority: "medium", dueDate: "" });
  const [aiSubtaskDraft, setAiSubtaskDraft] = useState({});
  const [subtaskState, setSubtaskState] = useState({});
  const [customSubtask, setCustomSubtask] = useState({});
  const [customAdded, setCustomAdded] = useState({});
  const router = useRouter();
  const chatEndRef = useRef(null);
  const notifiedRef = useRef(false);
  const menuRef = useRef(null);
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") || "light";
    setTheme(savedTheme);
    document.documentElement.setAttribute("data-theme", savedTheme);
    if (!token) { router.push("/login"); return; }
    initialLoad();

    const savedChat = localStorage.getItem("lockedin_chat_history");
    if (savedChat) {
      try {
        const parsedChat = JSON.parse(savedChat);
        setMessages(Array.isArray(parsedChat) && parsedChat.length > 0 ? parsedChat : [DEFAULT_GREETING]);
      } catch {
        setMessages([DEFAULT_GREETING]);
      }
    } else {
      setMessages([DEFAULT_GREETING]);
    }
  }, []);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem("lockedin_chat_history", JSON.stringify(messages));
    }
  }, [messages]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
    const upcoming = list.filter((t) => t.dueDate && t.status !== "done" && t.status !== "deleted" && new Date(t.dueDate) <= soon && new Date(t.dueDate) >= now);
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

  const showFullScreen = (text, kind) => {
    setFullScreenMsg({ text, kind });
    setTimeout(() => setFullScreenMsg(null), 2800);
  };

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

  const markDone = async (task) => {
    const updatedSubtasks = (task.subtasks || []).map((s) => ({ ...s, completed: true }));
    setTasks((prev) => prev.map((t) => (t._id === task._id ? { ...t, status: "done", subtasks: updatedSubtasks } : t)));
    await fetch(`${API_URL}/api/tasks/${task._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status: "done", completed: true, subtasks: updatedSubtasks }),
    });
    showFullScreen(MOTIVATIONAL_MESSAGES[Math.floor(Math.random() * MOTIVATIONAL_MESSAGES.length)], "success");
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

  const deleteTask = (task) => setConfirmModal(task);

  const confirmSoftDelete = async () => {
    if (!confirmModal) return;
    const taskId = confirmModal._id;
    setTasks((prev) => prev.filter((t) => t._id !== taskId));
    setConfirmModal(null);
    await fetch(`${API_URL}/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status: "deleted", deletedAt: new Date().toISOString() }),
    });
  };

  const confirmReschedule = async (withDate) => {
    const task = rescheduleTask;
    let body;
    if (withDate && rescheduleDate) {
      body = { status: "pending", dueDate: rescheduleDate };
    } else {
      const updatedSubtasks = (task.subtasks || []).map((s) => ({ ...s, completed: false }));
      body = { status: "failed", subtasks: updatedSubtasks };
    }
    await fetch(`${API_URL}/api/tasks/${task._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    setRescheduleTask(null); setRescheduleDate("");
    showFullScreen(NOT_DONE_MESSAGES[Math.floor(Math.random() * NOT_DONE_MESSAGES.length)], "failure");
    fetchTasks();
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("lockedin_chat_history");
    router.push("/login");
  };

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
        subtaskProposal: data.subtaskProposal,
        linkedTaskId: data.showTaskId || null,
      }]);
      if (data.tasksChanged) fetchTasks();
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", text: "Hmm, something glitched. Try again?" }]);
    } finally { setChatLoading(false); }
  };

  const handleTaskOptionAction = async (opt, kind) => {
    if (kind === "delete") {
      await fetch(`${API_URL}/api/tasks/${opt.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: "deleted", deletedAt: new Date().toISOString() }),
      });
      fetchTasks();
    }
    if (kind === "done") {
      const task = tasks.find((t) => t._id === opt.id);
      if (task) await markDone(task);
    }
    setMessages((prev) => [...prev, { role: "assistant", text: `Got it — "${opt.title}" ${kind === "delete" ? "moved to deleted" : "marked done"}! ✨` }]);
  };

  const toggleSubtaskCheck = (msgIndex, i) => {
    setSubtaskState((prev) => {
      const cur = prev[msgIndex] || { checked: {}, dates: {}, priorities: {} };
      return { ...prev, [msgIndex]: { ...cur, checked: { ...cur.checked, [i]: !cur.checked[i] } } };
    });
  };

  const setSubtaskDate = (msgIndex, i, date) => {
    setSubtaskState((prev) => {
      const cur = prev[msgIndex] || { checked: {}, dates: {}, priorities: {} };
      return { ...prev, [msgIndex]: { ...cur, dates: { ...cur.dates, [i]: date } } };
    });
  };

  const setSubtaskPriority = (msgIndex, i, priority) => {
    setSubtaskState((prev) => {
      const cur = prev[msgIndex] || { checked: {}, dates: {}, priorities: {} };
      return { ...prev, [msgIndex]: { ...cur, priorities: { ...cur.priorities, [i]: priority } } };
    });
  };

  const updateCustomSubtask = (msgIndex, field, value) => {
    setCustomSubtask((prev) => ({
      ...prev,
      [msgIndex]: { ...(prev[msgIndex] || { title: "", priority: "medium", dueDate: "" }), [field]: value },
    }));
  };

  const addCustomSubtaskToList = (msgIndex) => {
    const draft = customSubtask[msgIndex];
    if (!draft || !draft.title || !draft.title.trim()) return;
    setCustomAdded((prev) => ({
      ...prev,
      [msgIndex]: [...(prev[msgIndex] || []), { title: draft.title.trim(), priority: draft.priority || "medium", dueDate: draft.dueDate || null }],
    }));
    setCustomSubtask((prev) => ({ ...prev, [msgIndex]: { title: "", priority: "medium", dueDate: "" } }));
  };
  const removeCustomSubtask = (msgIndex, i) => {
    setCustomAdded((prev) => ({ ...prev, [msgIndex]: (prev[msgIndex] || []).filter((_, idx) => idx !== i) }));
  };

  // proposal = { taskId, taskTitle, priority, dueDate, subtasks }
  // If taskId exists, embed into that existing task. Otherwise create a new task
  // from taskTitle (+ the priority/dueDate already gathered in chat) with the
  // picked subtasks embedded. Either way, keep the resulting task's id on the
  // message so the chat can keep showing its live, editable subtask list.
  const confirmSubtasks = async (msgIndex, proposal) => {
    const subtasks = proposal.subtasks || [];
    const state = subtaskState[msgIndex] || { checked: {}, dates: {}, priorities: {} };
    const selected = subtasks
      .map((title, i) => ({ title, i }))
      .filter(({ i }) => state.checked[i])
      .map(({ title, i }) => ({
        title,
        completed: false,
        priority: state.priorities[i] || "medium",
        dueDate: state.dates[i] || null,
      }));
    const custom = (customAdded[msgIndex] || []).map((item) => ({
      title: item.title,
      completed: false,
      priority: item.priority,
      dueDate: item.dueDate,
    }));
    const newSubtasks = [...selected, ...custom];
    if (newSubtasks.length === 0) return;

    let targetTaskId = proposal.taskId;

    if (proposal.taskId) {
      const task = tasks.find((t) => t._id === proposal.taskId);
      const updatedSubtasks = [...(task?.subtasks || []), ...newSubtasks];
      await fetch(`${API_URL}/api/tasks/${proposal.taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ subtasks: updatedSubtasks }),
      });
    } else {
      const body = { title: proposal.taskTitle || "New task", subtasks: newSubtasks };
      if (proposal.priority) body.priority = proposal.priority;
      if (proposal.dueDate) body.dueDate = proposal.dueDate;
      const res = await fetch(`${API_URL}/api/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const created = await res.json();
      targetTaskId = created._id;
    }

    setMessages((prev) => prev.map((m, idx) => (idx === msgIndex ? { ...m, subtaskProposal: null, linkedTaskId: targetTaskId } : m)));
    setCustomAdded((prev) => ({ ...prev, [msgIndex]: [] }));
    fetchTasks();
  };

  const toggleSubtaskCompleted = async (taskId, subtaskIndex) => {
    const task = tasks.find((t) => t._id === taskId);
    if (!task) return;
    const updatedSubtasks = task.subtasks.map((st, i) =>
      i === subtaskIndex ? { ...st, completed: !st.completed } : st
    );
    const res = await fetch(`${API_URL}/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ subtasks: updatedSubtasks }),
    });
    if (res.ok) {
      const saved = await res.json();
      setTasks((prev) => prev.map((t) => (t._id === taskId ? saved : t)));
    } else {
      console.error("Failed to toggle subtask");
      fetchTasks();
    }
  };

  const addSubtaskToTask = async (taskId) => {
    if (!newSubtaskDraft.title.trim()) return;
    const task = tasks.find((t) => t._id === taskId);
    if (!task) return;

    const newSubtask = {
      title: newSubtaskDraft.title.trim(),
      completed: false,
      priority: newSubtaskDraft.priority,
      dueDate: newSubtaskDraft.dueDate || null,
    };
    const updatedSubtasks = [...(task.subtasks || []), newSubtask];

    setAddingSubtaskId(null);
    setNewSubtaskDraft({ title: "", priority: "medium", dueDate: "" });

    const res = await fetch(`${API_URL}/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ subtasks: updatedSubtasks }),
    });
    if (res.ok) {
      const saved = await res.json();
      setTasks((prev) => prev.map((t) => (t._id === taskId ? saved : t)));
    } else {
      console.error("Failed to add subtask");
      fetchTasks();
    }
  };
  const removeSubtaskFromTask = async (taskId, idx) => {
    const task = tasks.find((t) => t._id === taskId);
    if (!task) return;
    const updatedSubtasks = (task.subtasks || []).filter((_, i) => i !== idx);

    // Optimistic UI update so the row disappears immediately...
    setTasks((prev) => prev.map((t) => (t._id === taskId ? { ...t, subtasks: updatedSubtasks } : t)));

    const res = await fetch(`${API_URL}/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ subtasks: updatedSubtasks }),
    });
    if (res.ok) {
      // ...then reconcile with whatever the server actually saved.
      const saved = await res.json();
      setTasks((prev) => prev.map((t) => (t._id === taskId ? saved : t)));
    } else {
      console.error("Failed to delete subtask — reverting");
      fetchTasks();
    }
  };

  const updateSubtaskField = async (taskId, idx, field, value) => {
    const task = tasks.find((t) => t._id === taskId);
    if (!task) return;
    // A cleared date input sends "" — must become null, or the save fails.
    const cleanValue = field === "dueDate" && value === "" ? null : value;
    const updatedSubtasks = task.subtasks.map((s, i) => (i === idx ? { ...s, [field]: cleanValue } : s));

    const res = await fetch(`${API_URL}/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ subtasks: updatedSubtasks }),
    });
    if (res.ok) {
      const saved = await res.json();
      setTasks((prev) => prev.map((t) => (t._id === taskId ? saved : t)));
    } else {
      console.error("Failed to update subtask field");
      fetchTasks();
    }
  };

  const fetchAiSubtasksForTask = async (task) => {
    setAiSubtaskDraft((prev) => ({ ...prev, [task._id]: { loading: true } }));
    try {
      const res = await fetch(`${API_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message: `Break down "${task.title}" into subtasks`, history: [] }),
      });
      const data = await res.json();
      const subtasks = data.subtaskProposal?.subtasks || [];
      setAiSubtaskDraft((prev) => ({
        ...prev,
        [task._id]: { loading: false, subtasks, checked: {}, priorities: {}, dates: {} },
      }));
    } catch {
      setAiSubtaskDraft((prev) => ({ ...prev, [task._id]: { loading: false, subtasks: [] } }));
    }
  };

  const toggleAiSubtaskCheck = (taskId, idx) => {
    setAiSubtaskDraft((prev) => {
      const cur = prev[taskId];
      return { ...prev, [taskId]: { ...cur, checked: { ...cur.checked, [idx]: !cur.checked[idx] } } };
    });
  };

  const setAiSubtaskField = (taskId, idx, field, value) => {
    setAiSubtaskDraft((prev) => {
      const cur = prev[taskId];
      const key = field === "priority" ? "priorities" : "dates";
      return { ...prev, [taskId]: { ...cur, [key]: { ...cur[key], [idx]: value } } };
    });
  };

  const confirmAiSubtasks = async (task) => {
    const draft = aiSubtaskDraft[task._id];
    if (!draft) return;
    const selected = draft.subtasks
      .map((title, idx) => ({ title, idx }))
      .filter(({ idx }) => draft.checked[idx]);
    if (selected.length === 0) return;

    const newSubtasks = selected.map(({ title, idx }) => ({
      title,
      completed: false,
      priority: draft.priorities[idx] || "medium",
      dueDate: draft.dates[idx] || null,
    }));
    const updatedSubtasks = [...(task.subtasks || []), ...newSubtasks];

    const res = await fetch(`${API_URL}/api/tasks/${task._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ subtasks: updatedSubtasks }),
    });
    if (res.ok) {
      const saved = await res.json();
      setTasks((prev) => prev.map((t) => (t._id === task._id ? saved : t)));
    } else {
      console.error("Failed to add AI subtasks");
      fetchTasks();
    }
    setAiSubtaskDraft((prev) => ({ ...prev, [task._id]: null }));
  };

  const sortedTasks = [...tasks].filter((t) => t.status !== "deleted").sort((a, b) => {
    if (!a.dueDate && !b.dueDate) return 0;
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    return new Date(a.dueDate) - new Date(b.dueDate);
  });

  const formatDate = (d) => !d ? "No due date" : new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const toInputDate = (d) => d ? new Date(d).toISOString().split("T")[0] : "";

  // Reusable live, editable subtask list — used both right after confirming a
  // chat subtask proposal, and when the user asks to review an existing task.
  const renderLiveSubtaskList = (taskId) => {
    const t = tasks.find((tt) => tt._id === taskId);
    if (!t) return <p style={{ fontFamily: "Quicksand", fontSize: 13, color: "var(--text-dim)", fontStyle: "italic" }}>Added to your list! ✨</p>;
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 6, width: "100%", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 14, padding: 12 }}>
        <p style={{ margin: 0, fontFamily: "Quicksand", fontWeight: 700, fontSize: 14 }}>✨ {t.title}</p>
        {(t.subtasks || []).length === 0 && (
          <p style={{ margin: 0, fontFamily: "Poppins", fontSize: 13, color: "var(--text-dim)" }}>No subtasks yet.</p>
        )}
        {(t.subtasks || []).map((st, idx) => (
          <div key={st._id || idx} style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--surface)", borderRadius: 10, padding: "6px 10px", flexWrap: "wrap" }}>
            <input type="checkbox" checked={!!st.completed} onChange={() => toggleSubtaskCompleted(t._id, idx)} style={{ width: 16, height: 16 }} />
            <select value={st.priority || "medium"} onChange={(e) => updateSubtaskField(t._id, idx, "priority", e.target.value)}
              style={{ ...styles.priorityBadge, background: PRIORITY_COLOR[st.priority || "medium"], border: "none", fontSize: 9, cursor: "pointer" }}>
              <option value="low">LOW</option>
              <option value="medium">MEDIUM</option>
              <option value="high">HIGH</option>
            </select>
            <span style={{ flex: 1, fontFamily: "Poppins", fontSize: 13, textDecoration: st.completed ? "line-through" : "none", minWidth: 100 }}>{st.title}</span>
            <input type="date" value={toInputDate(st.dueDate)} onChange={(e) => updateSubtaskField(t._id, idx, "dueDate", e.target.value)} style={styles.inlineSelect} />
            <button onClick={() => removeSubtaskFromTask(t._id, idx)} style={{ ...styles.miniBtn, color: "#ff5f5f" }}>🗑️</button>
          </div>
        ))}
      </div>
    );
  };

  const sparklePositions = [
    { top: "10%", left: "8%" }, { top: "18%", left: "85%" }, { top: "75%", left: "12%" },
    { top: "85%", left: "80%" }, { top: "45%", left: "5%" }, { top: "50%", left: "92%" },
    { top: "8%", left: "50%" }, { top: "90%", left: "45%" },
  ];

  return (
    <div style={styles.wrap}>
      {fullScreenMsg && (
        <div style={styles.fullScreenOverlay} onClick={() => setFullScreenMsg(null)}>
          {sparklePositions.map((pos, i) => (
            <span key={i} className="sparkle" style={{ ...pos, position: "absolute", fontSize: "2rem", animationDelay: `${i * 0.15}s`, color: "#fff" }}>
              {fullScreenMsg.kind === "success" ? "✨" : "💫"}
            </span>
          ))}
          <p style={styles.fullScreenText}>{fullScreenMsg.text}</p>
        </div>
      )}
      <div style={styles.mainCol}>
        <header style={styles.header}>
          <span className="wordmark" style={{ fontSize: "3rem" }}>lockedin</span>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <button onClick={toggleTheme} style={styles.iconBtn}>{theme === "light" ? "🌙" : "☀️"}</button>
            <div ref={menuRef} style={{ position: "relative" }}>
              <button onClick={() => setMenuOpen((v) => !v)} style={styles.iconBtn}>⋯</button>
              {menuOpen && (
                <div style={styles.dropdown}>
                  <button onClick={() => router.push("/deleted")} style={styles.dropdownItem}>🗑️ Deleted tasks</button>
                  <button onClick={logout} style={{ ...styles.dropdownItem, color: "#ff5f5f" }}>🚪 Log out</button>
                </div>
              )}
            </div>
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
              <div key={task._id}>
                <div style={{
                  ...styles.row,
                  background: task.status === "failed" ? "var(--surface-2)" : "var(--surface)",
                  filter: task.status === "failed" ? "grayscale(0.6)" : "none",
                  opacity: task.status === "done" ? 0.6 : 1,
                }}>
                  <button
                    onClick={() => setExpandedId(expandedId === task._id ? null : task._id)}
                    style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, color: "var(--text-dim)" }}
                  >
                    {expandedId === task._id ? "▼" : "▶"}
                  </button>
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

                  <button
                    onClick={() => markDone(task)}
                    style={{
                      ...styles.rowBtn,
                      color: task.status === "done" ? "#fff" : "var(--text-dim)",
                      background: task.status === "done" ? "#5fd68a" : "var(--surface-2)",
                      borderColor: task.status === "done" ? "#5fd68a" : "var(--border)",
                    }}
                  >
                    ✓ Done
                  </button>
                  <button
                    onClick={() => setRescheduleTask(task)}
                    style={{
                      ...styles.rowBtn,
                      color: task.status === "failed" ? "#fff" : "var(--text-dim)",
                      background: task.status === "failed" ? "#b06a94" : "var(--surface-2)",
                      borderColor: task.status === "failed" ? "#b06a94" : "var(--border)",
                    }}
                  >
                    ○ Not done
                  </button>
                  <button onClick={() => deleteTask(task)} style={{ ...styles.rowBtn, color: "#ff5f5f" }}>🗑️</button>
                </div>

                {expandedId === task._id && (
                  <div style={{ marginLeft: 30, marginTop: -6, marginBottom: 6, display: "flex", flexDirection: "column", gap: 6 }}>
                    {task.subtasks && task.subtasks.length > 0 && task.subtasks.map((st, idx) => (
                      <div key={st._id || idx} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", background: "var(--surface-2)", borderRadius: 10, flexWrap: "wrap" }}>
                        <input
                          type="checkbox"
                          checked={!!st.completed}
                          onChange={() => toggleSubtaskCompleted(task._id, idx)}
                          style={{ width: 16, height: 16 }}
                        />
                        <select
                          value={st.priority || "medium"}
                          onChange={(e) => updateSubtaskField(task._id, idx, "priority", e.target.value)}
                          style={{ ...styles.priorityBadge, background: PRIORITY_COLOR[st.priority || "medium"], border: "none", fontSize: 9, cursor: "pointer" }}
                        >
                          <option value="low">LOW</option>
                          <option value="medium">MEDIUM</option>
                          <option value="high">HIGH</option>
                        </select>
                        <span style={{ flex: 1, fontFamily: "Poppins", fontSize: 13, textDecoration: st.completed ? "line-through" : "none", minWidth: 100 }}>
                          {st.title}
                        </span>
                        <input
                          type="date"
                          value={toInputDate(st.dueDate)}
                          onChange={(e) => updateSubtaskField(task._id, idx, "dueDate", e.target.value)}
                          style={styles.inlineSelect}
                        />
                        <button
                          onClick={() => toggleSubtaskCompleted(task._id, idx)}
                          style={{
                            ...styles.rowBtn,
                            padding: "5px 10px",
                            fontSize: 11,
                            color: st.completed ? "#fff" : "var(--text-dim)",
                            background: st.completed ? "#5fd68a" : "var(--surface)",
                            borderColor: st.completed ? "#5fd68a" : "var(--border)",
                          }}
                        >
                          ✓ Done
                        </button>
                        <button
                          onClick={() => removeSubtaskFromTask(task._id, idx)}
                          style={{ ...styles.rowBtn, padding: "5px 10px", fontSize: 11, color: "#ff5f5f" }}
                        >
                          🗑️
                        </button>
                      </div>
                    ))}

                    {aiSubtaskDraft[task._id]?.loading && (
                      <p style={{ fontFamily: "Poppins", fontSize: 13, color: "var(--text-dim)" }}>Thinking of subtasks...</p>
                    )}

                    {aiSubtaskDraft[task._id] && !aiSubtaskDraft[task._id].loading && aiSubtaskDraft[task._id].subtasks.length > 0 && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 6, background: "var(--surface-2)", borderRadius: 12, padding: 10, border: "1px dashed var(--border)" }}>
                        {aiSubtaskDraft[task._id].subtasks.map((title, idx) => {
                          const draft = aiSubtaskDraft[task._id];
                          const priority = draft.priorities[idx] || "medium";
                          return (
                            <div key={idx} style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--surface)", borderRadius: 10, padding: "6px 10px", flexWrap: "wrap" }}>
                              <input type="checkbox" checked={!!draft.checked[idx]} onChange={() => toggleAiSubtaskCheck(task._id, idx)} style={{ width: 16, height: 16 }} />
                              <select value={priority} onChange={(e) => setAiSubtaskField(task._id, idx, "priority", e.target.value)}
                                style={{ ...styles.priorityBadge, background: PRIORITY_COLOR[priority], border: "none", fontSize: 9, cursor: "pointer" }}>
                                <option value="low">LOW</option>
                                <option value="medium">MEDIUM</option>
                                <option value="high">HIGH</option>
                              </select>
                              <span style={{ flex: 1, fontFamily: "Poppins", fontSize: 13, minWidth: 100 }}>{title}</span>
                              <input type="date" onChange={(e) => setAiSubtaskField(task._id, idx, "dueDate", e.target.value)} style={styles.inlineSelect} />
                            </div>
                          );
                        })}
                        <button onClick={() => confirmAiSubtasks(task)} style={styles.doneBtn}>✔ Add selected</button>
                      </div>
                    )}

                    <button
                      onClick={() => fetchAiSubtasksForTask(task)}
                      style={{ alignSelf: "flex-start", padding: "8px 14px", borderRadius: 10, border: "1px dashed var(--primary)", background: "var(--surface-2)", color: "var(--primary-strong)", fontFamily: "Quicksand", fontWeight: 700, fontSize: 13, cursor: "pointer" }}
                    >
                      {task.subtasks && task.subtasks.length > 0 ? "✨ Suggest more subtasks" : "✨ Suggest subtasks with AI"}
                    </button>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", background: "var(--surface-2)", borderRadius: 12, padding: 10, border: "1px dashed var(--border)" }}>
                      <input
                        type="text"
                        placeholder="Add a subtask..."
                        value={addingSubtaskId === task._id ? newSubtaskDraft.title : ""}
                        onFocus={() => setAddingSubtaskId(task._id)}
                        onChange={(e) => { setAddingSubtaskId(task._id); setNewSubtaskDraft((prev) => ({ ...prev, title: e.target.value })); }}
                        style={{ flex: "1 1 120px", padding: "8px 12px", borderRadius: 10, border: "1px solid var(--border)", fontFamily: "Poppins", fontSize: 13 }}
                      />
                      <select
                        value={addingSubtaskId === task._id ? newSubtaskDraft.priority : "medium"}
                        onChange={(e) => { setAddingSubtaskId(task._id); setNewSubtaskDraft((prev) => ({ ...prev, priority: e.target.value })); }}
                        style={styles.inlineSelect}
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                      </select>
                      <input
                        type="date"
                        value={addingSubtaskId === task._id ? newSubtaskDraft.dueDate : ""}
                        onChange={(e) => { setAddingSubtaskId(task._id); setNewSubtaskDraft((prev) => ({ ...prev, dueDate: e.target.value })); }}
                        style={styles.inlineSelect}
                      />
                      <button
                        onClick={() => addSubtaskToTask(task._id)}
                        style={{ padding: "8px 14px", borderRadius: 10, border: "none", background: "var(--primary)", color: "#fff", fontFamily: "Quicksand", fontWeight: 700, fontSize: 13, cursor: "pointer" }}
                      >
                        + Add
                      </button>
                    </div>
                  </div>
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

              {m.askType === "splitChoice" && (
                <div style={styles.pillRow}>
                  <button onClick={() => sendChat("Yes, split it into subtasks")} style={styles.pillBtn}>Yes, split it up</button>
                  <button onClick={() => sendChat("No, keep it as one task")} style={styles.pillBtn}>No, one task</button>
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

              {m.subtaskProposal && m.subtaskProposal.subtasks && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 14, padding: 12 }}>
                  {m.subtaskProposal.subtasks.map((title, idx) => {
                    const state = subtaskState[i] || { checked: {}, dates: {}, priorities: {} };
                    const priority = state.priorities[idx] || "medium";
                    return (
                      <div key={idx} style={{ display: "flex", alignItems: "center", gap: 10, background: "var(--surface)", borderRadius: 12, padding: "8px 10px" }}>
                        <input type="checkbox" checked={!!state.checked[idx]} onChange={() => toggleSubtaskCheck(i, idx)} style={{ width: 18, height: 18 }} />
                        <div style={{ flex: 1 }}>
                          <select value={priority} onChange={(e) => setSubtaskPriority(i, idx, e.target.value)}
                            style={{ ...styles.priorityBadge, background: PRIORITY_COLOR[priority], border: "none", fontSize: 9, cursor: "pointer" }}>
                            <option value="low">LOW</option>
                            <option value="medium">MEDIUM</option>
                            <option value="high">HIGH</option>
                          </select>
                          <p style={{ margin: "4px 0 0 0", fontFamily: "Quicksand", fontWeight: 600, fontSize: 14 }}>{title}</p>
                        </div>
                        <input type="date" onChange={(e) => setSubtaskDate(i, idx, e.target.value)} style={styles.inlineSelect} />
                      </div>
                    );
                  })}

                  {(customAdded[i] || []).map((item, idx) => (
                    <div key={`c-${idx}`} style={{ display: "flex", alignItems: "center", gap: 10, background: "var(--surface)", borderRadius: 12, padding: "8px 10px", border: "1px dashed var(--primary)" }}>
                      <span style={{ ...styles.priorityBadge, background: PRIORITY_COLOR[item.priority], fontSize: 9 }}>{item.priority.toUpperCase()}</span>
                      <span style={{ flex: 1, fontFamily: "Quicksand", fontWeight: 600, fontSize: 14 }}>{item.title}</span>
                      <button onClick={() => removeCustomSubtask(i, idx)} style={{ ...styles.miniBtn, color: "#ff5f5f" }}>✕</button>
                    </div>
                  ))}

                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", background: "var(--surface)", borderRadius: 12, padding: 10, border: "1px dashed var(--border)" }}>
                    <input type="text" placeholder="Add your own subtask..." value={customSubtask[i]?.title || ""}
                      onChange={(e) => updateCustomSubtask(i, "title", e.target.value)}
                      style={{ flex: "1 1 120px", padding: "8px 12px", borderRadius: 10, border: "1px solid var(--border)", fontFamily: "Poppins", fontSize: 13 }} />
                    <select value={customSubtask[i]?.priority || "medium"} onChange={(e) => updateCustomSubtask(i, "priority", e.target.value)} style={styles.inlineSelect}>
                      <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
                    </select>
                    <input type="date" value={customSubtask[i]?.dueDate || ""} onChange={(e) => updateCustomSubtask(i, "dueDate", e.target.value)} style={styles.inlineSelect} />
                    <button onClick={() => addCustomSubtaskToList(i)} style={{ padding: "8px 14px", borderRadius: 10, border: "none", background: "var(--primary)", color: "#fff", fontFamily: "Quicksand", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>+ Add</button>
                  </div>

                  <button onClick={() => confirmSubtasks(i, m.subtaskProposal)} style={styles.doneBtn}>
                    ✔ Done — Add Selected
                  </button>
                </div>
              )}

              {m.linkedTaskId && renderLiveSubtaskList(m.linkedTaskId)}
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

      {confirmModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalCard}>
            <p style={{ fontFamily: "Quicksand", fontWeight: 700, fontSize: 17, margin: "0 0 8px" }}>Delete this task?</p>
            <p style={{ fontFamily: "Poppins", fontSize: 14, color: "var(--text-dim)", margin: "0 0 20px" }}>"{confirmModal.title}" will move to Deleted — you can restore it later.</p>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setConfirmModal(null)} style={styles.modalCancelBtn}>Cancel</button>
              <button onClick={confirmSoftDelete} style={styles.modalDeleteBtn}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {rescheduleTask && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalCard}>
            <p style={{ fontFamily: "Quicksand", fontWeight: 700, fontSize: 17, margin: "0 0 8px" }}>Reschedule "{rescheduleTask.title}"?</p>
            <p style={{ fontFamily: "Poppins", fontSize: 14, color: "var(--text-dim)", margin: "0 0 16px" }}>Pick a new due date, or just mark it not done for now.</p>
            <input type="date" value={rescheduleDate} onChange={(e) => setRescheduleDate(e.target.value)} style={{ ...styles.addSelect, marginBottom: 16, width: "100%" }} />
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => confirmReschedule(false)} style={styles.modalCancelBtn}>Just mark not done</button>
              <button onClick={() => confirmReschedule(true)} style={styles.modalDeleteBtn} disabled={!rescheduleDate}>Reschedule</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  wrap: { minHeight: "100vh", display: "flex", flexWrap: "wrap" },
  mainCol: { flex: "1 1 500px", padding: "24px 24px 60px" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 },
  iconBtn: { background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: "50%", width: 46, height: 46, fontSize: 20, cursor: "pointer" },
  dropdown: { position: "absolute", top: 54, right: 0, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, boxShadow: "0 8px 28px rgba(0,0,0,0.18)", overflow: "hidden", minWidth: 190, zIndex: 250 },
  dropdownItem: { display: "block", width: "100%", textAlign: "left", padding: "14px 18px", background: "transparent", border: "none", fontFamily: "Quicksand", fontWeight: 700, fontSize: 15, color: "var(--text)", cursor: "pointer" },
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
  rowBtn: { border: "2px solid var(--border)", borderRadius: 12, padding: "8px 14px", fontFamily: "Quicksand", fontWeight: 700, fontSize: 13, cursor: "pointer", transition: "all 0.2s ease" },
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
  chatInputRow: { display: "flex", gap: 10, padding: 18, borderTop: "1px solid var(--border)" },
  chatInput: { flex: 1, padding: "14px 18px", borderRadius: 999, border: "1px solid var(--border)", background: "var(--surface-2)", color: "var(--text)", fontFamily: "Poppins", fontSize: 15, outline: "none" },
  chatSend: { width: 48, height: 48, borderRadius: "50%", border: "none", background: "var(--primary)", color: "#fff", fontSize: 20, cursor: "pointer" },
  doneBtn: { marginTop: 6, padding: "10px 16px", borderRadius: 999, border: "none", background: "linear-gradient(90deg, var(--primary-strong), var(--primary))", color: "#fff", fontFamily: "Quicksand", fontWeight: 700, fontSize: 14, cursor: "pointer" },
  modalOverlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 400 },
  modalCard: { background: "var(--surface)", borderRadius: 20, padding: 24, maxWidth: 340, width: "90%" },
  modalCancelBtn: { flex: 1, padding: "12px 0", borderRadius: 12, border: "1px solid var(--border)", background: "transparent", color: "var(--text)", fontFamily: "Quicksand", fontWeight: 700, cursor: "pointer" },
  modalDeleteBtn: { flex: 1, padding: "12px 0", borderRadius: 12, border: "none", background: "#ff5f5f", color: "#fff", fontFamily: "Quicksand", fontWeight: 700, cursor: "pointer" },
  fullScreenOverlay: {
    position: "fixed", inset: 0, zIndex: 500,
    display: "flex", alignItems: "center", justifyContent: "center",
    background: "linear-gradient(135deg, var(--primary-strong), var(--primary))",
    animation: "fadeIn 0.3s ease", cursor: "pointer", padding: 40, textAlign: "center",
    overflow: "hidden",
  },
  fullScreenText: {
    fontFamily: "Quicksand", fontWeight: 800, fontSize: "2.4rem", color: "#fff",
    lineHeight: 1.4, maxWidth: 700, position: "relative", zIndex: 1,
    textShadow: "0 4px 20px rgba(0,0,0,0.2)",
  },
};