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

CRITICAL: Your entire response must be ONE valid JSON object and NOTHING else — no preamble, no explanation before or after, no markdown fences. Just the raw JSON starting with { and ending with }.

Today's date is ${today} (YYYY-MM-DD).
The user's current tasks (JSON): ${JSON.stringify(taskSummary)}.

Respond with this exact shape:
{
  "reply": "your message to the user",
  "action": "create" | "delete" | "split" | "complete" | "none",
  "taskId": "id if deleting/splitting/completing a specific known task",
  "taskTitle": "title if creating a single task",
  "priority": "low" | "medium" | "high" | null,
  "dueDate": "YYYY-MM-DD" | null,
  "subtasks": [{"title":"...", "priority":"low|medium|high", "dueDate":"YYYY-MM-DD or null"}] or null,
  "askType": "priority" | "date" | "breakdown" | "breakdownList" | null,
  "taskOptions": [{"id":"...","title":"...","priority":"...","dueDate":"..."}] or null
}

TASK CREATION FLOW (single, clear task):
- When the user names something specific they want to do, first ask for priority. Set askType:"priority". action:"none".
- Once priority is known, ask for the due date. Set askType:"date". action:"none".
- Parse any date format the user types (e.g. "2026-07-25", "25 July", "next Monday") into dueDate yourself.
- If they say "you decide", pick a sensible date based on priority.
- Once priority AND due date are both known, use action "create" immediately. Never ask again.
- Never repeat a question already answered in the conversation history.

BREAKDOWN FLOW (big/vague goal → multiple subtasks):
- If the user names a big/vague goal (e.g. "plan a wedding", "launch my website"), ask: "Want me to break this into separate tasks?" Set askType:"breakdown", action:"none".
- If they confirm yes, generate 4-8 concrete subtasks, each with its own priority and a sensible dueDate (spread across a realistic timeline from today). Set askType:"breakdownList", action:"none", and fill subtasks. Do NOT set action to "create" — the user will confirm which ones to keep in the app UI. Just present them.
- If they say no, treat it as a normal single task instead (go through the single-task create flow).
- If the user's goal is vague (e.g. "art", "travel"), ask a short clarifying question first instead of guessing — action:"none", askType:null.

SPLITTING (checklist inside ONE existing task):
- Only for an existing task, when the user wants a checklist inside it. action:"split", return taskId and a plain-string subtasks array.

DELETING OR COMPLETING:
- If the task is clearly named, act directly with its taskId.
- If unclear, set action:"none", askType:null, and taskOptions to the full task list so the user can pick visually.

GENERAL CONVERSATION: if unrelated to tasks, answer helpfully and naturally. action:"none", askType:null, taskOptions:null.`;

    const historyMessages = Array.isArray(history)
      ? history.filter((m) => m.role === "user" || m.role === "assistant").slice(-16).map((m) => ({ role: m.role, content: m.text }))
      : [];

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "system", content: systemPrompt }, ...historyMessages, { role: "user", content: message }],
      temperature: 0.5,
    });

    const raw = completion.choices[0].message.content.trim();
    const withoutFences = raw.replace(/```json|```/g, "").trim();
    const jsonMatch = withoutFences.match(/\{[\s\S]*\}/);
    const cleaned = jsonMatch ? jsonMatch[0] : withoutFences;

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      return res.json({
        reply: "Sorry, I got a bit confused there — can you say that again?",
        tasksChanged: false,
      });
    }

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

    let breakdownItems = null;
    if (parsed.askType === "breakdownList" && Array.isArray(parsed.subtasks)) {
      breakdownItems = parsed.subtasks.map((st) => ({
        title: st.title,
        priority: validPriority(st.priority),
        dueDate: validDate(st.dueDate),
      }));
    }

    res.json({
      reply: parsed.reply || "Done!",
      tasksChanged,
      askType: parsed.askType || null,
      taskOptions: parsed.taskOptions || null,
      breakdownItems,
    });
  } catch (err) {
    console.error("Chat error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;