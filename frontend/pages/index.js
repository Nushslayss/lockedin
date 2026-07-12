import { useState, useEffect } from "react";
import { useRouter } from "next/router";

const API_URL = "https://task-manager-production-d03d.up.railway.app";

export default function Home() {
  const [tasks, setTasks] = useState([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/api/tasks`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setTasks(data);
      setError("");
    } catch (err) {
      setError("Could not connect to backend.");
    }
  };

  const addTask = async () => {
    if (!title) return;
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
      if (!res.ok) throw new Error("Failed to add task");
      setTitle("");
      setDescription("");
      fetchTasks();
    } catch (err) {
      setError("Could not connect to backend.");
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    router.push("/login");
  };

  return (
    <div style={{ maxWidth: 600, margin: "40px auto", padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <h1>Task Manager</h1>
        <button onClick={logout}>Logout</button>
      </div>

      {error && <p style={{ color: "red" }}>{error}</p>}

      <input
        placeholder="Task title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        style={{ width: "100%", marginBottom: 8 }}
      />
      <input
        placeholder="Description (optional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        style={{ width: "100%", marginBottom: 8 }}
      />
      <button onClick={addTask}>Add Task</button>

      <div style={{ marginTop: 20 }}>
        {tasks.length === 0 ? (
          <p>No tasks yet. Add one above.</p>
        ) : (
          tasks.map((task) => (
            <div key={task._id}>
              <strong>{task.title}</strong>
              <p>{task.description}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
