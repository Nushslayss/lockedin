import express from "express";
import Groq from "groq-sdk";
import Task from "../models/Task.js";
import { authenticate } from "../middleware.js";

const router = express.Router();

router.post("/", authenticate, async (req, res) => {
  try {
    const { message, history } = req.body;
    if (!message) return res.status(400).json({ error: "Message required" });

    const tasks = await Task.find({ userId: req.userId, status: { $ne: "deleted" } }).sort({ createdAt: -1 });
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

CRITICAL OUTPUT RULE: You must respond with EXACTLY ONE JSON object, and nothing else — no extra text before or after it, and never more than one JSON object even if the user mentions several tasks in one message. Respond ONLY with valid JSON, no extra text, in this exact shape:
{
  "reply": "your natural, human-sounding message to the user",
  "action": "create" | "delete" | "split" | "complete" | "none",
  "taskId": "id if deleting, splitting, or completing a specific known task",
  "taskTitle": "title if creating a new task",
  "priority": "low" | "medium" | "high" | null,
  "dueDate": "YYYY-MM-DD" | null,
  "subtasks": ["step1","step2","step3"] or null,
  "askType": "priority" | "date" | "splitChoice" | null,
  "taskOptions": [{"id":"...","title":"...","priority":"...","dueDate":"..."}] or null
}

HANDLING MULTIPLE TASKS IN ONE MESSAGE:
- If the user names more than one task/goal in a single message (e.g. "add Study and Play and plan my Wedding"), do NOT try to create or ask about all of them at once, and do NOT output multiple JSON objects.
- Instead, handle ONLY the first one in this turn (ask its priority, or continue its flow), and in "reply" briefly acknowledge the others by name and say you'll get to them right after this one. Still output exactly one JSON object.

HOW TO TALK:
- Sound like a real person having a conversation, not a form. Vary your phrasing naturally, react to what they actually said, ask follow-ups when genuinely curious. Warm and a little upbeat, but never robotic or repetitive.
- If the message isn't about tasks (a question, chat, translation, advice, general knowledge), just respond naturally and helpfully. action:"none", askType:null, taskOptions:null, subtasks:null.

CHECKING IF A TASK NEEDS SUBTASKS:
- If the user names a task that sounds like a big/multi-step goal (e.g. "plan a wedding", "study for exams", "launch a website"), first ask: "Want me to split this into subtasks, or keep it as one task?" Set askType:"splitChoice", action:"none", taskTitle:"<the goal name>".
- If they reply "yes"/"split it up", generate 4-8 concrete subtasks immediately. Set askType:null, action:"none", taskTitle:"<the goal>", and fill subtasks with the array.
  - IMPORTANT: do NOT set action:"create" here, and do NOT ask about priority or due date for the parent task in this turn or any later turn about these subtasks. The app itself creates the task the moment the user picks which subtasks to keep — you have no way of knowing when/if that happens, so never try to create or re-create this task yourself. The user can set priority and due date afterward directly on the task and on each subtask in the app.
  - In "reply", give one short sentence like "Here's a breakdown you can pick from:" and stop there — no follow-up question in this turn.
- If they reply "no"/"keep it one task", continue the normal single-task flow below (ask priority, then date).
- For small single-step tasks (e.g. "call mom"), skip this question — go straight to asking priority.

CREATING A SINGLE TASK (no subtasks):
- When the user names something they want to do as one single task, first ask for priority conversationally. Set askType:"priority". action:"none".
- Once priority is known, ask for the due date. Set askType:"date". action:"none".
- Parse whatever date format they type (relative or exact) into dueDate yourself.
- If they say "you decide", pick a sensible date based on priority.
- Once both priority and a due date decision are known (from this message or earlier in history), use action:"create" immediately in that same turn, with no subtasks. Never ask again or repeat a question already answered.
- Never combine action:"create" with an askType in the same response — either you are still asking something (action:"none"), or you are done and creating (action:"create", askType:null). Never both at once.

DELETING OR COMPLETING:
- If the task is clearly named or obviously implied, act directly using its taskId.
- If it's unclear which task they mean, set action:"none", askType:null, and taskOptions to the current task list so they can pick visually. Don't guess.

BREAKING DOWN A GOAL INTO SUBTASKS (standalone breakdown request, not tied to creating a task):
- If the user asks to break down, split up, or "give me a list" for any goal — whether it's an existing task or a brand new idea like "plan a wedding" — do NOT ask which part to start with. Generate the full list immediately in the SAME turn.
- Set action:"none", askType:null. Put the subtasks in "subtasks" as an array of 4-8 concrete, specific, doable steps (not generic filler) for that exact goal.
- In "reply", give one short sentence like "Here's a breakdown you can pick from:" — do NOT ask a follow-up question in the same turn, and do NOT list the steps again inside "reply" itself since the UI will display them separately.
- If the user previously got a clarifying question from you and then says something like "just give me the list" or "give me lists", treat that as a clear instruction to generate the full list immediately — never ask again.
- These proposed subtasks are NOT saved automatically. The user will pick which ones to keep in the app UI, and the app creates the task at that point — never action:"create" for this case.

GENERAL RULE: never ask more than one question per turn, never repeat something already answered earlier in the conversation, and never output more than one JSON object no matter how many tasks the user mentions. Never set action:"create" in the same turn as generating a "subtasks" array — those are two different, mutually exclusive user actions (one is you finishing a normal single task, the other is the app finishing a subtask-picker task).`;

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

    // Parse defensively: the model should return exactly one JSON object, but if
    // it ever slips and returns multiple back-to-back objects (e.g. the user named
    // several tasks at once), grab just the FIRST valid one instead of leaking raw
    // JSON text into the chat bubble.
    let parsed = safeParseFirstJsonObject(cleaned);
    if (!parsed) {
      return res.json({
        reply: "Let's take these one at a time — which one do you want to start with?",
        tasksChanged: false,
      });
    }

    let tasksChanged = false;
    let createdTaskId = null;
    let subtaskProposal = null;

    if (parsed.action === "create" && parsed.taskTitle) {
      const task = new Task({
        userId: req.userId,
        title: parsed.taskTitle,
        priority: ["low", "medium", "high"].includes(parsed.priority) ? parsed.priority : "medium",
        dueDate: parsed.dueDate || null,
        subtasks: [],
      });
      await task.save();
      tasksChanged = true;
      createdTaskId = task._id.toString();
    }

    if (parsed.action === "delete" && parsed.taskId) {
      await Task.findOneAndUpdate(
        { _id: parsed.taskId, userId: req.userId },
        { status: "deleted", deletedAt: new Date() }
      );
      tasksChanged = true;
    }

    if (parsed.action === "complete" && parsed.taskId) {
      const task = await Task.findOne({ _id: parsed.taskId, userId: req.userId });
      if (task) {
        task.status = "done";
        task.completed = true;
        if (task.subtasks && task.subtasks.length > 0) {
          task.subtasks.forEach((s) => (s.completed = true));
        }
        await task.save();
        tasksChanged = true;
      }
    }

    if (Array.isArray(parsed.subtasks) && parsed.subtasks.length > 0) {
      subtaskProposal = {
        taskId: createdTaskId || parsed.taskId || null,
        taskTitle: parsed.taskTitle || null,
        subtasks: parsed.subtasks,
      };
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

// Extracts and parses just the FIRST complete top-level JSON object found in a
// string, by tracking brace depth (ignoring braces inside quoted strings).
// Returns null if no valid JSON object is found.
function safeParseFirstJsonObject(text) {
  const start = text.indexOf("{");
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escapeNext = false;

  for (let i = start; i < text.length; i++) {
    const ch = text[i];

    if (escapeNext) {
      escapeNext = false;
      continue;
    }
    if (ch === "\\") {
      escapeNext = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;

    if (ch === "{") depth++;
    if (ch === "}") {
      depth--;
      if (depth === 0) {
        const candidate = text.slice(start, i + 1);
        try {
          return JSON.parse(candidate);
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

export default router;