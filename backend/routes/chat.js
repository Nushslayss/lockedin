import express from "express";
import Groq from "groq-sdk";
import Task from "../models/Task.js";
import { authenticate } from "../middleware.js";

const router = express.Router();

router.post("/", authenticate, async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: "Message required" });

    const tasks = await Task.find({ userId: req.userId }).sort({ createdAt: -1 });
    const taskSummary = tasks.map((t) => ({
      id: t._id.toString(),
      title: t.title,
      priority: t.priority,
      completed: t.completed,
    }));

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: `You are lockedin's task assistant — warm, upbeat, a little girly-pop, but efficient.
The user's current tasks (JSON): ${JSON.stringify(taskSummary)}.
Respond ONLY with valid JSON, no extra text, in this exact shape:
{
  "reply": "short friendly response to show the user",
  "action": "create" | "delete" | "split" | "complete" | "none",
  "taskId": "id of the task if action is delete, split, or complete (must match an id from the list above)",
  "taskTitle": "title text if action is create",
  "subtasks": ["step1","step2"] (only if action is split)
}
Rules:
- Use "create" when the user wants to add a new task — pick a clear taskTitle from their message.
- Use "delete" when the user wants to remove a task — match it to the closest title in their task list and return its id.
- Use "split" when the user wants a task broken into steps — return the task's id and a subtasks array.
- Use "complete" when the user wants to mark a task done — return its id.
- Use "none" for greetings, questions, or general chat — just reply, no task list changes.
- If you can't confidently match a task the user is referring to, use action "none" and ask them to clarify in "reply".`,
        },
        { role: "user", content: message },
      ],
      temperature: 0.4,
    });

    const raw = completion.choices[0].message.content.trim();
    const cleaned = raw.replace(/```json|```/g, "").trim();
    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      return res.json({ reply: raw, tasksChanged: false });
    }

    let tasksChanged = false;

    if (parsed.action === "create" && parsed.taskTitle) {
      const task = new Task({ userId: req.userId, title: parsed.taskTitle, priority: "medium" });
      await task.save();
      tasksChanged = true;
    }

    if (parsed.action === "delete" && parsed.taskId) {
      await Task.findOneAndDelete({ _id: parsed.taskId, userId: req.userId });
      tasksChanged = true;
    }

    if (parsed.action === "split" && parsed.taskId && Array.isArray(parsed.subtasks)) {
      const task = await Task.findOne({ _id: parsed.taskId, userId: req.userId });
      if (task) {
        task.subtasks = parsed.subtasks.map((t) => ({ title: t, completed: false }));
        await task.save();
        tasksChanged = true;
      }
    }

    if (parsed.action === "complete" && parsed.taskId) {
      const task = await Task.findOne({ _id: parsed.taskId, userId: req.userId });
      if (task) {
        task.completed = true;
        await task.save();
        tasksChanged = true;
      }
    }

    res.json({ reply: parsed.reply || "Done!", tasksChanged });
  } catch (err) {
    console.error("Chat error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;