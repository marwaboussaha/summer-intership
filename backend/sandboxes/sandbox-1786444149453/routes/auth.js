import express from 'express';
import { MongoClient } from 'mongodb';

const router = express.Router();

router.post('/login', (req, res) => {
  // TODO: implémenter la logique de connexion
  res.send('Connexion réussie');
});

export default router;