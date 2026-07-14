import Groq from "groq-sdk";

export async function analyzeTask(title, description = "") {
  try {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content:
            "You are a task management assistant. Given a task title and description, respond ONLY with valid JSON in this exact format: { \"priority\": \"low\"|\"medium\"|\"high\", \"subtasks\": [\"step1\", \"step2\"] }. No extra text.",
        },
        {
          role: "user",
          content: `Title: ${title}\nDescription: ${description}`,
        },
      ],
      temperature: 0.3,
    });

    const raw = completion.choices[0].message.content.trim();
    const cleaned = raw.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleaned);

    return {
      priority: ["low", "medium", "high"].includes(parsed.priority)
        ? parsed.priority
        : "medium",
      subtasks: Array.isArray(parsed.subtasks)
        ? parsed.subtasks.map((t) => ({ title: t, completed: false }))
        : [],
    };
  } catch (err) {
    console.error("Groq AI error:", err.message);
    return { priority: "medium", subtasks: [] };
  }
}