const express = require('express');
const app = express();
app.use(express.json());
app.get('/login', (req, res) => {
  res.send(`
    <html>
      <body>
        <h1>Page de connexion</h1>
        <form>
          <label>Nom d'utilisateur :</label><br>
          <input type='text' id='username' name='username'><br>
          <label>Mot de passe :</label><br>
          <input type='password' id='password' name='password'><br>
          <input type='submit' value='Se connecter'>
        </form>
      </body>
    </html>
  `);
});
app.listen(3000, () => console.log('Serveur démarré sur le port 3000'));