// lib/chat/ai.js
import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

// MODOS: "polish" (pulir), "generate" (responder libre), "rewrite" (parafrasear)
const MODE = process.env.AI_MODE || "polish";

export async function aiPolish({ draft, intent, question, context }) {
  // Seguridad: si no hay clave o draft, regreso el draft tal cual
  if (!process.env.OPENAI_API_KEY || !draft) return draft;

  const system = [
    "You are Sunsets Rooftop Bar's assistant (Brisbane).",
    "Be friendly, concise, and practical.",
    "Never invent firm facts like prices/hours if not given in context; ask briefly instead.",
    "Keep formatting simple (short bullets ok)."
  ].join(" ");

  // Prompt depende del modo
  const userPrompt =
    MODE === "generate"
      ? `User asked: "${question}". Use this context:\n${context}\n\nRespond naturally and helpfully.`
      : MODE === "rewrite"
      ? `Rewrite the draft to be more natural and brief.\nDraft:\n${draft}\n\nContext:\n${context}`
      : // polish (default) → respeta el draft, mejora tono/fluidez, no cambies el contenido factual
        `Polish this draft to sound more natural and friendly without changing the facts.\nDraft:\n${draft}\n\nContext:\n${context}`;

  const { choices } = await client.chat.completions.create({
    model: MODEL,
    temperature: MODE === "generate" ? 0.5 : 0.2,
    messages: [
      { role: "system", content: system },
      { role: "user", content: userPrompt }
    ]
  });

  const text = choices?.[0]?.message?.content?.trim();
  return text || draft;
}
