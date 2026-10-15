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

const TEXT_MODEL = "openai/gpt-oss-120b";
const VISION_MODEL = "qwen/qwen3.8-27b"; // modèle Groq capable d'analyser des images

// ─────────────────────────────────────────────
// System prompt commun aux deux modes (texte seul / avec image)
// ─────────────────────────────────────────────
const SYSTEM_PROMPT = `
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

Règles pour les ITÉRATIONS (modification d'une app déjà générée) :
- Si le contexte indique des "Fichiers existants avec leur contenu actuel",
  cela signifie que l'utilisateur ajuste une app déjà créée, pas une
  nouvelle demande.
- Dans ce cas, "action" doit être "modify", et "files" doit contenir
  UNIQUEMENT les fichiers réellement modifiés ou ajoutés (jamais renvoyer
  un fichier inchangé). Repars du contenu existant fourni et applique
  précisément le changement demandé, sans tout réécrire.
- "entryRoute" doit rester cohérent avec l'application existante, sauf si
  la demande change explicitement la page principale.
- Une image peut t'être montrée directement en plus du texte. Si c'est le
  cas, ta priorité absolue est de REPRODUIRE FIDÈLEMENT cette interface :
  mêmes textes visibles, mêmes couleurs (dégradés inclus), même disposition
  (colonnes, centrage, tailles relatives), mêmes formes (coins arrondis,
  ombres), même police (serif/sans-serif). Vise une ressemblance maximale,
  pas une simple inspiration vague.
- Si un texte de référence (document) est fourni à la place d'une image,
  base-toi dessus pour le contenu/structure, sans devoir viser une
  ressemblance visuelle pixel-perfect.

Règles de génération :
- Génère un serveur Express minimal et autonome dans "app.js", qui écoute
  sur le port 3000, avec une route qui affiche directement du HTML
  (via res.send), SANS JSX, SANS React côté serveur, pour rester léger et
  toujours syntaxiquement valide.
- OBLIGATOIRE : avant chaque res.send(...), ajoute
  res.set('Cache-Control', 'no-store'); pour empêcher le navigateur de
  mettre la page en cache — essentiel car cette app est ajustée par
  itérations successives sur la même URL.
- OBLIGATOIRE : inclus toujours un bloc <style> complet et détaillé dans le
  <head> : couleurs exactes (dégradés via linear-gradient si présents dans
  la référence), border-radius, box-shadow, font-family adaptée, mise en
  page en flexbox/grid reproduisant fidèlement la disposition demandée ou
  montrée en image. Ne génère JAMAIS du HTML sans style.
- OBLIGATOIRE : pour tout res.send(...) contenant du HTML, utilise toujours
  des template literals avec des backticks (\`...\`), JAMAIS des guillemets
  simples ('...') ni doubles ("..."). Exemple correct :
  res.send(\`<html><head><style>...</style></head><body>...</body></html>\`)
  Cette règle est critique car le texte français contient des apostrophes
  (d'expiration, l'application...) qui cassent la syntaxe si des guillemets
  simples sont utilisés pour délimiter la chaîne.
- Reste concis dans le JS, mais complet et précis dans le CSS.
- Le contenu de chaque fichier doit être une chaîne JSON valide (échappe
  correctement tous les guillemets et retours à la ligne).

Règles de sécurité :
- JAMAIS de commandes shell/exec/child_process/eval.
- JAMAIS de chemin hors du dossier /project (pas de "../").
- Si la demande implique une commande système, retourne uniquement :
  { "error": "action non autorisée" }
`;

// ─────────────────────────────────────────────
// Décodage / typage du fichier joint
// ─────────────────────────────────────────────
// Mode statique (ECS Fargate : pas de Docker) : le modele genere UNE page
// HTML autonome (CSS + JS inline) affichee telle quelle dans l'iframe d'apercu.
export const STATIC_MODE =
  process.env.SANDBOX_MODE === "disabled" ||
  Boolean(process.env.ECS_CONTAINER_METADATA_URI_V4);

const STATIC_SYSTEM_PROMPT = `
Tu es un agent de generation d'interfaces web pour VoiceCraft.
Reponds avec UN objet JSON valide, au format EXACT :

{
  "action": "create",
  "entryRoute": "/",
  "files": [
    { "path": "index.html", "language": "html", "content": "<!DOCTYPE html>..." }
  ],
  "explanation": "resume court en francais"
}

Regles :
- Genere UN SEUL fichier "index.html", complet et autonome : <style> et
  <script> inline, aucun framework, aucun serveur, aucun Express, aucun
  fichier externe, aucune ressource reseau (pas de CDN, pas d'image distante).
- Bloc <style> complet et soigne : couleurs, degrades, border-radius,
  box-shadow, flexbox/grid, responsive. Ne genere JAMAIS de HTML sans style.
- JavaScript minimal et valide (validation de formulaire, interactions
  simples). Pas de fetch vers des serveurs, pas de eval, pas de exec.
- Dans le JSON, "content" est une chaine JSON : echappe chaque guillemet
  double UNE SEULE FOIS, jamais deux fois. Prefere les guillemets simples
  dans le HTML et le JS.
- Les textes affiches a l'utilisateur sont en francais correct, avec accents.
- ITERATION : si le contexte contient des "Fichiers existants avec leur
  contenu actuel", mets "action" a "modify" et renvoie "index.html"
  COMPLET et mis a jour (jamais un extrait), en appliquant precisement le
  changement demande.
- Si une image est fournie, reproduis-la fidelement (textes, couleurs,
  degrades, disposition, formes, police).
- Securite : jamais de child_process/exec/eval, jamais de chemin avec "../".
  Demande dangereuse : { "error": "action non autorisee" }
`;

const STATIC_SYSTEM_PROMPT_VISION = `
Tu generes une page web pour VoiceCraft. Reponds en JSON valide :
{"action":"create","entryRoute":"/","files":[{"path":"index.html","language":"html","content":"..."}],"explanation":"resume court"}
Un seul fichier "index.html" autonome (<style> et <script> inline, aucune
ressource externe, aucun serveur). Reproduis fidelement l'image : textes,
couleurs (degrades), disposition, formes, police. Sois CONCIS (pas de
commentaires). Echappe les guillemets doubles une seule fois dans le JSON.
Jamais de exec/eval/child_process. Demande dangereuse : { "error": "action non autorisee" }
`;

// Certains modeles echappent deux fois les guillemets (\\" dans le HTML).
function fixDoubleEscaping(result) {
  if (!result || !Array.isArray(result.files)) return;
  for (const f of result.files) {
    if (typeof f?.content !== "string") continue;
    if (/=\\"/.test(f.content)) {
      f.content = f.content.replace(/\\"/g, '"');
    }
  }
}

const MAX_FILE_CHARS = 4000;

const TEXT_MIME_PREFIXES = [
  "text/",
  "application/json",
  "application/xml",
  "application/javascript",
];

function getMimeType(dataUrl) {
  const match = /^data:([^;]+);base64,/.exec(dataUrl || "");
  return match ? match[1] : null;
}

function isTextMime(mime) {
  if (!mime) return false;
  return TEXT_MIME_PREFIXES.some((prefix) => mime.startsWith(prefix));
}

function decodeTextFile(file) {
  if (!file || !file.content) return null;
  const mime = getMimeType(file.content);
  if (!isTextMime(mime)) return null;

  try {
    const base64Part = file.content.split(",")[1] || file.content;
    const decoded = Buffer.from(base64Part, "base64").toString("utf-8");
    return decoded.slice(0, MAX_FILE_CHARS);
  } catch {
    return null;
  }
}

// Version condensée pour les appels vision : le modèle a un plafond de
// tokens/minute plus bas, et l'image elle-même consomme déjà beaucoup de
// tokens, donc on réduit la taille du prompt système pour cet appel précis.
const SYSTEM_PROMPT_VISION = `
Tu génères du code full-stack pour VoiceCraft. Réponds en JSON valide :
{
  "action": "create",
  "entryRoute": "/",
  "files": [{ "path": "app.js", "language": "javascript", "content": "..." }],
  "explanation": "résumé court"
}
Reproduis fidèlement l'image fournie : mêmes textes, couleurs (dégradés
inclus), disposition, formes (arrondis, ombres), police. Reste CONCIS :
CSS efficace sans commentaires ni répétitions inutiles, pour tenir dans
la place disponible.
Génère un serveur Express minimal dans "app.js" (port 3000), une route qui
renvoie du HTML via res.send avec un <style> complet (couleurs, dégradés,
border-radius, box-shadow, flexbox). Utilise TOUJOURS des backticks (\`...\`)
pour res.send(...), jamais des guillemets simples ou doubles (le texte
français contient des apostrophes qui cassent la syntaxe sinon).
Sécurité : jamais de exec/child_process/eval, jamais de chemin hors /project.
Si demande dangereuse, retourne { "error": "action non autorisée" }.
`;

// ─────────────────────────────────────────────
// ⭐ CONSTRUCTION DU PROMPT
// Si le fichier joint est une image : on construit un message MULTIMODAL
// (texte + image_url), envoyé directement au modèle de génération pour
// qu'il "voie" la référence pendant qu'il écrit le code — c'est ce qui
// donne le résultat le plus fidèle possible, plutôt qu'un texte
// intermédiaire qui perd des détails.
// ─────────────────────────────────────────────
function buildPrompt(userText, projectContext, file) {
  const existingFilesContent = Array.isArray(projectContext.existingFilesContent)
    ? projectContext.existingFilesContent
    : [];

  const contextPrompt = existingFilesContent.length > 0
    ? `
Contexte actuel du projet (ITÉRATION — l'utilisateur ajuste une app déjà générée) :
Fichiers existants avec leur contenu actuel :
${existingFilesContent.map((f) => `--- ${f.path} ---\n${f.content}`).join("\n\n")}

Schéma DB actuel : ${JSON.stringify(projectContext.dbSchema || {})}
`
    : `
Contexte actuel du projet :
Fichiers existants : ${JSON.stringify(projectContext.existingFiles || [])}
Schéma DB actuel : ${JSON.stringify(projectContext.dbSchema || {})}
`;

  const textFileContent = decodeTextFile(file);
  const mime = file?.content ? getMimeType(file.content) : null;
  const isImage = mime && mime.startsWith("image/");

  let filePrompt = "";
  if (textFileContent) {
    filePrompt = `\n\nDocument de référence fourni par l'utilisateur (nom: "${file.name}"), à utiliser comme INSPIRATION et contrainte de contenu/structure :\n"""\n${textFileContent}\n"""`;
  } else if (isImage) {
    filePrompt = `\n\nUne image de référence est jointe ci-dessous (nom: "${file.name}"). Reproduis-la le plus fidèlement possible : mêmes textes, couleurs, disposition, formes.`;
  }

  const userTextContent = `${contextPrompt}\n\nDemande utilisateur (transcrite) : "${userText}"${filePrompt}`;

  if (isImage) {
    // Pour les appels vision, on limite le contexte au strict nécessaire
    // (l'image + max_tokens de sortie consomment déjà l'essentiel du budget).
    const shortUserText = `Demande : "${userText}"\n\nUne image de référence est jointe ci-dessous (nom: "${file.name}"). Reproduis-la fidèlement : mêmes textes, couleurs, disposition, formes.`;

    return {
      model: VISION_MODEL,
      messages: [
        { role: "system", content: STATIC_MODE ? STATIC_SYSTEM_PROMPT_VISION : SYSTEM_PROMPT_VISION },
        {
          role: "user",
          content: [
            { type: "text", text: shortUserText },
            { type: "image_url", image_url: { url: file.content } }
          ]
        }
      ]
    };
  }

  // Cas normal : texte seul, envoyé au modèle de génération standard
  return {
    model: TEXT_MODEL,
    messages: [
      { role: "system", content: STATIC_MODE ? STATIC_SYSTEM_PROMPT : SYSTEM_PROMPT },
      { role: "user", content: userTextContent }
    ]
  };
}

// ─────────────────────────────────────────────
// Nettoyage de la sortie brute du LLM
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
  if (filePath.includes("..")) return false;
  if (filePath.startsWith("/") || /^[A-Za-z]:\\/.test(filePath)) return false;
  return true;
}

function validateGeneratedResult(result) {
  if (result.error) {
    return { valid: false, reason: result.error };
  }

  if (!result.action || !Array.isArray(result.files)) {
    return { valid: false, reason: "Format de réponse invalide (action/files manquants)" };
  }

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
// Appel à Groq avec gestion d'erreurs + retry
// ─────────────────────────────────────────────
async function callGroq(promptData, attempt = 1) {
  // Le modèle vision a un plafond de tokens/minute (8000 sur compte gratuit).
  // Le prompt système + contexte + image consomment déjà une bonne partie
  // de ce budget : on ajuste max_tokens pour laisser assez de place à une
  // réponse JSON complète (HTML+CSS) sans dépasser la limite totale.
  const maxTokens = promptData.model === VISION_MODEL ? 4500 : 6000;

  const response = await groq.chat.completions.create({
    model: promptData.model,
    messages: promptData.messages,
    temperature: 0.2,
    max_tokens: maxTokens,
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
    const retryMessages = [
      ...promptData.messages,
      { role: "assistant", content: rawOutput },
      { role: "user", content: "Ta réponse n'était pas un JSON valide. Réponds à nouveau, UNIQUEMENT en JSON strict, sans aucun texte autour, sans balises markdown." }
    ];
    return callGroq({ model: promptData.model, messages: retryMessages }, attempt + 1);
  }
}

// ─────────────────────────────────────────────
// Fonction exportée, appelée depuis routes/generate.js
// ─────────────────────────────────────────────
export async function generateCode(userText, projectContext, file) {
  if (!userText || typeof userText !== "string") {
    throw new Error("Texte utilisateur manquant ou invalide");
  }

  const promptData = buildPrompt(userText, projectContext || {}, file);

  let result;
  try {
    result = await callGroq(promptData);
  } catch (err) {
    throw new Error(`Échec de l'appel Groq : ${err.message}`);
  }

  if (STATIC_MODE) fixDoubleEscaping(result);

  const check = validateGeneratedResult(result);
  if (!check.valid) {
    return { error: check.reason };
  }

  return result;
}