require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const mongoose = require('mongoose');

const authRoutes     = require('./routes/auth');
const partidasRoutes = require('./routes/partidas');
const { verifyToken } = require('./middleware/auth');

const app = express();

// Middleware global
app.use(cors());
app.use(express.json());

// Conexão ao MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('MongoDB conectado.'))
.catch(err => console.error('Erro MongoDB:', err));

// Rotas públicas
app.use('/auth', authRoutes);

// Middleware de verificação de token para rotas seguintes
app.use('/api', verifyToken);

// Rotas protegidas
app.use('/api/partidas', partidasRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`API a correr em http://localhost:${PORT}`);
});
