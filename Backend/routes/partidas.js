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
router.post(
  '/upload',
  allowRoles('admin','user'),
  upload.single('imagem'),
  async (req, res) => {
    const imagePath = req.file.path;
    try {
      const { data: { text } } = await Tesseract.recognize(
        imagePath, 'eng', { logger: m => console.log(m) }
      );

      // Extrair todos os valores tipo "2.45x"
      const matches = Array.from(text.matchAll(/(\d+\.\d+)x/g));
      const valores = matches.map(m => m[1] + 'x');

      if (valores.length === 0) {
        return res.status(422).json({
          sucesso: false,
          mensagem: 'Nenhum multiplicador encontrado na imagem.'
        });
      }

      // Inserção em batch
      const docs = valores.map(v => ({ valor: v }));
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
      // Remove o ficheiro temporário
      fs.unlinkSync(imagePath);
    }
  }
);

// ⬇️ Inserir manualmente um valor de multiplicador
router.post(
  '/manual',
  allowRoles('admin','user'),
  express.json(),
  async (req, res) => {
    const { valor } = req.body;
    const match = valor.match(/^(\d+(\.\d+))x?$/);
    if (!match) {
      return res.status(422).json({
        sucesso: false,
        mensagem: 'Formato inválido: informe algo como "2.45" ou "2.45x".'
      });
    }
    const normalized = match[1] + 'x';
    try {
      const partida = new Partida({ valor: normalized });
      await partida.save();
      return res.json({
        sucesso: true,
        valorInserido: normalized
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

// ⬇️ Histórico completo – admin e user
router.get(
  '/resultados',
  allowRoles('admin','user'),
  async (req, res) => {
    const docs = await Partida.find().sort({ data: 1 });
    res.json(docs.map(d => ({ valor: d.valor, data: d.data })));
  }
);

// ⬇️ Estatísticas descritivas – admin e user
router.get(
  '/estatisticas',
  allowRoles('admin','user'),
  async (req, res) => {
    const docs = await Partida.find().sort({ data: 1 });
    const nums = docs.map(d => parseFloat(d.valor));
    res.json({
      media: stats.mean(nums),
      moda: stats.mode(nums),
      desvio: stats.standardDeviation(nums),
      min: Math.min(...nums),
      max: Math.max(...nums),
      total: nums.length
    });
  }
);

// ⬇️ Predição (média móvel de ordem 5) – admin e user
router.get(
  '/predicao',
  allowRoles('admin','user'),
  async (req, res) => {
    const docs = await Partida.find().sort({ data: 1 });
    const nums = docs.map(d => parseFloat(d.valor));

    if (nums.length < 5) {
      return res.status(422).json({
        sucesso: false,
        mensagem: 'Dados insuficientes para predizer.'
      });
    }

    const ult5 = nums.slice(-5);
    const pred = stats.mean(ult5).toFixed(2);

    res.json({ proximoValor: pred });
  }
);

module.exports = router;
