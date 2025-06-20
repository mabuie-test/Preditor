// routes/partidas.js

const express   = require('express');
const multer    = require('multer');
const Tesseract = require('tesseract.js');
const fs        = require('fs');
const stats     = require('simple-statistics');
const Partida   = require('../models/Partida');
const { verifyToken } = require('../middleware/auth');
const { allowRoles }  = require('../middleware/role');

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

// ⬇️ Upload e OCR – acessível a admin e user
router.post(
  '/upload',
  verifyToken,
  allowRoles('admin', 'user'),
  upload.single('imagem'),
  async (req, res) => {
    const imagePath = req.file.path;
    try {
      // 1) Executar OCR
      const { data: { text } } = await Tesseract.recognize(
        imagePath, 'eng', { logger: m => console.log(m) }
      );

      // 2) Extrair todos os valores no formato "n.nnx" (ex: "2.45x")
      const matches = Array.from(text.matchAll(/(\d+\.\d+)x/g));
      const valores = matches.map(m => m[1] + 'x');

      if (valores.length === 0) {
        return res.status(422).json({
          sucesso: false,
          mensagem: 'Nenhum multiplicador encontrado na imagem.'
        });
      }

      // 3) Apagar TODO o histórico antigo do utilizador (reiniciar sessão)
      await Partida.deleteMany({ user: req.user.id });

      // 4) Inserir somente os novos valores extraídos, associando ao utilizador
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


// ⬇️ Inserção manual de um ou vários valores (continuação em tempo real)
router.post(
  '/manual',
  verifyToken,
  allowRoles('admin', 'user'),
  express.json(),
  async (req, res) => {
    // Pode receber { valor: "2.45" } ou { valores: ["2.45","1.20"] }
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

    // Inserir todos de uma só vez, associando ao utilizador
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


// ⬇️ Histórico completo – apenas entradas do utilizador autenticado
router.get(
  '/resultados',
  verifyToken,
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
  verifyToken,
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
        mediana: stats.median(nums),
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


// ⬇️ Predição Avançada (estatísticas robustas + percentis “provably fair”)
router.get(
  '/predicao',
  verifyToken,
  allowRoles('admin', 'user'),
  async (req, res) => {
    try {
      const docs = await Partida
        .find({ user: req.user.id })
        .sort({ data: 1 });
      console.log('DEBUG /predicao: req.user.id =', req.user.id);
      console.log('DEBUG /predicao: docs.length =', docs.length);

      const nums = docs.map(d => parseFloat(d.valor));
      if (nums.length === 0) {
        return res.status(422).json({
          sucesso: false,
          mensagem: 'Dados insuficientes para predizer. Insira pelo menos 1 valor.'
        });
      }

      // 1) Média simples de TODOS os valores
      const mediaSimples = stats.mean(nums).toFixed(2);

      // 2) Mediana (percentil 50%)
      const mediana = stats.median(nums).toFixed(2);

      // 3) Média aparada (trimmed mean), descartando 10% dos menores e 10% dos maiores
      const n = nums.length;
      const k = Math.floor(n * 0.10); // 10% de cada extremidade
      const sorted = [...nums].sort((a, b) => a - b);
      const aparados = sorted.slice(k, n - k);
      const mediaAparada = (aparados.length > 0
        ? stats.mean(aparados)
        : stats.mean(sorted)
      ).toFixed(2);

      // 4) Percentis para o “provably fair” de risco
      const lowRiskOddRaw    = stats.quantile(sorted, 0.20); // 20% → low risk
      const mediumRiskOddRaw = stats.quantile(sorted, 0.50); // 50% → mediana
      const highRiskOddRaw   = stats.quantile(sorted, 0.80); // 80% → high risk

      const lowRiskOdd    = lowRiskOddRaw.toFixed(2);
      const mediumRiskOdd = mediumRiskOddRaw.toFixed(2);
      const highRiskOdd   = highRiskOddRaw.toFixed(2);

      return res.json({
        proximoValor: mediaSimples,
        mediana,
        mediaAparada,
        lowRiskOdd,
        mediumRiskOdd,
        highRiskOdd
      });
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
