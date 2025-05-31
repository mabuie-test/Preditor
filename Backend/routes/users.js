// routes/users.js

const express = require('express');
const router  = express.Router();
const User    = require('../models/User');
const { verifyToken } = require('../middleware/auth');
const { allowRoles }  = require('../middleware/role');

// Todas as rotas aqui são apenas para admin
router.use(verifyToken, allowRoles('admin'));


/**
 * GET /api/users
 *  - Lista todos os utilizadores (username, role, createdAt)
 */
router.get('/', async (req, res) => {
  try {
    const users = await User.find({}, 'username role createdAt').sort({ createdAt: -1 });
    return res.json({ sucesso: true, users });
  } catch (err) {
    console.error('Erro ao listar utilizadores:', err);
    return res.status(500).json({ sucesso: false, mensagem: 'Erro interno ao listar utilizadores.' });
  }
});


/**
 * GET /api/users/:id
 *  - Obtém detalhes de um único utilizador
 */
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id, 'username role createdAt');
    if (!user) {
      return res.status(404).json({ sucesso: false, mensagem: 'Utilizador não encontrado.' });
    }
    return res.json({ sucesso: true, user });
  } catch (err) {
    console.error('Erro ao obter utilizador:', err);
    return res.status(500).json({ sucesso: false, mensagem: 'Erro interno ao obter utilizador.' });
  }
});


/**
 * POST /api/users
 *  - Cria novo utilizador (username, password, role)
 */
router.post('/', async (req, res) => {
  const { username, password, role } = req.body;
  if (!username || !password || !role) {
    return res.status(422).json({ sucesso: false, mensagem: 'Campos obrigatórios: username, password, role.' });
  }
  if (!['admin', 'user'].includes(role)) {
    return res.status(422).json({ sucesso: false, mensagem: 'Role inválida. Use "admin" ou "user".' });
  }

  try {
    const existe = await User.findOne({ username: username.toLowerCase().trim() });
    if (existe) {
      return res.status(409).json({ sucesso: false, mensagem: 'Username já existe.' });
    }

    const newUser = new User({
      username: username.toLowerCase().trim(),
      password,
      role
    });
    await newUser.save();

    return res.status(201).json({
      sucesso: true,
      user: {
        _id: newUser._id,
        username: newUser.username,
        role: newUser.role,
        createdAt: newUser.createdAt
      }
    });
  } catch (err) {
    console.error('Erro ao criar utilizador:', err);
    return res.status(500).json({ sucesso: false, mensagem: 'Erro interno ao criar utilizador.' });
  }
});


/**
 * PUT /api/users/:id
 *  - Atualiza username e/ou role de um utilizador existente
 */
router.put('/:id', async (req, res) => {
  const { username, role } = req.body;
  const update = {};

  if (username) {
    update.username = username.toLowerCase().trim();
  }
  if (role) {
    if (!['admin', 'user'].includes(role)) {
      return res.status(422).json({ sucesso: false, mensagem: 'Role inválida. Use "admin" ou "user".' });
    }
    update.role = role;
  }

  try {
    if (update.username) {
      const outro = await User.findOne({ 
        username: update.username, 
        _id: { $ne: req.params.id } 
      });
      if (outro) {
        return res.status(409).json({ sucesso: false, mensagem: 'Username já em uso por outro utilizador.' });
      }
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      { $set: update },
      { new: true, select: 'username role createdAt' }
    );
    if (!updatedUser) {
      return res.status(404).json({ sucesso: false, mensagem: 'Utilizador não encontrado.' });
    }
    return res.json({ sucesso: true, user: updatedUser });
  } catch (err) {
    console.error('Erro ao atualizar utilizador:', err);
    return res.status(500).json({ sucesso: false, mensagem: 'Erro interno ao atualizar utilizador.' });
  }
});


/**
 * DELETE /api/users/:id
 *  - Remove um utilizador
 */
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await User.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ sucesso: false, mensagem: 'Utilizador não encontrado.' });
    }
    return res.json({ sucesso: true, mensagem: `Utilizador '${deleted.username}' removido.` });
  } catch (err) {
    console.error('Erro ao remover utilizador:', err);
    return res.status(500).json({ sucesso: false, mensagem: 'Erro interno ao remover utilizador.' });
  }
});

module.exports = router;
