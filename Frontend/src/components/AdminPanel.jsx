// src/components/AdminPanel.jsx

import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../AuthContext';

/**
 * Painel de Gestão de Utilizadores (apenas admins)
 */
export default function AdminPanel() {
  const { token } = useContext(AuthContext);

  // Estados
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [errorUsers, setErrorUsers] = useState(null);

  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('user');
  const [creatingUser, setCreatingUser] = useState(false);
  const [createError, setCreateError] = useState(null);

  const [editingRoleId, setEditingRoleId] = useState(null);
  const [editingRoleValue, setEditingRoleValue] = useState('');
  const [updatingRole, setUpdatingRole] = useState(false);
  const [updateError, setUpdateError] = useState(null);

  const [deletingUserId, setDeletingUserId] = useState(null);
  const [deleteError, setDeleteError] = useState(null);

  // Configurar o header Authorization
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = 'Bearer ' + token;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [token]);

  // Buscar utilizadores
  const fetchUsers = async () => {
    setLoadingUsers(true);
    setErrorUsers(null);
    try {
      const res = await axios.get('/api/users');
      setUsers(res.data.users || []);
    } catch (err) {
      console.error('Erro ao buscar utilizadores:', err);
      const msg = err.response?.data?.mensagem || err.message || 'Erro desconhecido';
      setErrorUsers(msg);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Criar novo utilizador
  const handleCreateUser = async (e) => {
    e.preventDefault();
    setCreatingUser(true);
    setCreateError(null);

    if (!newUsername.trim() || !newPassword.trim()) {
      setCreateError('Username e password são obrigatórios.');
      setCreatingUser(false);
      return;
    }

    try {
      const payload = {
        username: newUsername.toLowerCase().trim(),
        password: newPassword,
        role: newRole
      };
      const res = await axios.post('/api/users', payload);
      setUsers(prev => [res.data.user, ...prev]);
      setNewUsername('');
      setNewPassword('');
      setNewRole('user');
    } catch (err) {
      console.error('Erro ao criar utilizador:', err);
      const msg = err.response?.data?.mensagem || err.message || 'Erro desconhecido';
      setCreateError(msg);
    } finally {
      setCreatingUser(false);
    }
  };

  // Iniciar edição de role
  const startEditingRole = (userId, currentRole) => {
    setEditingRoleId(userId);
    setEditingRoleValue(currentRole);
    setUpdateError(null);
  };

  // Cancelar edição
  const cancelEditingRole = () => {
    setEditingRoleId(null);
    setEditingRoleValue('');
    setUpdateError(null);
  };

  // Atualizar role
  const handleUpdateRole = async (userId) => {
    if (!editingRoleValue) {
      setUpdateError('Role não pode ficar vazio.');
      return;
    }
    setUpdatingRole(true);
    setUpdateError(null);

    try {
      const res = await axios.put(`/api/users/${userId}`, { role: editingRoleValue });
      const updatedUser = res.data.user;
      setUsers(prev => prev.map(u => u._id === userId ? updatedUser : u));
      cancelEditingRole();
    } catch (err) {
      console.error('Erro ao atualizar role:', err);
      const msg = err.response?.data?.mensagem || err.message || 'Erro desconhecido';
      setUpdateError(msg);
    } finally {
      setUpdatingRole(false);
    }
  };

  // Remover utilizador
  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Tem certeza que deseja remover este utilizador?')) {
      return;
    }
    setDeletingUserId(userId);
    setDeleteError(null);

    try {
      await axios.delete(`/api/users/${userId}`);
      setUsers(prev => prev.filter(u => u._id !== userId));
    } catch (err) {
      console.error('Erro ao remover utilizador:', err);
      const msg = err.response?.data?.mensagem || err.message || 'Erro desconhecido';
      setDeleteError(msg);
    } finally {
      setDeletingUserId(null);
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl mb-4">Painel de Gestão de Utilizadores</h1>

      {/* Criar Novo Utilizador */}
      <div className="border p-4 mb-6 rounded-lg shadow-sm bg-white">
        <h2 className="text-xl mb-2">Criar Novo Utilizador</h2>
        <form onSubmit={handleCreateUser}>
          <div className="mb-2">
            <label className="block mb-1 font-medium">Username:</label>
            <input
              type="text"
              value={newUsername}
              onChange={e => setNewUsername(e.target.value)}
              className="w-full border px-2 py-1 rounded"
              placeholder="Ex.: joao123"
            />
          </div>
          <div className="mb-2">
            <label className="block mb-1 font-medium">Password:</label>
            <input
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              className="w-full border px-2 py-1 rounded"
              placeholder="Ex.: senha123"
            />
          </div>
          <div className="mb-2">
            <label className="block mb-1 font-medium">Role:</label>
            <select
              value={newRole}
              onChange={e => setNewRole(e.target.value)}
              className="w-full border px-2 py-1 rounded"
            >
              <option value="user">user</option>
              <option value="admin">admin</option>
            </select>
          </div>
          {createError && (
            <p className="text-red-600 mb-2">{createError}</p>
          )}
          <button
            type="submit"
            className={`px-4 py-2 text-white ${
              creatingUser ? 'bg-gray-500 cursor-not-allowed' : 'bg-blue-600'
            } rounded`}
            disabled={creatingUser}
          >
            {creatingUser ? 'Criando...' : 'Criar Utilizador'}
          </button>
        </form>
      </div>

      {/* Lista de Utilizadores */}
      <div className="border p-4 rounded-lg shadow-sm bg-white">
        <h2 className="text-xl mb-2">Lista de Utilizadores</h2>
        {loadingUsers ? (
          <p>Carregando utilizadores...</p>
        ) : errorUsers ? (
          <p className="text-red-600">Erro: {errorUsers}</p>
        ) : (
          <table className="w-full table-auto border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="border px-2 py-1 text-left">ID</th>
                <th className="border px-2 py-1 text-left">Username</th>
                <th className="border px-2 py-1 text-left">Role</th>
                <th className="border px-2 py-1 text-left">Criado Em</th>
                <th className="border px-2 py-1 text-left">Ações</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 && (
                <tr>
                  <td colSpan="5" className="text-center py-4">Nenhum utilizador encontrado.</td>
                </tr>
              )}
              {users.map(user => (
                <tr key={user._id} className="hover:bg-gray-50">
                  <td className="border px-2 py-1 text-sm">{user._id}</td>
                  <td className="border px-2 py-1">{user.username}</td>
                  <td className="border px-2 py-1">
                    {editingRoleId === user._id ? (
                      <select
                        value={editingRoleValue}
                        onChange={e => setEditingRoleValue(e.target.value)}
                        className="border px-2 py-1 rounded"
                        disabled={updatingRole}
                      >
                        <option value="user">user</option>
                        <option value="admin">admin</option>
                      </select>
                    ) : (
                      <span>{user.role}</span>
                    )}
                  </td>
                  <td className="border px-2 py-1 text-sm">
                    {new Date(user.createdAt).toLocaleString()}
                  </td>
                  <td className="border px-2 py-1 space-x-2">
                    {editingRoleId === user._id ? (
                      <>
                        <button
                          onClick={() => handleUpdateRole(user._id)}
                          className={`px-2 py-1 text-white ${
                            updatingRole ? 'bg-gray-500 cursor-not-allowed' : 'bg-green-600'
                          } rounded text-sm`}
                          disabled={updatingRole}
                        >
                          {updatingRole ? 'Salvando...' : 'Salvar'}
                        </button>
                        <button
                          onClick={cancelEditingRole}
                          className="px-2 py-1 bg-gray-300 text-gray-700 rounded text-sm"
                          disabled={updatingRole}
                        >
                          Cancelar
                        </button>
                        {updateError && (
                          <p className="text-red-600 text-sm mt-1">{updateError}</p>
                        )}
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => startEditingRole(user._id, user.role)}
                          className="px-2 py-1 bg-yellow-500 text-white rounded text-sm"
                        >
                          Editar Role
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user._id)}
                          className={`px-2 py-1 bg-red-600 text-white rounded text-sm ${
                            deletingUserId === user._id ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                          disabled={deletingUserId === user._id}
                        >
                          {deletingUserId === user._id ? 'Removendo...' : 'Remover'}
                        </button>
                        {deleteError && deletingUserId === user._id && (
                          <p className="text-red-600 text-sm mt-1">{deleteError}</p>
                        )}
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
