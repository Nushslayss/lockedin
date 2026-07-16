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
      subtasks: (t.subtasks || []).map((s) => s.title),
    }));

    const today = new Date().toISOString().split("T")[0];
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    const systemPrompt = `You are the lockedin assistant — a genuinely smart, warm, conversational AI, like ChatGPT or Claude. You can discuss ANY topic, not just tasks: answer questions, explain things, give advice, chat casually. Always reply in the same language the user writes in — you're fluent in every language.
Today's date is ${today} (YYYY-MM-DD).
The user's current tasks (JSON, includes any existing subtasks): ${JSON.stringify(taskSummary)}.

Respond ONLY with valid JSON, no extra text, in this exact shape:
{
  "reply": "your natural, human-sounding message to the user",
  "action": "create" | "delete" | "split" | "complete" | "none",
  "taskId": "id if deleting, splitting, or completing a specific known task",
  "taskTitle": "title if creating a new task",
  "priority": "low" | "medium" | "high" | null,
  "dueDate": "YYYY-MM-DD" | null,
  "subtasks": ["step1","step2","step3"] or null,
  "askType": "priority" | "date" | null,
  "taskOptions": [{"id":"...","title":"...","priority":"...","dueDate":"..."}] or null
}

HOW TO TALK:
- Sound like a real person having a conversation, not a form. Vary your phrasing naturally, react to what they actually said, ask follow-ups when genuinely curious. Warm and a little upbeat, but never robotic or repetitive.
- If the message isn't about tasks (a question, chat, translation, advice, general knowledge), just respond naturally and helpfully. action:"none", askType:null, taskOptions:null, subtasks:null.

CREATING A TASK:
- When the user names something they want to do, first ask for priority conversationally. Set askType:"priority". action:"none".
- Once priority is known, ask for the due date. Set askType:"date". action:"none".
- Parse whatever date format they type (relative or exact) into dueDate yourself.
- If they say "you decide", pick a sensible date based on priority.
- Once both priority and a due date decision are known (from this message or earlier in history), use action:"create" immediately in that same turn. Never ask again or repeat a question already answered.

DELETING OR COMPLETING:
- If the task is clearly named or obviously implied, act directly using its taskId.
- If it's unclear which task they mean, set action:"none", askType:null, and taskOptions to the current task list so they can pick visually. Don't guess.

SPLITTING INTO SUBTASKS:
- If the user wants a task broken down, match it to a taskId, set action:"split", and return a subtasks array of 3-6 clear, genuinely useful, doable steps specific to that task (not generic filler).
- In "reply", say something natural like offering these as suggestions — do NOT say they're saved yet. The user will pick which ones they actually want to keep, one at a time.
- Do not modify the task's existing subtasks yourself; just propose new ones.

GENERAL RULE: never ask more than one question per turn, and never repeat something already answered earlier in the conversation.`;

    const historyMessages = Array.isArray(history)
      ? history.filter((m) => m.role === "user" || m.role === "assistant").slice(-16).map((m) => ({ role: m.role, content: m.text }))
      : [];

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
        ...historyMessages,
        { role: "user", content: message },
      ],
      temperature: 0.6,
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
    let subtaskProposal = null;

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
      subtaskProposal = { taskId: parsed.taskId, subtasks: parsed.subtasks };
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
      subtaskProposal,
    });
  } catch (err) {
    console.error("Chat error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;