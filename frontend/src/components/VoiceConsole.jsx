import { useEffect, useRef, useState } from "react";

/**
 * VoiceConsole
 * - Utilise l'API Web Speech (native au navigateur, gratuite, sans clé) pour
 *   transformer la voix en texte au fur et à mesure (SpeechRecognition).
 * - Utilise l'API Web Audio (AnalyserNode) UNIQUEMENT pour dessiner l'anneau
 *   réactif autour du bouton micro (aucun envoi audio brut n'est fait).
 * - Quand l'utilisateur arrête de parler, le texte final est envoyé au parent
 *   via onFinalTranscript, qui l'enverra ensuite au backend.
 */
export default function VoiceConsole({ onFinalTranscript, disabled }) {
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [lang, setLang] = useState("fr-FR");
  const [supported, setSupported] = useState(true);

  const recognitionRef = useRef(null);
  const canvasRef = useRef(null);
  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const rafRef = useRef(null);
  const streamRef = useRef(null);

  // --- Reconnaissance vocale (Speech-to-Text natif du navigateur) ---
  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = lang;

    recognition.onresult = (event) => {
      let finalChunk = "";
      let interimChunk = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcriptPiece = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalChunk += transcriptPiece;
        } else {
          interimChunk += transcriptPiece;
        }
      }

      if (finalChunk.trim()) {
        onFinalTranscript(finalChunk.trim());
        setInterim("");
      } else {
        setInterim(interimChunk);
      }
    };

    recognition.onerror = (event) => {
      console.warn("Erreur de reconnaissance vocale :", event.error);
    };

    recognition.onend = () => {
      // Si l'utilisateur n'a pas cliqué "stop", on relance (mode continu réel)
      if (listeningRef.current) {
        try {
          recognition.start();
        } catch {
          /* déjà démarré, on ignore */
        }
      }
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  // ref miroir pour lire "listening" dans le callback onend sans stale closure
  const listeningRef = useRef(false);
  useEffect(() => {
    listeningRef.current = listening;
  }, [listening]);

  // --- Anneau audio réactif (Web Audio API) ---
  const startAudioVisual = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 128;
      source.connect(analyser);

      audioCtxRef.current = audioCtx;
      analyserRef.current = analyser;

      drawRing();
    } catch (err) {
      console.warn("Micro indisponible pour la visualisation :", err);
    }
  };

  const stopAudioVisual = () => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((track) => track.stop());
    audioCtxRef.current?.close();
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
  };

  const drawRing = () => {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) return;

    const ctx = canvas.getContext("2d");
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const size = canvas.width;
    const center = size / 2;
    const baseRadius = size * 0.28;
    const bars = 48;

    const render = () => {
      analyser.getByteFrequencyData(dataArray);
      ctx.clearRect(0, 0, size, size);

      for (let i = 0; i < bars; i++) {
        const value = dataArray[i % bufferLength] / 255;
        const angle = (i / bars) * Math.PI * 2;
        const barLength = 6 + value * 34;

        const x1 = center + Math.cos(angle) * baseRadius;
        const y1 = center + Math.sin(angle) * baseRadius;
        const x2 = center + Math.cos(angle) * (baseRadius + barLength);
        const y2 = center + Math.sin(angle) * (baseRadius + barLength);

        ctx.strokeStyle = `rgba(94, 234, 212, ${0.35 + value * 0.65})`;
        ctx.lineWidth = 3;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }

      rafRef.current = requestAnimationFrame(render);
    };

    render();
  };

  const toggleListening = async () => {
    if (!supported) return;

    if (listening) {
      recognitionRef.current?.stop();
      stopAudioVisual();
      setListening(false);
      setInterim("");
    } else {
      recognitionRef.current?.start();
      await startAudioVisual();
      setListening(true);
    }
  };

  useEffect(() => {
    return () => stopAudioVisual();
  }, []);

  if (!supported) {
    return (
      <div className="voice-console voice-console--unsupported">
        <p>
          Ton navigateur ne supporte pas la reconnaissance vocale native.
          Utilise Chrome ou Edge sur ordinateur pour la dictée automatique.
        </p>
      </div>
    );
  }

  return (
    <div className="voice-console">
      <div className={`voice-ring ${listening ? "is-live" : ""}`}>
        <canvas ref={canvasRef} width={220} height={220} className="voice-canvas" />
        <button
          className={`voice-btn ${listening ? "is-live" : ""}`}
          onClick={toggleListening}
          disabled={disabled}
          aria-pressed={listening}
          aria-label={listening ? "Arrêter l'écoute" : "Démarrer l'écoute vocale"}
        >
          <span className="voice-btn__dot" />
          {listening ? "Écoute…" : "Parler"}
        </button>
      </div>

      <div className="voice-meta">
        <select
          value={lang}
          onChange={(e) => setLang(e.target.value)}
          disabled={listening}
          className="voice-lang"
          aria-label="Langue de dictée"
        >
          <option value="fr-FR">Français</option>
          <option value="en-US">English</option>
          <option value="ar-SA">العربية</option>
        </select>
        <p className="voice-interim">
          {interim || "Clique sur « Parler » et décris la page ou la fonctionnalité à créer."}
        </p>
      </div>
    </div>
  );
}
