import express from 'express';
import router from express.Router();

router.post('/login', (req, res) => {
  // À implémenter : logique de connexion
  res.send('Connexion réussie');
});

export default router;