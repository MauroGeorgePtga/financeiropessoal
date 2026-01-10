import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Search, 
  TrendingUp, 
  TrendingDown,
  Upload,
  RefreshCw,
  X,
  Copy
} from 'lucide-react'
import ImportarInvestimentos from './ImportarInvestimentos'
import './Investimentos.css'

export default function Investimentos() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('operacoes')
  const [operacoes, setOperacoes] = useState([])
  const [cotacoes, setCotacoes] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [editingOperacao, setEditingOperacao] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filtroTipoOp, setFiltroTipoOp] = useState('todos')
  const [filtroTipoAtivo, setFiltroTipoAtivo] = useState('todos')

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
    }
  }, [user])

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

    try {
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
      
      const { error } = await supabase
        .from('investimentos_cotacoes')
        .upsert({
          ticker: ticker,
          tipo_ativo: ativo.tipo_ativo,
          nome_ativo: ativo.nome_ativo,
          cotacao_atual: parseFloat(cotacao),
          user_id: user.id,
          data_atualizacao: new Date().toISOString()
        }, {
          onConflict: 'ticker'
        })

      if (error) throw error
      setSuccess(`Cotação ${ticker} atualizada!`)
      await carregarDados()
    } catch (error) {
      setError('Erro ao atualizar cotação')
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
  }

  const operacoesFiltradas = operacoes.filter(op => {
    const matchSearch = op.ticker.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        op.nome_ativo.toLowerCase().includes(searchTerm.toLowerCase())
    const matchTipoOp = filtroTipoOp === 'todos' || op.tipo_operacao === filtroTipoOp
    const matchTipoAtivo = filtroTipoAtivo === 'todos' || op.tipo_ativo === filtroTipoAtivo
    
    return matchSearch && matchTipoOp && matchTipoAtivo
  })

  const carteira = calcularCarteira()

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
        <div className="resumo-card card-investido">
          <div className="resumo-icon">💰</div>
          <div className="resumo-info">
            <span className="resumo-label">Total Investido</span>
            <span className="resumo-valor">{formatCurrency(totalInvestido)}</span>
          </div>
        </div>

        <div className="resumo-card card-atual">
          <div className="resumo-icon">💎</div>
          <div className="resumo-info">
            <span className="resumo-label">Valor Atual</span>
            <span className="resumo-valor">{formatCurrency(totalAtual)}</span>
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

      <div className="tabs-container">
        <button 
          className={`tab-btn ${activeTab === 'operacoes' ? 'active' : ''}`}
          onClick={() => setActiveTab('operacoes')}
        >
          📜 Operações ({operacoes.length})
        </button>
        <button 
          className={`tab-btn ${activeTab === 'carteira' ? 'active' : ''}`}
          onClick={() => setActiveTab('carteira')}
        >
          💼 Carteira ({carteira.length})
        </button>
      </div>

      {activeTab === 'operacoes' && (
        <>
          <div className="filtros-container">
            <div className="search-box">
              <Search size={20} />
              <input
                type="text"
                placeholder="Buscar por ticker ou nome..."
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
          </div>

          {operacoesFiltradas.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📈</div>
              <h2>Nenhuma operação cadastrada</h2>
              <p>Cadastre suas operações de compra e venda</p>
              <button className="btn-primary" onClick={abrirModal}>
                <Plus size={20} />
                Cadastrar Primeira Operação
              </button>
            </div>
          ) : (
            <div className="operacoes-list">
              {operacoesFiltradas.map((op) => {
                const tipoConfig = tiposAtivo.find(t => t.value === op.tipo_ativo)
                const total = (op.quantidade * op.preco_unitario) + 
                              (op.taxa_corretagem || 0) + 
                              (op.emolumentos || 0) + 
                              (op.outros_custos || 0)

                return (
                  <div key={op.id} className={`operacao-card ${op.tipo_operacao}`}>
                    <div className="operacao-header">
                      <div className="operacao-tipo-badge">
                        <span className={`badge-${op.tipo_operacao}`}>
                          {op.tipo_operacao === 'compra' ? '🟢 COMPRA' : '🔴 VENDA'}
                        </span>
                        <span className="tipo-ativo-badge">
                          {tipoConfig?.emoji} {tipoConfig?.label}
                        </span>
                      </div>
                      <div className="operacao-acoes">
                        <button
                          className="btn-acao"
                          onClick={() => handleDuplicar(op)}
                          title="Duplicar"
                        >
                          <Copy size={16} />
                        </button>
                        <button
                          className="btn-acao"
                          onClick={() => handleEditar(op)}
                          title="Editar"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          className="btn-acao btn-delete"
                          onClick={() => handleExcluir(op.id)}
                          title="Excluir"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    <div className="operacao-body">
                      <div className="operacao-info">
                        <h3>{op.ticker}</h3>
                        <p>{op.nome_ativo}</p>
                      </div>

                      <div className="operacao-detalhes">
                        <div className="detalhe-item">
                          <span className="detalhe-label">Qtd:</span>
                          <span className="detalhe-valor">{op.quantidade}</span>
                        </div>
                        <div className="detalhe-item">
                          <span className="detalhe-label">Preço:</span>
                          <span className="detalhe-valor">{formatCurrency(op.preco_unitario)}</span>
                        </div>
                        <div className="detalhe-item">
                          <span className="detalhe-label">Data:</span>
                          <span className="detalhe-valor">{formatDate(op.data_operacao)}</span>
                        </div>
                      </div>

                      <div className="operacao-total">
                        <span className="total-label">Total:</span>
                        <span className="total-valor">{formatCurrency(total)}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {activeTab === 'carteira' && (
        <>
          {carteira.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">💼</div>
              <h2>Carteira vazia</h2>
              <p>Cadastre operações para montar sua carteira</p>
            </div>
          ) : (
            <div className="carteira-grid">
              {carteira.map((ativo) => {
                const tipoConfig = tiposAtivo.find(t => t.value === ativo.tipo_ativo)
                const temCotacao = ativo.cotacao_atual !== undefined

                return (
                  <div key={ativo.ticker} className="ativo-card">
                    <div className="ativo-header">
                      <span className="tipo-emoji">{tipoConfig?.emoji}</span>
                      <span className="tipo-label">{tipoConfig?.label}</span>
                    </div>

                    <div className="ativo-titulo">
                      <h3>{ativo.ticker}</h3>
                      <p>{ativo.nome_ativo}</p>
                    </div>

                    <div className="ativo-info">
                      <div className="info-row">
                        <span>Quantidade:</span>
                        <span>{ativo.quantidade}</span>
                      </div>
                      <div className="info-row">
                        <span>Preço Médio:</span>
                        <span>{formatCurrency(ativo.preco_medio)}</span>
                      </div>
                      <div className="info-row">
                        <span>Investido:</span>
                        <strong>{formatCurrency(ativo.total_investido)}</strong>
                      </div>
                    </div>

                    <div className="ativo-cotacao">
                      <label>Cotação Atual:</label>
                      <div className="cotacao-group">
                        <input
                          type="number"
                          step="0.01"
                          defaultValue={ativo.cotacao_atual || ''}
                          placeholder="0,00"
                          id={`cotacao-${ativo.ticker}`}
                        />
                        <button 
                          className="btn-refresh"
                          onClick={() => {
                            const input = document.getElementById(`cotacao-${ativo.ticker}`)
                            if (input && input.value) {
                              handleAtualizarCotacao(ativo.ticker, input.value)
                            }
                          }}
                        >
                          <RefreshCw size={16} />
                        </button>
                      </div>
                    </div>

                    {temCotacao && (
                      <div className="ativo-resultado">
                        <div className="resultado-row">
                          <span>Valor Atual:</span>
                          <span>{formatCurrency(ativo.valor_atual)}</span>
                        </div>
                        <div className={`rentabilidade ${ativo.rentabilidade >= 0 ? 'positivo' : 'negativo'}`}>
                          {ativo.rentabilidade >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                          <span>
                            {ativo.rentabilidade >= 0 ? '+' : ''}{ativo.rentabilidade.toFixed(2)}%
                          </span>
                          <span>({formatCurrency(ativo.lucro)})</span>
                        </div>
                      </div>
                    )}

                    <div className="ativo-ops">
                      <small>{ativo.operacoes_compra} compra(s) • {ativo.operacoes_venda} venda(s)</small>
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
          <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingOperacao ? 'Editar Operação' : 'Nova Operação'}</h2>
              <button className="btn-close" onClick={fecharModal}>
                <X size={24} />
              </button>
            </div>

            <form onSubmit={(e) => handleSubmit(e, false)}>
              <div className="form-grid">
                <div className="form-group full-width">
                  <label>Tipo de Operação *</label>
                  <div className="radio-group">
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

                <div className="form-group full-width">
                  <label>Tipo de Ativo *</label>
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
                    onChange={(e) => setFormData({ ...formData, ticker: e.target.value.toUpperCase() })}
                    placeholder="PETR4"
                    required
                  />
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
