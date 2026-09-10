import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import generateRouter from "./routes/generate.js";
import connectDB from "../database/db.js";
import authRoutes from "./routes/auth.js";
import exportPdfRouter from "./routes/export-pdf.js"; // ⭐ nouvelle route

dotenv.config();

const app = express();

// Ne pas divulguer la techno utilisée (X-Powered-By: Express)
app.disable("x-powered-by");

// CORS restreint aux origines autorisées (au lieu de cors() ouvert à tous)
const allowedOrigins = [
  "http://localhost:5173", // front en dev (Vite)
  process.env.FRONTEND_URL, // front en prod, ex: https://voicecraft.monapp.com
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // origin est undefined pour les requêtes sans en-tête Origin (curl, mobile...)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

app.use(express.json({ limit: "1mb" }));

// Fonction utilitaire pour éviter l'injection de logs (CRLF / faux logs)
function sanitizeForLog(value) {
  return String(value)
    .replace(/[\r\n]/g, "") // supprime retours à la ligne / retours chariot
    .slice(0, 200); // limite la longueur
}

// Petit log utile pendant le dev
app.use((req, _res, next) => {
  console.log(
    `${new Date().toISOString()} ${sanitizeForLog(req.method)} ${sanitizeForLog(req.url)}`
  );
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

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Backend VoiceCraft lancé sur http://localhost:${PORT}`);
});