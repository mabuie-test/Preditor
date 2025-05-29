// Garante que o role do utilizador está autorizado
exports.allowRoles = (...permittedRoles) => (req, res, next) => {
  if (!req.user || !permittedRoles.includes(req.user.role)) {
    return res.status(403).json({ erro: 'Acesso proibido.' });
  }
  next();
};
