import express from "express";
import { generateCode } from "../services/groqService.js";
import { writeSandboxFiles, copyTemplateFiles } from "../sandbox/services/fileWriter.js";
import { launchSandbox } from "../sandbox/services/dockerRunner.js";
// ⭐ MODIFIÉ : la validation vit désormais dans son propre module, partagé et testable.
import { isValidSandboxId, createSandboxId } from "../utils/sandboxId.js";

const router = express.Router();

// POST /api/generate
router.post("/generate", async (req, res) => {
  try {
    const {
      userText,
      projectContext,
      file,
      sandboxId: incomingSandboxId, // ⭐ présent = on ajuste une sandbox existante
    } = req.body;

    if (!userText) {
      return res.status(400).json({ error: "userText manquant dans la requête" });
    }

    // ⭐ Validation du sandboxId fourni par le client AVANT toute utilisation.
    // Bloque l'injection de commande, le path traversal (../, /, \) ET
    // l'injection d'argument (identifiant commençant par un tiret).
    if (incomingSandboxId && !isValidSandboxId(incomingSandboxId)) {
      return res.status(400).json({ error: "sandboxId invalide" });
    }

    const isIteration = Boolean(incomingSandboxId);
    const sandboxId = incomingSandboxId || createSandboxId();

    // Étapes 6 + 7 : construction du prompt + appel Groq
    // (le contexte, s'il contient existingFilesContent, déclenche le mode
    // "modify" côté prompt — voir groqService.js)
    const result = await generateCode(userText, projectContext, file);

    if (result.error) {
      return res.status(200).json(result);
    }

    // ⭐ Étape 03/05 : écriture des fichiers.
    // En itération, le dossier sandboxId existe déjà : on n'écrit QUE les
    // fichiers renvoyés par Groq (modifiés/ajoutés), les autres restent
    // intacts sur le disque — c'est ça, l'injection différentielle.
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
        hotReload, // ⭐ true si c'est une injection à chaud sur le conteneur déjà actif
        previewUrl: `${url}${result.entryRoute || "/"}${
          (result.entryRoute || "/").includes("?") ? "&" : "?"
        }v=${Date.now()}`
      }
    });
  } catch (err) {
    // ⭐ On ne logue jamais err.message ni err.stack bruts : tous deux peuvent
    // contenir des données contrôlées par l'utilisateur (une valeur invalide
    // réapparaît souvent dans le message d'erreur) → log injection / log forging.
    // On logue le type d'erreur et la première ligne de code de la stack, qui
    // suffisent au diagnostic, et on renvoie une erreur générique au client.
    const origin = String(err?.stack || "")
      .split("\n")
      .find((line) => line.trim().startsWith("at ")) || "origine inconnue";
    console.error(
      "Erreur /api/generate :",
      err?.name || "Error",
      "|",
      origin.trim().replace(/[\r\n]/g, " ")
    );
    res.status(500).json({ error: "Une erreur interne est survenue." });
  }
});

export default router;