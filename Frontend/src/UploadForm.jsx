import React, { useState, useEffect, useContext } from 'react';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { AuthContext } from './AuthContext';

export default function UploadForm() {
  const { role } = useContext(AuthContext);

  // Estados
  const [arquivo, setArquivo] = useState(null);
  const [valores, setValores] = useState([]);       // Valores extraídos do último OCR
  const [historico, setHistorico] = useState([]);   // Histórico completo do utilizador
  const [predicao, setPredicao] = useState(null);   // Predição atual
  const [manualInput, setManualInput] = useState('');// Campo de texto para inserir manualmente

  // Configuração do Dropzone para upload de imagens
  const onDrop = acceptedFiles => setArquivo(acceptedFiles[0]);
  const { getRootProps, getInputProps } = useDropzone({ onDrop, accept: 'image/*' });

  // Ao montar, traz o histórico (inicialmente vazio ou com partidas antigas)
  useEffect(() => {
    fetchHistorico(/* clearOnFetch= */ false);
  }, []);

  /**
   * Busca histórico de partidas do utilizador autenticado.
   * @param {boolean} clearOnFetch - se true, limpa valores OCR + predição (usar ao chamar após upload de imagem).
   */
  const fetchHistorico = async (clearOnFetch = false) => {
    try {
      const res = await axios.get('/api/partidas/resultados');
      setHistorico(res.data);

      if (clearOnFetch) {
        // Após OCR, limpamos valores extraídos e predição para reiniciar gráfico
        setValores([]);
        setPredicao(null);
      }
    } catch (err) {
      console.error('Erro ao buscar histórico:', err);
      alert('Falha ao obter histórico: ' + (err.message || 'Erro desconhecido'));
    }
  };

  /**
   * Processa a imagem via OCR → backend → insere novos dados (e reinicia histórico).
   */
  const handleUpload = async () => {
    if (!arquivo) return alert('Selecione uma imagem primeiro.');
    const fd = new FormData();
    fd.append('imagem', arquivo);
    try {
      const res = await axios.post('/api/partidas/upload', fd);
      // Valores imediatamente retornados do OCR
      setValores(res.data.valoresReconhecidos);

      // Recarrega histórico e limpa gráfico + predição
      await fetchHistorico(true);
    } catch (err) {
      console.error('Erro ao processar imagem:', err);
      const backendMsg = err.response?.data?.mensagem || err.response?.data?.erro;
      const finalMsg = backendMsg || err.message || 'Erro desconhecido';
      alert('Erro ao processar a imagem: ' + finalMsg);
    }
  };

  /**
   * Chama o endpoint de predição – baseia-se no histórico atual do utilizador.
   */
  const handlePredicao = async () => {
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
   * Insere manualmente um ou vários valores (continuar jogo em tempo real).
   * Não apaga histórico nem reinicia predição automaticamente.
   */
  const handleManual = async () => {
    if (!manualInput.trim()) {
      return alert('Digite um ou mais valores (ex: "2.45,1.20").');
    }
    // Divide por vírgula, remove espaços vazios
    const arr = manualInput
      .split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    try {
      // Se houver mais de um valor, manda array; senão, valor único
      const payload = arr.length > 1
        ? { valores: arr }
        : { valor: arr[0] };

      const res = await axios.post('/api/partidas/manual', payload);
      const inseridos = res.data.valoresInseridos || [res.data.valorInserido];
      alert('Valores inseridos: ' + inseridos.join(', '));

      // Limpa o campo de input manual
      setManualInput('');

      // Recarrega o histórico do utilizador (mas NÃO limpa a predição,
      // pois queremos manter o fluxo em tempo real; atualiza apenas o gráfico)
      await fetchHistorico(false);
    } catch (err) {
      console.error('Erro ao inserir manual:', err);
      const backendMsg = err.response?.data?.mensagem || err.response?.data?.erro;
      const finalMsg = backendMsg || err.message || 'Erro desconhecido';
      alert('Falha ao inserir manualmente: ' + finalMsg);
    }
  };

  // Prepara os dados para o gráfico (array de objetos { name: "#1", value: 2.45 })
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

      {/* Botão para processar a imagem via OCR e reiniciar histórico */}
      <button
        onClick={handleUpload}
        className="bg-blue-600 text-white px-4 py-2 mb-4"
      >
        Processar Imagem
      </button>

      {/* Exibe valores extraídos do OCR */}
      {valores.length > 0 && (
        <div className="mb-4">
          <h2 className="text-xl">Valores Extraídos:</h2>
          <ul className="list-disc list-inside">
            {valores.map((v, i) => (
              <li key={i}>{v}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Botão para solicitar predição com base no histórico atual */}
      <button
        onClick={handlePredicao}
        className="bg-green-600 text-white px-4 py-2 mb-4"
      >
        Obter Predição do Próximo Valor
      </button>

      {/* Se houver predição, exibe e disponibiliza o input manual para continuar */}
      {predicao && (
        <div className="mb-4">
          <p>
            Valor Previsto: <strong>{predicao}x</strong>
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

      {/* Gráfico com o histórico de resultados do utilizador */}
      <h2 className="text-xl mb-2">Histórico de Resultados</h2>
      <LineChart width={600} height={300} data={dataGrafico}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis domain={['dataMin - 0.5', 'dataMax + 0.5']} />
        <Tooltip />
        <Line type="monotone" dataKey="value" />
      </LineChart>

      {/* Se for admin, exibe painel extra (pode adicionar funcionalidades aqui) */}
      {role === 'admin' && (
        <div className="mt-6 p-4 border-t">
          <h3 className="text-lg">Painel de Admin</h3>
          {/* Controles adicionais para admin */}
        </div>
      )}
    </div>
  );
}
