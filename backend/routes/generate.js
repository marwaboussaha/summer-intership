import express from "express";
import { generateCode } from "../services/groqService.js";
import { writeSandboxFiles, copyTemplateFiles } from "../sandbox/services/fileWriter.js";
import { launchSandbox } from "../sandbox/services/dockerRunner.js";
// La validation vit dans son propre module, partagé et testable.
import { isValidSandboxId, createSandboxId } from "../utils/sandboxId.js";

const router = express.Router();

// Reconstitue la page index.html finale (fichiers existants + fichiers générés).
function buildStaticHtml(projectContext, result) {
  const files = new Map();
  const all = [
    ...(projectContext?.existingFilesContent || []),
    ...(result?.files || []),
  ];
  for (const f of all) {
    if (f && typeof f.path === "string" && typeof f.content === "string") {
      files.set(f.path, f.content);
    }
  }
  const key = files.has("index.html")
    ? "index.html"
    : [...files.keys()].find((p) => p.toLowerCase().endsWith(".html"));
  return key ? files.get(key) : null;
}

// POST /api/generate
router.post("/generate", async (req, res) => {
  try {
    const {
      userText,
      projectContext,
      file,
      sandboxId: incomingSandboxId, // présent = on ajuste une sandbox existante
    } = req.body;

    if (!userText) {
      return res.status(400).json({ error: "userText manquant dans la requête" });
    }

    // Validation du sandboxId fourni par le client AVANT toute utilisation.
    // Bloque l'injection de commande, le path traversal (../, /, \) ET
    // l'injection d'argument (identifiant commençant par un tiret).
    if (incomingSandboxId && !isValidSandboxId(incomingSandboxId)) {
      return res.status(400).json({ error: "sandboxId invalide" });
    }

    const isIteration = Boolean(incomingSandboxId);
    const sandboxId = incomingSandboxId || createSandboxId();

    // Construction du prompt + appel Groq
    // (si le contexte contient existingFilesContent, le mode "modify" est
    // déclenché côté prompt — voir groqService.js)
    const result = await generateCode(userText, projectContext, file);

    if (result.error) {
      return res.status(200).json(result);
    }

    // En production (ECS Fargate), il n'y a pas de démon Docker : on renvoie
    // directement le code généré, sans écrire de fichiers ni lancer de sandbox.
    const sandboxDisabled =
      process.env.SANDBOX_MODE === "disabled" ||
      Boolean(process.env.ECS_CONTAINER_METADATA_URI_V4);

    if (sandboxDisabled) {
      const staticHtml = buildStaticHtml(projectContext, result);
      return res.json({
        ...result,
        sandboxId,
        sandbox: {
          id: sandboxId,
          url: null,
          port: null,
          hotReload: false,
          html: staticHtml,
          previewUrl: staticHtml
            ? "data:text/html;charset=utf-8;base64," +
              Buffer.from(staticHtml, "utf-8").toString("base64")
            : null,
          disabled: true,
        },
      });
    }

    // Écriture des fichiers. En itération, le dossier sandboxId existe déjà :
    // on n'écrit QUE les fichiers renvoyés par Groq (injection différentielle).
    const sandboxPath = await writeSandboxFiles(sandboxId, result.files);
    await copyTemplateFiles(sandboxPath); // no-op si déjà présent (force:false)

    const { url, port, hotReload } = await launchSandbox(sandboxId, {
      isIteration,
      preferredPort: projectContext?.currentPort,
    });

    res.json({
      ...result,
      sandboxId,
      sandbox: {
        id: sandboxId,
        url,
        port,
        hotReload, // true si injection à chaud sur le conteneur déjà actif
        previewUrl: `${url}${result.entryRoute || "/"}${
          (result.entryRoute || "/").includes("?") ? "&" : "?"
        }v=${Date.now()}`,
      },
    });
  } catch (err) {
    // On ne logue jamais err.message ni err.stack bruts (log injection / forging).
    // On logue le type d'erreur, la première ligne de la stack, et un message
    // nettoyé : ASCII imprimable uniquement (plus de retours à la ligne) et
    // limité à 160 caractères.
    const origin =
      String(err?.stack || "")
        .split("\n")
        .find((line) => line.trim().startsWith("at ")) || "origine inconnue";
    const safeMsg = String(err?.message || "")
      .replace(/[^\x20-\x7E]/g, " ")
      .slice(0, 160);
    console.error(
      "Erreur /api/generate :",
      err?.name || "Error",
      "|",
      origin.trim().replace(/[\r\n]/g, " "),
      "|",
      safeMsg
    );
    res.status(500).json({ error: "Une erreur interne est survenue." });
  }
});

export default router;