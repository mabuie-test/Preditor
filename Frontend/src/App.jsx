import React, { useContext } from 'react';
import { AuthContext } from './AuthContext';
import Login from './Login';
import UploadForm from './UploadForm';

export default function App() {
  const { token, logout, role } = useContext(AuthContext);

  if (!token) {
    return <Login />;
  }

  return (
    <div className="max-w-3xl mx-auto">
      <header className="flex justify-between items-center p-4 border-b">
        <div>
          <strong>Bem-vindo,</strong> {role.toUpperCase()}
        </div>
        <button onClick={logout} className="text-red-600">Sair</button>
      </header>
      <main>
        <UploadForm />
      </main>
    </div>
  );
}

