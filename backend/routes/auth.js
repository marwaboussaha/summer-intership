import express from "express";
import { registerUser, loginUser, toPublicUser } from "../services/authService.js";
import requireAuth from "../middleware/auth.js";
import User from "../../database/models/User.js";

const router = express.Router();

// POST /api/auth/signup
router.post("/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name?.trim() || !email?.trim() || !password) {
      return res.status(400).json({ success: false, error: "Nom, email et mot de passe requis." });
    }
    if (password.length < 8) {
      return res.status(400).json({ success: false, error: "Le mot de passe doit contenir au moins 8 caractères." });
    }

    const { user, token } = await registerUser({ name: name.trim(), email: email.trim(), password });
    res.status(201).json({ success: true, user, token });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, error: err.message || "Erreur serveur." });
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email?.trim() || !password) {
      return res.status(400).json({ success: false, error: "Email et mot de passe requis." });
    }

    const { user, token } = await loginUser({ email: email.trim(), password });
    res.json({ success: true, user, token });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, error: err.message || "Erreur serveur." });
  }
});

// GET /api/auth/me — vérifie le token et renvoie l'utilisateur courant
router.get("/me", requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, error: "Utilisateur introuvable." });
    }
    res.json({ success: true, user: toPublicUser(user) });
  } catch (err) {
    res.status(500).json({ success: false, error: "Erreur serveur." });
  }
});

export default router;