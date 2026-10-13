import express from "express";
import { generateCode } from "../services/groqService.js";
import { writeSandboxFiles, copyTemplateFiles } from "../sandbox/services/fileWriter.js";
import { launchSandbox } from "../sandbox/services/dockerRunner.js";
import { isValidSandboxId, createSandboxId } from "../utils/sandboxId.js";

const router = express.Router();

// Sur ECS Fargate il n'y a pas de Docker : on n'écrit rien sur disque et on
// ne lance aucun conteneur. L'aperçu est une page HTML autonome renvoyée
// sous forme de data: URL (sans état serveur : fonctionne avec plusieurs
// tâches derrière l'ALB) et aussi dans le champ "html" (pour un iframe srcdoc).
const SANDBOX_DISABLED =
  process.env.SANDBOX_MODE === "disabled" ||
  Boolean(process.env.ECS_CONTAINER_METADATA_URI_V4);

// Fusionne les fichiers existants (envoyés par le client) et les fichiers
// renvoyés par le modèle, puis retourne le HTML complet de la page.
function buildStaticHtml(existing, generated) {
  const files = new Map();
  for (const f of Array.isArray(existing) ? existing : []) {
    if (f && typeof f.path === "string" && typeof f.content === "string") {
      files.set(f.path, f.content);
    }
  }
  for (const f of Array.isArray(generated) ? generated : []) {
    if (f && typeof f.path === "string" && typeof f.content === "string") {
      files.set(f.path, f.content);
    }
  }

  let entry =
    files.has("index.html")
      ? "index.html"
      : [...files.keys()].find((p) => p.toLowerCase().endsWith(".html"));
  if (!entry) return null;

  let html = files.get(entry);

  // Inline les éventuels CSS/JS séparés générés par le modèle.
  html = html.replace(
    /<link[^>]+href=["']([^"']+\.css)["'][^>]*>/gi,
    (m, href) => {
      const css = files.get(href.replace(/^\.?\//, ""));
      return css !== undefined ? `<style>${css}</style>` : m;
    }
  );
  html = html.replace(
    /<script[^>]+src=["']([^"']+\.js)["'][^>]*>\s*<\/script>/gi,
    (m, src) => {
      const js = files.get(src.replace(/^\.?\//, ""));
      return js !== undefined ? `<script>${js}</script>` : m;
    }
  );
  return html;
}

// POST /api/generate
router.post("/generate", async (req, res) => {
  try {
    const {
      userText,
      projectContext,
      file,
      sandboxId: incomingSandboxId,
    } = req.body;

    if (!userText) {
      return res.status(400).json({ error: "userText manquant dans la requête" });
    }

    if (incomingSandboxId && !isValidSandboxId(incomingSandboxId)) {
      return res.status(400).json({ error: "sandboxId invalide" });
    }

    const isIteration = Boolean(incomingSandboxId);
    const sandboxId = incomingSandboxId || createSandboxId();

    const result = await generateCode(userText, projectContext, file);

    if (result.error) {
      return res.status(200).json(result);
    }

    if (SANDBOX_DISABLED) {
      const html = buildStaticHtml(
        projectContext?.existingFilesContent,
        result.files
      );
      const previewUrl = html
        ? `data:text/html;charset=utf-8;base64,${Buffer.from(html, "utf-8").toString("base64")}`
        : null;

      return res.json({
        ...result,
        sandboxId,
        html,
        sandbox: {
          id: sandboxId,
          url: null,
          port: null,
          hotReload: false,
          previewUrl,
          disabled: true,
        },
      });
    }

    const sandboxPath = await writeSandboxFiles(sandboxId, result.files);
    await copyTemplateFiles(sandboxPath);

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
        hotReload,
        previewUrl: `${url}${result.entryRoute || "/"}${
          (result.entryRoute || "/").includes("?") ? "&" : "?"
        }v=${Date.now()}`
      }
    });
  } catch (err) {
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