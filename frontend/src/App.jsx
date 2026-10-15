import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./App.css";

const BACKEND_URL = "";
const MAX_CHARS = 500;
const MAX_FILE_SIZE = 5 * 1024 * 1024;

// Génère un ZIP (méthode "stored", sans compression) sans dépendance externe.
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

const crc32 = (bytes) => {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};

function createZip(entries) {
  const enc = new TextEncoder();
  const chunks = [];
  const central = [];
  let offset = 0;
  for (const { path, content } of entries) {
    const name = enc.encode(path);
    const data = enc.encode(content);
    const crc = crc32(data);
    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true);
    local.setUint16(4, 20, true);
    local.setUint16(6, 0x0800, true);
    local.setUint16(8, 0, true);
    local.setUint16(10, 0, true);
    local.setUint16(12, 0x21, true);
    local.setUint32(14, crc, true);
    local.setUint32(18, data.length, true);
    local.setUint32(22, data.length, true);
    local.setUint16(26, name.length, true);
    local.setUint16(28, 0, true);
    chunks.push(new Uint8Array(local.buffer), name, data);
    const cen = new DataView(new ArrayBuffer(46));
    cen.setUint32(0, 0x02014b50, true);
    cen.setUint16(4, 20, true);
    cen.setUint16(6, 20, true);
    cen.setUint16(8, 0x0800, true);
    cen.setUint16(10, 0, true);
    cen.setUint16(12, 0, true);
    cen.setUint16(14, 0x21, true);
    cen.setUint32(16, crc, true);
    cen.setUint32(20, data.length, true);
    cen.setUint32(24, data.length, true);
    cen.setUint16(28, name.length, true);
    cen.setUint32(42, offset, true);
    central.push(new Uint8Array(cen.buffer), name);
    offset += 30 + name.length + data.length;
  }
  const centralSize = central.reduce((s, c) => s + c.length, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true);
  end.setUint16(8, entries.length, true);
  end.setUint16(10, entries.length, true);
  end.setUint32(12, centralSize, true);
  end.setUint32(16, offset, true);
  return new Blob([...chunks, ...central, new Uint8Array(end.buffer)], { type: "application/zip" });
}

// Nom de base des fichiers du site, tiré du <title> de la page générée.
function slugFromHtml(html) {
  const m = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html || "");
  const slug = (m ? m[1] : "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return slug || "page";
}

// Sépare la page générée en <nom>.html / <nom>.css / <nom>.js.
function splitSiteFiles(html) {
  const base = slugFromHtml(html);
  let css = "";
  let js = "";
  let page = html;
  page = page.replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, (_, c) => {
    css += c.trim() + "\n\n";
    return "";
  });
  page = page.replace(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi, (_, c) => {
    js += c.trim() + "\n\n";
    return "";
  });
  if (css) {
    const link = `  <link rel="stylesheet" href="${base}.css">\n`;
    page = page.includes("</head>") ? page.replace("</head>", link + "</head>") : link + page;
  }
  if (js) {
    const tag = `  <script src="${base}.js"></script>\n`;
    page = page.includes("</body>") ? page.replace("</body>", tag + "</body>") : page + "\n" + tag;
  }
  const files = [{ path: `${base}.html`, content: page.trim() + "\n" }];
  if (css) files.push({ path: `${base}.css`, content: css });
  if (js) files.push({ path: `${base}.js`, content: js });
  return files;
}

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

  // Mémorise la sandbox active pour permettre l'ajustement vocal itératif.
  const [activeSandbox, setActiveSandbox] = useState(null); // { id, port, files: [{path, content}] }

  const [draft, setDraft] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [micError, setMicError] = useState(null);
  const recognitionRef = useRef(null);

  const [attachedFile, setAttachedFile] = useState(null); // { name, size, content }
  const fileInputRef = useRef(null);

  // Reconnaissance vocale légère pour le champ de saisie de la hero section.
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setMicError(
        "La dictée vocale n'est pas supportée par ce navigateur (utilisez Chrome ou Edge)."
      );
      return;
    }

    if (!window.isSecureContext) {
      setMicError("La dictée vocale nécessite une connexion HTTPS.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "fr-FR";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setDraft((prev) => (prev ? `${prev} ${transcript}` : transcript).slice(0, MAX_CHARS));
      setMicError(null);
    };
    recognition.onend = () => setIsListening(false);

    recognition.onerror = (event) => {
      console.error("SpeechRecognition error:", event.error);
      setIsListening(false);

      const messages = {
        "not-allowed": "Micro bloqué : autorisez l'accès au micro pour ce site dans les paramètres du navigateur.",
        "service-not-allowed": "Micro bloqué : autorisez l'accès au micro pour ce site dans les paramètres du navigateur.",
        "no-speech": "Aucune voix détectée, réessayez en parlant juste après avoir cliqué sur le micro.",
        "audio-capture": "Aucun microphone détecté sur cet appareil.",
        network: "Erreur réseau pendant la reconnaissance vocale (le service Google Speech n'a pas pu être contacté).",
      };
      setMicError(messages[event.error] || `Erreur de reconnaissance vocale : ${event.error}`);
    };

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
      setMicError(null);
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.error("SpeechRecognition.start() failed:", err);
        setMicError(err.message);
      }
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

      // Lecture sûre : le serveur / WAF / ALB peut répondre en HTML (403, 413, 504...).
      const raw = await res.text();
      let data;
      try {
        data = JSON.parse(raw);
      } catch {
        if (res.status === 403) {
          throw new Error("Requête bloquée par le pare-feu (403). Essayez avec une image plus petite.");
        }
        if (res.status === 413) {
          throw new Error("Requête trop volumineuse (413). Réduisez la taille de l'image jointe.");
        }
        if (res.status === 502 || res.status === 503 || res.status === 504) {
          throw new Error(`Le serveur a mis trop de temps à répondre (${res.status}). Réessayez.`);
        }
        throw new Error(`Réponse invalide du serveur (HTTP ${res.status}).`);
      }

      if (!res.ok) {
        throw new Error(data.error || "Erreur inconnue du serveur.");
      }
      if (data.error) {
        throw new Error(data.error);
      }

      setResult(data); // { action, files, explanation, sandboxId, sandbox }

      // Fusionne les fichiers modifiés/ajoutés avec ceux déjà connus,
      // pour garder le bon contexte à la PROCHAINE itération.
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

  // Page HTML à afficher : renvoyée par le backend, sinon prise dans les fichiers générés.
  const previewHtml = result?.html || (() => {
    const files = activeSandbox?.files || result?.files || [];
    const page = files.find((x) => x.path === "index.html") || files.find((x) => /\.html?$/i.test(x.path));
    return page?.content || null;
  })();

  // Dossier du site généré : code de la page séparé en .html / .css / .js
  // (+ éventuels autres fichiers non-HTML renvoyés par le modèle).
  const rawFiles = (activeSandbox?.files?.length ? activeSandbox.files : result?.files) || [];
  const projectFiles = (() => {
    if (!previewHtml) return rawFiles;
    const split = splitSiteFiles(previewHtml);
    const taken = new Set(split.map((f) => f.path));
    const others = rawFiles.filter((f) => !/\.html?$/i.test(f.path || "") && !taken.has(f.path));
    return [...split, ...others];
  })();
  const projectFolder = `site-${String(activeSandbox?.id || result?.sandboxId || "voicecraft").slice(-8)}`;

  const handleDownloadZip = () => {
    if (projectFiles.length === 0) return;
    const blob = createZip(
      projectFiles.map((f) => ({ path: `${projectFolder}/${f.path}`, content: f.content || "" }))
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${projectFolder}.zip`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  };

  // Téléchargement de la page générée en PDF (impression locale du HTML).
  const handleDownloadPdf = () => {
    if (previewHtml) {
      const printFrame = document.createElement("iframe");
      printFrame.setAttribute("sandbox", "allow-same-origin allow-modals");
      printFrame.style.cssText =
        "position:fixed;right:0;bottom:0;width:1024px;height:768px;border:0;opacity:0;pointer-events:none;";
      const printCss =
        "<style>@page{margin:0}*{-webkit-print-color-adjust:exact !important;print-color-adjust:exact !important}</style>";
      printFrame.srcdoc = previewHtml.includes("</head>")
        ? previewHtml.replace("</head>", printCss + "</head>")
        : printCss + previewHtml;

      printFrame.onload = () => {
        try {
          printFrame.contentWindow.focus();
          printFrame.contentWindow.print();
        } finally {
          setTimeout(() => printFrame.remove(), 60000);
        }
      };
      document.body.appendChild(printFrame);
      return;
    }
    if (!result?.sandbox?.url || !result?.entryRoute) return;

    const cleanUrl = `${result.sandbox.url}${result.entryRoute}`;
    const exportUrl = `${BACKEND_URL}/api/export-pdf?url=${encodeURIComponent(cleanUrl)}`;
    window.location.href = exportUrl;
  };

  const handleSuggestionClick = (suggestion) => {
    setDraft(suggestion.replace(/\.\.\.$/, ""));
  };

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

        {micError && (
          <p className="hero-input__error">🎙️ {micError}</p>
        )}

        {status === "done" && (result?.sandbox?.previewUrl || previewHtml) && (
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
              href={result.sandbox.previewUrl} hidden={Boolean(previewHtml)}
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

        {activeSandbox && (
          <div className="hero-iteration-bar">
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

        {status === "done" && previewHtml && (
          <div className="hero-sandbox-ready" style={{ marginTop: 16 }}>
            <div className="hero-sandbox-ready__text">
              <strong>📁 Dossier du site : {projectFolder}/</strong>
              <p>{projectFiles.map((f) => f.path).join(", ")}</p>
            </div>
            <button
              type="button"
              className="hero-sandbox-ready__pdf-button"
              onClick={handleDownloadZip}
              title="Télécharger les fichiers du site dans un dossier ZIP"
            >
              📦 Télécharger le dossier (.zip)
            </button>
          </div>
        )}

        {status === "done" && previewHtml && (
          <iframe
            title="Apercu de l'application generee"
            srcDoc={previewHtml}
            sandbox="allow-scripts allow-forms allow-modals"
            style={{ width: "100%", maxWidth: 1100, height: 560, border: "1px solid #334155", borderRadius: 12, background: "#fff", marginTop: 16 }}
          />
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