// src/AuthContext.jsx

import React, { createContext, useState } from 'react';
import jwtDecode from 'jwt-decode';
import axios from 'axios';

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const tokenStorage = localStorage.getItem('token');
  const [token, setToken] = useState(tokenStorage);
  const [role, setRole]   = useState(tokenStorage ? jwtDecode(tokenStorage).role : null);

  const login = (newToken) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
    setRole(jwtDecode(newToken).role);
    axios.defaults.headers.common['Authorization'] = 'Bearer ' + newToken;
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setRole(null);
    delete axios.defaults.headers.common['Authorization'];
  };

  return (
    <AuthContext.Provider value={{ token, role, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
