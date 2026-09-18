import React, { useState } from 'react';

function PaymentPage() {
  const [cardNumber, setCardNumber] = useState('');
  const [expirationDate, setExpirationDate] = useState('');

  const handleSubmit = (event) => {
    event.preventDefault();
    // À compléter avec la logique de traitement du paiement
  };

  return (
    <form onSubmit={handleSubmit}>
      <label>
        Numéro de carte :
        <input type='text' value={cardNumber} onChange={(event) => setCardNumber(event.target.value)} />
      </label>
      <br />
      <label>
        Date d'expiration :
        <input type='date' value={expirationDate} onChange={(event) => setExpirationDate(event.target.value)} />
      </label>
      <br />
      <button type='submit'>Payer</button>
    </form>
  );
}

export default PaymentPage;