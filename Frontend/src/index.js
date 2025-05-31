// src/index.js

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AuthProvider } from './AuthContext';
import axios from 'axios';
import './index.css';

// Configura o baseURL de axios para as chamadas à API
axios.defaults.baseURL = process.env.REACT_APP_API_BASE_URL;

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <AuthProvider>
    <App />
  </AuthProvider>
);
