import fs from "fs/promises";
import path from "path";
import { resolveSandboxDir } from "./dockerRunner.js";

/**
 * Vérifie qu'un chemin de fichier reste bien à l'intérieur du dossier sandbox
 * (protection anti path-traversal, ex: "../../etc/passwd").
 *
 * Ce contrôle reste nécessaire même si le dossier de base (`basePath`) est
 * lui-même garanti sûr : `file.path` vient des fichiers générés (ex: par
 * Groq), pas de sandboxId, et rien ne garantit qu'un chemin relatif malicieux
 * n'y soit jamais injecté.
 */
function isPathSafe(basePath, filePath) {
  const resolved = path.resolve(basePath, filePath);
  return resolved === basePath || resolved.startsWith(basePath + path.sep);
}

/**
 * Écrit tous les fichiers générés par Groq dans un dossier sandbox dédié.
 *
 * ⭐ Le dossier est résolu via `resolveSandboxDir()` (dockerRunner.js),
 * jamais construit ici à partir de `sandboxId` directement. C'est le même
 * mécanisme que `buildSandboxImage`/`runSandboxContainer` utilisent pour le
 * bind mount Docker : en centralisant la résolution dans une seule fonction
 * partagée, on garantit que fileWriter.js écrit exactement dans le dossier
 * que dockerRunner.js montera dans le conteneur — aucune divergence
 * possible entre les deux modules.
 *
 * @param {string} sandboxId - identifiant unique (ex: userId + timestamp)
 * @param {Array<{path:string, content:string}>} files - fichiers reçus de Groq
 * @returns {string} le chemin absolu du dossier sandbox créé
 */
export async function writeSandboxFiles(sandboxId, files) {
  // resolveSandboxDir() valide sandboxId en interne (assertSafeSandboxId)
  // avant de dériver le token — pas besoin de dupliquer cette validation ici.
  const sandboxPath = resolveSandboxDir(sandboxId);

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