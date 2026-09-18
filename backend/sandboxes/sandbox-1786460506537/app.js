const express = require('express');
const app = express();
const port = 3000;

app.use(express.json());

app.get('/', (req, res) => {
  res.send(`
    <html>
      <head>
        <style>
          body {
            font-family: Arial, sans-serif;
            background-color: #f0f0f0;
          }
          .container {
            width: 300px;
            margin: 50px auto;
            padding: 20px;
            background-color: #fff;
            border: 1px solid #ddd;
            border-radius: 10px;
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
          }
          .container h2 {
            text-align: center;
          }
          .container form {
            display: flex;
            flex-direction: column;
          }
          .container label {
            margin-bottom: 10px;
          }
          .container input {
            padding: 10px;
            margin-bottom: 20px;
            border: 1px solid #ccc;
          }
          .container button {
            padding: 10px;
            background-color: #4CAF50;
            color: #fff;
            border: none;
            border-radius: 5px;
            cursor: pointer;
          }
          .container button:hover {
            background-color: #3e8e41;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h2>Connexion</h2>
          <form>
            <label for="username">Nom d'utilisateur:</label>
            <input type="text" id="username" name="username"><br><br>
            <label for="password">Mot de passe:</label>
            <input type="password" id="password" name="password"><br><br>
            <button type="submit">Se connecter</button>
          </form>
        </div>
      </body>
    </html>
  `);
});

app.listen(port, () => {
  console.log(`Serveur démarré sur le port ${port}`);
});