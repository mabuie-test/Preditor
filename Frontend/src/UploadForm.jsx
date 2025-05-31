import React, { useState, useEffect, useContext } from 'react';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { AuthContext } from './AuthContext';

export default function UploadForm() {
  const { role } = useContext(AuthContext);

  // Estados principais
  const [arquivo, setArquivo] = useState(null);            // Ficheiro selecionado
  const [uploadProgress, setUploadProgress] = useState(0); // Progresso do upload (0–100)
  const [valoresOCR, setValoresOCR] = useState([]);        // Valores extraídos pelo OCR (visuais imediatos)
  const [historico, setHistorico] = useState([]);          // Histórico persistido no backend
  const [predicao, setPredicao] = useState(null);          // Predição atual
  const [manualInput, setManualInput] = useState('');      // Campo de texto para inserir manualmente
  const [isPredictEnabled, setIsPredictEnabled] = useState(false); // Controla botão de predição

  // Configuração do Dropzone
  const onDrop = acceptedFiles => {
    setArquivo(acceptedFiles[0]);
    setUploadProgress(0);
  };
  const { getRootProps, getInputProps } = useDropzone({ onDrop, accept: 'image/*' });

  // Ao montar, trazer histórico sem limpar estados visuais
  useEffect(() => {
    fetchHistorico();
  }, []);

  /**
   * Puxa histórico de partidas do backend (para o utilizador autenticado).
   * @param {boolean} clearStates - se true, limpa valoresOCR e predicao para iniciar nova sessão.
   */
  const fetchHistorico = async (clearStates = false) => {
    try {
      const res = await axios.get('/api/partidas/resultados');
      setHistorico(res.data || []);
      // Se quisermos forçar “novo gráfico” (após OCR), limpamos valores e predição
      if (clearStates) {
        setValoresOCR([]);
        setPredicao(null);
      }
      // Controlamos botão de predição: só activa se existirem ≥5 entradas no histórico
      setIsPredictEnabled((res.data || []).length >= 5);
    } catch (err) {
      console.error('Erro ao buscar histórico:', err);
      alert('Falha ao obter histórico: ' + (err.message || 'Erro desconhecido'));
    }
  };

  /**
   * Lida com o upload da imagem para OCR.
   * - Faz o upload com progresso.
   * - Persiste no backend, que POR SUA VEZ reinicia o histórico do utilizador.
   * - Depois de terminado, recarrega histórico (clearStates=true).
   */
  const handleUpload = async () => {
    if (!arquivo) return alert('Selecione uma imagem primeiro.');

    const fd = new FormData();
    fd.append('imagem', arquivo);

    try {
      const res = await axios.post('/api/partidas/upload', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percent);
        }
      });

      // Mostrar imediatamente os valores extraídos
      if (res.data.valoresReconhecidos) {
        setValoresOCR(res.data.valoresReconhecidos);
      }

      // Recarregar histórico: clearStates=true para reiniciar gráfico e predição
      await fetchHistorico(true);

      // Após um pequeno atraso, limpar a barra de progresso
      setTimeout(() => setUploadProgress(0), 1000);
    } catch (err) {
      console.error('Erro ao processar imagem:', err);
      const backendMsg = err.response?.data?.mensagem || err.response?.data?.erro;
      const finalMsg = backendMsg || err.message || 'Erro desconhecido';
      alert('Erro ao processar a imagem: ' + finalMsg);
      setUploadProgress(0);
    }
  };

  /**
   * Solicita predição ao backend.
   * - So faz sentido chamar se isPredictEnabled for true (isto evita repetidos “insuficientes”).
   */
  const handlePredicao = async () => {
    if (!isPredictEnabled) {
      return alert('Dados insuficientes para predição (mínimo 5 partidas).');
    }
    try {
      const res = await axios.get('/api/partidas/predicao');
      setPredicao(res.data.proximoValor);
    } catch (err) {
      console.error('Erro ao obter predição:', err);
      const backendMsg = err.response?.data?.mensagem || err.response?.data?.erro;
      const finalMsg = backendMsg || err.message || 'Erro desconhecido';
      alert('Não foi possível obter predição: ' + finalMsg);
    }
  };

  /**
   * Insere manualmente um ou vários valores, sem reiniciar sessão.
   * - Não limpa histórico nem predição automaticamente.
   * - Após a inserção, recarrega histórico (sem clearStates).
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
      // Recarrega histórico sem limpar predição (temos actualização em tempo real)
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

      {/* Botão para enviar a imagem */}
      <button
        onClick={handleUpload}
        className="bg-blue-600 text-white px-4 py-2 mb-4"
      >
        Processar Imagem
      </button>

      {/* Barra de progresso (visível apenas quando > 0%) */}
      {uploadProgress > 0 && (
        <div className="mb-4">
          <label className="block mb-1">Progresso do Upload:</label>
          <progress
            value={uploadProgress}
            max="100"
            className="w-full h-4"
          />
          <span className="text-sm">{uploadProgress}%</span>
        </div>
      )}

      {/* Exibe valores extraídos pelo OCR */}
      {valoresOCR.length > 0 && (
        <div className="mb-4">
          <h2 className="text-xl">Valores Extraídos:</h2>
          <ul className="list-disc list-inside">
            {valoresOCR.map((v, i) => (
              <li key={i}>{v}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Botão de predição (só activo se houver >=5 partidas no histórico) */}
      <button
        onClick={handlePredicao}
        className={`px-4 py-2 mb-4 ${isPredictEnabled ? 'bg-green-600 text-white' : 'bg-gray-400 text-gray-700 cursor-not-allowed'}`}
        disabled={!isPredictEnabled}
      >
        Obter Predição do Próximo Valor
      </button>

      {/* Exibe predição + campo para inserção manual */}
      {predicao && (
        <div className="mb-4">
          <p>
            Valor Previsto: <strong>{predicao}x</strong>
          </p>
          <div className="mt-2">
            <label className="mr-2">
              Ou insira manualmente (vírgula separa):
            </label>
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
          {/* Aqui pode adicionar funcionalidades extra de gestão */}
        </div>
      )}
    </div>
  );
}
