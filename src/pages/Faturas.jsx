import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useVisibility } from '../contexts/VisibilityContext'
import { 
  CreditCard, 
  Plus, 
  Calendar,
  DollarSign,
  CheckCircle,
  XCircle,
  Clock,
  TrendingDown,
  Edit2,
  Trash2,
  Lock,
  Receipt,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import './Faturas.css'

export default function Faturas() {
  const { user } = useAuth()
  const { valoresVisiveis } = useVisibility()
  const [cartoes, setCartoes] = useState([])
  const [faturas, setFaturas] = useState([])
  const [lancamentos, setLancamentos] = useState([])
  const [categorias, setCategorias] = useState([])
  const [subcategorias, setSubcategorias] = useState([])
  const [loading, setLoading] = useState(true)
  const [cartaoSelecionado, setCartaoSelecionado] = useState(null)
  const [faturaSelecionada, setFaturaSelecionada] = useState(null)
  const [showModalLancamento, setShowModalLancamento] = useState(false)
  const [showModalPagamento, setShowModalPagamento] = useState(false)
  const [showModalEditarFatura, setShowModalEditarFatura] = useState(false)
  const [showModalParcelas, setShowModalParcelas] = useState(false)
  const [parcelasModal, setParcelasModal] = useState([])
  const [lancamentoParcelasModal, setLancamentoParcelasModal] = useState(null)
  const [faturaExpandida, setFaturaExpandida] = useState(null)
  const [editandoLancamento, setEditandoLancamento] = useState(null)
  
  const [formEditarFatura, setFormEditarFatura] = useState({
    data_vencimento: '',
    data_fechamento: ''
  })
  
  const [formLancamento, setFormLancamento] = useState({
    descricao: '',
    valor: '',
    data_compra: new Date().toISOString().split('T')[0],
    categoria_id: '',
    subcategoria_id: '',
    parcelas: 1,
    observacao: ''
  })

  const [formPagamento, setFormPagamento] = useState({
    conta_id: '',
    data_pagamento: new Date().toISOString().split('T')[0]
  })

  const [contas, setContas] = useState([])

  useEffect(() => {
    if (user) {
      carregarDados()
    }
  }, [user])

  useEffect(() => {
    if (cartaoSelecionado) {
      carregarFaturas(cartaoSelecionado)
    }
  }, [cartaoSelecionado])

  useEffect(() => {
    if (faturaSelecionada) {
      carregarLancamentos(faturaSelecionada)
    }
  }, [faturaSelecionada])

  const carregarDados = async () => {
    try {
      setLoading(true)

      // Carregar cartões ativos
      const { data: cartoesData } = await supabase
        .from('cartoes_credito')
        .select('*')
        .eq('user_id', user.id)
        .eq('ativo', true)
        .order('nome')

      setCartoes(cartoesData || [])
      if (cartoesData && cartoesData.length > 0) {
        setCartaoSelecionado(cartoesData[0].id)
      }

      // Carregar categorias e subcategorias
      const { data: categoriasData } = await supabase
        .from('categorias')
        .select('*')
        .eq('user_id', user.id)
        .eq('tipo', 'despesa')
        .order('nome')

      setCategorias(categoriasData || [])

      const { data: subcategoriasData } = await supabase
        .from('subcategorias')
        .select('*')
        .order('nome')

      setSubcategorias(subcategoriasData || [])

      // Carregar contas bancárias
      const { data: contasData } = await supabase
        .from('contas_bancarias')
        .select('*')
        .eq('user_id', user.id)
        .order('nome')

      setContas(contasData || [])

    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    } finally {
      setLoading(false)
    }
  }

  const carregarFaturas = async (cartaoId) => {
    try {
      const { data, error } = await supabase
        .from('faturas_cartao')
        .select(`
          *,
          cartoes_credito (nome, cor, icone, limite)
        `)
        .eq('cartao_id', cartaoId)
        .order('ano_referencia', { ascending: true })
        .order('mes_referencia', { ascending: true })

      if (error) throw error
      setFaturas(data || [])
      
      // Selecionar primeira fatura aberta ou fechada
      const faturaPendente = data?.find(f => f.status === 'aberta' || f.status === 'fechada')
      if (faturaPendente) {
        setFaturaSelecionada(faturaPendente.id)
        setFaturaExpandida(faturaPendente.id)
      }
    } catch (error) {
      console.error('Erro ao carregar faturas:', error)
    }
  }

  const carregarLancamentos = async (faturaId) => {
    try {
      const { data, error } = await supabase
        .from('lancamentos_cartao')
        .select(`
          *,
          categorias (nome, cor, icone),
          subcategorias (nome)
        `)
        .eq('fatura_id', faturaId)
        .order('data_compra', { ascending: false })

      if (error) throw error
      setLancamentos(data || [])
    } catch (error) {
      console.error('Erro ao carregar lançamentos:', error)
    }
  }

  const calcularFatura = async (cartaoId, dataCompra) => {
    try {
      const { data, error } = await supabase
        .rpc('calcular_fatura', {
          p_cartao_id: cartaoId,
          p_data_compra: dataCompra
        })

      if (error) throw error
      return data[0]
    } catch (error) {
      console.error('Erro ao calcular fatura:', error)
      return null
    }
  }

  const criarOuBuscarFatura = async (cartaoId, mesRef, anoRef, dataVencimento) => {
    try {
      // Tentar buscar fatura existente
      const { data: faturaExistente } = await supabase
        .from('faturas_cartao')
        .select('id')
        .eq('cartao_id', cartaoId)
        .eq('mes_referencia', mesRef)
        .eq('ano_referencia', anoRef)
        .single()

      if (faturaExistente) {
        return faturaExistente.id
      }

      // Criar nova fatura
      const { data: novaFatura, error } = await supabase
        .from('faturas_cartao')
        .insert([{
          cartao_id: cartaoId,
          user_id: user.id,
          mes_referencia: mesRef,
          ano_referencia: anoRef,
          data_vencimento: dataVencimento,
          status: 'aberta'
        }])
        .select()
        .single()

      if (error) throw error
      return novaFatura.id
    } catch (error) {
      console.error('Erro ao criar/buscar fatura:', error)
      return null
    }
  }

  const handleAdicionarLancamento = async (e) => {
    e.preventDefault()

    if (!formLancamento.descricao || !formLancamento.valor) {
      alert('Preencha descrição e valor')
      return
    }

    try {
      if (editandoLancamento) {
        // EDITAR lançamento existente
        const { error } = await supabase
          .from('lancamentos_cartao')
          .update({
            descricao: formLancamento.descricao,
            valor: parseFloat(formLancamento.valor),
            data_compra: formLancamento.data_compra,
            categoria_id: formLancamento.categoria_id || null,
            subcategoria_id: formLancamento.subcategoria_id || null,
            observacao: formLancamento.observacao || null
          })
          .eq('id', editandoLancamento)

        if (error) throw error
        alert('Lançamento atualizado com sucesso!')
      } else {
        // CRIAR novo lançamento
        const valorTotal = parseFloat(formLancamento.valor)
        const parcelas = parseInt(formLancamento.parcelas) || 1
        const valorParcela = valorTotal / parcelas

        // Calcular fatura para cada parcela
        const grupoId = crypto.randomUUID()

        for (let i = 0; i < parcelas; i++) {
          // Calcular data da parcela (mes atual + i meses)
          const dataCompra = new Date(formLancamento.data_compra)
          dataCompra.setMonth(dataCompra.getMonth() + i)
          const dataCompraParcela = dataCompra.toISOString().split('T')[0]

          // Calcular em qual fatura cai esta parcela
          const faturaInfo = await calcularFatura(cartaoSelecionado, dataCompraParcela)
          
          if (!faturaInfo) {
            alert('Erro ao calcular fatura')
            return
          }

          // Criar ou buscar fatura
          const faturaId = await criarOuBuscarFatura(
            cartaoSelecionado,
            faturaInfo.mes_referencia,
            faturaInfo.ano_referencia,
            faturaInfo.data_vencimento
          )

          // Inserir lançamento
          const { error } = await supabase
            .from('lancamentos_cartao')
            .insert([{
              fatura_id: faturaId,
              cartao_id: cartaoSelecionado,
              user_id: user.id,
              descricao: formLancamento.descricao,
              valor: valorParcela,
              data_compra: dataCompraParcela,
              categoria_id: formLancamento.categoria_id || null,
              subcategoria_id: formLancamento.subcategoria_id || null,
              parcela_atual: i + 1,
              total_parcelas: parcelas,
              grupo_parcelamento_id: parcelas > 1 ? grupoId : null,
              observacao: formLancamento.observacao || null
            }])

          if (error) throw error
        }
        alert('Lançamento adicionado com sucesso!')
      }

      setShowModalLancamento(false)
      setEditandoLancamento(null)
      setFormLancamento({
        descricao: '',
        valor: '',
        data_compra: new Date().toISOString().split('T')[0],
        categoria_id: '',
        subcategoria_id: '',
        parcelas: 1,
        observacao: ''
      })
      carregarFaturas(cartaoSelecionado)
      if (faturaSelecionada) {
        carregarLancamentos(faturaSelecionada)
      }
    } catch (error) {
      console.error('Erro ao adicionar lançamento:', error)
      alert('Erro ao adicionar lançamento')
    }
  }

  const handleFecharFatura = async (faturaId) => {
    if (!confirm('Deseja fechar esta fatura? Não será possível adicionar mais lançamentos.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('faturas_cartao')
        .update({ 
          status: 'fechada',
          data_fechamento: new Date().toISOString()
        })
        .eq('id', faturaId)

      if (error) throw error
      alert('Fatura fechada com sucesso!')
      carregarFaturas(cartaoSelecionado)
    } catch (error) {
      console.error('Erro ao fechar fatura:', error)
      alert('Erro ao fechar fatura')
    }
  }

  const handleDeletarFatura = async (faturaId) => {
    if (!confirm('Tem certeza que deseja excluir esta fatura? Ela será deletada permanentemente.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('faturas_cartao')
        .delete()
        .eq('id', faturaId)

      if (error) throw error
      alert('Fatura excluída com sucesso!')
      setFaturaExpandida(null)
      setFaturaSelecionada(null)
      carregarFaturas(cartaoSelecionado)
    } catch (error) {
      console.error('Erro ao excluir fatura:', error)
      alert('Erro ao excluir fatura')
    }
  }

  const handleEditarFatura = async (e) => {
    e.preventDefault()

    try {
      const updates = {}
      
      if (formEditarFatura.data_vencimento) {
        updates.data_vencimento = formEditarFatura.data_vencimento
      }
      
      if (formEditarFatura.data_fechamento) {
        updates.data_fechamento = formEditarFatura.data_fechamento
      }

      const { error } = await supabase
        .from('faturas_cartao')
        .update(updates)
        .eq('id', faturaSelecionada)

      if (error) throw error
      alert('Fatura atualizada com sucesso!')
      setShowModalEditarFatura(false)
      setFormEditarFatura({ data_vencimento: '', data_fechamento: '' })
      carregarFaturas(cartaoSelecionado)
    } catch (error) {
      console.error('Erro ao atualizar fatura:', error)
      alert('Erro ao atualizar fatura')
    }
  }

  const handlePagarFatura = async (e) => {
    e.preventDefault()

    const fatura = faturas.find(f => f.id === faturaSelecionada)
    if (!fatura) return

    try {
      // 1. Criar transação de pagamento
      const { data: transacao, error: errorTransacao } = await supabase
        .from('transacoes')
        .insert([{
          user_id: user.id,
          tipo: 'despesa',
          descricao: `Fatura ${fatura.cartoes_credito.nome} - ${getMesNome(fatura.mes_referencia)}/${fatura.ano_referencia}`,
          valor: fatura.valor_total,
          data: formPagamento.data_pagamento,
          conta_id: formPagamento.conta_id,
          categoria_id: null, // Pode criar categoria "Cartão de Crédito"
          subcategoria_id: null
        }])
        .select()
        .single()

      if (errorTransacao) throw errorTransacao

      // 2. Atualizar fatura
      const { error: errorFatura } = await supabase
        .from('faturas_cartao')
        .update({
          status: 'paga',
          data_pagamento: formPagamento.data_pagamento,
          transacao_pagamento_id: transacao.id
        })
        .eq('id', faturaSelecionada)

      if (errorFatura) throw errorFatura

      alert('Fatura paga com sucesso!')
      setShowModalPagamento(false)
      setFormPagamento({
        conta_id: '',
        data_pagamento: new Date().toISOString().split('T')[0]
      })
      carregarFaturas(cartaoSelecionado)
    } catch (error) {
      console.error('Erro ao pagar fatura:', error)
      alert('Erro ao pagar fatura')
    }
  }

  const handleDeletarLancamento = async (lancamentoId, grupoParcelamentoId) => {
    if (grupoParcelamentoId) {
      const confirmMsg = 'Este lançamento é parcelado. Deseja excluir todas as parcelas ou apenas esta?'
      const opcao = confirm(confirmMsg + '\n\nOK = Todas | Cancelar = Apenas esta')
      
      if (opcao) {
        // Deletar todas as parcelas do grupo
        const { error } = await supabase
          .from('lancamentos_cartao')
          .delete()
          .eq('grupo_parcelamento_id', grupoParcelamentoId)

        if (error) {
          console.error('Erro ao deletar parcelas:', error)
          alert('Erro ao deletar parcelas')
          return
        }
        alert('Todas as parcelas foram excluídas!')
      } else {
        // Deletar apenas esta parcela
        const { error } = await supabase
          .from('lancamentos_cartao')
          .delete()
          .eq('id', lancamentoId)

        if (error) {
          console.error('Erro ao deletar lançamento:', error)
          alert('Erro ao deletar lançamento')
          return
        }
        alert('Lançamento excluído!')
      }
    } else {
      // Lançamento único
      if (!confirm('Deseja excluir este lançamento?')) return

      const { error } = await supabase
        .from('lancamentos_cartao')
        .delete()
        .eq('id', lancamentoId)

      if (error) {
        console.error('Erro ao deletar lançamento:', error)
        alert('Erro ao deletar lançamento')
        return
      }
      alert('Lançamento excluído!')
    }

    carregarFaturas(cartaoSelecionado)
    carregarLancamentos(faturaSelecionada)
  }

  const handleAbrirParcelas = async (lancamento) => {
    if (!lancamento.grupo_parcelamento_id) {
      alert('Este lançamento não possui parcelamento')
      return
    }

    try {
      const { data, error } = await supabase
        .from('lancamentos_cartao')
        .select(`
          *,
          faturas_cartao!inner(mes, ano, status)
        `)
        .eq('grupo_parcelamento_id', lancamento.grupo_parcelamento_id)
        .order('parcela_numero', { ascending: true })

      if (error) throw error

      setParcelasModal(data || [])
      setLancamentoParcelasModal(lancamento)
      setShowModalParcelas(true)
    } catch (error) {
      console.error('Erro ao carregar parcelas:', error)
      alert('Erro ao carregar parcelas')
    }
  }

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0)
  }

  const getMesNome = (mes) => {
    const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
    return meses[mes - 1]
  }

  const getStatusBadge = (status) => {
    const badges = {
      aberta: { icon: Clock, label: 'Aberta', class: 'status-aberta' },
      fechada: { icon: Lock, label: 'Fechada', class: 'status-fechada' },
      paga: { icon: CheckCircle, label: 'Paga', class: 'status-paga' }
    }
    const badge = badges[status] || badges.aberta
    const Icon = badge.icon
    
    return (
      <span className={`status-badge ${badge.class}`}>
        <Icon size={14} />
        {badge.label}
      </span>
    )
  }

  const toggleFatura = (faturaId) => {
    if (faturaExpandida === faturaId) {
      setFaturaExpandida(null)
      setFaturaSelecionada(null)
      setLancamentos([])
    } else {
      setFaturaExpandida(faturaId)
      setFaturaSelecionada(faturaId)
    }
  }

  if (loading) {
    return <div className="loading">Carregando faturas...</div>
  }

  if (cartoes.length === 0) {
    return (
      <div className="empty-state">
        <CreditCard size={64} />
        <h3>Nenhum cartão ativo</h3>
        <p>Cadastre um cartão de crédito primeiro</p>
      </div>
    )
  }

  return (
    <div className="faturas-container">
      {/* Header */}
      <div className="page-header">
        <div className="header-title">
          <Receipt size={32} />
          <div>
            <h1>Faturas e Lançamentos</h1>
            <p>Gerencie as faturas dos seus cartões</p>
          </div>
        </div>
        <button 
          className="btn-primary" 
          onClick={() => setShowModalLancamento(true)}
          disabled={!cartaoSelecionado}
        >
          <Plus size={20} />
          Nova Compra
        </button>
      </div>

      {/* Seletor de Cartão */}
      <div className="cartao-selector">
        {cartoes.map(cartao => {
          const limiteUsado = faturas
            .filter(f => f.cartao_id === cartao.id && (f.status === 'aberta' || f.status === 'fechada'))
            .reduce((sum, f) => sum + (f.valor_total || 0), 0)
          const limiteDisponivel = (cartao.limite || 0) - limiteUsado

          return (
            <button
              key={cartao.id}
              className={`cartao-btn ${cartaoSelecionado === cartao.id ? 'active' : ''}`}
              onClick={() => {
                setCartaoSelecionado(cartao.id)
                setFaturaSelecionada(null)
                setFaturaExpandida(null)
                setLancamentos([])
              }}
              style={{ borderLeftColor: cartao.cor }}
            >
              <span className="cartao-icone">{cartao.icone}</span>
              <div className="cartao-info-completa">
                <div className="cartao-nome-wrapper">
                  <span className="cartao-nome">{cartao.nome}</span>
                  <span className="cartao-bandeira-small">{cartao.bandeira}</span>
                </div>
                <div className="cartao-limites">
                  <span className="limite-item">
                    <small>Usado:</small> <strong className="usado">{valoresVisiveis ? formatCurrency(limiteUsado) : '••••••'}</strong>
                  </span>
                  <span className="limite-item">
                    <small>Disponível:</small> <strong className="disponivel">{valoresVisiveis ? formatCurrency(limiteDisponivel) : '••••••'}</strong>
                  </span>
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {/* Lista de Faturas */}
      <div className="faturas-list">
        {faturas.length === 0 ? (
          <div className="empty-message">
            <p>Nenhuma fatura encontrada. Adicione uma compra para criar a primeira fatura.</p>
          </div>
        ) : (
          faturas.map(fatura => (
            <div key={fatura.id} className="fatura-card">
              <div 
                className="fatura-header"
                onClick={() => toggleFatura(fatura.id)}
              >
                <div className="fatura-info">
                  <h3>{getMesNome(fatura.mes_referencia)}/{fatura.ano_referencia}</h3>
                  <span className="fatura-vencimento">
                    Vence: {new Date(fatura.data_vencimento).toLocaleDateString('pt-BR')}
                  </span>
                </div>
                <div className="fatura-valor-status">
                  <span className="fatura-valor">{valoresVisiveis ? formatCurrency(fatura.valor_total) : '••••••'}</span>
                  {getStatusBadge(fatura.status)}
                  {fatura.status === 'aberta' && (
                    <button 
                      className="btn-fechar-inline"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleFecharFatura(fatura.id)
                      }}
                      title="Fechar Fatura"
                    >
                      <Lock size={16} />
                    </button>
                  )}
                  {(fatura.status === 'aberta' || fatura.status === 'fechada') && (
                    <button 
                      className="btn-editar-inline"
                      onClick={(e) => {
                        e.stopPropagation()
                        setFaturaSelecionada(fatura.id)
                        setFormEditarFatura({
                          data_vencimento: fatura.data_vencimento,
                          data_fechamento: fatura.data_fechamento || ''
                        })
                        setShowModalEditarFatura(true)
                      }}
                      title="Editar Datas"
                    >
                      <Edit2 size={16} />
                    </button>
                  )}
                  {fatura.status === 'fechada' && (
                    <button 
                      className="btn-pagar-inline"
                      onClick={(e) => {
                        e.stopPropagation()
                        setFaturaSelecionada(fatura.id)
                        setShowModalPagamento(true)
                      }}
                      title="Pagar Fatura"
                    >
                      <DollarSign size={16} />
                    </button>
                  )}
                  {faturaExpandida === fatura.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </div>
              </div>

              {faturaExpandida === fatura.id && (
                <div className="fatura-detalhes">
                  {/* Ações da Fatura */}
                  {fatura.status === 'paga' && fatura.data_pagamento && (
                    <div className="fatura-actions">
                      <span className="data-pagamento">
                        <CheckCircle size={16} />
                        Pago em {new Date(fatura.data_pagamento).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  )}

                  {/* Botão deletar fatura vazia */}
                  {lancamentos.length === 0 && fatura.status === 'aberta' && (
                    <div className="fatura-actions">
                      <button 
                        className="btn-danger btn-sm"
                        onClick={() => handleDeletarFatura(fatura.id)}
                      >
                        <Trash2 size={16} />
                        Excluir Fatura Vazia
                      </button>
                    </div>
                  )}

                  {/* Lançamentos */}
                  <div className="lancamentos-list">
                    <h4>Lançamentos ({lancamentos.length})</h4>
                    {lancamentos.length === 0 ? (
                      <p className="empty-lancamentos">Nenhum lançamento nesta fatura</p>
                    ) : (
                      lancamentos.map(lanc => (
                        <div 
                          key={lanc.id} 
                          className="lancamento-item"
                          onDoubleClick={() => lanc.grupo_parcelamento_id && handleAbrirParcelas(lanc)}
                          style={{ cursor: lanc.grupo_parcelamento_id ? 'pointer' : 'default' }}
                          title={lanc.grupo_parcelamento_id ? 'Clique 2x para ver todas as parcelas' : ''}
                        >
                          <div className="lancamento-info">
                            <div className="lancamento-descricao">
                              <span className="descricao">{lanc.descricao}</span>
                              {lanc.total_parcelas > 1 && (
                                <span className="parcela-info">
                                  {lanc.parcela_atual}/{lanc.total_parcelas}x
                                </span>
                              )}
                            </div>
                            <div className="lancamento-meta">
                              <span className="data">
                                {new Date(lanc.data_compra).toLocaleDateString('pt-BR')}
                              </span>
                              {lanc.categorias && (
                                <span 
                                  className="categoria-tag"
                                  style={{ backgroundColor: lanc.categorias.cor }}
                                >
                                  {lanc.categorias.icone} {lanc.categorias.nome}
                                  {lanc.subcategorias && ` > ${lanc.subcategorias.nome}`}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="lancamento-valor-actions">
                            <span className="valor">{valoresVisiveis ? formatCurrency(lanc.valor) : '••••••'}</span>
                            {fatura.status === 'aberta' && (
                              <div className="lancamento-btns">
                                <button 
                                  className="btn-icon btn-edit"
                                  onClick={() => {
                                    setEditandoLancamento(lanc.id)
                                    setFormLancamento({
                                      descricao: lanc.descricao,
                                      valor: lanc.valor,
                                      data_compra: lanc.data_compra,
                                      categoria_id: lanc.categoria_id || '',
                                      subcategoria_id: lanc.subcategoria_id || '',
                                      parcelas: 1,
                                      observacao: lanc.observacao || ''
                                    })
                                    setShowModalLancamento(true)
                                  }}
                                  title="Editar"
                                >
                                  <Edit2 size={16} />
                                </button>
                                <button 
                                  className="btn-icon btn-delete"
                                  onClick={() => handleDeletarLancamento(lanc.id, lanc.grupo_parcelamento_id)}
                                  title="Excluir"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Modal: Novo Lançamento */}
      {showModalLancamento && (
        <div className="modal-overlay" onClick={() => setShowModalLancamento(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editandoLancamento ? 'Editar Compra' : 'Nova Compra'}</h2>
              <button className="btn-icon" onClick={() => {
                setShowModalLancamento(false)
                setEditandoLancamento(null)
                setFormLancamento({
                  descricao: '',
                  valor: '',
                  data_compra: new Date().toISOString().split('T')[0],
                  categoria_id: '',
                  subcategoria_id: '',
                  parcelas: 1,
                  observacao: ''
                })
              }}>
                <XCircle size={20} />
              </button>
            </div>

            <form onSubmit={handleAdicionarLancamento}>
              <div className="form-group">
                <label>Descrição *</label>
                <input
                  type="text"
                  value={formLancamento.descricao}
                  onChange={(e) => setFormLancamento({ ...formLancamento, descricao: e.target.value })}
                  placeholder="Ex: Compra no supermercado"
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Valor Total *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formLancamento.valor}
                    onChange={(e) => setFormLancamento({ ...formLancamento, valor: e.target.value })}
                    placeholder="0.00"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Parcelas</label>
                  <input
                    type="number"
                    min="1"
                    max="48"
                    value={formLancamento.parcelas}
                    onChange={(e) => setFormLancamento({ ...formLancamento, parcelas: e.target.value })}
                    disabled={editandoLancamento}
                  />
                  {editandoLancamento && (
                    <small style={{color: '#999', fontSize: '12px'}}>Não é possível alterar parcelas em edição</small>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label>Data da Compra *</label>
                <input
                  type="date"
                  value={formLancamento.data_compra}
                  onChange={(e) => setFormLancamento({ ...formLancamento, data_compra: e.target.value })}
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Categoria</label>
                  <select
                    value={formLancamento.categoria_id}
                    onChange={(e) => setFormLancamento({ ...formLancamento, categoria_id: e.target.value, subcategoria_id: '' })}
                  >
                    <option value="">Selecione...</option>
                    {categorias.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.icone} {cat.nome}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Subcategoria</label>
                  <select
                    value={formLancamento.subcategoria_id}
                    onChange={(e) => setFormLancamento({ ...formLancamento, subcategoria_id: e.target.value })}
                    disabled={!formLancamento.categoria_id}
                  >
                    <option value="">Selecione...</option>
                    {subcategorias
                      .filter(sub => {
                        console.log('🔍 Comparando:', {
                          subcategoria: sub.nome,
                          sub_categoria_id: sub.categoria_id,
                          form_categoria_id: formLancamento.categoria_id,
                          igual: sub.categoria_id === formLancamento.categoria_id
                        })
                        return sub.categoria_id === formLancamento.categoria_id
                      })
                      .map(sub => (
                        <option key={sub.id} value={sub.id}>{sub.nome}</option>
                      ))
                    }
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Observação</label>
                <textarea
                  value={formLancamento.observacao}
                  onChange={(e) => setFormLancamento({ ...formLancamento, observacao: e.target.value })}
                  placeholder="Observações adicionais (opcional)"
                  rows="3"
                />
              </div>

              {formLancamento.parcelas > 1 && (
                <div className="info-parcelas">
                  <TrendingDown size={16} />
                  <span>
                    {formLancamento.parcelas}x de {formatCurrency(parseFloat(formLancamento.valor || 0) / parseInt(formLancamento.parcelas))}
                  </span>
                </div>
              )}

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => {
                  setShowModalLancamento(false)
                  setEditandoLancamento(null)
                }}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary">
                  <Plus size={20} />
                  {editandoLancamento ? 'Salvar' : 'Adicionar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Pagar Fatura */}
      {showModalPagamento && (
        <div className="modal-overlay" onClick={() => setShowModalPagamento(false)}>
          <div className="modal-content modal-sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Pagar Fatura</h2>
              <button className="btn-icon" onClick={() => setShowModalPagamento(false)}>
                <XCircle size={20} />
              </button>
            </div>

            <form onSubmit={handlePagarFatura}>
              <div className="pagamento-info">
                <p><strong>Valor:</strong> {formatCurrency(faturas.find(f => f.id === faturaSelecionada)?.valor_total || 0)}</p>
              </div>

              <div className="form-group">
                <label>Conta para Débito *</label>
                <select
                  value={formPagamento.conta_id}
                  onChange={(e) => setFormPagamento({ ...formPagamento, conta_id: e.target.value })}
                  required
                >
                  <option value="">Selecione a conta...</option>
                  {contas.map(conta => (
                    <option key={conta.id} value={conta.id}>{conta.icone} {conta.nome}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Data do Pagamento *</label>
                <input
                  type="date"
                  value={formPagamento.data_pagamento}
                  onChange={(e) => setFormPagamento({ ...formPagamento, data_pagamento: e.target.value })}
                  required
                />
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowModalPagamento(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary">
                  <CheckCircle size={20} />
                  Confirmar Pagamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Editar Fatura */}
      {showModalEditarFatura && (
        <div className="modal-overlay" onClick={() => setShowModalEditarFatura(false)}>
          <div className="modal-content modal-sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Editar Datas da Fatura</h2>
              <button className="btn-icon" onClick={() => setShowModalEditarFatura(false)}>
                <XCircle size={20} />
              </button>
            </div>

            <form onSubmit={handleEditarFatura}>
              <div className="form-group">
                <label>Data de Vencimento *</label>
                <input
                  type="date"
                  value={formEditarFatura.data_vencimento}
                  onChange={(e) => setFormEditarFatura({ ...formEditarFatura, data_vencimento: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Data de Fechamento</label>
                <input
                  type="date"
                  value={formEditarFatura.data_fechamento}
                  onChange={(e) => setFormEditarFatura({ ...formEditarFatura, data_fechamento: e.target.value })}
                />
                <small style={{color: '#999', fontSize: '12px'}}>
                  Deixe vazio se a fatura ainda não foi fechada
                </small>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowModalEditarFatura(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary">
                  <CheckCircle size={20} />
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Parcelas */}
      {showModalParcelas && (
        <div className="modal-overlay" onClick={() => setShowModalParcelas(false)}>
          <div className="modal-content modal-parcelas" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                <Receipt size={24} />
                Todas as Parcelas
              </h2>
              <button className="btn-close" onClick={() => setShowModalParcelas(false)}>
                <XCircle size={24} />
              </button>
            </div>

            <div className="modal-body">
              {lancamentoParcelasModal && (
                <div className="parcelas-resumo">
                  <h3>{lancamentoParcelasModal.descricao}</h3>
                  <div className="resumo-valores">
                    <div className="resumo-item">
                      <span className="label">Valor Total:</span>
                      <span className="valor total">
                        {valoresVisiveis ? formatCurrency(
                          parcelasModal.reduce((sum, p) => sum + parseFloat(p.valor || 0), 0)
                        ) : '••••••'}
                      </span>
                    </div>
                    <div className="resumo-item">
                      <span className="label">Total de Parcelas:</span>
                      <span className="valor">{parcelasModal.length}x</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="parcelas-lista">
                {parcelasModal.map((parcela) => {
                  const isPaga = parcela.faturas_cartao?.status === 'fechada' || parcela.faturas_cartao?.status === 'paga'
                  
                  return (
                    <div key={parcela.id} className={`parcela-card ${isPaga ? 'paga' : 'pendente'}`}>
                      <div className="parcela-numero">
                        <span className="numero">{parcela.parcela_numero}/{parcela.total_parcelas}</span>
                        {isPaga ? (
                          <span className="status-badge-parcela paga">
                            <CheckCircle size={16} />
                            Paga
                          </span>
                        ) : (
                          <span className="status-badge-parcela pendente">
                            <Clock size={16} />
                            Pendente
                          </span>
                        )}
                      </div>
                      <div className="parcela-info-row">
                        <div className="parcela-fatura">
                          <Calendar size={14} />
                          <span>
                            {getMesNome(parcela.faturas_cartao?.mes)}/{parcela.faturas_cartao?.ano}
                          </span>
                        </div>
                        <div className="parcela-valor">
                          {valoresVisiveis ? formatCurrency(parcela.valor) : '••••••'}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowModalParcelas(false)}>
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
