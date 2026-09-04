const express = require('express');
const app = express();
const port = 3000;

app.use(express.json());

let emailSecours = '';

app.get('/', (req, res) => {
  res.send(`
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; }
          label { display: block; margin-bottom: 10px; }
          input { padding: 10px; border: 1px solid #ccc; border-radius: 5px; }
          button { padding: 10px; background-color: #4CAF50; color: #fff; border: none; border-radius: 5px; cursor: pointer; }
          button:hover { background-color: #3e8e41; }
        </style>
      </head>
      <body>
        <h1>Ajouter un email de secours</h1>
        <form>
          <label for='email'>Email de secours:</label>
          <input type='email' id='email' name='email'><br><br>
          <button type='submit'>Enregistrer</button>
        </form>
      </body>
    </html>
  `);
});

app.post('/', (req, res) => {
  emailSecours = req.body.email;
  res.send(`
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; }
          label { display: block; margin-bottom: 10px; }
          input { padding: 10px; border: 1px solid #ccc; border-radius: 5px; }
          button { padding: 10px; background-color: #4CAF50; color: #fff; border: none; border-radius: 5px; cursor: pointer; }
          button:hover { background-color: #3e8e41; }
        </style>
      </head>
      <body>
        <h1>Email de secours enregistré</h1>
        <p>L'email de secours est : ${emailSecours}</p>
      </body>
    </html>
  `);
});

app.listen(port, () => {
  console.log(`Serveur démarré sur le port ${port}`);
});