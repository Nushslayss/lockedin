import express from "express";
import Task from "../models/Task.js";
import { authenticate } from "../middleware.js";
import { analyzeTask } from "../utils/aiAgent.js";

const router = express.Router();

function sanitizeSubtasks(subtasks) {
  if (!Array.isArray(subtasks)) return subtasks;
  return subtasks.map((s) => ({
    ...s,
    dueDate: s.dueDate === "" ? null : s.dueDate,
  }));
}

router.get("/", authenticate, async (req, res) => {
  try {
    const tasks = await Task.find({ userId: req.userId, status: { $ne: "deleted" } }).sort({ createdAt: -1 });
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/deleted", authenticate, async (req, res) => {
  try {
    const tasks = await Task.find({ userId: req.userId, status: "deleted" }).sort({ deletedAt: -1 });
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/grouped-by-day", authenticate, async (req, res) => {
  try {
    const tasks = await Task.find({ userId: req.userId, status: { $ne: "deleted" } }).sort({ dueDate: 1 });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const weekEnd = new Date(today);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const groups = { today: [], tomorrow: [], thisWeek: [], later: [], noDate: [] };

    tasks.forEach((task) => {
      if (!task.dueDate) {
        groups.noDate.push(task);
        return;
      }
      const due = new Date(task.dueDate);
      due.setHours(0, 0, 0, 0);

      if (due.getTime() === today.getTime()) groups.today.push(task);
      else if (due.getTime() === tomorrow.getTime()) groups.tomorrow.push(task);
      else if (due > tomorrow && due <= weekEnd) groups.thisWeek.push(task);
      else groups.later.push(task);
    });

    res.json(groups);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/by-priority", authenticate, async (req, res) => {
  try {
    const tasks = await Task.find({ userId: req.userId, status: { $ne: "deleted" } }).sort({ dueDate: 1 });
    const groups = { high: [], medium: [], low: [] };
    tasks.forEach((task) => groups[task.priority || "medium"].push(task));
    res.json(groups);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", authenticate, async (req, res) => {
  try {
    const { title, description, dueDate, priority, subtasks, tags } = req.body;
    if (!title) return res.status(400).json({ error: "Title required" });

    let finalPriority = priority;

    if (!priority) {
      const aiResult = await analyzeTask(title, description || "");
      finalPriority = aiResult.priority;
    }

    const task = new Task({
      userId: req.userId,
      title,
      description,
      dueDate: dueDate === "" ? null : dueDate || null,
      priority: finalPriority || "medium",
      subtasks: sanitizeSubtasks(Array.isArray(subtasks) ? subtasks : []),
      tags: tags || [],
    });
    const savedTask = await task.save();
    res.status(201).json(savedTask);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch("/:id", authenticate, async (req, res) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, userId: req.userId });
    if (!task) return res.status(404).json({ error: "Task not found" });

    const body = { ...req.body };
    if (body.dueDate === "") body.dueDate = null;
    if (Array.isArray(body.subtasks)) body.subtasks = sanitizeSubtasks(body.subtasks);

    Object.assign(task, body);

    if (!body.subtasks && task.subtasks && task.subtasks.length > 0) {
      if (body.status === "done") {
        task.subtasks.forEach((s) => (s.completed = true));
      } else if (body.status === "failed") {
        task.subtasks.forEach((s) => (s.completed = false));
      }
    }

    await task.save();
    res.json(task);
  } catch (err) {
    console.error("PATCH /tasks/:id error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

router.delete("/:id", authenticate, async (req, res) => {
  try {
    const task = await Task.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { status: "deleted", deletedAt: new Date() },
      { new: true }
    );
    if (!task) return res.status(404).json({ error: "Task not found" });
    res.json({ message: "Task moved to deleted", task });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/:id/permanent", authenticate, async (req, res) => {
  try {
    const task = await Task.findOneAndDelete({ _id: req.params.id, userId: req.userId, status: "deleted" });
    if (!task) return res.status(404).json({ error: "Task not found" });
    res.json({ message: "Task permanently deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;