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
      id: t._id.toString(), title: t.title, priority: t.priority, dueDate: t.dueDate, status: t.status,
    }));

    const today = new Date().toISOString().split("T")[0];
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    const systemPrompt = `You are the lockedin assistant — a genuinely smart, warm, conversational AI, like ChatGPT or Claude. You can discuss ANY topic, not just tasks. Always reply in the same language the user writes in.
Today's date is ${today} (YYYY-MM-DD).
The user's current tasks (JSON): ${JSON.stringify(taskSummary)}.

Respond ONLY with valid JSON, no extra text, in this exact shape:
{
  "reply": "your message to the user",
  "action": "create" | "delete" | "split" | "complete" | "breakdown" | "none",
  "taskId": "id if deleting/splitting/completing a specific known task",
  "taskTitle": "title if creating a single task",
  "priority": "low" | "medium" | "high" | null,
  "dueDate": "YYYY-MM-DD" | null,
  "subtasks": [{"title":"...", "priority":"low|medium|high", "dueDate":"YYYY-MM-DD or null"}] or null,
  "breakdownTitle": "the big/vague goal name, if action is breakdown",
  "askType": "priority" | "date" | "breakdown" | null,
  "taskOptions": [{"id":"...","title":"...","priority":"...","dueDate":"..."}] or null
}

TASK CREATION FLOW (single, clear task):
- When the user names something specific they want to do, first ask for priority. Set askType:"priority". action:"none".
- Once priority is known, ask for the due date. Set askType:"date". action:"none".
- The user might click a quick option OR type an exact date directly (e.g. "2026-07-25", "25 July", "next Monday") — always parse whatever they typed into dueDate yourself.
- If they say "you decide", pick a sensible date based on priority (high = soon, low = relaxed).
- Once priority AND a due date decision are both known (from this message or earlier in history), use action "create" immediately in that same turn. Never ask again.
- Never repeat a question already answered in the conversation history.

BREAKDOWN FLOW (big/vague goal that should become MULTIPLE separate tasks):
- If the user names a big or vague goal (e.g. "plan a wedding", "launch my website", "move apartments"), ask: "Want me to break this into separate tasks?" Set askType:"breakdown", action:"none", breakdownTitle set to the goal.
- If the user confirms yes, generate 4-8 concrete, actionable subtasks. Each needs its own sensible priority and dueDate (spread across a reasonable timeline based on today's date). Respond with action:"breakdown" and fill the subtasks array. Do not ask again.
- If the user says no, just create it as ONE single task instead (go through the normal single-task create flow using breakdownTitle as taskTitle).
- Never confuse this with "split" (below) — breakdown creates NEW independent tasks in the list; split adds sub-checklist items INSIDE one existing task.

SPLITTING (checklist inside ONE existing task):
- Only use this when the user asks to split/break down a task that ALREADY exists in their list (match by name/taskId), and they want a checklist within it, not new list items.
- action:"split", return taskId and a subtasks array of plain strings.

DELETING OR COMPLETING:
- If the task is clearly named, act directly with its taskId.
- If unclear, set action:"none", askType:null, and taskOptions to the full task list so the user can pick visually.

GENERAL CONVERSATION: if unrelated to tasks, just answer helpfully and naturally. action:"none", askType:null, taskOptions:null.`;

    const historyMessages = Array.isArray(history)
      ? history.filter((m) => m.role === "user" || m.role === "assistant").slice(-16).map((m) => ({ role: m.role, content: m.text }))
      : [];

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "system", content: systemPrompt }, ...historyMessages, { role: "user", content: message }],
      temperature: 0.5,
    });

    const raw = completion.choices[0].message.content.trim();
    const cleaned = raw.replace(/```json|```/g, "").trim();
    let parsed;
    try { parsed = JSON.parse(cleaned); }
    catch { return res.json({ reply: raw, tasksChanged: false }); }

    let tasksChanged = false;

    const validPriority = (p) => (["low", "medium", "high"].includes(p) ? p : "medium");
    const validDate = (d) => {
      if (!d) return null;
      const parsedDate = new Date(d);
      return isNaN(parsedDate.getTime()) ? null : d;
    };

    if (parsed.action === "create" && parsed.taskTitle) {
      const task = new Task({
        userId: req.userId,
        title: parsed.taskTitle,
        priority: validPriority(parsed.priority),
        dueDate: validDate(parsed.dueDate),
      });
      await task.save();
      tasksChanged = true;
    }

    if (parsed.action === "breakdown" && Array.isArray(parsed.subtasks) && parsed.subtasks.length) {
      await Promise.all(
        parsed.subtasks.map((st) => {
          const t = new Task({
            userId: req.userId,
            title: st.title,
            priority: validPriority(st.priority),
            dueDate: validDate(st.dueDate),
          });
          return t.save();
        })
      );
      tasksChanged = true;
    }

    if (parsed.action === "delete" && parsed.taskId) {
      await Task.findOneAndDelete({ _id: parsed.taskId, userId: req.userId });
      tasksChanged = true;
    }

    if (parsed.action === "split" && parsed.taskId && Array.isArray(parsed.subtasks)) {
      const task = await Task.findOne({ _id: parsed.taskId, userId: req.userId });
      if (task) {
        task.subtasks = parsed.subtasks.map((t) => ({
          title: typeof t === "string" ? t : t.title,
          completed: false,
        }));
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
      askType: parsed.askType || null,
      taskOptions: parsed.taskOptions || null,
    });
  } catch (err) {
    console.error("Chat error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;