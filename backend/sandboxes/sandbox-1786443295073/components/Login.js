import React, { useState } from 'react';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (event) => {
    event.preventDefault();
    // À implémenter : appel API de connexion
  };

  return (
    <form onSubmit={handleSubmit}>
      <label>Username :</label>
      <input type='text' value={username} onChange={(event) => setUsername(event.target.value)} />
      <br />
      <label>Password :</label>
      <input type='password' value={password} onChange={(event) => setPassword(event.target.value)} />
      <br />
      <button type='submit'>Se connecter</button>
    </form>
  );
};

export default Login;