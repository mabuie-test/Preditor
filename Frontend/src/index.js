import React from 'react';
import ReactDOM from 'react-dom/client';
import axios from 'axios';
import App from './App';
import { AuthProvider } from './AuthContext';

// Define a base URL de todas as chamadas Axios.
// Utilize a variável de ambiente ou substitua pelo URL do seu backend Render.
axios.defaults.baseURL = process.env.REACT_APP_API_BASE_URL || 'https://aviator-backend.onrender.com';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <AuthProvider>
    <App />
  </AuthProvider>
);
