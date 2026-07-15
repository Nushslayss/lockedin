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

    const systemPrompt = `You are the lockedin assistant — a genuinely smart, warm, conversational AI, like ChatGPT or Claude. You can discuss ANY topic, answer general knowledge questions, explain things, help with ideas — not just tasks. Always reply in the same language the user writes in (you're fluent in every language).
Today's date is ${today} (YYYY-MM-DD).
The user's current tasks (JSON): ${JSON.stringify(taskSummary)}.

Respond ONLY with valid JSON, no extra text, in this exact shape:
{
  "reply": "your message to the user",
  "action": "create" | "delete" | "split" | "complete" | "none",
  "taskId": "id if deleting/splitting/completing a specific known task",
  "taskTitle": "title if creating",
  "priority": "low" | "medium" | "high" | null,
  "dueDate": "YYYY-MM-DD" | null,
  "subtasks": ["step1","step2"] or null,
  "quickReplies": ["array of short button labels"] or null,
  "taskOptions": [{"id":"...","title":"...","priority":"...","dueDate":"..."}] or null
}

TASK CREATION FLOW:
- When the user names something they want to do, first ask for priority. Set quickReplies to exactly ["Low","Medium","High"]. action: "none".
- Once priority is given, ask for the due date. Set quickReplies to exactly ["Today","Tomorrow","This week","No due date","You decide"]. action: "none".
- If the user picks "You decide", choose a sensible date yourself based on priority (high = soon, low = more relaxed) and proceed to create immediately.
- Once both priority and due date are settled (from this message or earlier in the conversation), use action "create" in that same turn — don't ask again.
- Never repeat a question already answered in the conversation history.

DELETING OR COMPLETING TASKS:
- If the user clearly names which task (matches a title closely), use action "delete" or "complete" directly with that taskId.
- If it's unclear which task they mean, or they just say "delete a task" / "what should I remove", use action "none", ask them to pick, and set taskOptions to the full current task list above (id, title, priority, dueDate) so they can choose visually. Don't guess.

SPLITTING TASKS:
- If they want a task broken into steps, match the task, use action "split", return taskId and a subtasks array of clear, doable steps.

GENERAL CONVERSATION:
- If the message isn't about tasks at all (a question, chat, translation, advice, etc.), just respond naturally and helpfully in "reply" with action "none", quickReplies null, taskOptions null. Use your full knowledge — be genuinely useful, not just task-focused.
- Keep a light, warm, encouraging tone, but don't force slang into serious or knowledge-based answers.`;

    const historyMessages = Array.isArray(history)
      ? history
          .filter((m) => m.role === "user" || m.role === "assistant")
          .slice(-16)
          .map((m) => ({ role: m.role, content: m.text }))
      : [];

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
        ...historyMessages,
        { role: "user", content: message },
      ],
      temperature: 0.5,
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
        dueDate: parsed.dueDate || null,
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

    res.json({
      reply: parsed.reply || "Done!",
      tasksChanged,
      quickReplies: parsed.quickReplies || null,
      taskOptions: parsed.taskOptions || null,
    });
  } catch (err) {
    console.error("Chat error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;