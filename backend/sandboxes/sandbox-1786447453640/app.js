const express = require('express');
const app = express();
const port = 3000;

app.get('/', (req, res) => {
  res.send(`
    <html>
      <body>
        <h1>Page de Login</h1>
        <form>
          <label>Nom d'utilisateur:</label><br>
          <input type='text' name='username'><br>
          <label>Mot de passe:</label><br>
          <input type='password' name='password'><br>
          <input type='submit' value='Se connecter'>
        </form>
      </body>
    </html>
  `);
});

app.listen(port, () => {
  console.log(`Serveur démarré sur le port ${port}`);
});