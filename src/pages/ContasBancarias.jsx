import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { ValorOculto } from '../components/ValorOculto'
import { Plus, Edit2, Trash2, Search, Check, X, Calendar, Banknote, Landmark, ArrowRightLeft } from 'lucide-react'
import TransferenciaModal from './TransferenciaModal'
import './Transacoes.css'

export default function Transacoes() {
  const { user } = useAuth()
  const [transacoes, setTransacoes] = useState([])
  const [contas, setContas] = useState([])
  const [categorias, setCategorias] = useState([])
  const [subcategorias, setSubcategorias] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showTransferenciaModal, setShowTransferenciaModal] = useState(false)
  const [editingTransacao, setEditingTransacao] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('todos')
  const [filtroPago, setFiltroPago] = useState('todos')
  const [filtroConta, setFiltroConta] = useState('todas')
  const [gruposExpandidos, setGruposExpandidos] = useState({})
  
  const [formData, setFormData] = useState({
    tipo: 'despesa',
    descricao: '',
    valor: 0,
    forma_pagamento: 'conta',
    conta_id: '',
    categoria_id: '',
    subcategoria_id: '',
    data_transacao: new Date().toISOString().split('T')[0],
    data_vencimento: '',
    pago: false,
    data_pagamento: '',
    observacoes: ''
  })

  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Auto-dismiss de mensagens
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(''), 3000)
      return () => clearTimeout(timer)
    }
  }, [success])

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(''), 5000)
      return () => clearTimeout(timer)
    }
  }, [error])

  useEffect(() => {
    if (user) {
      carregarDados()
    }
  }, [user])

  const carregarDados = async () => {
    try {
      setLoading(true)

      const { data: transData, error: transError } = await supabase
        .from('transacoes')
        .select(`
          *,
          contas_bancarias(nome, cor),
          categorias(nome, cor, icone, tipo),
          subcategorias(nome)
        `)
        .eq('user_id', user.id)
        .order('data_transacao', { ascending: false })

      if (transError) throw transError

      const { data: contasData, error: contasError } = await supabase
        .from('contas_bancarias')
        .select('*')
        .eq('user_id', user.id)
        .eq('ativo', true)
        .order('nome')

      if (contasError) throw contasError
      
      console.log('🔄 Contas recarregadas:', contasData?.map(c => ({ 
        nome: c.nome, 
        saldo: c.saldo_atual,
        logo_url: c.logo_url 
      })))

      const { data: catData, error: catError } = await supabase
        .from('categorias')
        .select('*')
        .eq('user_id', user.id)
        .eq('ativo', true)
        .order('tipo', { ascending: false })
        .order('nome')

      if (catError) throw catError

      const { data: subData, error: subError } = await supabase
        .from('subcategorias')
        .select(`
          *,
          categorias!inner(user_id)
        `)
        .eq('categorias.user_id', user.id)
        .eq('ativo', true)
        .order('nome')

      if (subError) throw subError

      setTransacoes(transData || [])
      setContas(contasData || [])
      setCategorias(catData || [])
      setSubcategorias(subData || [])
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
      setError('Erro ao carregar transações')
    } finally {
      setLoading(false)
    }
  }

  // REMOVIDO: atualizarSaldoConta
  // O trigger do banco agora faz isso automaticamente!

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    try {
      if (formData.forma_pagamento === 'conta' && !formData.conta_id) {
        setError('Selecione uma conta bancária')
        return
      }

      if (!formData.categoria_id) {
        setError('Selecione uma categoria')
        return
      }

      const valor = parseFloat(formData.valor)
      const pago = formData.pago

      const dadosTransacao = {
        tipo: formData.tipo,
        descricao: formData.descricao,
        valor: valor,
        user_id: user.id,
        conta_id: formData.forma_pagamento === 'dinheiro' ? null : formData.conta_id,
        categoria_id: formData.categoria_id,
        subcategoria_id: formData.subcategoria_id || null,
        data_transacao: formData.data_transacao,
        data_vencimento: formData.data_vencimento || null,
        pago: pago,
        data_pagamento: pago ? (formData.data_pagamento || formData.data_transacao) : null,
        observacoes: formData.observacoes || null
      }

      if (editingTransacao) {
        // Remover saldo antigo (agora feito por trigger)
        // if (editingTransacao.pago && editingTransacao.conta_id) {
        //   await atualizarSaldoConta(...)
        // }

        const { error } = await supabase
          .from('transacoes')
          .update(dadosTransacao)
          .eq('id', editingTransacao.id)

        if (error) throw error

        // Adicionar novo saldo (agora feito por trigger)
        // if (pago && dadosTransacao.conta_id) {
        //   await atualizarSaldoConta(...)
        // }

        setSuccess('Transação atualizada com sucesso!')
      } else {
        const { error } = await supabase
          .from('transacoes')
          .insert([dadosTransacao])

        if (error) throw error

        // Atualizar saldo (agora feito por trigger)
        // if (pago && dadosTransacao.conta_id) {
        //   await atualizarSaldoConta(...)
        // }

        setSuccess('Transação cadastrada com sucesso!')
      }

      await carregarDados()
      fecharModal()
    } catch (error) {
      console.error('Erro ao salvar transação:', error)
      setError(error.message || 'Erro ao salvar transação')
    }
  }

  const handleEditar = (transacao) => {
    setEditingTransacao(transacao)
    setFormData({
      tipo: transacao.tipo,
      descricao: transacao.descricao,
      valor: transacao.valor,
      forma_pagamento: transacao.conta_id ? 'conta' : 'dinheiro',
      conta_id: transacao.conta_id || '',
      categoria_id: transacao.categoria_id,
      subcategoria_id: transacao.subcategoria_id || '',
      data_transacao: transacao.data_transacao,
      data_vencimento: transacao.data_vencimento || '',
      pago: transacao.pago,
      data_pagamento: transacao.data_pagamento || '',
      observacoes: transacao.observacoes || ''
    })
    setShowModal(true)
  }

  const handleExcluir = async (transacao) => {
    if (!confirm('Tem certeza que deseja excluir esta transação?')) return

    try {
      // Remover saldo (agora feito por trigger)
      // if (transacao.pago && transacao.conta_id) {
      //   await atualizarSaldoConta(...)
      // }

      const { error } = await supabase
        .from('transacoes')
        .delete()
        .eq('id', transacao.id)

      if (error) throw error
      
      setSuccess('Transação excluída com sucesso!')
      await carregarDados()
    } catch (error) {
      console.error('Erro ao excluir transação:', error)
      setError('Erro ao excluir transação')
    }
  }

  const handleDarBaixa = async (transacao) => {
    try {
      const dataPagamento = new Date().toISOString().split('T')[0]

      const { error } = await supabase
        .from('transacoes')
        .update({
          pago: true,
          data_pagamento: dataPagamento
        })
        .eq('id', transacao.id)

      if (error) throw error

      // Atualizar saldo (agora feito por trigger)
      // if (transacao.conta_id) {
      //   await atualizarSaldoConta(...)
      // }
      
      setSuccess('Baixa realizada com sucesso!')
      await carregarDados()
    } catch (error) {
      console.error('Erro ao dar baixa:', error)
      setError('Erro ao dar baixa na transação')
    }
  }

  const abrirModal = () => {
    setEditingTransacao(null)
    setFormData({
      tipo: 'despesa',
      descricao: '',
      valor: 0,
      forma_pagamento: 'conta',
      conta_id: contas.length > 0 ? contas[0].id : '',
      categoria_id: '',
      subcategoria_id: '',
      data_transacao: new Date().toISOString().split('T')[0],
      data_vencimento: '',
      pago: false,
      data_pagamento: '',
      observacoes: ''
    })
    setError('')
    setSuccess('')
    setShowModal(true)
  }

  const fecharModal = () => {
    setShowModal(false)
    setEditingTransacao(null)
    setError('')
  }

  const transacoesFiltradas = transacoes.filter(trans => {
    const matchSearch = trans.descricao.toLowerCase().includes(searchTerm.toLowerCase())
    const matchTipo = filtroTipo === 'todos' || trans.tipo === filtroTipo
    const matchPago = filtroPago === 'todos' || 
                      (filtroPago === 'pago' && trans.pago) ||
                      (filtroPago === 'pendente' && !trans.pago)
    const matchConta = filtroConta === 'todas' || trans.conta_id === filtroConta
    
    return matchSearch && matchTipo && matchPago && matchConta
  })

  // Agrupar transações por conta
  const transacoesPorConta = transacoesFiltradas.reduce((acc, trans) => {
    const chave = trans.conta_id || 'dinheiro'
    if (!acc[chave]) {
      acc[chave] = []
    }
    acc[chave].push(trans)
    return acc
  }, {})

  // Calcular totais por conta (INCLUINDO transferências)
  const calcularTotaisConta = (chave, transacoesDaConta) => {
    const receitas = transacoesDaConta
      .filter(t => t.tipo === 'receita' && t.pago)
      .reduce((acc, t) => acc + t.valor, 0)
    
    const despesas = transacoesDaConta
      .filter(t => t.tipo === 'despesa' && t.pago)
      .reduce((acc, t) => acc + t.valor, 0)
    
    const saldoMovimentacoes = receitas - despesas
    
    // Buscar saldo inicial e atual da conta
    let saldoInicial = 0
    let saldoAtual = 0
    
    if (chave !== 'dinheiro') {
      const conta = contas.find(c => c.id === chave)
      saldoInicial = conta?.saldo_inicial || 0
      saldoAtual = conta?.saldo_atual || 0
    } else {
      // Para dinheiro, usar apenas as movimentações
      saldoInicial = 0
      saldoAtual = saldoMovimentacoes
    }
    
    return { saldoInicial, receitas, despesas, saldoAtual }
  }

  const subcategoriasFiltradas = subcategorias.filter(
    sub => sub.categoria_id === formData.categoria_id
  )

  const categoriasFiltradas = categorias.filter(
    cat => cat.tipo === formData.tipo
  )

  const totalReceitas = transacoes
    .filter(t => t.tipo === 'receita' && t.pago && !t.is_transferencia)
    .reduce((acc, t) => acc + t.valor, 0)
  
  const totalDespesas = transacoes
    .filter(t => t.tipo === 'despesa' && t.pago && !t.is_transferencia)
    .reduce((acc, t) => acc + t.valor, 0)
  
  const totalPendente = transacoes
    .filter(t => !t.pago && !t.is_transferencia)
    .reduce((acc, t) => acc + (t.tipo === 'receita' ? t.valor : -t.valor), 0)

  const saldo = totalReceitas - totalDespesas

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const formatDate = (date) => {
    return new Date(date + 'T00:00:00').toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  }

  const toggleGrupo = (chave) => {
    setGruposExpandidos(prev => ({
      ...prev,
      [chave]: prev[chave] === undefined ? true : !prev[chave] // Primeira vez abre, depois alterna
    }))
  }

  const getContaInfo = (chave) => {
    if (chave === 'dinheiro') {
      return { nome: 'Dinheiro', logo_url: null, cor: '#48bb78' }
    }
    const conta = contas.find(c => c.id === chave)
    const info = conta ? {
      nome: conta.nome,
      logo_url: conta.logo_url,
      cor: conta.cor || '#667eea'
    } : { nome: 'Conta Desconhecida', logo_url: null, cor: '#999' }
    
    console.log('📊 Conta Info:', chave, info)
    return info
  }

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading">Carregando transações...</div>
      </div>
    )
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Transações</h1>
          <p>Gerencie suas receitas e despesas</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn-primary" onClick={() => setShowTransferenciaModal(true)}>
            <ArrowRightLeft size={20} />
            Transferência
          </button>
          <button className="btn-primary" onClick={abrirModal}>
            <Plus size={20} />
            Nova Transação
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
        <div className="resumo-card card-receita">
          <div className="resumo-icon">💰</div>
          <div className="resumo-info">
            <span className="resumo-label">Receitas</span>
            <span className="resumo-valor">
              <ValorOculto valor={formatCurrency(totalReceitas)} />
            </span>
          </div>
        </div>

        <div className="resumo-card card-despesa">
          <div className="resumo-icon">💸</div>
          <div className="resumo-info">
            <span className="resumo-label">Despesas</span>
            <span className="resumo-valor">
              <ValorOculto valor={formatCurrency(totalDespesas)} />
            </span>
          </div>
        </div>

        <div className="resumo-card card-saldo">
          <div className="resumo-icon">💵</div>
          <div className="resumo-info">
            <span className="resumo-label">Saldo</span>
            <span className={`resumo-valor ${saldo >= 0 ? 'positivo' : 'negativo'}`}>
              <ValorOculto valor={formatCurrency(saldo)} />
            </span>
          </div>
        </div>

        <div className="resumo-card card-pendente">
          <div className="resumo-icon">⏳</div>
          <div className="resumo-info">
            <span className="resumo-label">Pendentes</span>
            <span className="resumo-valor">
              <ValorOculto valor={formatCurrency(totalPendente)} />
            </span>
          </div>
        </div>
      </div>

      <div className="filtros-container">
        <div className="search-box">
          <Search size={20} />
          <input
            type="text"
            placeholder="Buscar transações..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="filtros-group">
          <select 
            value={filtroTipo} 
            onChange={(e) => setFiltroTipo(e.target.value)}
            className="filtro-select"
          >
            <option value="todos">Todos os tipos</option>
            <option value="receita">Receitas</option>
            <option value="despesa">Despesas</option>
          </select>

          <select 
            value={filtroPago} 
            onChange={(e) => setFiltroPago(e.target.value)}
            className="filtro-select"
          >
            <option value="todos">Todos os status</option>
            <option value="pago">Pagos</option>
            <option value="pendente">Pendentes</option>
          </select>

          <select 
            value={filtroConta} 
            onChange={(e) => setFiltroConta(e.target.value)}
            className="filtro-select"
          >
            <option value="todas">Todas as contas</option>
            {contas.map(conta => (
              <option key={conta.id} value={conta.id}>
                {conta.icone} {conta.nome}
              </option>
            ))}
          </select>
        </div>
      </div>

      {transacoesFiltradas.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">💰</div>
          <h2>Nenhuma transação encontrada</h2>
          <p>Comece lançando suas receitas e despesas</p>
          <button className="btn-primary" onClick={abrirModal}>
            <Plus size={20} />
            Lançar Primeira Transação
          </button>
        </div>
      ) : (
        <div className="transacoes-agrupadas">
          {Object.entries(transacoesPorConta).map(([chave, transacoesDaConta]) => {
            const { saldoInicial, receitas, despesas, saldoAtual } = calcularTotaisConta(chave, transacoesDaConta)
            const isExpanded = gruposExpandidos[chave] === true // Por padrão todos retraídos
            const contaInfo = getContaInfo(chave)
            
            return (
              <div key={chave} className="grupo-conta">
                <div 
                  className="grupo-conta-header"
                  onClick={() => toggleGrupo(chave)}
                >
                  <div className="grupo-info">
                    <span className="grupo-icone">{isExpanded ? '▼' : '▶'}</span>
                    {contaInfo.logo_url ? (
                      <div className="grupo-logo" style={{ backgroundColor: contaInfo.cor }}>
                        <img src={contaInfo.logo_url} alt={contaInfo.nome} />
                      </div>
                    ) : (
                      <div className="grupo-logo" style={{ backgroundColor: contaInfo.cor }}>
                        💳
                      </div>
                    )}
                    <h3 className="grupo-nome">{contaInfo.nome}</h3>
                    <span className="grupo-qtd">({transacoesDaConta.length})</span>
                  </div>
                  
                  <div className="grupo-totais">
                    {chave !== 'dinheiro' && (
                      <div className="grupo-total-item inicial">
                        <span className="total-label">Saldo Inicial:</span>
                        <span className="total-valor"><ValorOculto valor={formatCurrency(saldoInicial)} /></span>
                      </div>
                    )}
                    <div className="grupo-total-item receitas">
                      <span className="total-label">Receitas:</span>
                      <span className="total-valor"><ValorOculto valor={formatCurrency(receitas)}/></span>
                    </div>
                    <div className="grupo-total-item despesas">
                      <span className="total-label">Despesas:</span>
                      <span className="total-valor"><ValorOculto valor={formatCurrency(despesas)}/></span>
                    </div>
                    <div className={`grupo-total-item saldo ${saldoAtual >= 0 ? 'positivo' : 'negativo'}`}>
                      <span className="total-label">Saldo Atual:</span>
                      <span className="total-valor"><ValorOculto valor={formatCurrency(saldoAtual)}/></span>
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="transacoes-list">
                    {transacoesDaConta.map((trans) => (
                      <div 
                        key={trans.id} 
                        className={`transacao-card ${trans.tipo} ${trans.pago ? 'pago' : 'pendente'}`}
                      >
                        <div className="transacao-left">
                          <div 
                            className="transacao-icone"
                            style={{ backgroundColor: trans.categorias?.cor }}
                          >
                            {trans.categorias?.icone || '📦'}
                          </div>

                          <div className="transacao-info">
                            <h3 className="transacao-titulo">{trans.descricao}</h3>
                            
                            <div className="transacao-detalhes">
                              <span className="transacao-categoria">
                                {trans.categorias?.nome}
                                {trans.subcategorias && ` • ${trans.subcategorias.nome}`}
                              </span>

                              <span className="transacao-separador">•</span>

                              <span className="transacao-data">
                                <Calendar size={14} />
                                {formatDate(trans.data_transacao)}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="transacao-right">
                          <div className="transacao-valor-container">
                            <span className={`transacao-valor ${trans.tipo}`}>
                              {trans.tipo === 'receita' ? '+' : '-'}
                              {formatCurrency(trans.valor)}
                            </span>
                            <span className={`transacao-status ${trans.pago ? 'pago' : 'pendente'}`}>
                              {trans.pago ? 'Pago' : 'Pendente'}
                            </span>
                          </div>

                          <div className="transacao-acoes">
                            {!trans.pago && (
                              <button
                                className="btn-acao btn-check"
                                onClick={() => handleDarBaixa(trans)}
                                title="Dar Baixa"
                              >
                                <Check size={16} />
                              </button>
                            )}
                            <button
                              className="btn-acao btn-edit"
                              onClick={() => handleEditar(trans)}
                              title="Editar"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              className="btn-acao btn-delete"
                              onClick={() => handleExcluir(trans)}
                              title="Excluir"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={fecharModal}>
          <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingTransacao ? 'Editar Transação' : 'Nova Transação'}</h2>
              <button className="btn-close" onClick={fecharModal}>
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="form-group full-width">
                  <label>Tipo *</label>
                  <div className="radio-group">
                    <label className="radio-label">
                      <input
                        type="radio"
                        value="receita"
                        checked={formData.tipo === 'receita'}
                        onChange={(e) => setFormData({ ...formData, tipo: e.target.value, categoria_id: '', subcategoria_id: '' })}
                      />
                      <span>Receita</span>
                    </label>
                    <label className="radio-label">
                      <input
                        type="radio"
                        value="despesa"
                        checked={formData.tipo === 'despesa'}
                        onChange={(e) => setFormData({ ...formData, tipo: e.target.value, categoria_id: '', subcategoria_id: '' })}
                      />
                      <span>Despesa</span>
                    </label>
                  </div>
                </div>

                <div className="form-group full-width">
                  <label>Descrição *</label>
                  <input
                    type="text"
                    value={formData.descricao}
                    onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                    placeholder="Ex: Compra no supermercado"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Valor *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.valor}
                    onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Forma de Pagamento *</label>
                  <select
                    value={formData.forma_pagamento}
                    onChange={(e) => setFormData({ ...formData, forma_pagamento: e.target.value, conta_id: '' })}
                    required
                  >
                    <option value="conta">Conta Bancária</option>
                    <option value="dinheiro">Dinheiro</option>
                  </select>
                </div>

                {formData.forma_pagamento === 'conta' && (
                  <div className="form-group">
                    <label>Conta *</label>
                    <select
                      value={formData.conta_id}
                      onChange={(e) => setFormData({ ...formData, conta_id: e.target.value })}
                      required
                    >
                      <option value="">Selecione...</option>
                      {contas.map(conta => (
                        <option key={conta.id} value={conta.id}>
                          {conta.nome}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="form-group">
                  <label>Categoria *</label>
                  <select
                    value={formData.categoria_id}
                    onChange={(e) => setFormData({ ...formData, categoria_id: e.target.value, subcategoria_id: '' })}
                    required
                  >
                    <option value="">Selecione...</option>
                    {categoriasFiltradas.map(cat => (
                      <option key={cat.id} value={cat.id}>
                        {cat.icone} {cat.nome}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Subcategoria</label>
                  <select
                    value={formData.subcategoria_id}
                    onChange={(e) => setFormData({ ...formData, subcategoria_id: e.target.value })}
                    disabled={!formData.categoria_id || subcategoriasFiltradas.length === 0}
                  >
                    <option value="">Nenhuma</option>
                    {subcategoriasFiltradas.map(sub => (
                      <option key={sub.id} value={sub.id}>
                        {sub.nome}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Data da Transação *</label>
                  <input
                    type="date"
                    value={formData.data_transacao}
                    onChange={(e) => setFormData({ ...formData, data_transacao: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Data de Vencimento</label>
                  <input
                    type="date"
                    value={formData.data_vencimento}
                    onChange={(e) => setFormData({ ...formData, data_vencimento: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.pago}
                      onChange={(e) => {
                        const isPago = e.target.checked
                        setFormData({ 
                          ...formData, 
                          pago: isPago,
                          data_pagamento: isPago ? new Date().toISOString().split('T')[0] : ''
                        })
                      }}
                    />
                    <span>Pago</span>
                  </label>
                </div>

                {formData.pago && (
                  <div className="form-group">
                    <label>Data de Pagamento</label>
                    <input
                      type="date"
                      value={formData.data_pagamento}
                      onChange={(e) => setFormData({ ...formData, data_pagamento: e.target.value })}
                    />
                  </div>
                )}

                <div className="form-group full-width">
                  <label>Observações</label>
                  <textarea
                    value={formData.observacoes}
                    onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                    placeholder="Informações adicionais..."
                    rows="3"
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={fecharModal}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary">
                  {editingTransacao ? 'Atualizar' : 'Cadastrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showTransferenciaModal && (
        <TransferenciaModal
          onClose={() => setShowTransferenciaModal(false)}
          onSuccess={carregarDados}
        />
      )}
    </div>
  )
}
