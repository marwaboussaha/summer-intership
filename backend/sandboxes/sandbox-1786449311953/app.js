const express = require('express');
const app = express();
const port = 3000;

app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Login Page</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');

        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
          font-family: 'Poppins', sans-serif;
        }

        body {
          min-height: 100vh;
          display: flex;
          justify-content: center;
          align-items: center;
          background: linear-gradient(135deg, #ff9a9e 0%, #fecfef 20%, #a18cd1 60%, #fbc2eb 100%);
          padding: 20px;
        }

        .container {
          width: 100%;
          max-width: 1000px;
          height: 600px;
          background: #fff;
          border-radius: 20px;
          box-shadow: 0 20px 50px rgba(0,0,0,0.15);
          display: flex;
          overflow: hidden;
          position: relative;
        }

        .left-panel {
          flex: 1;
          background-image: url('https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80');
          background-size: cover;
          background-position: center;
          position: relative;
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 40px;
        }

        .login-card {
          background: rgba(255, 255, 255, 0.95);
          padding: 30px;
          border-radius: 15px;
          width: 100%;
          max-width: 320px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.1);
          backdrop-filter: blur(5px);
        }

        .logo {
          display: flex;
          align-items: center;
          margin-bottom: 20px;
        }

        .logo-icon {
          width: 30px;
          height: 30px;
          background: linear-gradient(45deg, #ff6b6b, #feca57, #48dbfb, #ff9ff3);
          border-radius: 50%;
          margin-right: 10px;
        }

        .logo-text {
          font-weight: 700;
          font-size: 14px;
          color: #333;
        }

        h2 {
          font-size: 18px;
          font-weight: 600;
          color: #333;
          margin-bottom: 20px;
        }

        .input-group {
          margin-bottom: 15px;
        }

        .input-group label {
          display: block;
          font-size: 10px;
          color: #888;
          margin-bottom: 5px;
        }

        .input-group input {
          width: 100%;
          padding: 10px 15px;
          border: none;
          background: #f5f6fa;
          border-radius: 8px;
          font-size: 12px;
          outline: none;
        }

        .options {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 10px;
          margin-bottom: 20px;
        }

        .remember {
          display: flex;
          align-items: center;
          color: #666;
        }

        .remember input {
          margin-right: 5px;
        }

        .forgot {
          color: #48dbfb;
          text-decoration: none;
        }

        .btn-primary {
          width: 100%;
          padding: 10px;
          background: #0984e3;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          margin-bottom: 15px;
        }

        .btn-google {
          width: 100%;
          padding: 10px;
          background: #2d3436;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }

        .google-icon {
          width: 15px;
          height: 15px;
          margin-right: 8px;
          background: conic-gradient(from -45deg, #ea4335 110deg, #4285f4 90deg 180deg, #34a853 180deg 270deg, #fbbc05 270deg); 
          border-radius: 50%;
          position: relative;
        }
        .google-icon::after {
            content: 'G';
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 10px;
            font-weight: bold;
            color: white;
        }

        .signup-link {
          text-align: center;
          font-size: 10px;
          color: #666;
          margin-top: 15px;
        }

        .signup-link a {
          color: #0984e3;
          text-decoration: none;
        }

        .right-panel {
          flex: 1.2;
          background: linear-gradient(135deg, #6c5ce7 0%, #0984e3 100%);
          padding: 50px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          color: white;
        }

        .right-panel h1 {
          font-size: 48px;
          font-weight: 700;
          line-height: 1.1;
          margin-bottom: 30px;
        }

        .features {
          list-style: none;
          margin-bottom: 40px;
        }

        .features li {
          margin-bottom: 10px;
          font-size: 16px;
          display: flex;
          align-items: center;
        }

        .features li::before {
          content: '○';
          margin-right: 10px;
          font-size: 12px;
        }

        .btn-freebie {
          background: #2d3436;
          color: white;
          padding: 12px 25px;
          border-radius: 30px;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          font-weight: 600;
          width: fit-content;
        }

        .hand-icon {
          margin-right: 8px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="left-panel">
          <div class="login-card">
            <div class="logo">
              <div class="logo-icon"></div>
              <span class="logo-text">UI Unicorn</span>
            </div>
            <h2>Nice to see you again</h2>
            <div class="input-group">
              <label>Login</label>
              <input type="text" placeholder="Email or phone number">
            </div>
            <div class="input-group">
              <label>Password</label>
              <input type="password" placeholder="Enter password">
            </div>
            <div class="options">
              <label class="remember">
                <input type="checkbox"> Remember me
              </label>
              <a href="#" class="forgot">Forgot password?</a>
            </div>
            <button class="btn-primary">Sign in</button>
            <button class="btn-google">
              <div class="google-icon"></div>
              Or sign in with Google
            </button>
            <div class="signup-link">
              Don't have an account? <a href="#">Sign up now</a>
            </div>
          </div>
        </div>
        <div class="right-panel">
          <h1>Perfect<br>login</h1>
          <ul class="features">
            <li>Universal</li>
            <li>High conversion</li>
            <li>Desktop & Mobile</li>
          </ul>
          <a href="#" class="btn-freebie">
            <span class="hand-icon">✌️</span> Freebie
          </a>
        </div>
      </div>
    </body>
    </html>
  `);
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
