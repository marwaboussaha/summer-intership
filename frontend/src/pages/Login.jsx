import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import "./auth.css";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password.trim()) {
      setError("Merci de renseigner ton email et ton mot de passe.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("http://localhost:5000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Identifiants incorrects.");
      }

      window.localStorage.setItem(
        "voicecraft_auth",
        JSON.stringify({ token: data.token, user: data.user })
      );
      navigate("/");
    } catch (err) {
      setError(err.message || "Impossible de se connecter pour le moment.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <Link to="/" className="auth-back">← Retour à l&apos;accueil</Link>

        <div className="auth-card__brand">
          <span className="auth-card__mark">◎</span>
          <span className="auth-card__name">VoiceCraft</span>
        </div>

        <h1 className="auth-card__title">Connexion</h1>
        <p className="auth-card__subtitle">
          Connecte-toi pour retrouver tes projets générés et ton historique.
        </p>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="auth-field">
            <label htmlFor="login-email">Email</label>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="toi@exemple.com"
            />
          </div>

          <div className="auth-field">
            <label htmlFor="login-password">Mot de passe</label>
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          <button type="submit" className="auth-submit" disabled={loading}>
            {loading ? "Connexion..." : "Se connecter"}
          </button>
        </form>

        <p className="auth-switch">
          Première fois ici ? <Link to="/signup">Créer un compte</Link>
        </p>
      </div>
    </div>
  );
}