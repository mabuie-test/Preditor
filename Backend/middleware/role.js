// middleware/role.js

/**
 * Gera um middleware que permite apenas acessos de determinados roles.
 * Exemplo de uso: allowRoles('admin', 'user')
 */
function allowRoles(...perfisPermitidos) {
  return (req, res, next) => {
    if (!req.user || !perfisPermitidos.includes(req.user.role)) {
      return res.status(403).json({ erro: 'Acesso negado.' });
    }
    return next();
  };
}

module.exports = {
  allowRoles
};
