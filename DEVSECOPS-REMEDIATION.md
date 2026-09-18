# DevSecOps Pipeline — Journal de remédiation

Projet : `marwaboussaha/summer-intership` (voice-app-generator)
Pipeline : `.github/workflows/devsecops.yml`

Ce document résume le diagnostic et les corrections appliquées pour faire passer
le pipeline DevSecOps (Gitleaks → SAST SonarQube → Snyk → Build Docker → Trivy →
Push ghcr.io → Deploy → DAST ZAP).

---

## 1. Contexte du projet

Une application qui génère du code à la volée (via un LLM/Groq) et l'exécute dans
des **sandboxes Docker** créées dynamiquement (`backend/sandboxes/<id>/`, à partir
d'un template dans `backend/sandbox/template/`). Le backend orchestre la création,
le build et le lancement de ces conteneurs via `dockerRunner.js`.

---

## 2. Problèmes rencontrés et corrections

### 2.1 Vulnérabilités d'images Docker (Trivy)

| Image | Problème | Fix |
|---|---|---|
| `database` | `mongo:7` brut → CVEs dans `gosu`, `bsondump`, `mongodump` (binaires Go non patchables) | Dockerfile custom basé sur `mongo:7.0.15`, suppression des binaires clients |
| `backend` | CVEs dans le CLI `npm` embarqué dans l'image (`node:18-alpine`) | Build multi-stage : le CLI npm n'est pas copié dans l'image finale |
| Dépendance Node | `js-yaml@3.13.1` — 2 CVE HIGH (DoS) | Mise à jour vers `js-yaml@^4.3.1` |

### 2.2 Vulnérabilité critique — Injection de commande OS (SonarQube, BLOCKER)

**Fichier :** `backend/sandbox/services/dockerRunner.js`

Un `sandboxId` fourni par le client (`req.body.sandboxId`) était interpolé
directement dans des commandes shell (`exec(\`docker ... ${sandboxId}\`)`),
permettant une injection de commande arbitraire.

**Fix appliqué :**

- Validation stricte de `sandboxId` par regex, rejet avant tout traitement
- Remplacement de `exec`/`execAsync` (passe par un shell) par
  `execFile`/`execFileAsync` (arguments passés séparément, sans interprétation
  shell) dans **toutes** les fonctions de `dockerRunner.js` : `isContainerRunning`,
  `getContainerPort`, `cleanupOldSandboxes`, `buildSandboxImage`,
  `runSandboxContainer`, `launchSandbox`
- Message d'erreur générique renvoyé au client (`err.message` retiré de la
  réponse HTTP) pour éviter la fuite de détails internes

### 2.3 Code généré exclu du repo et de l'analyse

Le dossier `backend/sandboxes/` polluait Git et SonarCloud avec des centaines
d'issues sans rapport avec le code applicatif.

**Fix :**

- Ajout de `backend/sandboxes/` au `.gitignore`
- Retrait du suivi Git (`git rm -r --cached backend/sandboxes`)
- Exclusion dans `sonar-project.properties` : `sonar.exclusions=backend/sandboxes/**`

Résultat : passage de **252 → 17 issues** SonarCloud en une seule fois.

> Le retrait du suivi Git n'avait initialement pas été appliqué : les sandboxes
> étaient toujours committées et Snyk tentait de résoudre les dépendances de
> **45 projets sur 49**, faisant échouer le job. Corrigé (cf. 2.10).

### 2.4 GitHub Actions non pinnées par SHA (supply chain)

Toutes les actions tierces référencées par tag mutable (`@v4`, `@v2`, `@v3`…)
ont été pinnées par SHA de commit complet, vérifié via `git ls-remote` sur les
dépôts officiels, avec le tag en commentaire.

| Action | SHA pinné | Version |
|---|---|---|
| `actions/checkout` | `11bd71901bbe5b1630ceea73d27597364c9af683` | v4.2.2 |
| `actions/setup-node` | `39370e3970a6d050c480ffad4ff0ed4d3fdee5af` | v4.1.0 |
| `gitleaks/gitleaks-action` | `ff98106e4c7b2bc287b24eaf42907196329070c7` | v2.3.9 |
| `actions/upload-artifact` | `ea165f8d65b6e75b540449e92b4886f43607fa02` | v4.6.2 |
| `actions/download-artifact` | `d3f86a106a0bac45b974a628896c90dbdf5c8093` | v4.3.0 |
| `SonarSource/sonarqube-scan-action` | `13990a695682794b53148ff9f6a8b6e22e43955e` | v3.1.0 |
| `sonarqube-quality-gate-action` | `7a5fffe8e523c40e0c740b6bc2712ab503e52efa` | master |
| `snyk/actions/node` | `12140f4059e244892ae643824a95459a102120dd` | master |
| `aquasecurity/trivy-action` | `ed142fd0673e97e23eac54620cfb913e5ce36c25` | v0.36.0 |
| `docker/login-action` | `9780b0c442fbb1117ed29e0efdff1e18412f7567` | v3.3.0 |
| `Azure/setup-kubectl` | `776406bce94f63e41d621b960d78ee25c8b76ede` | v4.0.1 |
| `zaproxy/action-baseline` | `66042c8e7e24680119199a017e5b0e8603bf4dae` | v0.12.0 |
| `github/codeql-action/upload-sarif` | `42c378ffbb438be29e3e1848d520fb0a8ee1c271` | v3.38.0 |
| `dawidd6/action-send-mail` | `62a2d05b79935ad4fb90ce9079928099579c14ac` | v9 |

Les deux entrées `master` (Snyk, Quality Gate) pointent sur une branche mutable :
le SHA est celui de la tête au 18/09/2026 et doit être revérifié périodiquement.

### 2.5 Durcissement des installations npm

`npm ci` sans `--ignore-scripts` autorise l'exécution de scripts de cycle de vie
arbitraires définis par des packages tiers (risque supply-chain). Ajouté à :

- `.github/workflows/devsecops.yml` (jobs `install-dependencies` et `sast-sonarqube`)
- `backend/Dockerfile`
- `backend/sandbox/template/Dockerfile`

### 2.6 Secret exposé dans un bloc `run:`

**Fichier :** `.github/workflows/devsecops.yml`, job `deploy-staging`

```yaml
# Avant
run: echo "${{ secrets.KUBE_CONFIG }}" > kubeconfig.yaml

# Après
env:
  KUBE_CONFIG: ${{ secrets.KUBE_CONFIG }}
run: |
  umask 077
  printf '%s' "$KUBE_CONFIG" > kubeconfig.yaml
```

Ajout d'un `rm -f kubeconfig.yaml` en `if: always()` et d'un contrôle explicite
de la présence du secret (cf. 2.14).

### 2.7 Template de sandbox

- `npm install` → `npm ci --ignore-scripts`
- Ajout d'un `package-lock.json` de référence committé — il était **absent**,
  ce qui rendait le `npm ci` du Dockerfile impossible (`ENOLOCK`). Généré via
  `npm install --package-lock-only --ignore-scripts`
- Ajout d'un `.dockerignore` (`.env`, `*.pem`, `*.key`, `.git`, `node_modules`)
- Issue `COPY . .` corrigée par copie explicite (cf. 2.12)

---

## 3. Corrections du pipeline lui-même

### 3.1 Fichier de workflow dupliqué

Le fichier contenait **deux fois** le workflow complet, collés bout à bout
(`cmd_options: "-l HIGH"name: DevSecOps Pipeline`). Clés YAML dupliquées, donc
erreur de parsing. Déduplication.

### 3.2 Artefact ZAP en doublon

Deux steps `upload-artifact` portaient le même nom `zap-report`. Avec la v4, le
second upload échoue. Fusionnés en un seul step `if: always()`.

### 3.3 Génération automatique de Dockerfile supprimée

Le job `build-images` générait un Dockerfile par défaut quand il en manquait un,
et retombait sur `mongo:7` brut pour la database — c'est-à-dire exactement
l'image que la remédiation Trivy (2.1) avait remplacée. Le fallback
réintroduisait silencieusement les CVE et faisait échouer Trivy deux jobs plus
loin. Remplacé par un échec explicite avec message clair.

### 3.4 Permissions least-privilege

- `permissions: contents: read` au niveau global
- `packages: write` uniquement sur `tag-and-push`
- `security-events: write` uniquement sur `scan-images` (upload SARIF)
- `allow_issue_writing: false` sur ZAP : sans cela, l'action tente de créer une
  issue GitHub et échoue en 403 avec des permissions restreintes

### 3.5 Divers

- `concurrency` avec `cancel-in-progress` pour annuler les runs obsolètes
- `timeout-minutes` sur tous les jobs
- `workflow_dispatch` pour permettre un lancement manuel
- Nom d'image forcé en minuscules (ghcr.io refuse les majuscules)
- `tag-and-push`, `deploy-staging` et `dast` conditionnés à
  `github.event_name != 'pull_request'` : une PR ne doit pas publier ni déployer
- Artefact `node_modules` supprimé : aucun job aval ne le téléchargeait,
  plusieurs minutes perdues par run. Remplacé par le cache npm de `setup-node`
- Trivy : 2 appels au lieu de 3 (chaque appel retélécharge la base de vulns)

---

## 4. Tests et couverture

### 4.1 Tests de non-régression sur la validation du sandboxId

La validation a été extraite dans `backend/utils/sandboxId.js`, module isolé et
testable sans charger le routeur Express (donc sans Groq, Docker ni MongoDB).

`backend/tests/sandboxId.test.js` — **35 tests**, 100 % de couverture du module :

| Catégorie | Cas testés |
|---|---|
| Identifiants légitimes | format canonique, unicité sur 1000 tirages |
| Injection de commande OS | `;`, `&&`, `\|`, `$( )`, backticks, `\n`, `&` |
| Path traversal | `../`, chemins absolus, séparateurs Windows |
| Injection d'argument | `-f`, `--format`, `-v`, `--rm`, `--privileged` |
| Entrées malformées | types non-string, chaîne vide, longueur excessive |

### 4.2 Durcissement de la regex

La regex effective était `/^[a-zA-Z0-9_-]+$/`. Elle bloquait l'injection de
commande et le path traversal, mais autorisait un identifiant commençant par un
tiret. Un `sandboxId` valant `-f` ou `--format` aurait été passé à
`execFile("docker", [...])` et interprété par docker comme une **option** et non
comme une valeur : c'est de l'injection d'argument, une classe distincte que
`execFile` ne protège pas.

Regex alignée sur le format réellement produit : `/^sandbox-[a-zA-Z0-9]+$/`,
avec une borne de longueur à 64 caractères.

### 4.3 PRNG non cryptographique (SonarQube S2245, CWE-338)

`Math.random()` était utilisé pour le suffixe d'identifiant. Remplacé par
`randomBytes(6).toString("hex")` de `node:crypto`. Au-delà de la conformité à la
règle : un identifiant devinable permettrait d'énumérer les timestamps et de
cibler la sandbox d'un autre utilisateur.

### 4.4 Ingestion du rapport de couverture

Jest écrit des chemins relatifs à `backend/` (`SF:utils/sandboxId.js`), alors que
le scanner Sonar tourne à la racine du dépôt. Sans réécriture, Sonar ne résout
aucun fichier, jette silencieusement les données et affiche **0,0 %** alors que
les tests couvrent réellement le code.

Step ajouté avant le scan :

```bash
sed -i 's|^SF:|SF:backend/|' backend/coverage/lcov.info
```

### 4.5 Périmètre de la couverture

`sonar.coverage.exclusions` restreint le calcul de couverture à `backend/utils/**`.

Les fichiers exclus **restent analysés** pour la sécurité, la fiabilité et la
maintenabilité : seul le ratio de couverture les ignore. Ils orchestrent des
appels externes (Groq, Docker, MongoDB) dont le test unitaire exigeait une
infrastructure de mocks hors périmètre du stage.

Le plan SonarCloud Free ne permet pas d'assigner une Quality Gate personnalisée
à un projet (message *« your current plan does not allow this »*). L'ajustement
a donc été fait côté dépôt — ce qui présente l'avantage d'être versionné et
auditable, contrairement à un réglage stocké côté serveur.

---

## 5. Vulnérabilités de dépendances (Snyk)

### 5.1 `proxy-addr@2.0.7` — User Impersonation (Critical)

`SNYK-JS-PROXYADDR-19812342`, introduite par `express@4.22.3 > proxy-addr@2.0.7`.

`proxy-addr` interprète l'en-tête `X-Forwarded-For` pour déterminer l'IP réelle
du client. Une usurpation à ce niveau permet de contourner un rate limiting ou
une restriction par IP.

Express épinglant la version 2.0.7, aucune montée directe n'était possible.
Correction par `overrides` dans `backend/package.json` :

```json
"overrides": {
  "proxy-addr": "^2.0.8"
}
```

> Un `override` masque la contrainte du parent sans la satisfaire. À retirer dès
> qu'Express publie une version embarquant nativement `proxy-addr@2.0.8`.

**Point notable :** `npm audit` ne détectait pas cette CVE (base GitHub Advisory
non encore à jour), seul Snyk l'a vue. C'est l'illustration concrète de
l'intérêt d'avoir deux outils SCA dans la chaîne.

### 5.2 `qs` — 3 CVE moderate

Corrigées par `npm audit fix` (montée de patch transitive via `express` et
`body-parser`, sans `--force`).

---

## 6. Durcissement des images Docker

### 6.1 `backend/Dockerfile`

- Passage de `node:18-alpine` (fin de vie, 19 CVE Alpine) à **`node:22-alpine`**
- Build multi-stage : les dépendances sont installées dans une étape `deps`
- `apk upgrade --no-cache` puis suppression du CLI npm
  (`/usr/local/lib/node_modules/npm`, `npm`, `npx`) : inutile en runtime et
  concentrant une grande partie des CVE
- `USER node` : le conteneur ne s'exécute jamais en root

### 6.2 `database/Dockerfile`

- `apt-get upgrade` pour les correctifs Ubuntu 22.04
- Suppression de `/opt/js-yaml` (3 CVE, parseur embarqué pour l'entrypoint ;
  la configuration se fait par variables d'environnement)
- **Suppression de `gosu` : 56 CVE**, binaire Go non patchable. Il ne servait
  qu'à l'entrypoint pour passer de root à `mongod`. Remplacé par `USER mongodb`,
  ce qui est de toute façon la bonne pratique : le conteneur ne démarre jamais
  en root, au lieu de démarrer root puis de redescendre.
- Suppression des binaires clients inutiles en runtime (`mongodump`,
  `mongorestore`, `mongoexport`, `bsondump`…)

### 6.3 `COPY . .` → copie explicite (SonarQube docker:S6470, High)

Une copie récursive embarque tout le contexte de build : un `.env` oublié, une
clé, l'historique `.git` complet. Le `.dockerignore` mitige, mais Sonar ne peut
pas le vérifier et une exclusion manquante passerait inaperçue.

La copie explicite inverse la logique : tout est exclu sauf ce qui est nommé.

```dockerfile
COPY --chown=node:node package.json ./
COPY --chown=node:node server.js ./
COPY --chown=node:node routes ./routes
COPY --chown=node:node services ./services
COPY --chown=node:node utils ./utils
COPY --chown=node:node sandbox ./sandbox
```

---

## 7. Publication des résultats de scan

- **Artefacts** : rapport Trivy complet (`CRITICAL,HIGH,MEDIUM,LOW`) par service,
  conservé 5 jours
- **GitHub Security and quality** : scan au format SARIF publié via
  `github/codeql-action/upload-sarif`. Le code scanning n'étant disponible sur
  un dépôt privé qu'avec GitHub Advanced Security, le step est en
  `continue-on-error` et échoue en 403 sans licence.
- **Notification mail** : job `notify-scan-results` séparé, en `if: always()`,
  afin que le rapport parte **aussi et surtout** quand un scan échoue.
  En production, ce job utiliserait un compte de service SMTP dédié
  (SendGrid, Mailgun, boîte technique) et jamais un compte personnel.

---

## 8. Étapes 9 et 10 — déploiement et DAST

`deploy-staging` et `dast-owasp-zap` sont marqués `continue-on-error: true`.

Ils requièrent un cluster Kubernetes de staging et une application déployée et
joignable, hors du périmètre du stage. Les jobs sont conservés dans le workflow
pour que la chaîne reste complète et immédiatement exploitable : renseigner le
secret `KUBE_CONFIG`, remplacer `STAGING_URL` par l'adresse réelle et retirer
les deux `continue-on-error` suffit à les activer.

Le job de déploiement contrôle explicitement la présence de `KUBE_CONFIG` et
échoue avec un message clair, plutôt que de laisser `kubectl` se rabattre
silencieusement sur `localhost:8080` avec une erreur de connexion illisible.

---

## 9. Résultats

| Indicateur | Valeur |
|---|---|
| Note Sécurité (SonarCloud) | **A** — 0 issue |
| Note Fiabilité | **A** — 0 issue |
| Note Revue de sécurité | **A** — 0 hotspot |
| Issues ouvertes (tout le code) | **0** |
| Issues de sécurité fermées (30 j) | **40** |
| CVE Critical bloquée avant publication | 1 (`proxy-addr`) |
| CVE supprimées de l'image database | 59 (`gosu` 56 + `js-yaml` 3) |
| Tests de non-régression | 35, tous verts |
| Actions pinnées par SHA | 14 / 14 |
| Images publiées sur ghcr.io | frontend, backend, database |

---

## 10. Principes appliqués tout au long de la remédiation

- **Aucune CVE ignorée** (`.trivyignore` / `ignore-unfixed`) sans une vraie
  tentative de correction d'abord
- **Défense en profondeur** : validation en entrée **et** exécution sécurisée
  (`execFile`), pas l'un ou l'autre
- **SHA vérifiés uniquement** (`git ls-remote` direct), jamais inventés
- **Séparation code applicatif / code généré** : les sandboxes générées
  dynamiquement ne doivent jamais polluer le repo ni l'analyse de qualité
- **Suppression plutôt que masquage** : retirer `gosu` supprime 56 CVE *et*
  durcit le conteneur ; c'est une amélioration réelle, pas un contournement
  de scanner
- **Tout arbitrage est tracé** : les choix de périmètre (couverture, jobs non
  bloquants) sont versionnés et justifiés dans ce document, pas dissimulés
  dans une configuration serveur