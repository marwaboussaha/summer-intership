const express = require('express');
const app = express();
app.use(express.json());
app.get('/', (req, res) => {
  res.send(`<!DOCTYPE html><html><head><style>body { font-family: Arial, sans-serif; background-color: #f0f0f0; } .container { max-width: 400px; margin: 40px auto; padding: 20px; background: #fff; border-radius: 10px; box-shadow: 0 0 10px rgba(0,0,0,0.1); }</style></head><body><div class="container"><h2>Paiement</h2><form><label for="cardNumber">Numéro de carte :</label><br><input type="text" id="cardNumber" name="cardNumber"><br><label for="expirationDate">Date d'expiration :</label><br><input type="text" id="expirationDate" name="expirationDate"><br><label for="cvv">CVV :</label><br><input type="text" id="cvv" name="cvv"><br><input type="submit" value="Payer"></form></div></body></html>`);
});
app.get('/payment', (req, res) => {
  res.send(`<!DOCTYPE html><html><head><style>body { font-family: Arial, sans-serif; background-color: #f0f0f0; } .container { max-width: 400px; margin: 40px auto; padding: 20px; background: #fff; border-radius: 10px; box-shadow: 0 0 10px rgba(0,0,0,0.1); }</style></head><body><div class="container"><h2>Paiement</h2><p>Veuillez effectuer le paiement.</p></div></body></html>`);
});
app.listen(3000, () => {
  console.log('Serveur démarré sur le port 3000');
});