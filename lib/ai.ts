// lib/ai.ts
import OpenAI from "openai";

if (!process.env.OPENAI_API_KEY) {
  throw new Error("Falta OPENAI_API_KEY en .env.local");
}

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const AI_MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
