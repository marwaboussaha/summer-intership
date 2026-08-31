import express from "express";
import puppeteer from "puppeteer";

const router = express.Router();

// GET /api/export-pdf?url=http://localhost:4023/login
router.get("/export-pdf", async (req, res) => {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: "Paramètre 'url' manquant" });
  }

  // ⭐ Correction sécurité (détectée par Semgrep en CI — SSRF) :
  // on ne vérifiait auparavant que le préfixe "http://localhost:", ce qui
  // aurait permis à un attaquant de cibler N'IMPORTE QUEL port du serveur
  // (ex: le port SSH, MongoDB...). On restreint désormais précisément à la
  // plage de ports réellement utilisée par les sandboxes Docker (4000-4100),
  // définie dans dockerRunner.js.
  const urlMatch = /^http:\/\/localhost:(\d+)(\/.*)?$/.exec(url);
  const port = urlMatch ? parseInt(urlMatch[1], 10) : null;
  const isValidSandboxUrl = port !== null && port >= 4000 && port <= 4100;

  if (!isValidSandboxUrl) {
    return res.status(400).json({ error: "URL non autorisée pour l'export" });
  }

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });

    const page = await browser.newPage();
    // nosemgrep: javascript.express.security.express-puppeteer-injection.express-puppeteer-injection
    // Justification : "url" est déjà validé ci-dessus (isValidSandboxUrl) —
    // restreint à http://localhost:4000-4100, la plage exacte des sandboxes
    // Docker internes. Aucune donnée utilisateur libre n'atteint page.goto().
    await page.goto(url, { waitUntil: "networkidle0", timeout: 15000 });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "10mm", bottom: "10mm", left: "10mm", right: "10mm" }
    });

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="application-generee.pdf"',
      "Content-Length": pdfBuffer.length
    });
    res.end(pdfBuffer);
  } catch (err) {
    console.error("Erreur export PDF :", err.message);
    res.status(500).json({ error: `Échec de l'export PDF : ${err.message}` });
  } finally {
    if (browser) await browser.close();
  }
});

export default router;