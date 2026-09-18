/**
 * Validation des identifiants de sandbox.
 *
 * Isolé dans son propre module pour deux raisons :
 *  1. Testable sans importer le routeur Express (donc sans charger groqService,
 *     dockerRunner, ni exiger de variables d'environnement au moment du test).
 *  2. Une seule source de vérité : routes/generate.js et dockerRunner.js
 *     utilisent la même fonction, impossible qu'elles divergent.
 */

import { randomBytes } from "node:crypto";

// Format canonique produit par le serveur : `sandbox-${Date.now()}`.
//
// Le préfixe obligatoire n'est pas cosmétique : il garantit que la valeur ne
// peut jamais commencer par un tiret. Sans lui, un sandboxId valant "-f" ou
// "--format" serait passé à execFile("docker", [...]) et interprété par docker
// comme une OPTION et non comme une valeur (injection d'argument).
// execFile protège de l'injection de commande shell, pas de celle-là.
const SANDBOX_ID_PATTERN = /^sandbox-[a-zA-Z0-9]+$/;

// Borne de longueur : évite qu'un identifiant démesuré ne parte dans un chemin
// de fichier ou une ligne de commande.
const MAX_LENGTH = 64;

/**
 * @param {unknown} id valeur brute issue de req.body, de type non garanti
 * @returns {boolean} true uniquement si l'identifiant est sûr à utiliser
 */
export function isValidSandboxId(id) {
  return (
    typeof id === "string" &&
    id.length > 0 &&
    id.length <= MAX_LENGTH &&
    SANDBOX_ID_PATTERN.test(id)
  );
}

/**
 * Génère un identifiant de sandbox conforme au format attendu.
 *
 * Le suffixe évite les collisions entre deux requêtes arrivant dans la même
 * milliseconde, et rend l'identifiant non devinable : sans lui, un tiers
 * pourrait cibler la sandbox d'un autre utilisateur en énumérant les
 * timestamps. randomBytes est un CSPRNG ; Math.random() ne l'est pas
 * (état interne de V8 inférable à partir de quelques sorties — S2245 / CWE-338).
 *
 * randomBytes(6).toString("hex") produit 12 caractères [0-9a-f], donc
 * compatible avec SANDBOX_ID_PATTERN.
 */
export function createSandboxId() {
  const suffix = randomBytes(6).toString("hex");
  return `sandbox-${Date.now()}${suffix}`;
}

export { SANDBOX_ID_PATTERN, MAX_LENGTH };