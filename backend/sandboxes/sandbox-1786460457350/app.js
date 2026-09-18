const express = require('express');
const app = express();
app.use(express.json());
app.listen(3000, () => console.log('Serveur démarré sur le port 3000'));
app.get('/', (req, res) => {
  res.send(`
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; background-color: #f0f0f0; }
          .container { width: 300px; margin: 50px auto; padding: 20px; background-color: #fff; border: 1px solid #ddd; border-radius: 10px; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
          label { display: block; margin-bottom: 10px; }
          input { width: 100%; height: 40px; margin-bottom: 20px; padding: 10px; border: 1px solid #ccc; border-radius: 5px; }
          button { width: 100%; height: 40px; background-color: #4CAF50; color: #fff; padding: 10px; border: none; border-radius: 5px; cursor: pointer; }
          button:hover { background-color: #3e8e41; }
        </style>
      </head>
      <body>
        <div class="container">
          <h2>Connexion</h2>
          <form>
            <label for="login">Login :</label>
            <input type="text" id="login" name="login"><br><br>
            <label for="password">Mot de passe :</label>
            <input type="password" id="password" name="password"><br><br>
            <button type="submit">Se connecter</button>
          </form>
        </div>
      </body>
    </html>
  `);
});