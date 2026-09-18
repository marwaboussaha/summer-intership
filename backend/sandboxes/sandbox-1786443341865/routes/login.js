import express from 'express';
import React from 'react';
import ReactDOMServer from 'react-dom/server';
import Login from '../components/Login';

const router = express.Router();

router.get('/login', (req, res) => {
  const markup = ReactDOMServer.renderToString(<Login />);
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <title>Login Page</title>
      </head>
      <body>
        <div id="root">${markup}</div>
      </body>
    </html>
  `);
});

export default router;