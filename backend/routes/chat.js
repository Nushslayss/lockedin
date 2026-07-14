import express from "express";
import Groq from "groq-sdk";
import Task from "../models/Task.js";
import { authenticate } from "../middleware.js";

const router = express.Router();

router.post("/", authenticate, async (req, res) => {
  try {
    const { message, history } = req.body;
    if (!message) return res.status(400).json({ error: "Message required" });

    const tasks = await Task.find({ userId: req.userId }).sort({ createdAt: -1 });
    const taskSummary = tasks.map((t) => ({
      id: t._id.toString(),
      title: t.title,
      priority: t.priority,
      dueDate: t.dueDate,
      status: t.status,
    }));

    const today = new Date().toISOString().split("T")[0];
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    const systemPrompt = `You are lockedin's task assistant — warm, upbeat, a little girly-pop, but efficient and decisive.
Today's date is ${today} (YYYY-MM-DD). Use this to work out relative dates like "tomorrow", "Friday", "next week".
The user's current tasks (JSON): ${JSON.stringify(taskSummary)}.

Respond ONLY with valid JSON, no extra text, in this exact shape:
{
  "reply": "short friendly response to show the user",
  "action": "create" | "delete" | "split" | "complete" | "none",
  "taskId": "id of the task if action is delete, split, or complete",
  "taskTitle": "title text if action is create",
  "priority": "low" | "medium" | "high",
  "dueDate": "YYYY-MM-DD or null",
  "subtasks": ["step1","step2"]
}

Rules for creating a task:
- You need THREE things before using action "create": a title, a priority, and a due date answer (a date, or explicit "no due date").
- If the user names a task but hasn't given priority yet, use action "none" and ask exactly: what priority is this — low, medium, or high? Do not create yet.
- If priority is known but due date isn't, use action "none" and ask when it's due (or if there's no due date). Do not create yet.
- Once you have all three (using the conversation history to check what's already answered), use action "create" immediately in that same turn.
- Ask only ONE missing piece per turn. Never repeat a question already answered earlier in the conversation.

Other actions:
- "delete": match the closest title in the task list and return its id.
- "split": return the task's id and a subtasks array of clear steps.
- "complete": return the task's id.
- "none": greetings, small talk, or still gathering info for a create.`;

    const historyMessages = Array.isArray(history)
      ? history
          .filter((m) => m.role === "user" || m.role === "assistant")
          .map((m) => ({ role: m.role, content: m.text }))
      : [];

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
        ...historyMessages,
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
      const task = new Task({
        userId: req.userId,
        title: parsed.taskTitle,
        priority: ["low", "medium", "high"].includes(parsed.priority) ? parsed.priority : "medium",
        dueDate: parsed.dueDate && parsed.dueDate !== "null" ? parsed.dueDate : null,
      });
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
        task.status = "done";
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