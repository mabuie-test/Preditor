// src/App.jsx

import React, { useContext } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import UploadForm from './UploadForm';
import AdminPanel from './components/AdminPanel';
import { AuthContext } from './AuthContext';

function App() {
  const { role } = useContext(AuthContext);

  return (
    <BrowserRouter>
      <Routes>
        {/* Rota pública ou para utilizadores autenticados */}
        <Route path="/" element={<UploadForm />} />

        {/* Rota para admin somente */}
        <Route 
          path="/admin" 
          element={
            role === 'admin' 
              ? <AdminPanel /> 
              : <Navigate to="/" replace />
          } 
        />

        {/* Outras rotas, fallback, etc. */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
