import React, { useState, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from './AuthContext';

export default function Login() {
  const { login } = useContext(AuthContext);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async e => {
    e.preventDefault();
    try {
      const res = await axios.post('/auth/login', { username, password });
      const { token } = res.data;
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      login(token);
    } catch (err) {
      alert('Falha no login: ' + (err.response?.data?.erro || err.message));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-sm mx-auto mt-10 p-4 border rounded">
      <h2 className="text-xl mb-4">Login</h2>
      <div className="mb-2">
        <label>Utilizador:</label>
        <input
          type="text"
          value={username}
          onChange={e => setUsername(e.target.value)}
          className="w-full border p-1"
          required
        />
      </div>
      <div className="mb-4">
        <label>Senha:</label>
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          className="w-full border p-1"
          required
        />
      </div>
      <button type="submit" className="bg-blue-600 text-white px-4 py-2">
        Entrar
      </button>
    </form>
  );
}
