import client from "prom-client";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import generateRouter from "./routes/generate.js";
import connectDB from "./database/db.js";
import authRoutes from "./routes/auth.js";
import exportPdfRouter from "./routes/export-pdf.js"; // ⭐ nouvelle route

dotenv.config();

const app = express();

// Ne pas divulguer la techno utilisée (X-Powered-By: Express)
app.disable("x-powered-by");

// ---------------------------------------------------------------------------
// Métriques Prometheus
// ---------------------------------------------------------------------------
client.collectDefaultMetrics();

const httpDuration = new client.Histogram({
  name: "http_request_duration_seconds",
  help: "Duree des requetes HTTP",
  labelNames: ["method", "route", "status"],
  buckets: [0.05, 0.1, 0.3, 0.5, 1, 2, 5],
});

app.use((req, res, next) => {
  const end = httpDuration.startTimer();
  res.on("finish", () => {
    end({
      method: req.method,
      route: req.route?.path ?? "unmatched",
      status: res.statusCode,
    });
  });
  next();
});

app.get("/api/metrics", async (_req, res) => {
  res.set("Content-Type", client.register.contentType);
  res.end(await client.register.metrics());
});

// ---------------------------------------------------------------------------
// CORS restreint aux origines autorisées (au lieu de cors() ouvert à tous)
// FRONTEND_URL peut contenir plusieurs origines séparées par des virgules, ex :
//   https://voicecraft-plateform.website,https://app.voicecraft-plateform.website
// Les requêtes de même origine (le site et l'API sur le même domaine) sont
// toujours acceptées.
// ---------------------------------------------------------------------------
const allowedOrigins = [
  "http://localhost:5173", // front en dev (Vite)
  ...(process.env.FRONTEND_URL || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
];

app.use(
  cors((req, callback) => {
    const origin = req.header("Origin");
    const host = req.header("X-Forwarded-Host") || req.header("Host");
    const proto = req.header("X-Forwarded-Proto") || "https";
    const sameOrigin = Boolean(origin && host && origin === `${proto}://${host}`);

    // origin est undefined pour les requêtes sans en-tête Origin (curl, mobile...)
    if (!origin || sameOrigin || allowedOrigins.includes(origin)) {
      return callback(null, { origin: true, credentials: true });
    }
    return callback(new Error("Not allowed by CORS"));
  })
);

app.use(express.json({ limit: "1mb" }));

// Fonction utilitaire pour éviter l'injection de logs (CRLF / faux logs)
function sanitizeForLog(value) {
  return String(value)
    .replace(/[\r\n]/g, "") // supprime retours à la ligne / retours chariot
    .slice(0, 200); // limite la longueur
}

// Petit log utile pendant le dev (on ignore /api/metrics, scrapé toutes les 15 s)
app.use((req, _res, next) => {
  if (req.url !== "/api/metrics") {
    console.log(
      `${new Date().toISOString()} ${sanitizeForLog(req.method)} ${sanitizeForLog(req.url)}`
    );
  }
  next();
});

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "voicecraft-backend" });
});

// Connexion à la base de données
connectDB();

// Routes
app.use("/api/auth", authRoutes);
app.use("/api", generateRouter);
app.use("/api", exportPdfRouter); // ⭐ /api/export-pdf

// ---------------------------------------------------------------------------
// Gestion d'erreurs : toujours répondre en JSON (jamais la page HTML d'Express)
// ---------------------------------------------------------------------------
app.use((err, _req, res, _next) => {
  if (err && err.message === "Not allowed by CORS") {
    return res.status(403).json({ error: "Origine non autorisée" });
  }
  console.error("Erreur serveur :", sanitizeForLog(err && err.message));
  const status = err && Number.isInteger(err.status) ? err.status : 500;
  res.status(status).json({ error: "Une erreur interne est survenue." });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Backend VoiceCraft lancé sur http://localhost:${PORT}`);
});