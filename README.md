# VoiceCraft — Générateur d'app piloté par la voix

Tu parles → le navigateur transcrit ta voix en texte (gratuit, sans clé) →
le texte part vers ton backend Node.js → le backend construit un prompt et
interroge **Groq** (gratuit, très rapide) → Groq renvoie une action structurée
(ex: "crée une page de connexion") avec le code React généré → le front
l'affiche, prêt à copier.

```
Voix (micro) --Web Speech API--> Texte --fetch--> Backend Node/Express
                                                        |
                                                        v
                                                  Prompt --> Groq API
                                                        |
                                                        v
                                              JSON { action, code, ... }
                                                        |
                                                        v
                                              Front React (affichage)
```

## Structure du projet

```
voice-app-generator/
├── backend/
│   ├── server.js              # démarre le serveur Express
│   ├── routes/generate.js     # route POST /api/generate
│   ├── services/groqService.js# construit le prompt + appelle Groq
│   ├── .env.example           # à copier en .env
│   └── package.json
└── frontend/
    ├── index.html
    ├── vite.config.js
    ├── package.json
    └── src/
        ├── main.jsx
        ├── App.jsx             # assemble les 3 panneaux
        ├── App.css             # thème "console audio" (signature: anneau réactif)
        ├── index.css           # tokens de couleur/typo
        └── components/
            ├── VoiceConsole.jsx    # bouton micro + reconnaissance vocale + anneau réactif
            ├── TranscriptFeed.jsx  # journal des commandes reconnues
            └── OutputPanel.jsx     # affiche l'action + le code généré par Groq
```

## Étape 1 — Récupérer une clé Groq (gratuite)

1. Va sur https://console.groq.com/keys
2. Crée un compte (gratuit).
3. Génère une clé API (elle commence par `gsk_...`).

## Étape 2 — Installer et lancer le backend

```bash
cd backend
npm install
cp .env.example .env
```

Ouvre `.env` et colle ta clé :

```
GROQ_API_KEY=gsk_ta_vraie_cle
GROQ_MODEL=llama-3.3-70b-versatile
PORT=5000
```

Puis lance le serveur :

```bash
npm run dev
```

Tu dois voir : `✅ Backend VoiceCraft lancé sur http://localhost:5000`

Teste qu'il répond bien :

```bash
curl http://localhost:5000/api/health
```

## Étape 3 — Installer et lancer le frontend

Dans un **autre terminal** :

```bash
cd frontend
npm install
npm run dev
```

Ouvre l'URL affichée (en général http://localhost:5173).

⚠️ Utilise **Chrome ou Edge** (ordinateur) : ce sont les seuls navigateurs qui
implémentent complètement l'API `SpeechRecognition` gratuite utilisée pour la
dictée vocale. Firefox/Safari ne la supportent pas nativement.

## Étape 4 — Utiliser l'application

1. Clique sur le bouton **« Parler »** au centre. Le navigateur te demande
   l'autorisation d'utiliser le micro : accepte.
2. L'anneau autour du bouton réagit en direct au volume de ta voix
   (Web Audio API, purement visuel, aucun son n'est envoyé à un serveur).
3. Dis par exemple : *« Crée une page de connexion avec email et mot de passe »*.
4. Dès que tu marques une pause, le texte final apparaît dans le **journal**
   (panneau du milieu) et part automatiquement vers le backend.
5. Le backend compose un prompt et interroge Groq. Pendant ce temps, le
   panneau de droite affiche « Groq compose ta page… ».
6. Le résultat apparaît : nom du composant, explication, et le **code React
   complet**, avec un bouton « Copier le code ».
7. Colle ce code dans un fichier `.jsx` de ton propre projet React pour
   l'utiliser (ex: dans `frontend/src/components/`).

## Comment fonctionne chaque étape techniquement

### 1. Voix → texte (gratuit, dans le navigateur)

`VoiceConsole.jsx` utilise `window.SpeechRecognition` (ou son équivalent
`webkitSpeechRecognition`). C'est une API **native du navigateur**, donc
aucune bibliothèque à installer et aucune clé API nécessaire pour cette
partie. Elle transcrit la voix en continu (`continuous = true`) et donne des
résultats provisoires (`interimResults`) pendant que tu parles, puis un
résultat final quand tu marques une pause.

### 2. Anneau réactif (signature visuelle)

En parallèle, `getUserMedia({ audio: true })` + un `AnalyserNode` de la Web
Audio API lisent le niveau sonore en direct pour dessiner l'anneau autour du
bouton micro sur un `<canvas>`. C'est purement visuel : ce flux audio brut
n'est jamais envoyé nulle part, seul le **texte transcrit** part vers le
backend.

### 3. Texte → backend

`App.jsx` reçoit le texte final (`onFinalTranscript`) et fait :

```js
fetch("http://localhost:5000/api/generate", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ transcript: text }),
});
```

### 4. Backend → prompt → Groq

`routes/generate.js` reçoit `{ transcript }` et appelle
`generateActionFromVoice()` dans `services/groqService.js`. Ce service :

- construit un **system prompt** qui explique à Groq son rôle exact
  (comprendre l'intention vocale, choisir une action, générer du code React,
  répondre en JSON strict) ;
- envoie ce prompt + la commande vocale à
  `https://api.groq.com/openai/v1/chat/completions` (API compatible OpenAI) ;
- parse la réponse JSON de Groq (avec un filet de sécurité si le modèle
  ajoute du texte autour du JSON).

### 5. Backend → front → affichage

Le backend renvoie `{ success: true, action: { action, componentName,
fileName, explanation, code, cssHint } }`. `OutputPanel.jsx` affiche cette
action : badge du type d'action, nom de fichier, explication, code
(coloration simple via `<pre><code>`), et un bouton pour copier le code dans
le presse-papiers.

## Personnaliser / aller plus loin

- **Changer le modèle Groq** : modifie `GROQ_MODEL` dans `.env` (ex:
  `llama-3.1-8b-instant` pour encore plus de vitesse).
- **Ajouter l'authentification** : demande à Groq, dans le system prompt, de
  générer aussi un backend Express minimal pour la route `/login` en plus du
  composant React.
- **Écrire le fichier généré sur disque automatiquement** : côté backend, tu
  peux ajouter `fs.writeFileSync()` dans `routes/generate.js` pour créer
  directement le fichier `.jsx` dans un dossier `generated/` du projet, au
  lieu de juste l'afficher à copier-coller.
- **Historique persistant** : remplace le tableau `entries` en mémoire par
  une petite base (SQLite, fichier JSON, etc.) si tu veux garder le journal
  entre deux sessions.

## Dépannage rapide

| Problème | Cause probable |
|---|---|
| Le bouton dit "navigateur non supporté" | Utilise Chrome/Edge, pas Firefox/Safari |
| Erreur `GROQ_API_KEY manquant` | Le fichier `.env` n'existe pas ou est mal rempli dans `backend/` |
| Le front ne reçoit pas de réponse | Vérifie que le backend tourne bien sur le port 5000 et que CORS est actif (déjà activé dans `server.js`) |
| Le JSON de Groq ne se parse pas | Rare, mais `groqService.js` a déjà un filet de sécurité ; réessaie la commande vocale |
