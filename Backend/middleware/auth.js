// middleware/auth.js

const jwt = require('jsonwebtoken');

/**
 * Verifica o token JWT enviado no header "Authorization: Bearer <token>".
 * Se válido, atribui req.user = { id: <ObjectId do user>, role: <string> }.
 */
function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ erro: 'Token em falta.' });
  }
  const parts = authHeader.split(' ');
  if (parts.length !== 2) {
    return res.status(401).json({ erro: 'Formato de token inválido.' });
  }
  const [scheme, token] = parts;
  if (!/^Bearer$/i.test(scheme)) {
    return res.status(401).json({ erro: 'Formato de token inválido.' });
  }
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: payload.id, role: payload.role };
    return next();
  } catch (err) {
    return res.status(401).json({ erro: 'Token inválido.' });
  }
}

module.exports = {
  verifyToken
};
