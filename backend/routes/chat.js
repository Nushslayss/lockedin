import express from "express";
import Groq from "groq-sdk";
import Task from "../models/Task.js";
import { authenticate } from "../middleware.js";

const router = express.Router();

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

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
  "taskOptions": [{"id":"...","title":"...","priority":"...","dueDate":"..."}] or null,
  "showTaskId": "id of an existing task to display, or null"
}

HANDLING MULTIPLE TASKS IN ONE MESSAGE:
- The ONLY time you are allowed to say anything like "let's take these one at a time" or "I'll get to X after this" is when the user's CURRENT message literally names 2 or more distinct new tasks/goals that don't exist yet (e.g. "add Study and Play and plan my Wedding" — three new names in one message).
- If the current message names only ONE task (even if earlier messages mentioned others, even if the task sounds big or vague), you must NOT say "let's take these one at a time," "which one do you want to start with," or anything similar. There is nothing to sequence — just continue that one task's flow normally (see CREATING A TASK below).
- When you do use the multi-task acknowledgment, say it ONCE, only in that exact turn — never repeat it again in any later turn, and never bring up those other names again unless the user brings them up themselves.
- Also check the current tasks list above: if a task the user mentioned already exists there, it's already handled — never say you'll "get to it," never re-acknowledge it, and never ask "which one do you want to start with" about it.

HOW TO TALK:
- Sound like a real person having a conversation, not a form. Vary your phrasing naturally, react to what they actually said, ask follow-ups when genuinely curious. Warm and a little upbeat, but never robotic or repetitive.
- Stay focused on exactly what the CURRENT message is about. Don't volunteer information about other tasks, past tasks, or things "coming up next" unless the user's current message is actually asking about them.
- If the message isn't about tasks (a question, chat, translation, advice, general knowledge), just respond naturally and helpfully. action:"none", askType:null, taskOptions:null, subtasks:null, showTaskId:null.

CREATING A TASK — THIS ORDER IS MANDATORY, NEVER SKIP OR REORDER IT:
STEP -1: If the user says they want to add/create a task but has NOT actually named what the task is (e.g. "I want to add a task", "create a task for me", "add something to my list"), do NOT invent a title and do NOT ask about priority yet. Just ask conversationally what the task is called. Set action:"none", askType:null, taskTitle:null, priority:null, dueDate:null. Once they name it in a later message, continue from STEP 0 below.
STEP 0 (HARD RULE): Once the task's name/title is known — whether given upfront or just answered — you go STRAIGHT into step 1 below in that same turn. Never respond with a generic stalling question like "which one do you want to start with" once you already have a single, clear task name. Also, you are NEVER allowed to set askType:"splitChoice" until BOTH priority AND a due date decision are already known for this task from earlier in the conversation. It does not matter how obviously multi-step the task sounds ("study", "plan a wedding", etc) — priority and date always come first, no exceptions. If you are unsure whether they're known yet, they are NOT known — ask priority.
1. If priority is not yet known for this task, ask for it conversationally. Set askType:"priority", action:"none". Stop here — do not also mention splitting in this turn.
2. Once priority is known but the due date isn't, ask for the due date. Set askType:"date", action:"none". Parse whatever format they use (relative or exact) into dueDate yourself. If they say "you decide", pick a sensible date based on priority. Stop here — do not also mention splitting in this turn.
3. Only once BOTH priority and a due date decision are known:
   - If the task sounds like a big/multi-step goal (e.g. "plan a wedding", "study for exams", "launch a website"), NOW ask: "Want me to split this into subtasks, or keep it as one task?" Set askType:"splitChoice", action:"none", and keep taskTitle/priority/dueDate carried in your JSON.
   - If it's a small single-step task (e.g. "call mom"), skip the split question entirely — go straight to action:"create" with subtasks:null.
4. If the user answers the split question with "yes"/"split it up": generate 4-8 concrete, specific subtasks immediately. Set askType:null, action:"none" (NOT "create"), and include taskTitle, priority, and dueDate (the ones already established in this conversation) alongside the "subtasks" array.
   - Never create the task yourself here — the app creates it, using this exact priority/dueDate, the moment the user picks which subtasks to keep.
   - In "reply", give one short sentence like "Here's a breakdown you can pick from:" and stop there — no follow-up question in this turn, and no mention of other tasks.
   - After the user confirms their subtask picks in the app, the task now EXISTS — do not ask about its priority or date again, and do not issue action:"create" for it again.
5. If the user answers "no"/"keep it one task": use action:"create" immediately with the known priority/dueDate and subtasks:null.
- Never combine action:"create" with an askType in the same response — either you are still asking something (action:"none"), or you are done and creating (action:"create", askType:null). Never both at once.
- Never ask a question that's already been answered earlier in the conversation.
- Before setting action:"create", check the current tasks list above — if a task with the same title (or clearly the same goal) already exists, do NOT create a duplicate. Treat it as already created and move the conversation forward instead.

DELETING OR COMPLETING:
- If the task is clearly named or obviously implied, act directly using its taskId.
- If it's unclear which task they mean, set action:"none", askType:null, and taskOptions to the current task list so they can pick visually. Don't guess.

BREAKING DOWN A GOAL INTO SUBTASKS (standalone breakdown request, not tied to creating a task):
- If the user asks to break down, split up, or "give me a list" for any goal — whether it's an existing task or a brand new idea like "plan a wedding" — and this is NOT part of the ordered creation flow above, do NOT ask which part to start with. Generate the full list immediately in the SAME turn.
- Set action:"none", askType:null, priority:null, dueDate:null (unless already known from earlier in the conversation, in which case include them). Put the subtasks in "subtasks" as an array of 4-8 concrete, specific, doable steps (not generic filler) for that exact goal.
- In "reply", give one short sentence like "Here's a breakdown you can pick from:" — do NOT ask a follow-up question in the same turn, and do NOT list the steps again inside "reply" itself since the UI will display them separately.
- If the user previously got a clarifying question from you and then says something like "just give me the list" or "give me lists", treat that as a clear instruction to generate the full list immediately — never ask again.
- These proposed subtasks are NOT saved automatically. The user will pick which ones to keep in the app UI, and the app creates the task at that point — never action:"create" for this case.

REVIEWING OR EDITING AN EXISTING TASK'S SUBTASKS:
- If the user asks to see, show, give, or review the subtasks of a task they already have (e.g. "give me task of study", "show me my study subtasks", "what's in my wedding list"), find the matching task in the current tasks list above by title and set action:"none", showTaskId:"<its id>", askType:null, subtasks:null, and a short natural reply like "Here's what's on your Study list:".
- Don't repeat the subtasks inside "reply" — the app displays them separately with checkboxes, priority, due date, and delete buttons so the user can edit them right there in the chat.
- If no task matches, or more than one could match, ask which one they mean, or set taskOptions instead. Don't guess.

GENERAL RULE: never ask more than one question per turn, never repeat something already answered earlier in the conversation, never bring up tasks or names the user hasn't asked about in their current message, never say "let's take these one at a time" or "which one do you want to start with" unless the current message names 2+ new tasks at once, and never output more than one JSON object no matter how many tasks the user mentions. Never set action:"create" in the same turn as generating a "subtasks" array.`;

    const historyMessages = Array.isArray(history)
      ? history.filter((m) => m.role === "user" || m.role === "assistant").slice(-16).map((m) => ({ role: m.role, content: m.text }))
      : [];

    const baseMessages = [
      { role: "system", content: systemPrompt },
      ...historyMessages,
      { role: "user", content: message },
    ];

    let parsed;
    try {
      parsed = await getValidJson(groq, baseMessages);
    } catch (err) {
      // Groq daily/rate limit hit — show a clean message instead of crashing
      if (err.status === 429 || (err.message && err.message.includes("rate_limit_exceeded"))) {
        let waitMinutes = null;
        const match = err.message.match(/try again in ([\d.]+)m/);
        if (match) waitMinutes = Math.ceil(parseFloat(match[1]));

        return res.json({
          reply: waitMinutes
            ? `I've hit my AI usage limit for now — it'll reset in about ${waitMinutes} minute${waitMinutes === 1 ? "" : "s"}. Please try again shortly!`
            : "I've hit my AI usage limit for now. Please try again in a little while.",
          tasksChanged: false,
          askType: null,
          taskOptions: null,
          subtaskProposal: null,
          showTaskId: null,
        });
      }
      console.error("Chat error:", err.message);
      return res.status(500).json({ error: err.message });
    }

    if (!parsed) {
      return res.json({
        reply: "Hmm, let me try that again — could you repeat what you just said?",
        tasksChanged: false,
      });
    }

    let tasksChanged = false;
    let createdTaskId = null;
    let subtaskProposal = null;

    if (parsed.action === "create" && parsed.taskTitle) {
      const existing = await Task.findOne({
        userId: req.userId,
        status: { $ne: "deleted" },
        title: { $regex: `^${escapeRegex(parsed.taskTitle.trim())}$`, $options: "i" },
      });

      if (existing) {
        createdTaskId = existing._id.toString();
      } else {
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
        priority: ["low", "medium", "high"].includes(parsed.priority) ? parsed.priority : null,
        dueDate: parsed.dueDate || null,
        subtasks: parsed.subtasks,
      };
    }

    let showTaskId = null;
    if (parsed.showTaskId) {
      const match = await Task.findOne({ _id: parsed.showTaskId, userId: req.userId, status: { $ne: "deleted" } });
      if (match) showTaskId = match._id.toString();
    }

    res.json({
      reply: parsed.reply || "Done!",
      tasksChanged,
      askType: parsed.askType || null,
      taskOptions: parsed.taskOptions || null,
      subtaskProposal,
      showTaskId,
    });
  } catch (err) {
    console.error("Chat error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Calls the model, and if the response isn't valid JSON, retries ONCE with a
// stricter corrective nudge before giving up. NOTE: deliberately NOT using
// response_format:{type:"json_object"} here — that parameter caused the API
// call itself to fail outright on this model, which made things worse.
// If a rate-limit error comes back, it's thrown immediately (no point retrying
// a call that's guaranteed to fail again instantly) so the caller can handle it.
async function getValidJson(groq, baseMessages) {
  for (let attempt = 0; attempt < 2; attempt++) {
    const messages = attempt === 0
      ? baseMessages
      : [
          ...baseMessages,
          {
            role: "system",
            content: "Your previous response was not valid JSON. Respond again with EXACTLY ONE valid JSON object matching the required shape — no explanation, no extra text, no markdown formatting, just the raw JSON object starting with { and ending with }.",
          },
        ];

    try {
      const completion = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages,
        temperature: 0.4,
      });

      const raw = completion.choices[0].message.content.trim();
      const cleaned = raw.replace(/```json|```/g, "").trim();
      const parsed = safeParseFirstJsonObject(cleaned);
      if (parsed) return parsed;
    } catch (err) {
      if (err.status === 429 || (err.message && err.message.includes("rate_limit_exceeded"))) {
        throw err;
      }
      console.error(`getValidJson attempt ${attempt} failed:`, err.message);
    }
  }
  return null;
}

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