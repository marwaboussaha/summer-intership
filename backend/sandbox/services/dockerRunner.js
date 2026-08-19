import { exec } from "child_process";
import { promisify } from "util";
import net from "net";
import path from "path";

const execAsync = promisify(exec);

const PORT_RANGE_START = 4000;
const PORT_RANGE_END = 4100;

// ─────────────────────────────────────────────
// Vérification de port au niveau du système d'exploitation
// ─────────────────────────────────────────────
function isPortFree(port) {
  return new Promise((resolve) => {
    const tester = net
      .createServer()
      .once("error", () => resolve(false))
      .once("listening", () => {
        tester.close(() => resolve(true));
      })
      .listen(port, "127.0.0.1");
  });
}

async function findFreePort() {
  for (let port = PORT_RANGE_START; port < PORT_RANGE_END; port++) {
    if (await isPortFree(port)) return port;
  }
  throw new Error(`Aucun port libre trouvé entre ${PORT_RANGE_START} et ${PORT_RANGE_END}`);
}

// ─────────────────────────────────────────────
// Est-ce que le conteneur d'une sandbox tourne déjà ?
// ─────────────────────────────────────────────
async function isContainerRunning(containerName) {
  try {
    const { stdout } = await execAsync(
      `docker inspect -f "{{.State.Running}}" ${containerName}`
    );
    return stdout.trim() === "true";
  } catch {
    return false; // conteneur inexistant
  }
}

// ─────────────────────────────────────────────
// Récupère le port réellement utilisé par un conteneur déjà actif
// ─────────────────────────────────────────────
async function getContainerPort(containerName) {
  const { stdout } = await execAsync(`docker port ${containerName} 3000/tcp`);
  const match = /:(\d+)/.exec(stdout);
  if (!match) {
    throw new Error(`Impossible de déterminer le port du conteneur ${containerName}`);
  }
  return parseInt(match[1], 10);
}

// ─────────────────────────────────────────────
// Nettoyage des anciens conteneurs (nouvelle génération uniquement,
// jamais en cours d'itération pour ne pas couper la sandbox active)
// ─────────────────────────────────────────────
export async function cleanupOldSandboxes(exceptContainerName) {
  try {
    const { stdout } = await execAsync(
      `docker ps -a --filter "name=voicecraft-sandbox-" --format "{{.Names}}"`
    );
    const containerNames = stdout
      .split("\n")
      .map((n) => n.trim())
      .filter(Boolean)
      .filter((n) => n !== exceptContainerName);

    for (const name of containerNames) {
      await execAsync(`docker rm -f ${name}`).catch(() => {});
    }
    return { removed: containerNames.length };
  } catch (err) {
    console.warn("⚠️ Nettoyage des anciens conteneurs a échoué :", err.message);
    return { removed: 0, error: err.message };
  }
}

/**
 * Build l'image Docker pour une sandbox donnée (une seule fois, à la
 * première génération — pas à chaque itération).
 */
export async function buildSandboxImage(sandboxId) {
  const imageName = `voicecraft-sandbox-${sandboxId}`.toLowerCase();
  const { stdout, stderr } = await execAsync(
    `docker build -t ${imageName} ./sandboxes/${sandboxId}`
  );
  return { imageName, stdout, stderr };
}

/**
 * Lance le conteneur en montant le dossier sandbox en VOLUME (bind mount) :
 * tout fichier réécrit sur disque par writeSandboxFiles() est immédiatement
 * visible à l'intérieur du conteneur, où nodemon détecte le changement et
 * redémarre l'app tout seul — c'est l'injection à chaud.
 * Le dossier node_modules reste isolé (volume anonyme) pour ne pas être
 * écrasé par le contenu du dossier hôte, qui ne le contient pas.
 */
export async function runSandboxContainer(imageName, sandboxId, preferredPort) {
  const containerName = `${imageName}-container`;

  await execAsync(`docker rm -f ${containerName}`).catch(() => {});

  const port =
    preferredPort && (await isPortFree(preferredPort))
      ? preferredPort
      : await findFreePort();

  const absSandboxPath = path.resolve("sandboxes", sandboxId);

  await execAsync(
    `docker run -d --name ${containerName} -p ${port}:3000 ` +
      `-v "${absSandboxPath}:/app" -v /app/node_modules ${imageName}`
  );

  return { containerName, port, url: `http://localhost:${port}` };
}

/**
 * ⭐ Fonction principale : décide s'il faut (a) créer une nouvelle sandbox
 * de zéro, ou (b) réutiliser le conteneur déjà actif d'une sandbox existante
 * (vraie injection à chaud, sans rebuild ni redémarrage de conteneur).
 */
export async function launchSandbox(sandboxId, options = {}) {
  const { isIteration = false, preferredPort } = options;
  const imageName = `voicecraft-sandbox-${sandboxId}`.toLowerCase();
  const containerName = `${imageName}-container`;

  if (isIteration) {
    const running = await isContainerRunning(containerName);
    if (running) {
      // ⭐⭐ VRAIE INJECTION À CHAUD : les fichiers ont déjà été écrits sur
      // disque (dans le dossier monté en volume). Le conteneur tourne déjà
      // et nodemon va détecter le changement et recharger l'app de
      // lui-même, en une seconde environ. Aucun rebuild, aucun redémarrage
      // de conteneur nécessaire ici.
      const port = await getContainerPort(containerName);
      return {
        imageName,
        containerName,
        port,
        url: `http://localhost:${port}`,
        hotReload: true
      };
    }
    // Le conteneur n'existe plus (ex: crash, ou Docker Desktop redémarré) :
    // on retombe sur un lancement complet ci-dessous.
    await execAsync(`docker rm -f ${containerName}`).catch(() => {});
  } else {
    // Nouvelle génération : on repart propre, un seul projet actif à la fois.
    await cleanupOldSandboxes();
  }

  await buildSandboxImage(sandboxId);
  const { port, url } = await runSandboxContainer(imageName, sandboxId, preferredPort);

  return { imageName, containerName, port, url, hotReload: false };
}