import { execFile } from "child_process";
import { promisify } from "util";
import net from "net";
import path from "path";

const execFileAsync = promisify(execFile);

const PORT_RANGE_START = 4000;
const PORT_RANGE_END = 4100;

// N'autorise que lettres, chiffres, tirets et underscores dans un sandboxId.
const SANDBOX_ID_PATTERN = /^[a-zA-Z0-9_-]+$/;
// Noms Docker valides : lettres/chiffres/./_/- (jamais d'espace, /, ;, |, $, `, etc.)
const DOCKER_NAME_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/;

function assertSafeSandboxId(sandboxId) {
  if (typeof sandboxId !== "string" || !SANDBOX_ID_PATTERN.test(sandboxId)) {
    throw new Error("Identifiant de sandbox invalide");
  }
}

/**
 * ⭐ Revalide un nom d'image/conteneur Docker juste avant qu'il ne serve à
 * construire une commande `docker`. Appelée localement dans CHAQUE fonction
 * qui invoque execFile, même si la valeur a déjà été validée plus haut dans
 * la pile d'appel : un analyseur de sécurité (et un futur lecteur du code)
 * doit pouvoir garantir la sécurité de chaque fonction indépendamment,
 * sans devoir faire confiance à ses appelants.
 */
function assertSafeDockerName(name) {
  if (typeof name !== "string" || !DOCKER_NAME_PATTERN.test(name)) {
    throw new Error("Nom Docker invalide");
  }
}

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
  assertSafeDockerName(containerName);
  try {
    const { stdout } = await execFileAsync("docker", [
      "inspect",
      "-f",
      "{{.State.Running}}",
      containerName,
    ]);
    return stdout.trim() === "true";
  } catch {
    return false; // conteneur inexistant
  }
}

// ─────────────────────────────────────────────
// Récupère le port réellement utilisé par un conteneur déjà actif
// ─────────────────────────────────────────────
async function getContainerPort(containerName) {
  assertSafeDockerName(containerName);
  const { stdout } = await execFileAsync("docker", [
    "port",
    containerName,
    "3000/tcp",
  ]);
  const match = /:(\d+)/.exec(stdout);
  if (!match) {
    throw new Error(`Impossible de déterminer le port du conteneur ${containerName}`);
  }
  return Number.parseInt(match[1], 10);
}

// ─────────────────────────────────────────────
// Nettoyage des anciens conteneurs (nouvelle génération uniquement,
// jamais en cours d'itération pour ne pas couper la sandbox active)
// ─────────────────────────────────────────────
export async function cleanupOldSandboxes(exceptContainerName) {
  try {
    const { stdout } = await execFileAsync("docker", [
      "ps",
      "-a",
      "--filter",
      "name=voicecraft-sandbox-",
      "--format",
      "{{.Names}}",
    ]);
    // Les noms viennent de `docker ps` (sortie du système, pas de l'utilisateur) :
    // pas de donnée externe ici, seule la comparaison utilise exceptContainerName.
    const containerNames = stdout
      .split("\n")
      .map((n) => n.trim())
      .filter(Boolean)
      .filter((n) => n !== exceptContainerName);

    for (const name of containerNames) {
      await execFileAsync("docker", ["rm", "-f", name]).catch(() => {});
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
  assertSafeSandboxId(sandboxId);

  const imageName = `voicecraft-sandbox-${sandboxId}`.toLowerCase();
  assertSafeDockerName(imageName);

  const { stdout, stderr } = await execFileAsync("docker", [
    "build",
    "-t",
    imageName,
    `./sandboxes/${sandboxId}`,
  ]);
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
  assertSafeSandboxId(sandboxId);
  assertSafeDockerName(imageName);

  const containerName = `${imageName}-container`;
  assertSafeDockerName(containerName);

  await execFileAsync("docker", ["rm", "-f", containerName]).catch(() => {});

  const port =
    preferredPort && (await isPortFree(preferredPort))
      ? preferredPort
      : await findFreePort();

  const absSandboxPath = path.resolve("sandboxes", sandboxId);

  await execFileAsync("docker", [
    "run",
    "-d",
    "--name",
    containerName,
    "-p",
    `${port}:3000`,
    "-v",
    `${absSandboxPath}:/app`,
    "-v",
    "/app/node_modules",
    imageName,
  ]);

  return { containerName, port, url: `http://localhost:${port}` };
}

/**
 * ⭐ Fonction principale : décide s'il faut (a) créer une nouvelle sandbox
 * de zéro, ou (b) réutiliser le conteneur déjà actif d'une sandbox existante
 * (vraie injection à chaud, sans rebuild ni redémarrage de conteneur).
 */
export async function launchSandbox(sandboxId, options = {}) {
  assertSafeSandboxId(sandboxId);

  const { isIteration = false, preferredPort } = options;
  const imageName = `voicecraft-sandbox-${sandboxId}`.toLowerCase();
  assertSafeDockerName(imageName);

  const containerName = `${imageName}-container`;
  assertSafeDockerName(containerName);

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
    await execFileAsync("docker", ["rm", "-f", containerName]).catch(() => {});
  } else {
    // Nouvelle génération : on repart propre, un seul projet actif à la fois.
    await cleanupOldSandboxes();
  }

  await buildSandboxImage(sandboxId);
  const { port, url } = await runSandboxContainer(imageName, sandboxId, preferredPort);

  return { imageName, containerName, port, url, hotReload: false };
}