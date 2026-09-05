import express from "express";
import { generateCode } from "../services/groqService.js";
import { writeSandboxFiles, copyTemplateFiles } from "../sandbox/services/fileWriter.js";
import { launchSandbox } from "../sandbox/services/dockerRunner.js";

const router = express.Router();

// Un sandboxId ne doit contenir que ce que dockerRunner.js utilise pour
// construire des noms d'image/conteneur : lettres, chiffres, tirets.
// Tout le reste est rejeté avant d'atteindre le moindre appel système.
const SANDBOX_ID_PATTERN = /^sandbox-[a-zA-Z0-9]+$/;

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

    // ⚠️ Validation stricte AVANT tout usage : incomingSandboxId vient
    // directement du client et finit dans des commandes Docker
    // (docker inspect/run) côté dockerRunner.js. Sans ce contrôle,
    // un attaquant peut injecter des métacaractères shell.
    if (incomingSandboxId !== undefined && !SANDBOX_ID_PATTERN.test(incomingSandboxId)) {
      return res.status(400).json({ error: "sandboxId invalide" });
    }

    const isIteration = Boolean(incomingSandboxId);
    const sandboxId = incomingSandboxId || `sandbox-${Date.now()}`;

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
    console.error("Erreur /api/generate :", err.message);
    res.status(500).json({ error: "Une erreur interne est survenue" });
  }
});

export default router;