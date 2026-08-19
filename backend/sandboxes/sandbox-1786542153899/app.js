const express = require('express');
const app = express();
app.use(express.json());
let tasks = [];

app.get('/', (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.send(`
    <html>
      <head>
        <style>
          body {
            font-family: 'Comic Sans MS', cursive;
            background-color: #ffe6cc;
          }
          .container {
            max-width: 400px;
            margin: 40px auto;
            padding: 20px;
            background-color: #fff;
            border: 1px solid #ddd;
            border-radius: 10px;
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
          }
          .task {
            margin-bottom: 10px;
            padding: 10px;
            background-color: #f9f9f9;
            border: 1px solid #ccc;
            border-radius: 5px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>To Do Liste <span style='font-size: 20px;'>&#10084;</span></h1>
          <form id="task-form">
            <input type="text" id="task-input" placeholder="Ajouter une tâche">
            <button type="submit" style='background-color: #ff99cc; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer;'>Ajouter</button>
          </form>
          <ul id="task-list">
          </ul>
        </div>
        <script>
          const taskForm = document.getElementById('task-form');
          const taskList = document.getElementById('task-list');
          const taskInput = document.getElementById('task-input');
          
          taskForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const task = taskInput.value;
            if (task !== '') {
              fetch('/add-task', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({ task: task })
              })
              .then((res) => res.json())
              .then((data) => {
                taskInput.value = '';
                const taskElement = document.createElement('li');
                taskElement.classList.add('task');
                taskElement.textContent = data.task;
                taskList.appendChild(taskElement);
              });
            }
          });
        </script>
      </body>
    </html>
  `);
});

app.post('/add-task', (req, res) => {
  const task = req.body.task;
  tasks.push(task);
  res.json({ task: task });
});

app.listen(3000, () => {
  console.log('Serveur démarré sur le port 3000');
});