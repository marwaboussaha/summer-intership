import OpenAI from "openai";
import dotenv from "dotenv";
dotenv.config();

const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1"
});

const response = await groq.chat.completions.create({
  model: "llama-3.3-70b-versatile",
  messages: [{ role: "user", content: "dis juste bonjour" }]
});

const content = response.choices[0].message.content;

/**
 * ⭐ Neutralise les caractères de contrôle (retours à la ligne, tabulations,
 * caractères ASCII < 0x20 et 0x7F) avant tout passage à un logger.
 * Empêche qu'une réponse externe (API tierce) ne puisse forger de fausses
 * lignes de log ou injecter des séquences de contrôle terminal.
 */
function sanitizeForLog(value) {
  return String(value).replace(/[\r\n\t\x00-\x1F\x7F]/g, " ");
}

console.log("Réponse Groq :", sanitizeForLog(content));