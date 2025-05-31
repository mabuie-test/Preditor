// app.js

require('dotenv').config();
const express  = require('express');
const cors     = require('cors');
const mongoose = require('mongoose');

const authRoutes    = require('./routes/auth');
const userRoutes    = require('./routes/users');
const partidaRoutes = require('./routes/partidas');

const app = express();

// Conexão ao MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('MongoDB conectado.'))
.catch(err => console.error('Erro ao conectar ao MongoDB:', err));

// Middlewares globais
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rotas públicas
app.use('/api/auth', authRoutes);

// Rotas de administração de utilizadores (apenas admin)
app.use('/api/users', userRoutes);

// Rotas de partidas (OCR, manual, histórico, estatísticas, predição)
app.use('/api/partidas', partidaRoutes);

// Catch-all 404
app.use((req, res) => {
  res.status(404).json({ sucesso: false, mensagem: 'Endpoint não encontrado.' });
});

// Iniciar servidor
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Servidor a correr na porta ${PORT}.`);
});
