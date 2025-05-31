// src/App.jsx

import React, { useContext } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthContext } from './AuthContext';
import UploadForm from './components/UploadForm';
import AdminPanel from './components/AdminPanel';

/**
 * Componente principal, define rotas protegidas
 */
function App() {
  const { role } = useContext(AuthContext);

  return (
    <BrowserRouter>
      <Routes>
        {/* Rota principal: UploadForm (qualquer utilizador autenticado) */}
        <Route path="/" element={<UploadForm />} />

        {/* Rota de administração (só para role === 'admin') */}
        <Route 
          path="/admin" 
          element={
            role === 'admin' 
              ? <AdminPanel /> 
              : <Navigate to="/" replace />
          } 
        />

        {/* Redirecionamento para home se rota inválida */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
