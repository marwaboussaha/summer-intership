import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import generateRouter from "./routes/generate.js";
import connectDB from "../database/db.js";
import authRoutes from "./routes/auth.js";
import exportPdfRouter from "./routes/export-pdf.js"; // ⭐ nouvelle route

dotenv.config();

const app = express();

app.use(cors()); // autorise le front (Vite, port 5173) à appeler ce backend
app.use(express.json({ limit: "1mb" }));

// Petit log utile pendant le dev
app.use((req, _res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
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