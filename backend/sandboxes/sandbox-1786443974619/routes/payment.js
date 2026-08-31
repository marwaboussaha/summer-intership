import express from 'express';
import PaymentPage from '../components/PaymentPage';

const router = express.Router();

router.get('/payment', (req, res) => {
  res.render('payment', {
    title: 'Paiement'
  });
});

export default router;