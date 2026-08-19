import fs from "fs/promises";
import path from "path";

// Racine où toutes les sandboxes seront créées (en dehors de backend/ et frontend/)
const SANDBOX_ROOT = path.resolve("sandboxes");

/**
 * Vérifie qu'un chemin de fichier reste bien à l'intérieur du dossier sandbox
 * (protection anti path-traversal, ex: "../../etc/passwd")
 */
function isPathSafe(basePath, filePath) {
  const resolved = path.resolve(basePath, filePath);
  return resolved.startsWith(basePath);
}

/**
 * Écrit tous les fichiers générés par Groq dans un dossier sandbox dédié.
 * @param {string} sandboxId - identifiant unique (ex: userId + timestamp)
 * @param {Array<{path:string, content:string}>} files - fichiers reçus de Groq
 * @returns {string} le chemin absolu du dossier sandbox créé
 */
export async function writeSandboxFiles(sandboxId, files) {
  const sandboxPath = path.join(SANDBOX_ROOT, sandboxId);

  // Crée le dossier racine de cette sandbox s'il n'existe pas
  await fs.mkdir(sandboxPath, { recursive: true });

  for (const file of files) {
    if (!isPathSafe(sandboxPath, file.path)) {
      throw new Error(`Chemin de fichier non autorisé : ${file.path}`);
    }

    const fullPath = path.join(sandboxPath, file.path);
    const dir = path.dirname(fullPath);

    // Crée les sous-dossiers nécessaires (ex: components/, routes/)
    await fs.mkdir(dir, { recursive: true });

    // Écrit le contenu réel du fichier
    await fs.writeFile(fullPath, file.content, "utf-8");
  }

  return sandboxPath;
}

/**
 * Copie les fichiers "template" de base (package.json, config...) dans la sandbox,
 * pour que le projet généré soit réellement exécutable, pas juste un tas de fichiers isolés.
 */
export async function copyTemplateFiles(sandboxPath) {
  const templatePath = path.resolve("sandbox/template");
  await fs.cp(templatePath, sandboxPath, { recursive: true, force: false });
}