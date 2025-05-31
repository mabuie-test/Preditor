// src/UploadForm.jsx

import React, { useState, useEffect, useContext } from 'react';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { AuthContext } from './AuthContext';

export default function UploadForm() {
  const { role } = useContext(AuthContext);

  // ---------- Estados ----------
  const [arquivo, setArquivo] = useState(null);              // Ficheiro de screenshot
  const [uploadProgress, setUploadProgress] = useState(0);   // Progresso do upload (0–100)
  const [isProcessingOCR, setIsProcessingOCR] = useState(false); // Indicador “Processando OCR”
  const [valoresOCR, setValoresOCR] = useState([]);          // Valores extraídos pelo OCR
  const [historico, setHistorico] = useState([]);            // Histórico de partidas do utilizador
  const [predictionData, setPredictionData] = useState(null); // Dados de predição (objeto com várias métricas)
  const [manualInput, setManualInput] = useState('');        // Campo para inserir manualmente

  // ---------- Dropzone ----------
  const onDrop = acceptedFiles => {
    setArquivo(acceptedFiles[0]);
    // Limpar estados prévios ao carregar nova imagem
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

  // ---------- Funções de Chamada a API ----------

  /**
   * GET /api/partidas/resultados
   * @param {boolean} clearPrediction - se true, limpa o estado 'predictionData'
   */
  const fetchHistorico = async (clearPrediction = false) => {
    try {
      const res = await axios.get('/api/partidas/resultados');
      console.log('DEBUG (frontend) /resultados:', res.data);
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
   * - Faz o upload da imagem para OCR.
   * - Atualiza a barra de progresso.
   * - Exibe “Processando OCR” até receber resposta.
   * - Lê valores, recarrega histórico (nova sessão).
   */
  const handleUpload = async () => {
    if (!arquivo) {
      return alert('Selecione uma imagem primeiro.');
    }
    const fd = new FormData();
    fd.append('imagem', arquivo);

    try {
      // Limpeza inicial
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

      // Quando upload atinge 100%
      setUploadProgress(100);
      setIsProcessingOCR(true);

      // Backend retorna { valoresReconhecidos: [...] }
      const ocrValues = res.data.valoresReconhecidos || [];
      setValoresOCR(ocrValues);

      // Recarrega histórico e limpa predição (nova sessão OCR)
      await fetchHistorico(true);

      // Após pequeno delay, desliga indicadores
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
   * - Retorna objeto:
   *    {
   *      proximoValor, mediaAparada, lowRiskOdd, mediumRiskOdd, highRiskOdd
   *    }
   * - Se não houver valores, devolve erro 422 “Dados insuficientes…”.
   */
  const handlePredicao = async () => {
    console.log('DEBUG (frontend) histórico.length =', historico.length);
    try {
      const res = await axios.get('/api/partidas/predicao');
      console.log('DEBUG (frontend) /predicao respondeu:', res.data);
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
   * - Insere manualmente um ou vários valores (continuação em tempo real).
   * - Não reinicia a sessão; apenas acrescenta ao histórico.
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
      // Recarrega histórico, mas não limpa 'predictionData'
      await fetchHistorico(false);
    } catch (err) {
      console.error('Erro ao inserir manual:', err);
      const backendMsg = err.response?.data?.mensagem || err.response?.data?.erro;
      const finalMsg = backendMsg || err.message || 'Erro desconhecido';
      alert('Falha ao inserir manualmente: ' + finalMsg);
    }
  };

  // Prepara dados para o gráfico de linhas
  const dataGrafico = historico.map((r, i) => ({
    name: `#${i + 1}`,
    value: parseFloat(r.valor)
  }));

  return (
    <div className="p-4">
      <h1 className="text-2xl mb-4">Aviator Predictor</h1>

      {/* Dropzone para screenshot */}
      <div {...getRootProps()} className="border-2 p-4 mb-4 cursor-pointer">
        <input {...getInputProps()} />
        {arquivo
          ? arquivo.name
          : 'Arraste e largue o screenshot aqui ou clique para selecionar'}
      </div>

      {/* Botão para enviar imagem */}
      <button
        onClick={handleUpload}
        className="bg-blue-600 text-white px-4 py-2 mb-4"
      >
        Processar Imagem
      </button>

      {/* Barra de progresso */}
      {uploadProgress > 0 && (
        <div className="mb-2">
          <label className="block mb-1">Progresso do Upload: {uploadProgress}%</label>
          <progress
            value={uploadProgress}
            max="100"
            className="w-full h-4"
          />
        </div>
      )}

      {/* Indicador “Processando OCR…” */}
      {isProcessingOCR && (
        <div className="mb-4 text-blue-700">
          Processando OCR, aguarde...
        </div>
      )}

      {/* Exibe valores extraídos pelo OCR */}
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

      {/* Botão de predição */}
      <button
        onClick={handlePredicao}
        className="bg-green-600 text-white px-4 py-2 mb-4"
      >
        Obter Predição do Próximo Valor
      </button>

      {/* Exibe dados de predição e odd ideal */}
      {predictionData && (
        <div className="mb-4">
          <h2 className="text-xl">Predição Avançada</h2>
          <p>
            • <strong>Média Simples (próximoValor):</strong> {predictionData.proximoValor}x
          </p>
          <p>
            • <strong>Média Aparada (trimmed mean):</strong> {predictionData.mediaAparada}x
          </p>
          <p>
            • <strong>Low‐Risk Odd (20º percentil):</strong> {predictionData.lowRiskOdd}x
          </p>
          <p>
            • <strong>Medium‐Risk Odd (50º percentil, mediana):</strong> {predictionData.mediumRiskOdd}x
          </p>
          <p>
            • <strong>High‐Risk Odd (80º percentil):</strong> {predictionData.highRiskOdd}x
          </p>
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
              className="bg-yellow-500 text-white px-3 py-1"
            >
              Inserir Manual
            </button>
          </div>
        </div>
      )}

      {/* Gráfico com histórico do utilizador */}
      <h2 className="text-xl mb-2">Histórico de Resultados</h2>
      <LineChart width={600} height={300} data={dataGrafico}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis domain={['dataMin - 0.5', 'dataMax + 0.5']} />
        <Tooltip />
        <Line type="monotone" dataKey="value" />
      </LineChart>

      {/* Painel extra para admin */}
      {role === 'admin' && (
        <div className="mt-6 p-4 border-t">
          <h3 className="text-lg">Painel de Admin</h3>
          {/* Funcionalidades adicionais para admin */}
        </div>
      )}
    </div>
  );
}
