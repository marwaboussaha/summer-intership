const express = require('express');
const app = express();
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.send(`
    <html>
      <body>
        <h1>Page de Login</h1>
        <form action='/login' method='post'>
          <label for='username'>Nom d'utilisateur:</label><br>
          <input type='text' id='username' name='username'><br>
          <label for='password'>Mot de passe:</label><br>
          <input type='password' id='password' name='password'><br>
          <input type='submit' value='Se connecter'>
        </form>
      </body>
    </html>
  `);
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  // Gérer les informations de connexion ici
  res.send(`Bienvenue, ${username}!`);
});

app.listen(3000, () => console.log('Serveur démarré sur le port 3000'));