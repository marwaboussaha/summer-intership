import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // En développement local, /api/... est relayé vers le backend (port 5000).
      // En production, c'est l'ALB qui redirige /api vers le backend.
      "/api": "http://localhost:5000",
    },
  },
});