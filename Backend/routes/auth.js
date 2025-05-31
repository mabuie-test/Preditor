// routes/auth.js

const express = require('express');
const jwt     = require('jsonwebtoken');
const User    = require('../models/User');

const router = express.Router();

/**
 * POST /api/auth/register
 * Registo de novo utilizador (apenas admin cria outros admin ou user).
 * Para o registo inicial / seed, pode comentar temporariamente o verifyToken + allowRoles.
 */
router.post('/register', async (req, res) => {
  const { username, password, role } = req.body;
  if (!username || !password || !role) {
    return res.status(422).json({ erro: 'Campos obrigatórios: username, password, role.' });
  }
  try {
    // Evitar duplicação
    const existe = await User.findOne({ username: username.toLowerCase().trim() });
    if (existe) {
      return res.status(409).json({ erro: 'Username já existe.' });
    }
    const user = new User({
      username: username.toLowerCase().trim(),
      password,
      role
    });
    await user.save();
    return res.status(201).json({ mensagem: 'Utilizador criado com sucesso.' });
  } catch (err) {
    return res.status(500).json({ erro: err.message });
  }
});


/**
 * POST /api/auth/login
 * Login retorna JWT
 */
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(422).json({ erro: 'Username e password são necessários.' });
  }
  try {
    const user = await User.findOne({ username: username.toLowerCase().trim() });
    if (!user) {
      return res.status(401).json({ erro: 'Credenciais inválidas.' });
    }
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ erro: 'Credenciais inválidas.' });
    }
    const payload = { id: user._id, role: user.role };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '12h' });
    return res.json({ token, role: user.role, username: user.username });
  } catch (err) {
    return res.status(500).json({ erro: err.message });
  }
});

module.exports = router;
