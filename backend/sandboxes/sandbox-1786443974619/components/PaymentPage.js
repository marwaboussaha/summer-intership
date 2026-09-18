import React from 'react';

const PaymentPage = () => {
  return (
    <div>
      <h1>Paiement</h1>
      <form>
        <label>Nom :</label>
        <input type="text" />
        <br />
        <label>Adresse e-mail :</label>
        <input type="email" />
        <br />
        <label>Montant :</label>
        <input type="number" />
        <br />
        <button>Payer</button>
      </form>
    </div>
  );
};

export default PaymentPage;