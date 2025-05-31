// src/index.js

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AuthProvider } from './AuthContext';
import axios from 'axios';

// Configure axios para apontar ao backend correto
axios.defaults.baseURL = process.env.REACT_APP_API_BASE_URL 
  || 'https://aviator-backend.onrender.com';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <AuthProvider>
    <App />
  </AuthProvider>
);
