const express = require('express');
const jwt     = require('jsonwebtoken');
const User    = require('../models/User');
// const { allowRoles } = require('../middleware/role');
// const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// Registo de novo utilizador (temporariamente aberto para criar o primeiro admin)
router.post(
  '/register',
  //verifyToken,
  //allowRoles('admin'),
  async (req, res) => {
    const { username, password, role } = req.body;
    try {
      const user = new User({ username, password, role });
      await user.save();
      res.status(201).json({ mensagem: 'Utilizador criado com sucesso.' });
    } catch (err) {
      res.status(400).json({ erro: err.message });
    }
  }
);

// Login – retorna JWT
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ username });
    if (!user || !await user.comparePassword(password)) {
      return res.status(401).json({ erro: 'Credenciais inválidas.' });
    }
    const payload = { id: user._id, role: user.role };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '12h' });
    res.json({ token, role: user.role, username: user.username });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

module.exports = router;
