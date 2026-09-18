const express = require('express');
const app = express();
const port = 3000;

app.get('/', (req, res) => {
    res.set('Cache-Control', 'no-store');
    res.send(`
        <html>
            <head>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        background-color: #f0f0f0;
                    }
                    .login-form {
                        width: 300px;
                        margin: 50px auto;
                        padding: 20px;
                        background-color: #fff;
                        border: 1px solid #ddd;
                        border-radius: 10px;
                        box-shadow: 0 0 10px rgba(0,0,0,0.1);
                    }
                    .login-form label {
                        display: block;
                        margin-bottom: 10px;
                    }
                    .login-form input {
                        width: 100%;
                        height: 40px;
                        margin-bottom: 20px;
                        padding: 10px;
                        border: 1px solid #ccc;
                    }
                    .login-form button {
                        width: 100%;
                        height: 40px;
                        background-color: #4CAF50;
                        color: #fff;
                        padding: 10px;
                        border: none;
                        border-radius: 5px;
                        cursor: pointer;
                    }
                </style>
            </head>
            <body>
                <div class="login-form">
                    <h2>Login</h2>
                    <form>
                        <label for="username">Username:</label>
                        <input type="text" id="username" name="username"><br><br>
                        <label for="password">Password:</label>
                        <input type="password" id="password" name="password"><br><br>
                        <button type="submit">Login</button>
                    </form>
                </div>
            </body>
        </html>
    `);
});

app.listen(port, () => {
    console.log(`Server started on port ${port}`);
});