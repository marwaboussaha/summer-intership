const express = require('express');
const app = express();
const port = 3000;

app.get('/', (req, res) => {
    res.send(`
        <html>
            <head>
                <style>
                    body {
                        background-image: linear-gradient(to bottom right, #FFDAB9, #E6E6FA);
                        height: 100vh;
                        margin: 0;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                    }
                    .container {
                        background-color: #FFFFFF;
                        border-radius: 20px;
                        box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
                        display: flex;
                        width: 80%;
                        max-width: 800px;
                    }
                    .left {
                        width: 25%;
                        background-image: url('https://via.placeholder.com/200x400');
                        background-size: cover;
                    }
                    .middle {
                        width: 35%;
                        padding: 20px;
                    }
                    .right {
                        width: 40%;
                        background-image: linear-gradient(to bottom, #6A5ACD, #00BFFF);
                        color: #FFFFFF;
                        padding: 20px;
                    }
                    .form {
                        display: flex;
                        flex-direction: column;
                    }
                    .form input {
                        margin-bottom: 10px;
                        padding: 10px;
                        border: none;
                        border-radius: 5px;
                    }
                    .form button {
                        background-color: #007BFF;
                        color: #FFFFFF;
                        padding: 10px;
                        border: none;
                        border-radius: 5px;
                        cursor: pointer;
                    }
                    .form button:hover {
                        background-color: #0056B3;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="left"></div>
                    <div class="middle">
                        <h2>Nice to see you again</h2>
                        <form class="form">
                            <input type="text" placeholder="Email or phone number">
                            <input type="password" placeholder="Enter password">
                            <button>Login</button>
                            <a href="#" style="color: #007BFF; text-decoration: none;">Forgot password?</a>
                            <a href="#" style="color: #007BFF; text-decoration: none;">Sign up now</a>
                        </form>
                    </div>
                    <div class="right">
                        <h2>Perfect login</h2>
                        <p>Universal</p>
                        <p>High conversion</p>
                        <p>Desktop & Mobile</p>
                        <button style="background-color: #000000; color: #FFFFFF; padding: 10px; border: none; border-radius: 5px; cursor: pointer;">Freebie</button>
                    </div>
                </div>
            </body>
        </html>
    `);
});

app.listen(port, () => {
    console.log(`Server started on port ${port}`);
});