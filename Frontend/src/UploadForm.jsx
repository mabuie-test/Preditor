import React, { useState, useEffect, useContext } from 'react';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { AuthContext } from './AuthContext';

export default function UploadForm() {
  const { role } = useContext(AuthContext);
  const [arquivo, setArquivo] = useState(null);
  const [valores, setValores] = useState([]);
  const [historico, setHistorico] = useState([]);
  const [predicao, setPredicao] = useState(null);
  const [manualInput, setManualInput] = useState(''); // pode conter "2.45" ou "2.45,1.20,3.00"

  const onDrop = acceptedFiles => setArquivo(acceptedFiles[0]);
  const { getRootProps, getInputProps } = useDropzone({ onDrop, accept: 'image/*' });

  useEffect(() => {
    fetchHistorico();
  }, []);

  const fetchHistorico = async () => {
    try {
      const res = await axios.get('/api/partidas/resultados');
      setHistorico(res.data);
    } catch (err) {
      console.error('Erro ao buscar histórico:', err);
      alert('Falha ao obter histórico: ' + (err.message || 'Erro desconhecido'));
    }
  };

  const handleUpload = async () => {
    if (!arquivo) return alert('Selecione uma imagem primeiro.');
    const fd = new FormData();
    fd.append('imagem', arquivo);
    try {
      const res = await axios.post('/api/partidas/upload', fd);
      setValores(res.data.valoresReconhecidos);
      await fetchHistorico();
    } catch (err) {
      console.error('Erro ao processar imagem:', err);
      const backendMsg = err.response?.data?.mensagem || err.response?.data?.erro;
      const finalMsg = backendMsg || err.message || 'Erro desconhecido';
      alert('Erro ao processar a imagem: ' + finalMsg);
    }
  };

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

  const handleManual = async () => {
    if (!manualInput.trim()) return alert('Digite um ou mais valores (ex: "2.45,1.20").');
    // separa por vírgula, limpa espaços
    const arr = manualInput
      .split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    try {
      const payload = arr.length > 1
        ? { valores: arr }
        : { valor: arr[0] };
      const res = await axios.post('/api/partidas/manual', payload);
      alert('Valores inseridos: ' + (res.data.valoresInseridos || [res.data.valorInserido]).join(', '));
      setManualInput('');
      await fetchHistorico();
    } catch (err) {
      console.error('Erro ao inserir manual:', err);
      const backendMsg = err.response?.data?.mensagem || err.response?.data?.erro;
      const finalMsg = backendMsg || err.message || 'Erro desconhecido';
      alert('Falha ao inserir manualmente: ' + finalMsg);
    }
  };

  const dataGrafico = historico.map((r, i) => ({
    name: `#${i + 1}`,
    value: parseFloat(r.valor)
  }));

  return (
    <div className="p-4">
      <h1 className="text-2xl mb-4">Aviator Predictor</h1>

      <div {...getRootProps()} className="border-2 p-4 mb-4 cursor-pointer">
        <input {...getInputProps()} />
        {arquivo ? arquivo.name : 'Arraste e largue o screenshot aqui ou clique para selecionar'}
      </div>

      <button onClick={handleUpload} className="bg-blue-600 text-white px-4 py-2 mb-4">
        Processar Imagem
      </button>

      {valores.length > 0 && (
        <div className="mb-4">
          <h2 className="text-xl">Valores Extraídos:</h2>
          <ul className="list-disc list-inside">
            {valores.map((v, i) => <li key={i}>{v}</li>)}
          </ul>
        </div>
      )}

      <button onClick={handlePredicao} className="bg-green-600 text-white px-4 py-2 mb-4">
        Obter Predição do Próximo Valor
      </button>
      {predicao && (
        <div className="mb-4">
          <p>Valor Previsto: <strong>{predicao}x</strong></p>
          <div className="mt-2">
            <label className="mr-2">Ou insira manualmente (vírgula separa):</label>
            <input
              type="text"
              value={manualInput}
              onChange={e => setManualInput(e.target.value)}
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

      <h2 className="text-xl mb-2">Histórico de Resultados</h2>
      <LineChart width={600} height={300} data={dataGrafico}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis domain={['dataMin - 0.5', 'dataMax + 0.5']} />
        <Tooltip />
        <Line type="monotone" dataKey="value" />
      </LineChart>

      {role === 'admin' && (
        <div className="mt-6 p-4 border-t">
          <h3 className="text-lg">Painel de Admin</h3>
          {/* Controles adicionais */}
        </div>
      )}
    </div>
  );
}
