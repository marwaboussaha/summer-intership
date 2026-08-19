import express from "express";
import puppeteer from "puppeteer";
import fs from "fs";

const router = express.Router();

// GET /api/export-pdf?url=http://localhost:4023/login
router.get("/export-pdf", async (req, res) => {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: "Paramètre 'url' manquant" });
  }

  if (!/^http:\/\/localhost:\d+/.test(url)) {
    return res.status(400).json({ error: "URL non autorisée pour l'export" });
  }

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });

    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "networkidle0", timeout: 15000 });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "10mm", bottom: "10mm", left: "10mm", right: "10mm" }
    });

    // ⭐ DIAGNOSTIC : sauvegarde une copie directement sur le serveur,
    // AVANT tout envoi HTTP. Si ce fichier s'ouvre correctement, le
    // problème vient de la transmission réseau. S'il est déjà corrompu
    // ici, le problème vient de Puppeteer/de la page capturée elle-même.
    fs.writeFileSync("debug-export.pdf", pdfBuffer);
    console.log(
      `📄 DEBUG : PDF sauvegardé côté serveur (${pdfBuffer.length} octets) dans backend/debug-export.pdf`
    );

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