import puppeteer from "puppeteer";
import fs from "fs";

console.log("Lancement de Puppeteer...");

const browser = await puppeteer.launch({
  headless: true,
  args: ["--no-sandbox", "--disable-setuid-sandbox"]
});

console.log("Navigateur lancé avec succès.");

const page = await browser.newPage();

// ⚠️ Remplacez cette URL par l'URL RÉELLE de votre sandbox active
// (vérifiez le port exact avec "docker ps")
const targetUrl = "http://localhost:4000/login";

console.log(`Ouverture de ${targetUrl}...`);
await page.goto(targetUrl, { waitUntil: "networkidle0", timeout: 15000 });

console.log("Page chargée, génération du PDF...");
const pdfBuffer = await page.pdf({ format: "A4", printBackground: true });

fs.writeFileSync("test-output.pdf", pdfBuffer);
console.log("✅ PDF sauvegardé dans test-output.pdf");

await browser.close();