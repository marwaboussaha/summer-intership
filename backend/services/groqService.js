import OpenAI from "openai";
import dotenv from "dotenv";
dotenv.config();

// ─────────────────────────────────────────────
// Client Groq (SDK OpenAI pointé vers l'API Groq)
// ─────────────────────────────────────────────
const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1"
});

const MODEL = "llama-3.3-70b-versatile";

// ─────────────────────────────────────────────
// ⭐ CONSTRUCTION DU PROMPT
// ─────────────────────────────────────────────
function buildPrompt(userText, projectContext) {
  const systemPrompt = `
Tu es un agent de génération de code full-stack pour VoiceCraft.
Tu dois répondre avec un objet JSON valide, au format EXACT suivant :

{
  "action": "create",
  "entryRoute": "/",
  "files": [
    { "path": "app.js", "language": "javascript", "content": "..." }
  ],
  "explanation": "résumé court"
}

Règles pour "entryRoute" :
- URL relative où voir le résultat (ex: "/", "/login", "/payment").
- Doit correspondre à une route Express réellement définie dans "files".

Règles de génération :
- Génère un serveur Express minimal et autonome dans "app.js", qui écoute
  sur le port 3000, avec une route qui affiche directement du HTML simple
  (via res.send), SANS JSX, SANS React côté serveur, pour rester léger et
  toujours syntaxiquement valide.
- Reste concis : code fonctionnel minimal, pas de commentaires longs.
- Le contenu de chaque fichier doit être une chaîne JSON valide (échappe
  correctement tous les guillemets et retours à la ligne).

Règles de sécurité :
- JAMAIS de commandes shell/exec/child_process/eval.
- JAMAIS de chemin hors du dossier /project (pas de "../").
- Si la demande implique une commande système, retourne uniquement :
  { "error": "action non autorisée" }
`;

  const contextPrompt = `
Contexte actuel du projet :
Fichiers existants : ${JSON.stringify(projectContext.existingFiles || [])}
Schéma DB actuel : ${JSON.stringify(projectContext.dbSchema || {})}
`;

  const userPrompt = `Demande utilisateur (transcrite) : "${userText}"`;

  return {
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `${contextPrompt}\n\n${userPrompt}` }
    ]
  };
}

// ─────────────────────────────────────────────
// Nettoyage de la sortie brute du LLM
// (certains modèles ajoutent ```json ... ``` autour)
// ─────────────────────────────────────────────
function cleanRawOutput(raw) {
  return raw
    .trim()
    .replace(/^```json/i, "")
    .replace(/^```/, "")
    .replace(/```$/, "")
    .trim();
}

// ─────────────────────────────────────────────
// Validation de sécurité APRÈS génération
// (on ne fait jamais confiance au prompt seul)
// ─────────────────────────────────────────────
const FORBIDDEN_PATTERNS = [
  /child_process/i,
  /require\(\s*['"]child_process['"]\s*\)/i,
  /\bexec\s*\(/i,
  /\bspawn\s*\(/i,
  /os\.system/i,
  /subprocess/i,
  /\beval\s*\(/i,
  /new Function\s*\(/i,
  /rm\s+-rf/i
];

function isPathSafe(filePath) {
  if (!filePath || typeof filePath !== "string") return false;
  if (filePath.includes("..")) return false;               // remontée de dossier
  if (filePath.startsWith("/") || /^[A-Za-z]:\\/.test(filePath)) return false; // chemin absolu
  return true;
}

function validateGeneratedResult(result) {
  if (result.error) {
    // Le LLM a lui-même refusé (grâce au system prompt) — on relaie tel quel
    return { valid: false, reason: result.error };
  }

  if (!result.action || !Array.isArray(result.files)) {
    return { valid: false, reason: "Format de réponse invalide (action/files manquants)" };
  }

  // entryRoute est optionnel côté validation stricte, mais on garantit
  // toujours une valeur exploitable pour l'iframe (fallback sur "/")
  if (!result.entryRoute || typeof result.entryRoute !== "string") {
    result.entryRoute = "/";
  }
  if (!result.entryRoute.startsWith("/")) {
    result.entryRoute = `/${result.entryRoute}`;
  }

  for (const file of result.files) {
    if (!isPathSafe(file.path)) {
      return { valid: false, reason: `Chemin de fichier non autorisé : ${file.path}` };
    }
    for (const pattern of FORBIDDEN_PATTERNS) {
      if (pattern.test(file.content || "")) {
        return { valid: false, reason: `Contenu dangereux détecté dans ${file.path}` };
      }
    }
  }

  return { valid: true };
}

// ─────────────────────────────────────────────
// Appel à Groq avec gestion d'erreurs + 1 retry
// ─────────────────────────────────────────────
async function callGroq(promptData, attempt = 1) {
  const response = await groq.chat.completions.create({
    model: MODEL,
    messages: promptData.messages,
    temperature: 0.2,
    max_tokens: 4096,
    // ⭐ Force nativement une sortie JSON valide côté API Groq,
    // beaucoup plus fiable que de compter uniquement sur le prompt.
    response_format: { type: "json_object" }
  });

  const rawOutput = response.choices[0].message.content;
  const cleaned = cleanRawOutput(rawOutput);

  try {
    return JSON.parse(cleaned);
  } catch (err) {
    console.error("⚠️ JSON invalide reçu de Groq (tentative", attempt, ") :");
    console.error(rawOutput);
    if (attempt >= 3) {
      throw new Error("Réponse Groq non parsable en JSON après plusieurs tentatives");
    }
    // Retry : on redemande explicitement un JSON valide
    const retryMessages = [
      ...promptData.messages,
      { role: "assistant", content: rawOutput },
      { role: "user", content: "Ta réponse n'était pas un JSON valide. Réponds à nouveau, UNIQUEMENT en JSON strict, sans aucun texte autour, sans balises markdown." }
    ];
    return callGroq({ messages: retryMessages }, attempt + 1);
  }
}

// ─────────────────────────────────────────────
// Fonction exportée, appelée depuis routes/generate.js
// ─────────────────────────────────────────────
export async function generateCode(userText, projectContext) {
  if (!userText || typeof userText !== "string") {
    throw new Error("Texte utilisateur manquant ou invalide");
  }

  const promptData = buildPrompt(userText, projectContext || {});

  let result;
  try {
    result = await callGroq(promptData);
  } catch (err) {
    throw new Error(`Échec de l'appel Groq : ${err.message}`);
  }

  const check = validateGeneratedResult(result);
  if (!check.valid) {
    return { error: check.reason };
  }

  return result;
}
