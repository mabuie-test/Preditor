import React, { useState, useEffect, useContext } from 'react';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { AuthContext } from './AuthContext';

export default function UploadForm() {
  const { role } = useContext(AuthContext);

  // Estados principais
  const [arquivo, setArquivo] = useState(null);              // Ficheiro selecionado
  const [uploadProgress, setUploadProgress] = useState(0);   // Progresso do upload (0–100)
  const [isProcessingOCR, setIsProcessingOCR] = useState(false); // Indica “OCR em curso”
  const [valoresOCR, setValoresOCR] = useState([]);          // Valores extraídos pelo OCR
  const [historico, setHistorico] = useState([]);            // Histórico completo do utilizador
  const [predicao, setPredicao] = useState(null);            // Predição atual
  const [manualInput, setManualInput] = useState('');        // Campo para inserir manualmente
  const [isPredictEnabled, setIsPredictEnabled] = useState(false); // Controla botão de predição

  // Configuração do Dropzone
  const onDrop = acceptedFiles => {
    // Quando o utilizador arrasta/seleciona novo ficheiro, limpamos estados anteriores
    setArquivo(acceptedFiles[0]);
    setValoresOCR([]);
    setPredicao(null);
    setUploadProgress(0);
    setIsProcessingOCR(false);
  };
  const { getRootProps, getInputProps } = useDropzone({ onDrop, accept: 'image/*' });

  // Ao montar, trazer histórico (inicialmente vazio ou com partidas passadas)
  useEffect(() => {
    fetchHistorico(false);
  }, []);

  /**
   * Puxa histórico de partidas do backend para o utilizador autenticado.
   * @param {boolean} clearPrediction - se true, limpa a predição (usado após upload).
   */
  const fetchHistorico = async (clearPrediction = false) => {
    try {
      const res = await axios.get('/api/partidas/resultados');
      const dados = res.data || [];
      setHistorico(dados);
      // Após carregar histórico, definimos se a predição pode ser calculada
      setIsPredictEnabled(dados.length >= 5);
      // Se devemos limpar predição (quando inicio uma nova sessão via OCR), fazemos:
      if (clearPrediction) {
        setPredicao(null);
      }
    } catch (err) {
      console.error('Erro ao buscar histórico:', err);
      alert('Falha ao obter histórico: ' + (err.message || 'Erro desconhecido'));
    }
  };

  /**
   * Processa a imagem via OCR:
   * 1) Faz upload com progresso visual.  
   * 2) Ao terminar upload, mostra “Processando OCR...” até receber resposta.  
   * 3) Limpa o histórico anterior no backend (rota /upload faz deleteMany) e devolve os valores OCR, 
   *    então recarrega histórico (limpa predição).
   */
  const handleUpload = async () => {
    if (!arquivo) {
      return alert('Selecione uma imagem primeiro.');
    }
    // Prepara FormData
    const fd = new FormData();
    fd.append('imagem', arquivo);

    try {
      // Antes de iniciar OCR, limpar OCR anterior e historico visual
      setValoresOCR([]);
      setPredicao(null);
      setIsProcessingOCR(false);
      setUploadProgress(0);

      // Faz o upload com callback de progresso
      const res = await axios.post('/api/partidas/upload', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percent);
        }
      });

      // Quando upload chegar a 100%, entramos em “Processando OCR”
      setUploadProgress(100);
      setIsProcessingOCR(true);

      // Agora aguardamos a resposta final (OCR + inserção no backend)
      const ocrValues = res.data.valoresReconhecidos || [];
      setValoresOCR(ocrValues);

      // Recarrega histórico e limpa predição, pois é uma nova session
      await fetchHistorico(true);

      // Terminado o processamento, desliga o indicador de “Processando OCR” após breve atraso
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
   * Solicita predição ao backend, com base no histórico atual.
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
   * Insere manualmente um ou vários valores, continuando o histórico (sem reiniciar sessão).
   */
  const handleManual = async () => {
    if (!manualInput.trim()) {
      return alert('Digite um ou mais valores (ex: "2.45,1.20").');
    }
    // Divide string por vírgula e remove espaços vazios
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

      // Limpa campo manual
      setManualInput('');
      // Recarrega histórico (mantém predição atual, pois é tempo real)
      await fetchHistorico(false);
    } catch (err) {
      console.error('Erro ao inserir manual:', err);
      const backendMsg = err.response?.data?.mensagem || err.response?.data?.erro;
      const finalMsg = backendMsg || err.message || 'Erro desconhecido';
      alert('Falha ao inserir manualmente: ' + finalMsg);
    }
  };

  // Prepara os dados para o gráfico de linhas
  const dataGrafico = historico.map((r, i) => ({
    name: `#${i + 1}`,
    value: parseFloat(r.valor)
  }));

  return (
    <div className="p-4">
      <h1 className="text-2xl mb-4">Aviator Predictor</h1>

      {/* Área de Dropzone para seleção de screenshot */}
      <div {...getRootProps()} className="border-2 p-4 mb-4 cursor-pointer">
        <input {...getInputProps()} />
        {arquivo
          ? arquivo.name
          : 'Arraste e largue o screenshot aqui ou clique para selecionar'}
      </div>

      {/* Botão para enviar a imagem para OCR */}
      <button
        onClick={handleUpload}
        className="bg-blue-600 text-white px-4 py-2 mb-4"
      >
        Processar Imagem
      </button>

      {/* Barra de progresso do upload */}
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

      {/* Indicador de “Processando OCR” */}
      {isProcessingOCR && (
        <div className="mb-4 text-blue-700">
          Processando OCR, aguarde...
        </div>
      )}

      {/* Exibe valores extraídos pelo OCR (até o utilizador repetir upload) */}
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

      {/* Botão de predição (ativo apenas se existirem ≥5 partidas no histórico) */}
      <button
        onClick={handlePredicao}
        className={`px-4 py-2 mb-4 ${
          isPredictEnabled
            ? 'bg-green-600 text-white'
            : 'bg-gray-400 text-gray-700 cursor-not-allowed'
        }`}
        disabled={!isPredictEnabled}
      >
        Obter Predição do Próximo Valor
      </button>

      {/* Se houver predição, exibe e disponibiliza o input manual */}
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

      {/* Gráfico com histórico de resultados do utilizador */}
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
