import { useState, useEffect } from "react";
import { useRouter } from "next/router";

const API_URL = "https://task-manager-production-d03d.up.railway.app";

// MOTIVATIONAL MESSAGES - GIRLY POP DIVA VIBES! 💅✨
const MOTIVATIONAL_MESSAGES = [
  "💅 Slay queen! That's what I'm talking about!",
  "✨ Periodt! You just ate and left no crumbs!",
  "🔥 Girl boss energy! Absolutely killing it!",
  "💋 That's it girl! You're giving main character!",
  "👑 Crown stays on! You're unstoppable!",
  "💗 Bestie, you just served LOOKS and TALENT!",
  "✨ Werk it! You're literally glowing!",
  "💃 Diva alert! That's how you do it!",
  "🌟 You're that girl! Period!",
  "💥 Absolutely ate! No notes!",
  "🎯 Task completed! Great job!",
  "✓ Well done! Moving forward!",
  "💪 You got it! Keep pushing!",
  "🚀 Success! Onward and upward!",
  "⭐ Excellent work! Keep it up!",
];

// FAILURE MESSAGES - GIRLY POP BUT SUPPORTIVE! 💗
const FAILURE_MESSAGES = [
  "Girl, it's giving 'next time energy!' 💋",
  "No worries bestie, you'll absolutely crush it next! 💅",
  "It's a no from me but you're still that girl! 👑",
  "Oop! Not this one sis, but you're still slaying! 💗",
  "This ain't it, but you'll get the yes babe! ✨",
  "Girlie, we can do better! Let's try again! 💪",
  "Not today honey, but you got this! 🌟",
  "Plot twist: You're still amazing! Try again! 💃",
  "That's okay! You'll get it next time! 💪",
  "No problem! Keep trying! 🌟",
  "Don't worry! You've got this! 💗",
  "It's all good! Give it another shot! 💫",
  "All good! You can do this! ✨",
  "That happens! Keep going! 🚀",
];

export default function Home() {
  const [tasks, setTasks] = useState([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState("light");
  const [modal, setModal] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") || "light";
    setTheme(savedTheme);
    document.documentElement.setAttribute("data-theme", savedTheme);
    fetchTasks();
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
  };

  const showModal = (message) => {
    setModal({ message });
    setTimeout(() => setModal(null), 3000);
  };

  const fetchTasks = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/login");
        return;
      }
      setLoading(true);
      const res = await fetch(`${API_URL}/api/tasks`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        localStorage.removeItem("token");
        router.push("/login");
        return;
      }
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setTasks(data);
      setError("");
    } catch (err) {
      setError("Could not connect to backend.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddTask = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/api/tasks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title, description }),
      });
      if (res.status === 401) {
        localStorage.removeItem("token");
        router.push("/login");
        return;
      }
      if (!res.ok) throw new Error("Failed to add task");
      setTitle("");
      setDescription("");
      fetchTasks();
    } catch (err) {
      setError("Could not add task.");
    }
  };

  const markDone = async (id) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/api/tasks/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ completed: true }),
      });
      if (!res.ok) throw new Error("Failed to update");

      const randomMsg = MOTIVATIONAL_MESSAGES[Math.floor(Math.random() * MOTIVATIONAL_MESSAGES.length)];
      showModal(randomMsg);

      fetchTasks();
    } catch (err) {
      setError("Could not update task.");
    }
  };

  const markNotDone = async (id) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/api/tasks/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ completed: false }),
      });
      if (!res.ok) throw new Error("Failed to update");

      const randomMsg = FAILURE_MESSAGES[Math.floor(Math.random() * FAILURE_MESSAGES.length)];
      showModal(randomMsg);

      fetchTasks();
    } catch (err) {
      setError("Could not update task.");
    }
  };

  const deleteTask = async (id) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/api/tasks/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to delete");
      fetchTasks();
    } catch (err) {
      setError("Could not delete task.");
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    router.push("/login");
  };

  return (
    <div style={{...styles.container, ...(theme === "dark" ? styles.containerDark : {})}}>
      <style>{`
        @keyframes glow {
          0%, 100% { text-shadow: 0 0 10px rgba(236, 72, 153, 0.5); }
          50% { text-shadow: 0 0 20px rgba(236, 72, 153, 0.8); }
        }
        .sparkle-text {
          animation: glow 2s ease-in-out infinite;
        }
        .glow-button:hover {
          box-shadow: 0 0 30px rgba(236, 72, 153, 0.6) !important;
          transform: scale(1.05);
        }
        @keyframes popIn {
          0% { transform: scale(0.5) translateY(-100px); opacity: 0; }
          50% { transform: scale(1.1); }
          100% { transform: scale(1) translateY(0); opacity: 1; }
        }
        .modal-enter {
          animation: popIn 0.5s ease-out;
        }
      `}</style>

      {modal && (
        <div style={styles.modalOverlay} className="modal-enter">
          <div style={styles.modalContent}>
            <h2 style={styles.modalText}>{modal.message}</h2>
          </div>
        </div>
      )}

      <div style={{...styles.navbar, ...(theme === "dark" ? styles.navbarDark : {})}}>
        <div style={styles.navContent}>
          <h1 style={styles.logo} className="sparkle-text">
            ✨ LockedIn ✨
          </h1>
          <div style={styles.navButtons}>
            <button style={{...styles.themeBtn, ...(theme === "dark" ? styles.themeBtnDark : {})}} onClick={toggleTheme}>
              {theme === "light" ? "🌙 Dark" : "☀️ Light"}
            </button>
            <button style={{...styles.logoutBtn, ...(theme === "dark" ? styles.logoutBtnDark : {})}} onClick={logout}>
              Logout
            </button>
          </div>
        </div>
      </div>

      <div style={styles.main}>
        {error && <div style={{...styles.error, ...(theme === "dark" ? styles.errorDark : {})}}>{error}</div>}

        <form onSubmit={handleAddTask} style={{...styles.form, ...(theme === "dark" ? styles.formDark : {})}}>
          <div style={styles.inputGroup}>
            <label style={{...styles.label, ...(theme === "dark" ? styles.labelDark : {})}}>✨ Task Title</label>
            <input
              type="text"
              placeholder="What needs to be done?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={{...styles.input, ...(theme === "dark" ? styles.inputDark : {})}}
              required
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={{...styles.label, ...(theme === "dark" ? styles.labelDark : {})}}>📝 Description (optional)</label>
            <input
              type="text"
              placeholder="Add a note..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{...styles.input, ...(theme === "dark" ? styles.inputDark : {})}}
            />
          </div>

          <button type="submit" style={styles.submitBtn} className="glow-button">
            ✨ Add Task ✨
          </button>
        </form>

        {loading ? (
          <p style={{...styles.loading, ...(theme === "dark" ? styles.loadingDark : {})}}>Loading your tasks... 💗</p>
        ) : tasks.length === 0 ? (
          <p style={{...styles.empty, ...(theme === "dark" ? styles.emptyDark : {})}}>No tasks yet. Add one to get started! 🎀</p>
        ) : (
          <div style={styles.tasksList}>
            {tasks.map((task) => (
              <div key={task._id} style={{...styles.taskCard, ...(theme === "dark" ? styles.taskCardDark : {})}}>
                <div style={styles.taskContent}>
                  <h3 style={{
                    ...styles.taskTitle,
                    ...(theme === "dark" ? styles.taskTitleDark : {}),
                    textDecoration: task.completed ? "line-through" : "none",
                    opacity: task.completed ? 0.6 : 1,
                  }}>
                    {task.completed ? "✓ " : "○ "} {task.title}
                  </h3>
                  {task.description && (
                    <p style={{...styles.taskDesc, ...(theme === "dark" ? styles.taskDescDark : {})}}>{task.description}</p>
                  )}
                </div>
                <div style={styles.taskActions}>
                  <button
                    onClick={() => markDone(task._id)}
                    style={{...styles.doneBtn, ...(theme === "dark" ? styles.doneBtnDark : {})}}
                    disabled={task.completed}
                  >
                    ✓ Done
                  </button>
                  <button
                    onClick={() => markNotDone(task._id)}
                    style={{...styles.notDoneBtn, ...(theme === "dark" ? styles.notDoneBtnDark : {})}}
                    disabled={!task.completed}
                  >
                    ○ Not Done
                  </button>
                  <button
                    onClick={() => deleteTask(task._id)}
                    style={{...styles.deleteBtn, ...(theme === "dark" ? styles.deleteBtnDark : {})}}
                  >
                    ✕ Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #fff5fb 0%, #fce7f3 50%, #fbcfe8 100%)",
    transition: "all 0.3s ease",
  },
  containerDark: {
    background: "linear-gradient(135deg, #f3e8ff 0%, #ede9fe 50%, #e9d5ff 100%)",
  },
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    background: "rgba(236, 72, 153, 0.9)",
  },
  modalContent: {
    background: "white",
    padding: "40px 60px",
    borderRadius: "20px",
    boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
    border: "3px solid #fbcfe8",
  },
  modalText: {
    fontSize: "28px",
    fontWeight: "bold",
    color: "#ec4899",
    textAlign: "center",
    margin: 0,
  },
  navbar: {
    background: "linear-gradient(90deg, #ec4899 0%, #db2777 100%)",
    padding: "20px",
    boxShadow: "0 10px 30px rgba(236, 72, 153, 0.3)",
    position: "sticky",
    top: 0,
    zIndex: 100,
    transition: "all 0.3s ease",
  },
  navbarDark: {
    background: "linear-gradient(90deg, #c4b5fd 0%, #a78bfa 100%)",
    boxShadow: "0 10px 30px rgba(168, 85, 247, 0.25)",
  },
  navContent: {
    maxWidth: "1000px",
    margin: "0 auto",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  logo: {
    color: "white",
    fontSize: "28px",
    fontWeight: "bold",
    textShadow: "0 0 15px rgba(255, 255, 255, 0.5)",
  },
  navButtons: {
    display: "flex",
    gap: "10px",
  },
  themeBtn: {
    background: "rgba(255, 255, 255, 0.2)",
    border: "2px solid white",
    color: "white",
    padding: "8px 16px",
    borderRadius: "20px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "bold",
    transition: "all 0.3s ease",
  },
  themeBtnDark: {
    background: "rgba(255, 255, 255, 0.3)",
    borderColor: "#ffffff",
    color: "#6b21a8",
  },
  logoutBtn: {
    background: "rgba(255, 255, 255, 0.2)",
    border: "2px solid white",
    color: "white",
    padding: "8px 16px",
    borderRadius: "20px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "bold",
    transition: "all 0.3s ease",
  },
  logoutBtnDark: {
    background: "rgba(255, 255, 255, 0.3)",
    borderColor: "#ffffff",
    color: "#6b21a8",
  },
  main: {
    maxWidth: "900px",
    margin: "40px auto",
    padding: "0 20px",
  },
  error: {
    background: "#fee2e2",
    color: "#991b1b",
    padding: "14px",
    borderRadius: "10px",
    marginBottom: "20px",
    border: "2px solid #fca5a5",
    fontWeight: "bold",
    transition: "all 0.3s ease",
  },
  errorDark: {
    background: "#fce7f3",
    color: "#9d174d",
    borderColor: "#f0abfc",
  },
  form: {
    background: "white",
    padding: "30px",
    borderRadius: "20px",
    boxShadow: "0 10px 40px rgba(236, 72, 153, 0.15)",
    marginBottom: "30px",
    border: "3px solid #ec4899",
    transition: "all 0.3s ease",
  },
  formDark: {
    background: "#faf5ff",
    border: "3px solid #d8b4fe",
    boxShadow: "0 10px 40px rgba(139, 92, 246, 0.15)",
  },
  inputGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    marginBottom: "16px",
  },
  label: {
    fontSize: "14px",
    fontWeight: "bold",
    color: "#ec4899",
    transition: "all 0.3s ease",
  },
  labelDark: {
    color: "#7c3aed",
  },
  input: {
    padding: "12px 16px",
    border: "2px solid #fbcfe8",
    borderRadius: "12px",
    fontSize: "16px",
    outline: "none",
    backgroundColor: "#fff5fb",
    color: "#1f2937",
    transition: "all 0.3s ease",
  },
  inputDark: {
    border: "2px solid #d8b4fe",
    backgroundColor: "#f3e8ff",
    color: "#6b21a8",
  },
  submitBtn: {
    width: "100%",
    padding: "14px",
    background: "linear-gradient(135deg, #ec4899 0%, #db2777 100%)",
    color: "white",
    border: "none",
    borderRadius: "12px",
    fontSize: "16px",
    fontWeight: "bold",
    cursor: "pointer",
    transition: "all 0.3s ease",
    textShadow: "0 2px 4px rgba(0, 0, 0, 0.2)",
  },
  loading: {
    textAlign: "center",
    fontSize: "18px",
    color: "#ec4899",
    fontWeight: "bold",
    transition: "all 0.3s ease",
  },
  loadingDark: {
    color: "#7c3aed",
  },
  empty: {
    textAlign: "center",
    fontSize: "18px",
    color: "#db2777",
    fontWeight: "bold",
    transition: "all 0.3s ease",
  },
  emptyDark: {
    color: "#7c3aed",
  },
  tasksList: {
    display: "flex",
    flexDirection: "column",
    gap: "15px",
  },
  taskCard: {
    background: "white",
    padding: "20px",
    borderRadius: "15px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    boxShadow: "0 5px 20px rgba(236, 72, 153, 0.1)",
    border: "2px solid #fbcfe8",
    transition: "all 0.3s ease",
  },
  taskCardDark: {
    background: "#faf5ff",
    border: "2px solid #d8b4fe",
    boxShadow: "0 5px 20px rgba(139, 92, 246, 0.15)",
  },
  taskContent: {
    flex: 1,
  },
  taskTitle: {
    fontSize: "18px",
    fontWeight: "bold",
    color: "#ec4899",
    marginBottom: "5px",
    transition: "all 0.3s ease",
  },
  taskTitleDark: {
    color: "#7c3aed",
  },
  taskDesc: {
    fontSize: "14px",
    color: "#9ca3af",
    transition: "all 0.3s ease",
  },
  taskDescDark: {
    color: "#a78bfa",
  },
  taskActions: {
    display: "flex",
    gap: "10px",
  },
  doneBtn: {
    background: "rgba(236, 72, 153, 0.1)",
    color: "#ec4899",
    border: "2px solid #ec4899",
    padding: "8px 14px",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "bold",
    transition: "all 0.3s ease",
  },
  doneBtnDark: {
    background: "rgba(196, 181, 253, 0.2)",
    color: "#7c3aed",
    borderColor: "#c4b5fd",
  },
  notDoneBtn: {
    background: "rgba(59, 130, 246, 0.1)",
    color: "#3b82f6",
    border: "2px solid #3b82f6",
    padding: "8px 14px",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "bold",
    transition: "all 0.3s ease",
  },
  notDoneBtnDark: {
    background: "rgba(99, 102, 241, 0.12)",
    color: "#6366f1",
    borderColor: "#6366f1",
  },
  deleteBtn: {
    background: "#fee2e2",
    color: "#991b1b",
    border: "2px solid #fca5a5",
    padding: "8px 14px",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "bold",
    transition: "all 0.3s ease",
  },
  deleteBtnDark: {
    background: "#fce7f3",
    color: "#be185d",
    borderColor: "#f0abfc",
  },
};