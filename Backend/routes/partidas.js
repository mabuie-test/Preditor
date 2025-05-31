const express   = require('express');
const multer    = require('multer');
const Tesseract = require('tesseract.js');
const fs        = require('fs');
const stats     = require('simple-statistics');
const Partida   = require('../models/Partida');
const { allowRoles } = require('../middleware/role');

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

// ⬇️ Upload e OCR – acessível a admin e user
// Ao processar uma nova imagem, eliminamos todo o histórico existente
// do utilizador para reiniciar o gráfico e predições.
router.post(
  '/upload',
  allowRoles('admin', 'user'),
  upload.single('imagem'),
  async (req, res) => {
    const imagePath = req.file.path;
    try {
      // 1. Executar OCR
      const { data: { text } } = await Tesseract.recognize(
        imagePath, 'eng', { logger: m => console.log(m) }
      );

      // 2. Extrair todos os valores do tipo "2.45x"
      const matches = Array.from(text.matchAll(/(\d+\.\d+)x/g));
      const valores = matches.map(m => m[1] + 'x');

      if (valores.length === 0) {
        return res.status(422).json({
          sucesso: false,
          mensagem: 'Nenhum multiplicador encontrado na imagem.'
        });
      }

      // 3. Limpar histórico antigo do utilizador (reiniciar sessão)
      await Partida.deleteMany({ user: req.user.id });

      // 4. Inserir novos valores em batch (cada documento inclui user)
      const docs = valores.map(v => ({
        valor: v,
        user: req.user.id
      }));
      await Partida.insertMany(docs);

      return res.json({
        sucesso: true,
        valoresReconhecidos: valores
      });
    } catch (err) {
      console.error('Erro OCR/BD:', err);
      return res.status(500).json({
        sucesso: false,
        mensagem: err.message
      });
    } finally {
      fs.unlinkSync(imagePath);
    }
  }
);

// ⬇️ Inserção manual de um ou vários valores
// Ao inserir manualmente, NÃO apagamos o histórico: os dados são somados.
router.post(
  '/manual',
  allowRoles('admin', 'user'),
  express.json(),
  async (req, res) => {
    // Aceita { valor: "2.45" } ou { valores: ["2.45","1.20"] }
    let entradas = [];
    if (Array.isArray(req.body.valores)) {
      entradas = req.body.valores;
    } else if (typeof req.body.valor === 'string') {
      entradas = [req.body.valor];
    } else {
      return res.status(422).json({
        sucesso: false,
        mensagem: 'Envie um campo "valor" (string) ou "valores" (array de strings).'
      });
    }

    // Normalizar e validar cada entrada
    const normalizados = [];
    for (const ent of entradas) {
      const m = ent.match(/^(\d+(\.\d+))x?$/);
      if (!m) {
        return res.status(422).json({
          sucesso: false,
          mensagem: `Formato inválido em "${ent}". Use "n.nn" ou "n.nnx".`
        });
      }
      normalizados.push(m[1] + 'x');
    }

    // Inserir todos de uma vez, incluindo o user, sem apagar histórico
    try {
      const docs = normalizados.map(v => ({
        valor: v,
        user: req.user.id
      }));
      await Partida.insertMany(docs);
      return res.json({
        sucesso: true,
        valoresInseridos: normalizados
      });
    } catch (err) {
      console.error('Erro ao inserir manual:', err);
      return res.status(500).json({
        sucesso: false,
        mensagem: err.message
      });
    }
  }
);

// ⬇️ Histórico completo – apenas partidas do utilizador autenticado
router.get(
  '/resultados',
  allowRoles('admin', 'user'),
  async (req, res) => {
    try {
      const docs = await Partida
        .find({ user: req.user.id })
        .sort({ data: 1 });
      return res.json(docs.map(d => ({
        valor: d.valor,
        data: d.data
      })));
    } catch (err) {
      console.error('Erro ao obter histórico:', err);
      return res.status(500).json({
        sucesso: false,
        mensagem: err.message
      });
    }
  }
);

// ⬇️ Estatísticas descritivas – apenas do utilizador autenticado
router.get(
  '/estatisticas',
  allowRoles('admin', 'user'),
  async (req, res) => {
    try {
      const docs = await Partida
        .find({ user: req.user.id })
        .sort({ data: 1 });
      const nums = docs.map(d => parseFloat(d.valor));
      return res.json({
        media: stats.mean(nums),
        moda: stats.mode(nums),
        desvio: stats.standardDeviation(nums),
        min: Math.min(...nums),
        max: Math.max(...nums),
        total: nums.length
      });
    } catch (err) {
      console.error('Erro ao obter estatísticas:', err);
      return res.status(500).json({
        sucesso: false,
        mensagem: err.message
      });
    }
  }
);

// ⬇️ Predição (média móvel de ordem 5) – apenas do utilizador autenticado
router.get(
  '/predicao',
  allowRoles('admin', 'user'),
  async (req, res) => {
    try {
      const docs = await Partida
        .find({ user: req.user.id })
        .sort({ data: 1 });
      const nums = docs.map(d => parseFloat(d.valor));

      if (nums.length < 5) {
        return res.status(422).json({
          sucesso: false,
          mensagem: 'Dados insuficientes para predizer.'
        });
      }

      const ult5 = nums.slice(-5);
      const pred = stats.mean(ult5).toFixed(2);
      return res.json({ proximoValor: pred });
    } catch (err) {
      console.error('Erro ao calcular predição:', err);
      return res.status(500).json({
        sucesso: false,
        mensagem: err.message
      });
    }
  }
);

module.exports = router;
