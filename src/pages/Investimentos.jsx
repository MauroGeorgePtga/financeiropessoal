import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { ValorOculto } from '../components/ValorOculto'
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Search, 
  TrendingUp, 
  TrendingDown,
  Upload,
  Download,
  RefreshCw,
  X,
  Copy,
  AlertCircle,
  CheckCircle,
  FileText,
  Loader
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'
import './Investimentos.css'
import './ImportarInvestimentos.css'

// Componente de Importação CSV
function ImportarInvestimentos({ onClose, onSuccess, userId }) {
  const [arquivo, setArquivo] = useState(null)
  const [preview, setPreview] = useState([])
  const [erros, setErros] = useState([])
  const [processando, setProcessando] = useState(false)
  const [resultado, setResultado] = useState(null)

  const templateCSV = `tipo_operacao,tipo_ativo,ticker,nome_ativo,quantidade,preco_unitario,taxa_corretagem,emolumentos,outros_custos,data_operacao,observacoes
compra,acao,PETR4,Petrobras PN,100,25.50,5.00,0.50,0,2023-01-15,Primeira compra
compra,acao,VALE3,Vale ON,50,62.80,5.00,0.30,0,2023-02-20,
venda,acao,PETR4,Petrobras PN,50,38.00,5.00,0.25,0,2025-08-15,Realizacao de lucro
compra,fii,HGLG11,CSHG Logística,100,150.00,0,0,0,2023-03-10,Primeiro FII`

  const downloadTemplate = () => {
    const blob = new Blob([templateCSV], { type: 'text/csv;charset=utf-8;' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'template_investimentos.csv'
    link.click()
    window.URL.revokeObjectURL(url)
  }

  const validarLinha = (linha) => {
    const errosLinha = []
    if (!['compra', 'venda'].includes(linha.tipo_operacao?.toLowerCase())) {
      errosLinha.push(`Tipo de operação inválido`)
    }
    const tiposValidos = ['acao', 'fii', 'renda_fixa', 'etf', 'fundo', 'cripto']
    if (!tiposValidos.includes(linha.tipo_ativo?.toLowerCase())) {
      errosLinha.push(`Tipo de ativo inválido`)
    }
    if (!linha.ticker || linha.ticker.trim() === '') {
      errosLinha.push('Ticker é obrigatório')
    }
    if (!linha.nome_ativo || linha.nome_ativo.trim() === '') {
      errosLinha.push('Nome do ativo é obrigatório')
    }
    const quantidade = parseFloat(linha.quantidade)
    if (isNaN(quantidade) || quantidade <= 0) {
      errosLinha.push('Quantidade inválida')
    }
    const preco = parseFloat(linha.preco_unitario)
    if (isNaN(preco) || preco <= 0) {
      errosLinha.push('Preço unitário inválido')
    }
    if (!linha.data_operacao || !linha.data_operacao.match(/^\d{4}-\d{2}-\d{2}$/)) {
      errosLinha.push('Data inválida (formato: AAAA-MM-DD)')
    }
    return errosLinha
  }

  const parseCSV = (texto) => {
    const linhas = texto.split('\n').filter(linha => linha.trim())
    if (linhas.length < 2) {
      throw new Error('Arquivo vazio')
    }
    const cabecalho = linhas[0].split(',').map(c => c.trim())
    const dados = []
    const errosValidacao = []
    for (let i = 1; i < linhas.length; i++) {
      const valores = linhas[i].split(',').map(v => v.trim())
      const objeto = {}
      cabecalho.forEach((campo, index) => {
        objeto[campo] = valores[index]
      })
      const errosLinha = validarLinha(objeto)
      if (errosLinha.length > 0) {
        errosValidacao.push({
          linha: i + 1,
          dados: objeto,
          erros: errosLinha
        })
      } else {
        dados.push({
          tipo_operacao: objeto.tipo_operacao.toLowerCase(),
          tipo_ativo: objeto.tipo_ativo.toLowerCase(),
          ticker: objeto.ticker.toUpperCase(),
          nome_ativo: objeto.nome_ativo,
          quantidade: parseFloat(objeto.quantidade),
          preco_unitario: parseFloat(objeto.preco_unitario),
          taxa_corretagem: parseFloat(objeto.taxa_corretagem) || 0,
          emolumentos: parseFloat(objeto.emolumentos) || 0,
          outros_custos: parseFloat(objeto.outros_custos) || 0,
          data_operacao: objeto.data_operacao,
          observacoes: objeto.observacoes || null,
          user_id: userId
        })
      }
    }
    return { dados, errosValidacao }
  }

  const handleArquivo = (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (!file.name.endsWith('.csv')) {
      setErros([{ mensagem: 'Selecione um arquivo CSV' }])
      return
    }
    setArquivo(file)
    setErros([])
    setResultado(null)
    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const texto = event.target.result
        const { dados, errosValidacao } = parseCSV(texto)
        setPreview(dados)
        setErros(errosValidacao)
      } catch (error) {
        setErros([{ mensagem: error.message }])
        setPreview([])
      }
    }
    reader.readAsText(file)
  }

  const handleImportar = async () => {
    if (preview.length === 0) return
    try {
      setProcessando(true)
      const { error } = await supabase
        .from('investimentos_operacoes')
        .insert(preview)
      if (error) throw error
      setResultado({
        sucesso: true,
        mensagem: `${preview.length} operação(ões) importada(s)!`
      })
      setTimeout(() => {
        onSuccess()
        onClose()
      }, 2000)
    } catch (error) {
      setResultado({
        sucesso: false,
        mensagem: error.message || 'Erro ao importar'
      })
    } finally {
      setProcessando(false)
    }
  }

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const formatDate = (date) => {
    return new Date(date + 'T00:00:00').toLocaleDateString('pt-BR')
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-import" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Importar Operações (CSV)</h2>
          <button className="btn-close" onClick={onClose}>
            <X size={24} />
          </button>
        </div>
        <div className="import-body">
          <div className="import-instrucoes">
            <h3>📋 Como importar:</h3>
            <ol>
              <li>Baixe o template CSV</li>
              <li>Preencha com suas operações</li>
              <li>Faça o upload aqui</li>
            </ol>
            <button className="btn-download" onClick={downloadTemplate}>
              <Download size={20} />
              Baixar Template CSV
            </button>
          </div>
          <div className="import-upload">
            <label className="upload-area">
              <Upload size={48} />
              <span>Selecionar arquivo CSV</span>
              <input
                type="file"
                accept=".csv"
                onChange={handleArquivo}
                style={{ display: 'none' }}
              />
            </label>
            {arquivo && (
              <div className="arquivo-selecionado">
                <FileText size={20} />
                <span>{arquivo.name}</span>
              </div>
            )}
          </div>
          {erros.length > 0 && (
            <div className="import-erros">
              <div className="erro-header">
                <AlertCircle size={20} />
                <h4>Erros ({erros.length}):</h4>
              </div>
              <div className="erros-list">
                {erros.map((erro, index) => (
                  <div key={index} className="erro-item">
                    {erro.linha && <strong>Linha {erro.linha}:</strong>}
                    {erro.mensagem && <p>{erro.mensagem}</p>}
                    {erro.erros && (
                      <ul>
                        {erro.erros.map((e, i) => (
                          <li key={i}>{e}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          {preview.length > 0 && (
            <div className="import-preview">
              <div className="preview-header">
                <CheckCircle size={20} />
                <h4>Preview: {preview.length} operação(ões)</h4>
              </div>
              <div className="preview-table-container">
                <table className="preview-table">
                  <thead>
                    <tr>
                      <th>Op</th>
                      <th>Ticker</th>
                      <th>Qtd</th>
                      <th>Preço</th>
                      <th>Total</th>
                      <th>Data</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.slice(0, 10).map((op, index) => {
                      const total = (op.quantidade * op.preco_unitario) + 
                                   op.taxa_corretagem + 
                                   op.emolumentos + 
                                   op.outros_custos
                      return (
                        <tr key={index}>
                          <td>{op.tipo_operacao === 'compra' ? '🟢' : '🔴'}</td>
                          <td><strong>{op.ticker}</strong></td>
                          <td>{op.quantidade}</td>
                          <td>{formatCurrency(op.preco_unitario)}</td>
                          <td><strong>{formatCurrency(total)}</strong></td>
                          <td>{formatDate(op.data_operacao)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                {preview.length > 10 && (
                  <p className="preview-mais">
                    ... e mais {preview.length - 10} operação(ões)
                  </p>
                )}
              </div>
            </div>
          )}
          {resultado && (
            <div className={`import-resultado ${resultado.sucesso ? 'sucesso' : 'erro'}`}>
              {resultado.sucesso ? <CheckCircle size={24} /> : <AlertCircle size={24} />}
              <p>{resultado.mensagem}</p>
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose} disabled={processando}>
            Cancelar
          </button>
          <button 
            className="btn-primary"
            onClick={handleImportar}
            disabled={preview.length === 0 || processando || resultado?.sucesso}
          >
            {processando ? 'Importando...' : `Importar ${preview.length} Op.`}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Investimentos() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('carteira')
  const [operacoes, setOperacoes] = useState([])
  const [cotacoes, setCotacoes] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [editingOperacao, setEditingOperacao] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filtroTipoOp, setFiltroTipoOp] = useState('todos')
  const [filtroTipoAtivo, setFiltroTipoAtivo] = useState('todos')
  const [atualizandoCotacoes, setAtualizandoCotacoes] = useState(false)
  const [progressoAtualizacao, setProgressoAtualizacao] = useState({ atual: 0, total: 0 })
  const [limiteOperacoes, setLimiteOperacoes] = useState(30)
  const [ativosCadastrados, setAtivosCadastrados] = useState([])
  const [ativosFiltradosPorTipo, setAtivosFiltradosPorTipo] = useState([])
  const [secoesExpandidas, setSecoesExpandidas] = useState({
    acao: true,
    fii: true,
    etf: true,
    renda_fixa: true,
    fundo: true,
    cripto: true
  })
  const [ordenacaoCarteira, setOrdenacaoCarteira] = useState('valor_desc') // valor_desc, valor_asc, alfabetica
  
  // Estados para o gráfico de evolução
  const [filtroGraficoPeriodo, setFiltroGraficoPeriodo] = useState('todos') // ano_atual, 2_anos, todos
  const [filtroGraficoTipo, setFiltroGraficoTipo] = useState('todos') // todos, acao, fii, etc

  const [formData, setFormData] = useState({
    tipo_operacao: 'compra',
    tipo_ativo: 'acao',
    ticker: '',
    nome_ativo: '',
    quantidade: 0,
    preco_unitario: 0,
    taxa_corretagem: 0,
    emolumentos: 0,
    outros_custos: 0,
    data_operacao: new Date().toISOString().split('T')[0],
    observacoes: ''
  })

  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [modalError, setModalError] = useState('')
  const [modalSuccess, setModalSuccess] = useState('')

  const tiposAtivo = [
    { value: 'acao', label: 'Ação', emoji: '📈' },
    { value: 'fii', label: 'FII', emoji: '🏢' },
    { value: 'renda_fixa', label: 'Renda Fixa', emoji: '💰' },
    { value: 'etf', label: 'ETF', emoji: '📊' },
    { value: 'fundo', label: 'Fundo', emoji: '💼' },
    { value: 'cripto', label: 'Cripto', emoji: '🪙' }
  ]

  useEffect(() => {
    if (user) {
      carregarDados()
      carregarAtivosCadastrados()
    }
  }, [user])

  // Filtrar ativos quando mudar o tipo selecionado
  useEffect(() => {
    const ativosFiltrados = ativosCadastrados.filter(
      a => a.tipo_ativo === formData.tipo_ativo
    )
    setAtivosFiltradosPorTipo(ativosFiltrados)
  }, [formData.tipo_ativo, ativosCadastrados])

  const carregarDados = async () => {
    try {
      setLoading(true)

      const { data: opData, error: opError } = await supabase
        .from('investimentos_operacoes')
        .select('*')
        .eq('user_id', user.id)
        .order('data_operacao', { ascending: false })

      if (opError) throw opError

      const { data: cotData, error: cotError } = await supabase
        .from('investimentos_cotacoes')
        .select('*')
        .eq('user_id', user.id)

      if (cotError) throw cotError

      setOperacoes(opData || [])
      setCotacoes(cotData || [])
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
      setError('Erro ao carregar investimentos')
    } finally {
      setLoading(false)
    }
  }

  const carregarAtivosCadastrados = async () => {
    try {
      const { data, error } = await supabase
        .from('ativos_cadastrados')
        .select('*')
        .eq('user_id', user.id)
        .eq('ativo', true)
        .order('ticker', { ascending: true })

      if (error) throw error
      setAtivosCadastrados(data || [])
    } catch (error) {
      console.error('Erro ao carregar ativos cadastrados:', error)
    }
  }

  // Buscar informações do ticker no banco
  const buscarInfoTicker = (ticker) => {
    if (!ticker || ticker.length < 4) return
    
    const tickerLimpo = ticker.toUpperCase().trim()
    const ativoEncontrado = ativosCadastrados.find(a => a.ticker === tickerLimpo)
    
    if (ativoEncontrado) {
      // Validar se o tipo corresponde ao selecionado
      if (ativoEncontrado.tipo_ativo !== formData.tipo_ativo) {
        const tipoSelecionado = tiposAtivo.find(t => t.value === formData.tipo_ativo)?.label
        const tipoAtivo = tiposAtivo.find(t => t.value === ativoEncontrado.tipo_ativo)?.label
        setModalError(`${tickerLimpo} é ${tipoAtivo}, mas você selecionou ${tipoSelecionado}`)
        setModalSuccess('')
        setTimeout(() => setModalError(''), 4000)
        return
      }
      
      setFormData(prev => ({
        ...prev,
        nome_ativo: ativoEncontrado.nome_ativo
      }))
      setModalSuccess(`✓ ${tickerLimpo}: ${ativoEncontrado.nome_ativo}`)
      setModalError('')
      setTimeout(() => setModalSuccess(''), 2000)
    } else {
      setModalError(`${tickerLimpo} não cadastrado. Cadastre em "Cadastro de Ativos"`)
      setModalSuccess('')
      setTimeout(() => setModalError(''), 4000)
    }
  }

  // Buscar cotação usando API própria (se disponível)
  const buscarCotacaoAPI = async (ticker) => {
    try {
      // Tenta usar API própria primeiro (sem CORS)
      // Você precisará hospedar o arquivo cotacoes-api.js como função serverless
      const baseURL = window.location.origin // Usa o mesmo domínio
      const response = await fetch(`${baseURL}/api/cotacoes?ticker=${ticker}`)
      
      if (!response.ok) {
        throw new Error('API não disponível')
      }
      
      const data = await response.json()
      
      if (data.success && data.cotacao) {
        return data.cotacao
      }
      
      return null
    } catch (error) {
      console.log('API própria não disponível, use atualização manual')
      return null
    }
  }

  // Atualizar todas as cotações automaticamente
  const atualizarTodasCotacoes = async () => {
    setAtualizandoCotacoes(true)
    setError('')
    setSuccess('')

    const tickersUnicos = [...new Set(carteira.map(a => a.ticker))]
    setProgressoAtualizacao({ atual: 0, total: tickersUnicos.length })

    let sucessos = 0
    let falhas = 0

    try {
      for (let i = 0; i < tickersUnicos.length; i++) {
        const ticker = tickersUnicos[i]
        setProgressoAtualizacao({ atual: i + 1, total: tickersUnicos.length })

        try {
          // Buscar cotação via API
          const cotacao = await buscarCotacaoAPI(ticker)

          if (cotacao) {
            // Atualizar no banco
            const ativo = carteira.find(a => a.ticker === ticker)

            const { data: existing } = await supabase
              .from('investimentos_cotacoes')
              .select('id')
              .eq('ticker', ticker)
              .eq('user_id', user.id)
              .single()

            if (existing) {
              await supabase
                .from('investimentos_cotacoes')
                .update({
                  cotacao_atual: cotacao,
                  data_atualizacao: new Date().toISOString()
                })
                .eq('ticker', ticker)
                .eq('user_id', user.id)
            } else {
              await supabase
                .from('investimentos_cotacoes')
                .insert({
                  ticker: ticker,
                  tipo_ativo: ativo.tipo_ativo,
                  nome_ativo: ativo.nome_ativo,
                  cotacao_atual: cotacao,
                  user_id: user.id,
                  data_atualizacao: new Date().toISOString()
                })
            }

            sucessos++
          } else {
            falhas++
          }
        } catch (error) {
          console.error(`Erro ao atualizar ${ticker}:`, error)
          falhas++
        }

        // Delay de 500ms entre requisições para não sobrecarregar
        await new Promise(resolve => setTimeout(resolve, 500))
      }

      if (sucessos > 0) {
        setSuccess(`${sucessos} cotação(ões) atualizada(s)!${falhas > 0 ? ` (${falhas} falharam)` : ''}`)
        await carregarDados()
      } else {
        setError('Nenhuma cotação foi atualizada. Verifique se a API está configurada.')
      }
    } catch (error) {
      console.error('Erro ao atualizar cotações:', error)
      setError('Erro ao atualizar cotações')
    } finally {
      setAtualizandoCotacoes(false)
      setProgressoAtualizacao({ atual: 0, total: 0 })
    }
  }

  // Atualizar cotações manualmente (uma por vez)
  const calcularCarteira = () => {
    const carteira = {}

    operacoes.forEach(op => {
      if (!carteira[op.ticker]) {
        carteira[op.ticker] = {
          ticker: op.ticker,
          nome_ativo: op.nome_ativo,
          tipo_ativo: op.tipo_ativo,
          quantidade: 0,
          total_investido: 0,
          operacoes_compra: 0,
          operacoes_venda: 0
        }
      }

      const custoTotal = (op.taxa_corretagem || 0) + (op.emolumentos || 0) + (op.outros_custos || 0)

      if (op.tipo_operacao === 'compra') {
        carteira[op.ticker].quantidade += op.quantidade
        carteira[op.ticker].total_investido += (op.quantidade * op.preco_unitario) + custoTotal
        carteira[op.ticker].operacoes_compra++
      } else if (op.tipo_operacao === 'venda') {
        carteira[op.ticker].quantidade -= op.quantidade
        carteira[op.ticker].total_investido -= (op.quantidade * op.preco_unitario) - custoTotal
        carteira[op.ticker].operacoes_venda++
      }
    })

    Object.keys(carteira).forEach(ticker => {
      if (carteira[ticker].quantidade <= 0) {
        delete carteira[ticker]
      } else {
        carteira[ticker].preco_medio = carteira[ticker].total_investido / carteira[ticker].quantidade
        
        const cotacao = cotacoes.find(c => c.ticker === ticker)
        if (cotacao) {
          carteira[ticker].cotacao_atual = cotacao.cotacao_atual
          carteira[ticker].valor_atual = carteira[ticker].quantidade * cotacao.cotacao_atual
          carteira[ticker].rentabilidade = ((carteira[ticker].valor_atual - carteira[ticker].total_investido) / carteira[ticker].total_investido) * 100
          carteira[ticker].lucro = carteira[ticker].valor_atual - carteira[ticker].total_investido
        }
      }
    })

    return Object.values(carteira)
  }

  const handleSubmit = async (e, salvarENovo = false) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setModalError('')
    setModalSuccess('')

    try {
      // Validar se ticker está cadastrado
      const tickerExiste = ativosCadastrados.find(
        a => a.ticker === formData.ticker.toUpperCase()
      )

      if (!tickerExiste) {
        setModalError(`Ticker ${formData.ticker} não cadastrado. Cadastre em "Cadastro de Ativos"`)
        return
      }

      // Validar tipo de ativo
      if (tickerExiste.tipo_ativo !== formData.tipo_ativo) {
        const tipoSelecionado = tiposAtivo.find(t => t.value === formData.tipo_ativo)?.label
        const tipoAtivo = tiposAtivo.find(t => t.value === tickerExiste.tipo_ativo)?.label
        setModalError(`${formData.ticker} é ${tipoAtivo}, mas você selecionou ${tipoSelecionado}`)
        return
      }

      const dadosOperacao = {
        ...formData,
        quantidade: parseFloat(formData.quantidade),
        preco_unitario: parseFloat(formData.preco_unitario),
        taxa_corretagem: parseFloat(formData.taxa_corretagem) || 0,
        emolumentos: parseFloat(formData.emolumentos) || 0,
        outros_custos: parseFloat(formData.outros_custos) || 0,
        ticker: formData.ticker.toUpperCase(),
        user_id: user.id
      }

      if (editingOperacao) {
        const { error } = await supabase
          .from('investimentos_operacoes')
          .update(dadosOperacao)
          .eq('id', editingOperacao.id)

        if (error) throw error
        setSuccess('Operação atualizada!')
      } else {
        const { error } = await supabase
          .from('investimentos_operacoes')
          .insert([dadosOperacao])

        if (error) throw error
        setSuccess('Operação cadastrada!')
      }

      await carregarDados()

      if (salvarENovo) {
        setFormData({
          ...formData,
          ticker: '',
          nome_ativo: '',
          quantidade: 0,
          preco_unitario: 0,
          taxa_corretagem: 0,
          emolumentos: 0,
          outros_custos: 0,
          observacoes: ''
        })
      } else {
        fecharModal()
      }
    } catch (error) {
      console.error('Erro:', error)
      setError(error.message)
    }
  }

  const handleEditar = (operacao) => {
    setEditingOperacao(operacao)
    setFormData({
      tipo_operacao: operacao.tipo_operacao,
      tipo_ativo: operacao.tipo_ativo,
      ticker: operacao.ticker,
      nome_ativo: operacao.nome_ativo,
      quantidade: operacao.quantidade,
      preco_unitario: operacao.preco_unitario,
      taxa_corretagem: operacao.taxa_corretagem || 0,
      emolumentos: operacao.emolumentos || 0,
      outros_custos: operacao.outros_custos || 0,
      data_operacao: operacao.data_operacao,
      observacoes: operacao.observacoes || ''
    })
    setShowModal(true)
  }

  const handleDuplicar = (operacao) => {
    setEditingOperacao(null)
    setFormData({
      tipo_operacao: operacao.tipo_operacao,
      tipo_ativo: operacao.tipo_ativo,
      ticker: operacao.ticker,
      nome_ativo: operacao.nome_ativo,
      quantidade: operacao.quantidade,
      preco_unitario: operacao.preco_unitario,
      taxa_corretagem: operacao.taxa_corretagem || 0,
      emolumentos: operacao.emolumentos || 0,
      outros_custos: operacao.outros_custos || 0,
      data_operacao: new Date().toISOString().split('T')[0],
      observacoes: operacao.observacoes || ''
    })
    setShowModal(true)
  }

  const handleExcluir = async (id) => {
    if (!confirm('Excluir esta operação?')) return

    try {
      const { error } = await supabase
        .from('investimentos_operacoes')
        .delete()
        .eq('id', id)

      if (error) throw error
      setSuccess('Operação excluída!')
      await carregarDados()
    } catch (error) {
      setError('Erro ao excluir')
    }
  }

  const handleAtualizarCotacao = async (ticker, cotacao) => {
    try {
      const ativo = carteira.find(a => a.ticker === ticker)
      
      // Verificar se já existe registro
      const { data: existing } = await supabase
        .from('investimentos_cotacoes')
        .select('id')
        .eq('ticker', ticker)
        .eq('user_id', user.id)
        .single()
      
      let error
      
      if (existing) {
        // Atualizar existente
        const result = await supabase
          .from('investimentos_cotacoes')
          .update({
            cotacao_atual: parseFloat(cotacao),
            data_atualizacao: new Date().toISOString()
          })
          .eq('ticker', ticker)
          .eq('user_id', user.id)
        
        error = result.error
      } else {
        // Inserir novo
        const result = await supabase
          .from('investimentos_cotacoes')
          .insert({
            ticker: ticker,
            tipo_ativo: ativo.tipo_ativo,
            nome_ativo: ativo.nome_ativo,
            cotacao_atual: parseFloat(cotacao),
            user_id: user.id,
            data_atualizacao: new Date().toISOString()
          })
        
        error = result.error
      }

      if (error) throw error
      
      setSuccess(`Cotação ${ticker} atualizada!`)
      await carregarDados()
    } catch (error) {
      console.error('Erro ao atualizar cotação:', error)
      setError(`Erro ao atualizar: ${error.message}`)
    }
  }

  const abrirModal = () => {
    setEditingOperacao(null)
    setFormData({
      tipo_operacao: 'compra',
      tipo_ativo: 'acao',
      ticker: '',
      nome_ativo: '',
      quantidade: 0,
      preco_unitario: 0,
      taxa_corretagem: 0,
      emolumentos: 0,
      outros_custos: 0,
      data_operacao: new Date().toISOString().split('T')[0],
      observacoes: ''
    })
    setError('')
    setSuccess('')
    setShowModal(true)
  }

  const fecharModal = () => {
    setShowModal(false)
    setEditingOperacao(null)
    setModalError('')
    setModalSuccess('')
  }

  const toggleSecao = (tipo) => {
    setSecoesExpandidas(prev => ({
      ...prev,
      [tipo]: !prev[tipo]
    }))
  }

  const ordenarAtivos = (ativos) => {
    const ativosOrdenados = [...ativos]
    
    switch (ordenacaoCarteira) {
      case 'valor_desc':
        return ativosOrdenados.sort((a, b) => b.total_investido - a.total_investido)
      case 'valor_asc':
        return ativosOrdenados.sort((a, b) => a.total_investido - b.total_investido)
      case 'alfabetica':
        return ativosOrdenados.sort((a, b) => a.ticker.localeCompare(b.ticker))
      default:
        return ativosOrdenados
    }
  }

  const operacoesFiltradas = operacoes.filter(op => {
    const matchSearch = op.ticker.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        op.nome_ativo.toLowerCase().includes(searchTerm.toLowerCase())
    const matchTipoOp = filtroTipoOp === 'todos' || op.tipo_operacao === filtroTipoOp
    const matchTipoAtivo = filtroTipoAtivo === 'todos' || op.tipo_ativo === filtroTipoAtivo
    
    return matchSearch && matchTipoOp && matchTipoAtivo
  })

  const carteira = calcularCarteira()

  // Agrupar carteira por tipo
  const carteiraPorTipo = carteira.reduce((acc, ativo) => {
    if (!acc[ativo.tipo_ativo]) {
      acc[ativo.tipo_ativo] = []
    }
    acc[ativo.tipo_ativo].push(ativo)
    return acc
  }, {})

  const totalInvestido = carteira.reduce((acc, ativo) => acc + ativo.total_investido, 0)
  const totalAtual = carteira.reduce((acc, ativo) => acc + (ativo.valor_atual || 0), 0)
  const rentabilidadeTotal = totalInvestido > 0 ? ((totalAtual - totalInvestido) / totalInvestido) * 100 : 0
  const lucroTotal = totalAtual - totalInvestido

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0)
  }

  const formatDate = (date) => {
    return new Date(date + 'T00:00:00').toLocaleDateString('pt-BR')
  }

  const calcularTotal = () => {
    const qtd = parseFloat(formData.quantidade) || 0
    const preco = parseFloat(formData.preco_unitario) || 0
    const corretagem = parseFloat(formData.taxa_corretagem) || 0
    const emol = parseFloat(formData.emolumentos) || 0
    const outros = parseFloat(formData.outros_custos) || 0
    
    return (qtd * preco) + corretagem + emol + outros
  }

  // Calcular dados para o gráfico de evolução
  const calcularDadosGrafico = () => {
    // Filtrar por tipo de ativo se necessário
    let todasOperacoes = operacoes
    if (filtroGraficoTipo !== 'todos') {
      todasOperacoes = todasOperacoes.filter(op => op.tipo_ativo === filtroGraficoTipo)
    }

    // Definir período de exibição
    const hoje = new Date()
    let dataInicio
    
    if (filtroGraficoPeriodo === 'ano_atual') {
      dataInicio = new Date(hoje.getFullYear(), 0, 1)
    } else if (filtroGraficoPeriodo === '2_anos') {
      dataInicio = new Date(hoje.getFullYear() - 2, 0, 1)
    } else {
      // Pegar a data da primeira operação
      if (todasOperacoes.length > 0) {
        const primeiraData = todasOperacoes
          .map(op => new Date(op.data_operacao))
          .sort((a, b) => a - b)[0]
        dataInicio = new Date(primeiraData.getFullYear(), primeiraData.getMonth(), 1)
      } else {
        dataInicio = new Date(hoje.getFullYear(), 0, 1)
      }
    }

    // PASSO 1: Calcular saldo ANTES do período (saldo inicial)
    const operacoesAnteriores = todasOperacoes.filter(op => 
      new Date(op.data_operacao) < dataInicio
    )
    
    let saldoInicial = 0
    operacoesAnteriores.forEach(op => {
      const custoTotal = (op.preco_unitario * op.quantidade) + 
                         (op.taxa_corretagem || 0) + 
                         (op.emolumentos || 0) + 
                         (op.outros_custos || 0)
      
      if (op.tipo_operacao === 'compra') {
        saldoInicial += custoTotal
      } else if (op.tipo_operacao === 'venda') {
        saldoInicial -= custoTotal
      }
    })

    // PASSO 2: Gerar lista de todos os meses do período
    const mesesPeriodo = []
    let dataAtual = new Date(dataInicio)
    const dataFim = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
    
    while (dataAtual <= dataFim) {
      mesesPeriodo.push(`${dataAtual.getFullYear()}-${String(dataAtual.getMonth() + 1).padStart(2, '0')}`)
      dataAtual.setMonth(dataAtual.getMonth() + 1)
    }

    // PASSO 3: Calcular saldo para cada mês
    let saldoAcumulado = saldoInicial
    const resultado = []

    mesesPeriodo.forEach(mesChave => {
      const [ano, mes] = mesChave.split('-')
      const mesNumero = parseInt(mes)
      
      // Buscar operações deste mês
      const operacoesDoMes = todasOperacoes.filter(op => {
        const dataOp = new Date(op.data_operacao)
        return dataOp.getFullYear() === parseInt(ano) && 
               (dataOp.getMonth() + 1) === mesNumero
      })

      // Somar/subtrair operações do mês
      operacoesDoMes.forEach(op => {
        const custoTotal = (op.preco_unitario * op.quantidade) + 
                           (op.taxa_corretagem || 0) + 
                           (op.emolumentos || 0) + 
                           (op.outros_custos || 0)
        
        if (op.tipo_operacao === 'compra') {
          saldoAcumulado += custoTotal
        } else if (op.tipo_operacao === 'venda') {
          saldoAcumulado -= custoTotal
        }
      })

      resultado.push({
        mes: formatarMesGrafico(mesChave),
        valorAplicado: Math.round(saldoAcumulado)
      })
    })

    return resultado
  }

  const formatarMesGrafico = (mesAno) => {
    const [ano, mes] = mesAno.split('-')
    const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
    return `${meses[parseInt(mes) - 1]}/${ano.substring(2)}`
  }

  const dadosGrafico = calcularDadosGrafico()

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading">Carregando investimentos...</div>
      </div>
    )
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Investimentos</h1>
          <p>Controle sua carteira de investimentos</p>
        </div>
        <div className="header-actions">
          <button className="btn-secondary" onClick={() => setShowImportModal(true)}>
            <Upload size={20} />
            Importar CSV
          </button>
          <button className="btn-primary" onClick={abrirModal}>
            <Plus size={20} />
            Nova Operação
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-error">
          {error}
          <button onClick={() => setError('')}>×</button>
        </div>
      )}
      {success && (
        <div className="alert alert-success">
          {success}
          <button onClick={() => setSuccess('')}>×</button>
        </div>
      )}

      <div className="resumo-cards">
        <div className="resumo-card card-investimentos">
          <div className="resumo-icon">💰</div>
            <div className="resumo-info">
           <span className="resumo-label">Investimentos</span>
          <span className="resumo-valor">
        <ValorOculto valor={formatCurrency(totalAtual)} />
      </span>

      <span className="resumo-sub-investido">
        Investido:{' '}
        <ValorOculto valor={formatCurrency(totalInvestido)} />
      </span>
    </div>
  </div>
</div>

        <div className={`resumo-card ${rentabilidadeTotal >= 0 ? 'card-positivo' : 'card-negativo'}`}>
          <div className="resumo-icon">
            {rentabilidadeTotal >= 0 ? <TrendingUp size={32} /> : <TrendingDown size={32} />}
          </div>
          <div className="resumo-info">
            <span className="resumo-label">Rentabilidade</span>
            <span className="resumo-valor">
              {rentabilidadeTotal >= 0 ? '+' : ''}{rentabilidadeTotal.toFixed(2)}%
            </span>
            <span className="resumo-sub">{formatCurrency(lucroTotal)}</span>
          </div>
        </div>

        <div className="resumo-card card-ativos">
          <div className="resumo-icon">📊</div>
          <div className="resumo-info">
            <span className="resumo-label">Ativos na Carteira</span>
            <span className="resumo-valor">{carteira.length}</span>
          </div>
        </div>
      </div>

      {/* Gráfico de Evolução Patrimonial */}
      <div className="grafico-evolucao-container">
        <div className="grafico-header">
          <h2>📈 Evolução Patrimonial</h2>
          <div className="grafico-filtros">
            <select 
              value={filtroGraficoPeriodo}
              onChange={(e) => setFiltroGraficoPeriodo(e.target.value)}
              className="filtro-grafico-select"
            >
              <option value="ano_atual">Ano Atual</option>
              <option value="2_anos">Últimos 2 Anos</option>
              <option value="todos">Todos os Períodos</option>
            </select>
            
            <select 
              value={filtroGraficoTipo}
              onChange={(e) => setFiltroGraficoTipo(e.target.value)}
              className="filtro-grafico-select"
            >
              <option value="todos">Todos os Tipos</option>
              {tiposAtivo.map(tipo => (
                <option key={tipo.value} value={tipo.value}>
                  {tipo.emoji} {tipo.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grafico-content">
          {dadosGrafico.length === 0 ? (
            <div className="grafico-empty">
              <p>Nenhum dado para exibir no período selecionado</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={dadosGrafico}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                <XAxis 
                  dataKey="mes" 
                  tick={{ fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={70}
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip 
                  formatter={(value) => formatCurrency(value)}
                  contentStyle={{ 
                    background: 'white', 
                    border: '1px solid #ccc',
                    borderRadius: '8px'
                  }}
                />
                <Legend 
                  wrapperStyle={{ paddingTop: '20px' }}
                  iconType="square"
                />
                <Bar 
                  dataKey="valorAplicado" 
                  name="Valor Aplicado" 
                  fill="#48bb78" 
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="tabs-container">
        <button 
          className={`tab-btn ${activeTab === 'carteira' ? 'active' : ''}`}
          onClick={() => setActiveTab('carteira')}
        >
          💼 Carteira ({carteira.length})
        </button>
        <button 
          className={`tab-btn ${activeTab === 'operacoes' ? 'active' : ''}`}
          onClick={() => setActiveTab('operacoes')}
        >
          📜 Operações ({operacoes.length})
        </button>
      </div>

      {activeTab === 'carteira' && (
        <>
          {carteira.length > 0 && (
            <div className="carteira-header">
              <button 
                className="btn-atualizar-cotacoes"
                onClick={atualizarTodasCotacoes}
                disabled={atualizandoCotacoes}
              >
                {atualizandoCotacoes ? (
                  <>
                    <Loader size={20} className="spinner" />
                    Atualizando {progressoAtualizacao.atual}/{progressoAtualizacao.total}...
                  </>
                ) : (
                  <>
                    <RefreshCw size={20} />
                    Atualizar Todas as Cotações
                  </>
                )}
              </button>
              <div className="carteira-controles">
                <select 
                  value={ordenacaoCarteira}
                  onChange={(e) => setOrdenacaoCarteira(e.target.value)}
                  className="select-ordenacao"
                >
                  <option value="valor_desc">💰 Maior Valor</option>
                  <option value="valor_asc">💵 Menor Valor</option>
                  <option value="alfabetica">🔤 A-Z</option>
                </select>
                <span className="carteira-info">
                  {carteira.length} ativo(s) • Cotações via Yahoo Finance
                </span>
              </div>
            </div>
          )}

          {carteira.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">💼</div>
              <h2>Carteira vazia</h2>
              <p>Cadastre operações para montar sua carteira</p>
            </div>
          ) : (
            <div className="carteira-agrupada">
              {tiposAtivo.map(tipoConfig => {
                const ativosDaTipo = carteiraPorTipo[tipoConfig.value] || []
                if (ativosDaTipo.length === 0) return null

                const totalInvestidoTipo = ativosDaTipo.reduce((acc, a) => acc + a.total_investido, 0)
                const totalAtualTipo = ativosDaTipo.reduce((acc, a) => acc + (a.valor_atual || 0), 0)
                const rentabilidadeTipo = totalInvestidoTipo > 0 
                  ? ((totalAtualTipo - totalInvestidoTipo) / totalInvestidoTipo) * 100 
                  : 0
                const lucroTipo = totalAtualTipo - totalInvestidoTipo
                const isExpanded = secoesExpandidas[tipoConfig.value]

                return (
                  <div key={tipoConfig.value} className="carteira-secao">
                    <div 
                      className="carteira-secao-header"
                      onClick={() => toggleSecao(tipoConfig.value)}
                    >
                      <div className="secao-left">
                        <span className="secao-icon">{isExpanded ? '▼' : '▶'}</span>
                        <span className="secao-emoji">{tipoConfig.emoji}</span>
                        <div className="secao-info">
                          <h3 className="secao-titulo">{tipoConfig.label}</h3>
                          <span className="secao-subtitulo">
                            {ativosDaTipo.length} ativo{ativosDaTipo.length > 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>

                      <div className="secao-resumo">
                        <div className="resumo-item">
                          <span className="resumo-label">Investido</span>
                          <span className="resumo-valor">{formatCurrency(totalInvestidoTipo)}</span>
                        </div>
                        <div className="resumo-item">
                          <span className="resumo-label">Atual</span>
                          <span className="resumo-valor">{formatCurrency(totalAtualTipo)}</span>
                        </div>
                        <div className={`resumo-item rent ${rentabilidadeTipo >= 0 ? 'positivo' : 'negativo'}`}>
                          {rentabilidadeTipo >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                          <span className="rent-valor">
                            {rentabilidadeTipo >= 0 ? '+' : ''}{rentabilidadeTipo.toFixed(2)}%
                          </span>
                          <span className="rent-money">
                            ({formatCurrency(lucroTipo)})
                          </span>
                        </div>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="carteira-list">
                        {ordenarAtivos(ativosDaTipo).map((ativo) => {
                          const temCotacao = ativo.cotacao_atual !== undefined

                          return (
                            <div key={ativo.ticker} className="ativo-linha">
                              <div className="ativo-badge-mini">
                                <span className="ativo-tipo-emoji">{tipoConfig.emoji}</span>
                              </div>

                              <div className="ativo-info-compact">
                                <h3>{ativo.ticker}</h3>
                                <p>{ativo.nome_ativo}</p>
                              </div>

                              <div className="ativo-dados">
                                <div className="dado-item">
                                  <span className="dado-label">Qtd</span>
                                  <span className="dado-valor">{ativo.quantidade}</span>
                                </div>
                                <div className="dado-item">
                                  <span className="dado-label">PM</span>
                                  <span className="dado-valor">{formatCurrency(ativo.preco_medio)}</span>
                                </div>
                                <div className="dado-item">
                                  <span className="dado-label">Investido</span>
                                  <span className="dado-valor destaque">{formatCurrency(ativo.total_investido)}</span>
                                </div>
                              </div>

                              <div className="ativo-cotacao-inline">
                                <label>Cotação:</label>
                                <input
                                  type="number"
                                  step="0.01"
                                  defaultValue={ativo.cotacao_atual || ''}
                                  placeholder="0,00"
                                  className="cotacao-input-small"
                                  id={`cotacao-${ativo.ticker}`}
                                />
                                <button 
                                  className="btn-refresh-small"
                                  onClick={() => {
                                    const input = document.getElementById(`cotacao-${ativo.ticker}`)
                                    if (input && input.value) {
                                      handleAtualizarCotacao(ativo.ticker, input.value)
                                    }
                                  }}
                                  title="Atualizar"
                                >
                                  <RefreshCw size={14} />
                                </button>
                              </div>

                              {temCotacao && (
                                <div className="ativo-resultado-inline">
                                  <div className="resultado-valor">
                                    <span className="resultado-label">Atual:</span>
                                    <span className="resultado-number">{formatCurrency(ativo.valor_atual)}</span>
                                  </div>
                                  <div className={`resultado-rent ${ativo.rentabilidade >= 0 ? 'positivo' : 'negativo'}`}>
                                    {ativo.rentabilidade >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                                    <span className="rent-percent">
                                      {ativo.rentabilidade >= 0 ? '+' : ''}{ativo.rentabilidade.toFixed(2)}%
                                    </span>
                                    <span className="rent-valor">
                                      ({formatCurrency(ativo.lucro)})
                                    </span>
                                  </div>
                                </div>
                              )}

                              <div className="ativo-ops-mini">
                                <small>{ativo.operacoes_compra}C • {ativo.operacoes_venda}V</small>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {activeTab === 'operacoes' && (
        <>
          <div className="filtros-container">
            <div className="search-box">
              <Search size={20} />
              <input
                type="text"
                placeholder="Buscar por ticker..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <select 
              value={filtroTipoOp} 
              onChange={(e) => setFiltroTipoOp(e.target.value)}
              className="filtro-select"
            >
              <option value="todos">Todas operações</option>
              <option value="compra">Compras</option>
              <option value="venda">Vendas</option>
            </select>

            <select 
              value={filtroTipoAtivo} 
              onChange={(e) => setFiltroTipoAtivo(e.target.value)}
              className="filtro-select"
            >
              <option value="todos">Todos os tipos</option>
              {tiposAtivo.map(tipo => (
                <option key={tipo.value} value={tipo.value}>
                  {tipo.emoji} {tipo.label}
                </option>
              ))}
            </select>

            <select 
              value={limiteOperacoes} 
              onChange={(e) => setLimiteOperacoes(Number(e.target.value))}
              className="filtro-select"
            >
              <option value={30}>30 operações</option>
              <option value={40}>40 operações</option>
              <option value={50}>50 operações</option>
              <option value={9999}>Todas</option>
            </select>
          </div>

          {operacoesFiltradas.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📈</div>
              <h2>Nenhuma operação encontrada</h2>
              <p>Ajuste os filtros ou cadastre novas operações</p>
            </div>
          ) : (
            <div className="operacoes-list">
              {operacoesFiltradas.slice(0, limiteOperacoes).map((op) => {
                const tipoConfig = tiposAtivo.find(t => t.value === op.tipo_ativo)
                const total = (op.quantidade * op.preco_unitario) + 
                              (op.taxa_corretagem || 0) + 
                              (op.emolumentos || 0) + 
                              (op.outros_custos || 0)

                return (
                  <div key={op.id} className={`operacao-card ${op.tipo_operacao}`}>
                    <div className="operacao-body">
                      <div className="operacao-badge">
                        <span className={`badge-${op.tipo_operacao}`}>
                          {op.tipo_operacao === 'compra' ? '🟢 C' : '🔴 V'}
                        </span>
                        <span className="tipo-ativo-mini">
                          {tipoConfig?.emoji}
                        </span>
                      </div>

                      <div className="operacao-info">
                        <h3>{op.ticker}</h3>
                        <p>{op.nome_ativo}</p>
                      </div>

                      <div className="operacao-detalhes">
                        <div className="detalhe-item">
                          <span className="detalhe-label">Qtd</span>
                          <span className="detalhe-valor">{op.quantidade}</span>
                        </div>
                        <div className="detalhe-item">
                          <span className="detalhe-label">Preço</span>
                          <span className="detalhe-valor">{formatCurrency(op.preco_unitario)}</span>
                        </div>
                        <div className="detalhe-item">
                          <span className="detalhe-label">Data</span>
                          <span className="detalhe-valor">{formatDate(op.data_operacao)}</span>
                        </div>
                      </div>

                      <div className="operacao-total">
                        <span className="total-label">Total</span>
                        <span className="total-valor">{formatCurrency(total)}</span>
                      </div>

                      <div className="operacao-acoes">
                        <button
                          className="btn-acao"
                          onClick={() => handleDuplicar(op)}
                          title="Duplicar"
                        >
                          <Copy size={14} />
                        </button>
                        <button
                          className="btn-acao"
                          onClick={() => handleEditar(op)}
                          title="Editar"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          className="btn-acao btn-delete"
                          onClick={() => handleExcluir(op.id)}
                          title="Excluir"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={fecharModal}>
          <div className="modal-content modal-invest" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingOperacao ? 'Editar Operação' : 'Nova Operação'}</h2>
              <button className="btn-close" onClick={fecharModal}>
                <X size={24} />
              </button>
            </div>

            {modalError && (
              <div className="alert alert-error" style={{ margin: '0 20px 15px 20px' }}>
                {modalError}
              </div>
            )}
            {modalSuccess && (
              <div className="alert alert-success" style={{ margin: '0 20px 15px 20px' }}>
                {modalSuccess}
              </div>
            )}

            <form onSubmit={(e) => handleSubmit(e, false)}>
              <div className="form-invest-grid">
                <div className="form-group">
                  <label>Operação *</label>
                  <div className="radio-group-compact">
                    <label className="radio-label">
                      <input
                        type="radio"
                        value="compra"
                        checked={formData.tipo_operacao === 'compra'}
                        onChange={(e) => setFormData({ ...formData, tipo_operacao: e.target.value })}
                      />
                      <span>🟢 Compra</span>
                    </label>
                    <label className="radio-label">
                      <input
                        type="radio"
                        value="venda"
                        checked={formData.tipo_operacao === 'venda'}
                        onChange={(e) => setFormData({ ...formData, tipo_operacao: e.target.value })}
                      />
                      <span>🔴 Venda</span>
                    </label>
                  </div>
                </div>

                <div className="form-group">
                  <label>Tipo *</label>
                  <select
                    value={formData.tipo_ativo}
                    onChange={(e) => setFormData({ ...formData, tipo_ativo: e.target.value })}
                    required
                  >
                    {tiposAtivo.map(tipo => (
                      <option key={tipo.value} value={tipo.value}>
                        {tipo.emoji} {tipo.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Ticker *</label>
                  <input
                    type="text"
                    value={formData.ticker}
                    onChange={(e) => {
                      const ticker = e.target.value.toUpperCase()
                      setFormData({ ...formData, ticker })
                      // Busca instantânea quando tiver 5+ caracteres
                      if (ticker.length >= 5) {
                        buscarInfoTicker(ticker)
                      }
                    }}
                    onBlur={() => {
                      // Busca ao sair do campo também
                      if (formData.ticker.length >= 4) {
                        buscarInfoTicker(formData.ticker)
                      }
                    }}
                    placeholder="Ex: PETR4"
                    required
                  />
                  <small className="form-hint">Sistema busca automaticamente na base de 200+ ativos</small>
                </div>

                <div className="form-group">
                  <label>Nome *</label>
                  <input
                    type="text"
                    value={formData.nome_ativo}
                    onChange={(e) => setFormData({ ...formData, nome_ativo: e.target.value })}
                    placeholder="Petrobras PN"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Quantidade *</label>
                  <input
                    type="number"
                    step="0.00000001"
                    value={formData.quantidade}
                    onChange={(e) => setFormData({ ...formData, quantidade: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Preço *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.preco_unitario}
                    onChange={(e) => setFormData({ ...formData, preco_unitario: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Corretagem</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.taxa_corretagem}
                    onChange={(e) => setFormData({ ...formData, taxa_corretagem: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Emolumentos</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.emolumentos}
                    onChange={(e) => setFormData({ ...formData, emolumentos: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Outros Custos</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.outros_custos}
                    onChange={(e) => setFormData({ ...formData, outros_custos: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Data *</label>
                  <input
                    type="date"
                    value={formData.data_operacao}
                    onChange={(e) => setFormData({ ...formData, data_operacao: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group full-width">
                  <label>Observações</label>
                  <textarea
                    value={formData.observacoes}
                    onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                    rows="2"
                  />
                </div>

                <div className="form-group full-width total-preview">
                  <span>Total:</span>
                  <strong>{formatCurrency(calcularTotal())}</strong>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={fecharModal}>
                  Cancelar
                </button>
                {!editingOperacao && (
                  <button 
                    type="button" 
                    className="btn-secondary"
                    onClick={(e) => handleSubmit(e, true)}
                  >
                    Salvar e Novo
                  </button>
                )}
                <button type="submit" className="btn-primary">
                  {editingOperacao ? 'Atualizar' : 'Cadastrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showImportModal && (
        <ImportarInvestimentos
          onClose={() => setShowImportModal(false)}
          onSuccess={carregarDados}
          userId={user.id}
        />
      )}
    </div>
  )
}
