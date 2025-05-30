import React, { createContext, useState } from 'react';
import jwtDecode from 'jwt-decode';
import axios from 'axios';

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  // Tenta ler e decodificar o token existente
  const tokenStorage = localStorage.getItem('token');
  let initialRole = null;

  if (tokenStorage) {
    try {
      initialRole = jwtDecode(tokenStorage).role;
    } catch {
      // Token inválido: limpa imediatamente
      localStorage.removeItem('token');
    }
  }

  const [token, setToken] = useState(localStorage.getItem('token'));
  const [role, setRole]   = useState(initialRole);

  const login = (newToken) => {
    try {
      // Tenta decodificar o novo token
      const { role: newRole } = jwtDecode(newToken);
      // Guarda só se for válido
      localStorage.setItem('token', newToken);
      axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
      setToken(newToken);
      setRole(newRole);
    } catch {
      // Token inválido: limpa tudo
      localStorage.removeItem('token');
      delete axios.defaults.headers.common['Authorization'];
      setToken(null);
      setRole(null);
      console.error('Login falhou: token inválido.');
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    setToken(null);
    setRole(null);
  };

  return (
    <AuthContext.Provider value={{ token, role, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
