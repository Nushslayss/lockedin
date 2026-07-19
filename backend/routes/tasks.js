import express from "express";
import Task from "../models/Task.js";
import { authenticate } from "../middleware.js";
import { analyzeTask } from "../utils/aiAgent.js";

const router = express.Router();

// GET tasks (only for logged-in user, excludes soft-deleted)
router.get("/", authenticate, async (req, res) => {
  try {
    const tasks = await Task.find({ userId: req.userId, status: { $ne: "deleted" } }).sort({ createdAt: -1 });
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET soft-deleted tasks
// NOTE: this used to be nested (and unreachable) inside the POST "/" handler — moved out here.
router.get("/deleted", authenticate, async (req, res) => {
  try {
    const tasks = await Task.find({ userId: req.userId, status: "deleted" }).sort({ deletedAt: -1 });
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET tasks grouped by day (Today / Tomorrow / This Week / Later / No Date)
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

// GET tasks grouped by priority (High / Medium / Low)
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

// POST new task — AI auto-assigns priority if not provided.
// IMPORTANT: subtasks are NEVER auto-generated/embedded here anymore.
// They only get attached once the user explicitly confirms them in the UI
// (either through the chat "pick which subtasks" flow, or the manual "+ Add" on a task).
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
      dueDate: dueDate || null,
      priority: finalPriority || "medium",
      subtasks: Array.isArray(subtasks) ? subtasks : [],
      tags: tags || [],
    });
    const savedTask = await task.save();
    res.status(201).json(savedTask);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH update task — also cascades Done/Not-done onto embedded subtasks,
// unless the caller already sent an explicit subtasks array (e.g. from a
// subtask-level edit), in which case we respect that instead.
router.patch("/:id", authenticate, async (req, res) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, userId: req.userId });
    if (!task) return res.status(404).json({ error: "Task not found" });

    Object.assign(task, req.body);

    if (!req.body.subtasks && task.subtasks && task.subtasks.length > 0) {
      if (req.body.status === "done") {
        task.subtasks.forEach((s) => (s.completed = true));
      } else if (req.body.status === "failed") {
        task.subtasks.forEach((s) => (s.completed = false));
      }
    }

    await task.save();
    res.json(task);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE task (hard delete — used by the permanent-delete action on the Deleted page)
router.delete("/:id", authenticate, async (req, res) => {
  try {
    const task = await Task.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    if (!task) return res.status(404).json({ error: "Task not found" });
    res.json({ message: "Task deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;