// app.js (ou index.js)

require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const mongoose = require('mongoose');

const authRoutes     = require('./routes/auth');       // Rotas de login/registo
const userRoutes     = require('./routes/users');      // NOSSO Novo Router de Gestão de Usuários
const partidaRoutes  = require('./routes/partidas');   // Rotas já existentes
// ... outros routers (ex.: estatísticas, etc.)

const app = express();

// → Conectar ao MongoDB (ajuste a URI conforme o seu ambiente)
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log('MongoDB conectado.');
}).catch(err => {
  console.error('Erro ao conectar ao MongoDB:', err);
});

// Middlewares gerais
app.use(cors());
app.use(express.json());      // Para ler application/json
app.use(express.urlencoded({  // Caso queira lidar com forms tradicionalmente
  extended: true
}));

// Rotas públicas (não precisam de ser admin, apenas registo e login)
app.use('/api/auth', authRoutes);

// → Rotas de gestão de utilizadores (administradores apenas)
app.use('/api/users', userRoutes);

// Rotas de partidas (OCR, manual, resultados, estatísticas, predição)
app.use('/api/partidas', partidaRoutes);

// Rota “catch‐all” para gerir 404 em caso de endpoints não existentes
app.use((req, res) => {
  res.status(404).json({ sucesso: false, mensagem: 'Endpoint não encontrado.' });
});

// Iniciar o servidor
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Servidor a correr na porta ${PORT}.`);
});
