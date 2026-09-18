const express = require('express');
const app = express();
const port = 3000;

app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Perfect Login</title>
      <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Poppins', sans-serif; }
        body {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #fdfbfb 0%, #ebedee 100%);
          background-image: linear-gradient(to top, #a18cd1 0%, #fbc2eb 100%);
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
          background-image: url('https://images.unsplash.com/photo-1499363536502-87642509e31b?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80');
          background-size: cover;
          background-position: center;
          position: relative;
        }
        .login-card {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 85%;
          background: rgba(255, 255, 255, 0.95);
          padding: 30px;
          border-radius: 15px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.1);
          backdrop-filter: blur(5px);
        }
        .logo-area { display: flex; align-items: center; gap: 10px; margin-bottom: 20px; }
        .logo-icon { width: 30px; height: 30px; background: linear-gradient(45deg, #ff9a9e, #fad0c4, #fad0c4, #a18cd1); border-radius: 50%; }
        .logo-text { font-weight: 700; font-size: 14px; color: #333; }
        h2 { font-size: 18px; font-weight: 600; margin-bottom: 20px; color: #333; }
        .input-group { margin-bottom: 15px; }
        .input-group label { display: block; font-size: 12px; color: #666; margin-bottom: 5px; }
        .input-group input {
          width: 100%;
          padding: 12px;
          border: 1px solid #eee;
          border-radius: 8px;
          background: #f9f9f9;
          outline: none;
          font-size: 13px;
        }
        .input-group input:focus { border-color: #a18cd1; }
        .options { display: flex; justify-content: space-between; align-items: center; font-size: 12px; margin-bottom: 20px; }
        .remember-me { display: flex; align-items: center; gap: 5px; color: #666; }
        .forgot-pass { color: #a18cd1; text-decoration: none; font-weight: 500; }
        .btn-primary {
          width: 100%;
          padding: 12px;
          background: #007bff;
          color: white;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: 0.3s;
        }
        .btn-primary:hover { background: #0056b3; }
        .divider { display: flex; align-items: center; margin: 20px 0; color: #999; font-size: 12px; }
        .divider::before, .divider::after { content: ''; flex: 1; height: 1px; background: #eee; }
        .divider span { padding: 0 10px; }
        .btn-google {
          width: 100%;
          padding: 12px;
          background: #333;
          color: white;
          border: none;
          border-radius: 8px;
          font-weight: 500;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
        }
        .signup-link { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
        .signup-link a { color: #007bff; text-decoration: none; font-weight: 600; }
        .right-panel {
          flex: 1.2;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 50px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          color: white;
          position: relative;
        }
        .right-panel h1 { font-size: 48px; font-weight: 700; line-height: 1.2; margin-bottom: 30px; }
        .features { list-style: none; margin-bottom: 40px; }
        .features li { margin-bottom: 15px; display: flex; align-items: center; gap: 10px; font-size: 16px; opacity: 0.9; }
        .features li::before { content: '○'; font-size: 12px; }
        .btn-freebie {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          background: #111;
          color: white;
          padding: 12px 25px;
          border-radius: 30px;
          text-decoration: none;
          font-weight: 600;
          width: fit-content;
          transition: transform 0.2s;
        }
        .btn-freebie:hover { transform: translateY(-2px); }
        @media (max-width: 768px) {
          .container { flex-direction: column; height: auto; }
          .left-panel { height: 300px; }
          .right-panel { padding: 30px; }
          .right-panel h1 { font-size: 32px; }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="left-panel">
          <div class="login-card">
            <div class="logo-area">
              <div class="logo-icon"></div>
              <span class="logo-text">UI Unicorn</span>
            </div>
            <h2>Nice to see you again</h2>
            <form>
              <div class="input-group">
                <label>Login</label>
                <input type="text" placeholder="Email or phone number">
              </div>
              <div class="input-group">
                <label>Password</label>
                <input type="password" placeholder="Enter password">
              </div>
              <div class="options">
                <label class="remember-me">
                  <input type="checkbox"> Remember me
                </label>
                <a href="#" class="forgot-pass">Forgot password?</a>
              </div>
              <button type="button" class="btn-primary">Sign in</button>
              <div class="divider"><span>or</span></div>
              <button type="button" class="btn-google">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
                  <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
                  <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/>
                  <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
                </svg>
                Or sign in with Google
              </button>
            </form>
            <p class="signup-link">Don't have an account? <a href="#">Sign up now</a></p>
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
            <span>✌️</span> Freebie
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
