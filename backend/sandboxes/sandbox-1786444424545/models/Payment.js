const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  cardNumber: String,
  expirationDate: Date
});

const Payment = mongoose.model('Payment', paymentSchema);

module.exports = Payment;