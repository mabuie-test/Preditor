// src/components/UploadForm.jsx

import React, { useState, useEffect, useContext } from 'react';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { AuthContext } from '../AuthContext';

export default function UploadForm() {
  const { role } = useContext(AuthContext);

  // ---------- Estados ----------
  const [arquivo, setArquivo] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isProcessingOCR, setIsProcessingOCR] = useState(false);
  const [valoresOCR, setValoresOCR] = useState([]);
  const [historico, setHistorico] = useState([]);
  const [predictionData, setPredictionData] = useState(null);
  const [manualInput, setManualInput] = useState('');

  // ---------- Dropzone ----------
  const onDrop = acceptedFiles => {
    setArquivo(acceptedFiles[0]);
    setValoresOCR([]);
    setPredictionData(null);
    setUploadProgress(0);
    setIsProcessingOCR(false);
  };
  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: 'image/*'
  });

  // ---------- useEffect Inicial ----------
  useEffect(() => {
    fetchHistorico(false);
  }, []);

  // ---------- Funções de Chamada à API ----------

  /**
   * GET /api/partidas/resultados
   * @param {boolean} clearPrediction
   */
  const fetchHistorico = async (clearPrediction = false) => {
    try {
      const res = await axios.get('/api/partidas/resultados');
      const dados = res.data || [];
      setHistorico(dados);
      if (clearPrediction) {
        setPredictionData(null);
      }
    } catch (err) {
      console.error('Erro ao buscar histórico:', err);
      alert('Falha ao obter histórico: ' + (err.message || 'Erro desconhecido'));
    }
  };

  /**
   * POST /api/partidas/upload
   */
  const handleUpload = async () => {
    if (!arquivo) {
      return alert('Selecione uma imagem primeiro.');
    }
    const fd = new FormData();
    fd.append('imagem', arquivo);

    try {
      setValoresOCR([]);
      setPredictionData(null);
      setIsProcessingOCR(false);
      setUploadProgress(0);

      // Upload com progresso
      const res = await axios.post('/api/partidas/upload', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percent);
        }
      });

      setUploadProgress(100);
      setIsProcessingOCR(true);

      const ocrValues = res.data.valoresReconhecidos || [];
      setValoresOCR(ocrValues);

      await fetchHistorico(true);

      setTimeout(() => {
        setIsProcessingOCR(false);
        setUploadProgress(0);
      }, 500);
    } catch (err) {
      console.error('Erro ao processar imagem:', err);
      const backendMsg = err.response?.data?.mensagem || err.response?.data?.erro;
      const finalMsg = backendMsg || err.message || 'Erro desconhecido';
      alert('Erro ao processar a imagem: ' + finalMsg);
      setUploadProgress(0);
      setIsProcessingOCR(false);
    }
  };

  /**
   * GET /api/partidas/predicao
   */
  const handlePredicao = async () => {
    try {
      const res = await axios.get('/api/partidas/predicao');
      setPredictionData(res.data);
    } catch (err) {
      console.error('Erro ao obter predição:', err);
      const backendMsg = err.response?.data?.mensagem || err.response?.data?.erro;
      if (backendMsg && backendMsg.toLowerCase().includes('insuficientes')) {
        alert(backendMsg);
      } else {
        const finalMsg = backendMsg || err.message || 'Erro desconhecido';
        alert('Não foi possível obter predição: ' + finalMsg);
      }
      setPredictionData(null);
    }
  };

  /**
   * POST /api/partidas/manual
   */
  const handleManual = async () => {
    if (!manualInput.trim()) {
      return alert('Digite um ou mais valores (ex: "2.45,1.20").');
    }
    const arr = manualInput
      .split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    try {
      const payload = arr.length > 1
        ? { valores: arr }
        : { valor: arr[0] };
      const res = await axios.post('/api/partidas/manual', payload);
      const inseridos = res.data.valoresInseridos || [res.data.valorInserido];
      alert('Valores inseridos: ' + inseridos.join(', '));
      setManualInput('');
      await fetchHistorico(false);
    } catch (err) {
      console.error('Erro ao inserir manual:', err);
      const backendMsg = err.response?.data?.mensagem || err.response?.data?.erro;
      const finalMsg = backendMsg || err.message || 'Erro desconhecido';
      alert('Falha ao inserir manualmente: ' + finalMsg);
    }
  };

  // Dados para gráfico
  const dataGrafico = historico.map((r, i) => ({
    name: `#${i + 1}`,
    value: parseFloat(r.valor)
  }));

  return (
    <div className="p-4">
      <h1 className="text-2xl mb-4">Aviator Predictor</h1>

      {/* Dropzone */}
      <div {...getRootProps()} className="border-2 p-4 mb-4 cursor-pointer">
        <input {...getInputProps()} />
        {arquivo
          ? arquivo.name
          : 'Arraste e largue o screenshot aqui ou clique para selecionar'}
      </div>

      {/* Botão Processar Imagem */}
      <button
        onClick={handleUpload}
        className="bg-blue-600 text-white px-4 py-2 mb-4 rounded"
      >
        Processar Imagem
      </button>

      {/* Barra de progresso do upload */}
      {uploadProgress > 0 && (
        <div className="mb-2">
          <label className="block mb-1">Progresso do Upload: {uploadProgress}%</label>
          <progress value={uploadProgress} max="100" className="w-full h-4" />
        </div>
      )}

      {/* Barra de status para OCR (indeterminado) */}
      {isProcessingOCR && (
        <div className="mb-4">
          <label className="block mb-1">Processando OCR, aguarde…</label>
          <progress className="w-full h-4" />
        </div>
      )}

      {/* Valores OCR */}
      {valoresOCR.length > 0 && !isProcessingOCR && (
        <div className="mb-4">
          <h2 className="text-xl">Valores Extraídos:</h2>
          <ul className="list-disc list-inside">
            {valoresOCR.map((v, i) => (
              <li key={i}>{v}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Botão Predição */}
      <button
        onClick={handlePredicao}
        className="bg-green-600 text-white px-4 py-2 mb-4 rounded"
      >
        Obter Predição do Próximo Valor
      </button>

      {/* Dados de Predição */}
      {predictionData && (
        <div className="mb-4 bg-gray-50 p-4 rounded">
          <h2 className="text-xl mb-2">Predição Avançada</h2>
          <p>• <strong>Média Simples:</strong> {predictionData.proximoValor}x</p>
          <p>• <strong>Média Aparada:</strong> {predictionData.mediaAparada}x</p>
          <p>• <strong>Low‐Risk Odd (20º perc):</strong> {predictionData.lowRiskOdd}x</p>
          <p>• <strong>Medium‐Risk Odd (50º perc):</strong> {predictionData.mediumRiskOdd}x</p>
          <p>• <strong>High‐Risk Odd (80º perc):</strong> {predictionData.highRiskOdd}x</p>
          <div className="mt-2">
            <label className="mr-2">Ou insira manualmente (vírgula separa):</label>
            <input
              type="text"
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              placeholder="ex: 2.45, 1.20, 3.00"
              className="border px-2 py-1 mr-2"
            />
            <button
              onClick={handleManual}
              className="bg-yellow-500 text-white px-3 py-1 rounded"
            >
              Inserir Manual
            </button>
          </div>
        </div>
      )}

      {/* Gráfico do Histórico */}
      <h2 className="text-xl mb-2">Histórico de Resultados</h2>
      <LineChart width={600} height={300} data={dataGrafico}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis domain={['dataMin - 0.5', 'dataMax + 0.5']} />
        <Tooltip />
        <Line type="monotone" dataKey="value" stroke="#1f2937" />
      </LineChart>

      {/* Painel de Admin (aparece apenas se role === 'admin') */}
      {role === 'admin' && (
        <div className="mt-6 p-4 border-t">
          <h3 className="text-lg">Painel de Admin</h3>
          <p>
            Aceda a <a href="/admin" className="text-blue-600 underline">Painel de Gestão de Utilizadores</a>
          </p>
        </div>
      )}
    </div>
  );
}
