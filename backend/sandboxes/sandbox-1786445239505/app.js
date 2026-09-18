const express = require('express');
const app = express();
app.use(express.urlencoded({ extended: true }));

app.get('/payment', (req, res) => {
  res.send('<html><body><h1>Page de paiement</h1><form><label>Numéro de carte:</label><br><input type="text" name="cardNumber"><br><label>Date d'expiration:</label><br><input type="date" name="expirationDate"><br><input type="submit" value="Payer"></form></body></html>');
});

app.listen(3000, () => {
  console.log('Serveur démarré sur le port 3000');
});