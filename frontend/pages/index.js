import { useState, useEffect } from "react";
import { useRouter } from "next/router";

const API_URL = "/api/tasks";

export default function Home() {
  const [tasks, setTasks] = useState([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [token, setToken] = useState("");
  const router = useRouter();

  useEffect(() => {
    const savedToken = localStorage.getItem("token");
    if (!savedToken) {
      router.push("/login");
    } else {
      setToken(savedToken);
      fetchTasks(savedToken);
    }
  }, []);

  const fetchTasks = async (authToken) => {
    try {
      setLoading(true);
      const res = await fetch(API_URL, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
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
      const res = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title, description }),
      });
      const newTask = await res.json();
      setTasks([newTask, ...tasks]);
      setTitle("");
      setDescription("");
    } catch (err) {
      setError("Failed to add task.");
    }
  };

  const toggleComplete = async (id, completed) => {
    try {
      const res = await fetch(`${API_URL}/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ completed: !completed }),
      });
      const updatedTask = await res.json();
      setTasks(tasks.map((t) => (t._id === id ? updatedTask : t)));
    } catch (err) {
      setError("Failed to update task.");
    }
  };

  const deleteTask = async (id) => {
    try {
      await fetch(`${API_URL}/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      setTasks(tasks.filter((t) => t._id !== id));
    } catch (err) {
      setError("Failed to delete task.");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Task Manager</h1>
          <button
            onClick={handleLogout}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            Logout
          </button>
        </div>

        {error && (
          <div className="bg-red-100 text-red-700 px-4 py-2 rounded mb-4 text-sm">
            {error}
          </div>
        )}

        <form
          onSubmit={handleAddTask}
          className="bg-white shadow rounded-lg p-4 mb-6 space-y-3"
        >
          <input
            type="text"
            placeholder="Task title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <input
            type="text"
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded transition"
          >
            Add Task
          </button>
        </form>

        {loading ? (
          <p className="text-gray-500">Loading tasks...</p>
        ) : tasks.length === 0 ? (
          <p className="text-gray-500">No tasks yet. Add one above.</p>
        ) : (
          <ul className="space-y-3">
            {tasks.map((task) => (
              <li
                key={task._id}
                className="bg-white shadow rounded-lg p-4 flex justify-between items-start"
              >
                <div>
                  <h3
                    className={`font-semibold ${
                      task.completed ? "line-through text-gray-400" : "text-gray-800"
                    }`}
                  >
                    {task.title}
                  </h3>
                  {task.description && (
                    <p className="text-gray-500 text-sm">{task.description}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => toggleComplete(task._id, task.completed)}
                    className="text-sm bg-green-100 text-green-700 px-3 py-1 rounded hover:bg-green-200"
                  >
                    {task.completed ? "Undo" : "Done"}
                  </button>
                  <button
                    onClick={() => deleteTask(task._id)}
                    className="text-sm bg-red-100 text-red-700 px-3 py-1 rounded hover:bg-red-200"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}