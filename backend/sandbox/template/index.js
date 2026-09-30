const express = require("express");
const app = express();

// S5689 : ne pas divulguer la technologie utilisee
app.disable("x-powered-by");

const port = process.env.PORT || 3000;

app.get("/health", (req, res) => res.json({ status: "ok" }));
app.get("/", (req, res) => res.send("VoiceCraft sandbox - en attente de code genere"));

app.listen(port, () => console.log("Sandbox demarree sur le port " + port));