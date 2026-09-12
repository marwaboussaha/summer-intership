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

// ⭐ On ne logue jamais une donnée externe (réponse API) brute : elle
// pourrait contenir des sauts de ligne ou caractères de contrôle
// permettant de falsifier les logs (log injection / log forging).
// JSON.stringify échappe automatiquement ces caractères.
console.log(JSON.stringify({ groqResponse: content }));