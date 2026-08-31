import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
  name: String,
  email: String,
  amount: Number
});

const Payment = mongoose.model('Payment', paymentSchema);

export default Payment;