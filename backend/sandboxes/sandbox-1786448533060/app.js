const express = require('express');
const app = express();
app.use(express.static('public'));
app.get('/', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>Login Page</title>
        <style>
          body {
            background-image: linear-gradient(to right, #ffff00, #800080, #0000ff);
            height: 100vh;
            margin: 0;
            display: flex;
            justify-content: center;
            align-items: center;
          }
          .card {
            background-color: #ffffff;
            padding: 20px;
            border-radius: 10px;
            box-shadow: 0 0 10px rgba(0, 0, 0, 0.2);
            display: flex;
          }
          .card .left {
            width: 50%;
          }
          .card .right {
            width: 50%;            background-color: #0000ff;
            color: #ffffff;
          }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="left">
            <h1>UI Unicorn</h1>
            <h2>Nice to see you again</h2>
            <form>
              <input type="text" placeholder="Email/Phone"/>
              <input type="password" placeholder="Password"/>
              <div>
                <input type="checkbox"/>
                <label>Remember me</label>
                <a href="#">Forgot password?</a>
              </div>
              <button>Sign in</button>
              <button>Or sign in with Google</button>
              <a href="#">Don't have an account? Sign up now</a>
            </form>
          </div>
          <div class="right">
            <h1>Perfect login</h1>
            <ul>
              <li>Item 1</li>
              <li>Item 2</li>
            </ul>
            <button>Freebie 🎁</button>
          </div>
        </div>
      </body>
    </html>
  `);
});
app.listen(3000, () => console.log('Server started on port 3000'));
