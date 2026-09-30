const express = require("express");
const app = express();
const port = process.env.PORT || 3000;

app.get("/health", (req, res) => res.json({ status: "ok" }));
app.get("/", (req, res) => res.send("VoiceCraft sandbox - en attente de code genere"));

app.listen(port, () => console.log("Sandbox demarree sur le port " + port));
