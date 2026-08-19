import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./App.css";

const BACKEND_URL = "http://localhost:5000";
const MAX_CHARS = 500;
const MAX_FILE_SIZE = 5 * 1024 * 1024;

const SUGGESTIONS = [
  "Une todo app avec React et Flask...",
  "Un chat temps réel avec WebSocket...",
  "Un dashboard e-commerce avec gestion de stock...",
];

const PILLS = ["Voice to app", "Flask / FastAPI", "Dockerisé", "Auto-correction" ,"Full-stack"];

const FEATURES = [
  {
    icon: "⚡",
    title: "Génération ultra-rapide",
    desc: "Du prompt vocal au projet complet en quelques secondes, sans configuration manuelle.",
  },
  {
    icon: "🧠",
    title: "IA agentique auto-correctrice",
    desc: "Nos agents détectent et corrigent automatiquement les erreurs avant de vous livrer le code.",
  },
  {
    icon: "🐳",
    title: "Sandbox Dockerisée instantanée",
    desc: "Chaque projet est containerisé et lancé en direct, prêt à être testé immédiatement.",
  },
  {
    icon: "🔒",
    title: "Code privé & sécurisé",
    desc: "Vos prompts et vos projets générés restent confidentiels et ne sont jamais partagés.",
  },
];

const STATS = [
  { value: "< 10s", label: "Temps moyen de génération" },
  { value: "100%", label: "Projets full-stack" },
  { value: "24/7", label: "Disponibilité de la plateforme" },
];

export default function App() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState("idle"); // idle | loading | done | error
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null); // { action, files, explanation } renvoyé par Groq

  // ⭐ Étape 05 : mémorise la sandbox active pour permettre l'ajustement
  // vocal itératif (même conteneur/port réutilisés tant qu'on ne démarre
  // pas un "nouveau projet").
  const [activeSandbox, setActiveSandbox] = useState(null); // { id, port, files: [{path, content}] }

  const [draft, setDraft] = useState("");
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);

  const [attachedFile, setAttachedFile] = useState(null); // { name, size, content }
  const fileInputRef = useRef(null);

  // Reconnaissance vocale légère pour le champ de saisie de la hero section.
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.lang = "fr-FR";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setDraft((prev) => (prev ? `${prev} ${transcript}` : transcript).slice(0, MAX_CHARS));
    };
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);

    recognitionRef.current = recognition;
  }, []);

  // Restaure la session (nom d'utilisateur) si un token valide est déjà stocké.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem("voicecraft_auth");
      if (raw) {
        const { user: storedUser } = JSON.parse(raw);
        if (storedUser?.name) setUser(storedUser);
      }
    } catch {
      window.localStorage.removeItem("voicecraft_auth");
    }
  }, []);

  const toggleMic = () => {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const handleFileButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // permet de re-sélectionner le même fichier plus tard
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      setError("Le fichier dépasse la taille maximale autorisée (5 Mo).");
      setStatus("error");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setAttachedFile({
        name: file.name,
        size: file.size,
        content: reader.result, // base64 (data URL)
      });
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveFile = () => {
    setAttachedFile(null);
  };

  const handleFinalTranscript = async (text) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    setStatus("loading");
    setError(null);
    setResult(null);

    try {
      const res = await fetch(`${BACKEND_URL}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userText: trimmed,
          // ⭐ Étape 05 : si une sandbox est déjà active, on l'indique au
          // backend — ça déclenche le mode itération/modification.
          sandboxId: activeSandbox?.id,
          projectContext: {
            existingFiles: activeSandbox?.files?.map((f) => f.path) || [],
            existingFilesContent: activeSandbox?.files || [],
            currentPort: activeSandbox?.port,
            dbSchema: {},
          },
          file: attachedFile
            ? { name: attachedFile.name, content: attachedFile.content }
            : null,
        }),
      });

      const data = await res.json();

      // ⭐ CORRECTION : le backend ne renvoie jamais de champ "success".
      // En cas d'échec, groqService/generate.js renvoient soit un statut HTTP
      // d'erreur (res.ok === false), soit { error: "..." } avec un statut 200
      // (cas où le LLM lui-même a refusé une action non autorisée).
      if (!res.ok) {
        throw new Error(data.error || "Erreur inconnue du serveur.");
      }
      if (data.error) {
        throw new Error(data.error);
      }

      setResult(data); // { action, files, explanation, sandboxId, sandbox }

      // ⭐ Fusionne les fichiers modifiés/ajoutés avec ceux déjà connus,
      // pour garder en mémoire l'état complet du projet côté front —
      // nécessaire pour que la PROCHAINE itération vocale ait le bon contexte.
      setActiveSandbox((prev) => {
        const previousFiles = prev?.files || [];
        const updatedPaths = new Set(data.files.map((f) => f.path));
        const untouched = previousFiles.filter((f) => !updatedPaths.has(f.path));
        return {
          id: data.sandboxId,
          port: data.sandbox.port,
          files: [...untouched, ...data.files],
        };
      });

      setStatus("done");
    } catch (err) {
      setError(err.message);
      setStatus("error");
    }
  };

  const handleBuild = () => {
    handleFinalTranscript(draft);
    setDraft("");
    setAttachedFile(null);
  };

  // ⭐ Téléchargement de la page générée en PDF
  // ⭐ CORRECTION MAJEURE : abandon de l'approche fetch() + Blob +
  // createObjectURL, qui s'est révélée peu fiable (fichiers corrompus).
  // On laisse maintenant le navigateur télécharger directement l'URL,
  // en s'appuyant sur l'en-tête "Content-Disposition: attachment" déjà
  // renvoyé par le serveur — c'est la méthode native et éprouvée pour
  // les téléchargements de fichiers binaires, sans aucune manipulation
  // JavaScript intermédiaire pouvant corrompre les données.
  const handleDownloadPdf = () => {
    if (!result?.sandbox?.url || !result?.entryRoute) return;

    const cleanUrl = `${result.sandbox.url}${result.entryRoute}`;
    const exportUrl = `${BACKEND_URL}/api/export-pdf?url=${encodeURIComponent(cleanUrl)}`;

    // Navigation directe : le navigateur gère lui-même le téléchargement
    // binaire, sans passer par un Blob JavaScript intermédiaire.
    window.location.href = exportUrl;
  };

  const handleSuggestionClick = (suggestion) => {
    setDraft(suggestion.replace(/\.\.\.$/, ""));
  };

  // Redirige vers la connexion (la page de login propose elle-même le lien
  // "Première fois ? Créer un compte" pour les nouveaux utilisateurs).
  const handleConnexionClick = () => {
    navigate("/login");
  };

  const handleLogout = () => {
    window.localStorage.removeItem("voicecraft_auth");
    setUser(null);
  };

  return (
    <div className="app">
      <nav className="site-nav">
        <div className="site-nav__brand">
          <span className="site-nav__mark">◎</span>
          <span className="site-nav__name">VoiceCraft</span>
        </div>
        <div className="site-nav__links">
          <a href="#features">Fonctionnalités</a>
          <a href="#" onClick={(e) => e.preventDefault()}>Exemples</a>
          <a href="#" onClick={(e) => e.preventDefault()}>GitHub</a>
        </div>
        {user ? (
          <div className="site-nav__user">
            <span className="site-nav__user-avatar">{user.name.trim().charAt(0).toUpperCase()}</span>
            <span className="site-nav__user-name">{user.name}</span>
            <button className="site-nav__logout" type="button" onClick={handleLogout} title="Se déconnecter">
              ⎋
            </button>
          </div>
        ) : (
          <button className="site-nav__cta" type="button" onClick={handleConnexionClick}>
            Connexion
          </button>
        )}
      </nav>

      <section className="hero">
        <span className="hero__badge">
          <span className="hero__badge-dot" />
          Génération applicative par IA agentique
        </span>

        <h1 className="hero__title">
          VoiceCraft <span className="hero__title-accent">Studio Vocal</span>
        </h1>

        <p className="hero__subtitle">
          Décrivez votre application, à voix haute ou par écrit. Nos agents génèrent
          un projet full-stack containerisé et l&apos;injectent en direct dans une sandbox — prêt à tester.
        </p>

        <div className="hero__pills">
          {PILLS.map((pill) => (
            <span className="hero__pill" key={pill}>{pill}</span>
          ))}
        </div>

        <div className="hero-input">
          <textarea
            className="hero-input__textarea"
            placeholder={
              activeSandbox
                ? "Décrivez la modification à apporter (ex: ajoute un lien mot de passe oublié)"
                : "Une application météo qui récupère des données en direct depuis une API"
            }
            value={draft}
            maxLength={MAX_CHARS}
            disabled={status === "loading"}
            onChange={(e) => setDraft(e.target.value)}
          />

          {attachedFile && (
            <div className="hero-input__file-chip">
              <span className="hero-input__file-icon">📎</span>
              <span className="hero-input__file-name" title={attachedFile.name}>
                {attachedFile.name}
              </span>
              <button
                type="button"
                className="hero-input__file-remove"
                onClick={handleRemoveFile}
                aria-label="Retirer le fichier joint"
              >
                ✕
              </button>
            </div>
          )}

          <div className="hero-input__footer">
            <span className="hero-input__counter">{draft.length}/{MAX_CHARS}</span>

            <input
              type="file"
              ref={fileInputRef}
              className="hero-input__file-input"
              onChange={handleFileChange}
              hidden
            />
            <button
              type="button"
              className="hero-file-btn"
              onClick={handleFileButtonClick}
              disabled={status === "loading"}
              aria-label="Joindre un fichier important"
              title="Joindre un fichier (spécifications, schéma, exemple...)"
            >
              +
            </button>

            <button
              type="button"
              className={`hero-mic-btn${isListening ? " is-live" : ""}`}
              onClick={toggleMic}
              disabled={status === "loading" || !recognitionRef.current}
              aria-label={isListening ? "Arrêter l'écoute" : "Dicter la description"}
              title={recognitionRef.current ? "Dicter la description" : "Reconnaissance vocale non supportée par ce navigateur"}
            >
              🎙
            </button>
            <button
              type="button"
              className="hero-build-btn"
              onClick={handleBuild}
              disabled={status === "loading" || !draft.trim()}
            >
              {status === "loading"
                ? "⏳ Génération..."
                : activeSandbox
                ? "🔧 Appliquer la modification"
                : "⚡ Générer l'app"}
            </button>
          </div>
        </div>

        {status === "error" && error && (
          <p className="hero-input__error">{error}</p>
        )}

        {/* ⭐ Étape 04 (Consultation Live) : message + redirection vers l'app générée.
            C'est le seul retour affiché après une génération réussie. */}
        {status === "done" && result?.sandbox?.previewUrl && (
          <div className="hero-sandbox-ready">
            <div className="hero-sandbox-ready__icon">
              {result.sandbox.hotReload ? "🔥" : "✅"}
            </div>
            <div className="hero-sandbox-ready__text">
              <strong>
                {result.sandbox.hotReload
                  ? "Modification injectée à chaud !"
                  : "Votre application est prête !"}
              </strong>
              <p>{result.explanation || "Elle tourne dans une sandbox isolée, prête à tester."}</p>
            </div>
            <a
              href={result.sandbox.previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hero-sandbox-ready__button"
            >
              Ouvrir l&apos;application ↗
            </a>
            <button
              type="button"
              className="hero-sandbox-ready__pdf-button"
              onClick={handleDownloadPdf}
              title="Télécharger cette page en PDF"
            >
              📄 PDF
            </button>
          </div>
        )}

        {/* ⭐ Étape 05 (Ajustement Vocal) : indique le mode itération et
            permet, si vraiment voulu, d'abandonner ce projet pour repartir
            de zéro sur quelque chose de différent. */}
        {activeSandbox && (
          <div className="hero-iteration-bar">
            <span>
              🎙️ <strong>Pour modifier cette app :</strong> tapez votre demande
              dans le champ ci-dessus (ex: "ajoute un bouton mot de passe oublié"),
              puis cliquez sur "Appliquer la modification". Pas besoin d'autre chose.
            </span>
            <button
              type="button"
              className="hero-iteration-bar__reset"
              onClick={() => {
                const confirmed = window.confirm(
                  "Ceci va abandonner le projet actuel et repartir de zéro. Vos modifications en cours seront perdues. Continuer ?"
                );
                if (!confirmed) return;
                setActiveSandbox(null);
                setResult(null);
                setStatus("idle");
              }}
              title="Abandonne ce projet et repart sur une application complètement différente"
            >
              🗑️ Abandonner et repartir à zéro
            </button>
          </div>
        )}

        <div className="hero-suggestions">
          <span className="hero-suggestions__label">Essayer :</span>
          {SUGGESTIONS.map((suggestion) => (
            <button
              type="button"
              className="hero-suggestions__chip"
              key={suggestion}
              onClick={() => handleSuggestionClick(suggestion)}
              title={suggestion}
            >
              {suggestion}
            </button>
          ))}
        </div>
      </section>

      <section className="features" id="features">
        <span className="features__label">POURQUOI VOICECRAFT</span>
        <h2 className="features__title">Une plateforme pensée pour aller vite</h2>
        <p className="features__subtitle">
          De la voix au code déployé, sans friction. Voici ce qui distingue notre atelier de génération.
        </p>

        <div className="features__grid">
          {FEATURES.map((f) => (
            <div className="feature-card" key={f.title}>
              <span className="feature-card__icon">{f.icon}</span>
              <h3 className="feature-card__title">{f.title}</h3>
              <p className="feature-card__desc">{f.desc}</p>
            </div>
          ))}
        </div>

        <div className="features__stats">
          {STATS.map((s) => (
            <div className="stat" key={s.label}>
              <span className="stat__value">{s.value}</span>
              <span className="stat__label">{s.label}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}