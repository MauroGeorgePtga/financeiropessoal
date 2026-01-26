import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useVisibility } from '../contexts/VisibilityContext'
import { 
  Calendar,
  TrendingUp,
  TrendingDown,
  PieChart as PieChartIcon,
  BarChart3,
  Download,
  Filter,
  CreditCard,
  ChevronDown,
  ChevronRight
} from 'lucide-react'
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'
import './Relatorios.css'

export default function Relatorios() {
  const { user } = useAuth()
  const { valoresVisiveis } = useVisibility()
  const [loading, setLoading] = useState(true)
  const [abaAtiva, setAbaAtiva] = useState('transacoes') // transacoes, cartoes
  const [periodo, setPeriodo] = useState('mes_atual') // mes_atual, ultimos_3_meses, ultimos_6_meses, ano_atual
  const [dados, setDados] = useState({
    transacoes: [],
    categorias: [],
    contas: []
  })
  const [resumo, setResumo] = useState({
    totalReceitas: 0,
    totalDespesas: 0,
    saldo: 0,
    receitasBanco: 0,
    receitasDinheiro: 0,
    despesasBanco: 0,
    despesasDinheiro: 0
  })
  const [categoriasExpandidas, setCategoriasExpandidas] = useState({})
  
  // Estados para Relatório de Cartões
  const [cartoes, setCartoes] = useState([])
  const [cartaoSelecionado, setCartaoSelecionado] = useState(null)
  const [faturaAberta, setFaturaAberta] = useState(null)
  const [dadosCartaoCategorizados, setDadosCartaoCategorizados] = useState([])
  const [loadingCartao, setLoadingCartao] = useState(false)

  const COLORS = [
    '#667eea', '#48bb78', '#f56565', '#ed8936', '#38b2ac',
    '#9f7aea', '#4299e1', '#f687b3', '#ecc94b', '#fc8181'
  ]

  useEffect(() => {
    if (user) {
      carregarDados()
    }
  }, [user, periodo])

  const getDataRange = () => {
    const hoje = new Date()
    let dataInicio, dataFim

    switch (periodo) {
      case 'mes_atual':
        dataInicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
        dataFim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0)
        break
      case 'ultimos_3_meses':
        dataInicio = new Date(hoje.getFullYear(), hoje.getMonth() - 2, 1)
        dataFim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0)
        break
      case 'ultimos_6_meses':
        dataInicio = new Date(hoje.getFullYear(), hoje.getMonth() - 5, 1)
        dataFim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0)
        break
      case 'ano_atual':
        dataInicio = new Date(hoje.getFullYear(), 0, 1)
        dataFim = new Date(hoje.getFullYear(), 11, 31)
        break
      default:
        dataInicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
        dataFim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0)
    }

    return {
      inicio: dataInicio.toISOString().split('T')[0],
      fim: dataFim.toISOString().split('T')[0]
    }
  }

  const carregarDados = async () => {
    try {
      setLoading(true)
      const { inicio, fim } = getDataRange()

      // Carregar transações do período
      const { data: transacoesData } = await supabase
        .from('transacoes')
        .select(`
          *,
          categorias(nome, cor, icone, tipo),
          subcategorias(nome),
          contas_bancarias(nome, cor)
        `)
        .eq('user_id', user.id)
        .eq('pago', true)
        .gte('data_transacao', inicio)
        .lte('data_transacao', fim)
        .order('data_transacao', { ascending: true })

      // Carregar categorias
      const { data: categoriasData } = await supabase
        .from('categorias')
        .select('*')
        .eq('user_id', user.id)
        .eq('ativo', true)

      // Carregar contas
      const { data: contasData } = await supabase
        .from('contas_bancarias')
        .select('*')
        .eq('user_id', user.id)
        .eq('ativo', true)

      const transacoes = transacoesData || []

      // Calcular resumo (EXCLUINDO TRANSFERÊNCIAS)
      const receitas = transacoes.filter(t => t.tipo === 'receita' && !t.is_transferencia)
      const despesas = transacoes.filter(t => t.tipo === 'despesa' && !t.is_transferencia)

      const totalReceitas = receitas.reduce((acc, t) => acc + t.valor, 0)
      const totalDespesas = despesas.reduce((acc, t) => acc + t.valor, 0)

      const receitasBanco = receitas.filter(t => t.conta_id).reduce((acc, t) => acc + t.valor, 0)
      const receitasDinheiro = receitas.filter(t => !t.conta_id).reduce((acc, t) => acc + t.valor, 0)
      const despesasBanco = despesas.filter(t => t.conta_id).reduce((acc, t) => acc + t.valor, 0)
      const despesasDinheiro = despesas.filter(t => !t.conta_id).reduce((acc, t) => acc + t.valor, 0)

      setDados({
        transacoes,
        categorias: categoriasData || [],
        contas: contasData || []
      })

      setResumo({
        totalReceitas,
        totalDespesas,
        saldo: totalReceitas - totalDespesas,
        receitasBanco,
        receitasDinheiro,
        despesasBanco,
        despesasDinheiro
      })
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    } finally {
      setLoading(false)
    }
  }

  // ========== FUNÇÕES PARA RELATÓRIO DE CARTÕES ==========
  useEffect(() => {
    if (user && abaAtiva === 'cartoes') {
      carregarCartoes()
    }
  }, [user, abaAtiva])

  useEffect(() => {
    if (cartaoSelecionado) {
      carregarDadosCartao()
    }
  }, [cartaoSelecionado])

  const carregarCartoes = async () => {
    try {
      const { data, error } = await supabase
        .from('cartoes_credito')
        .select('*')
        .eq('user_id', user.id)
        .order('nome')

      if (error) throw error
      setCartoes(data || [])
      if (data && data.length > 0) {
        setCartaoSelecionado(data[0].id)
      }
    } catch (error) {
      console.error('Erro ao carregar cartões:', error)
    }
  }

  const carregarDadosCartao = async () => {
    try {
      setLoadingCartao(true)

      // Buscar fatura aberta
      const { data: faturaData, error: faturaError } = await supabase
        .from('faturas_cartao')
        .select('*')
        .eq('cartao_id', cartaoSelecionado)
        .eq('status', 'aberta')
        .single()

      if (faturaError && faturaError.code !== 'PGRST116') throw faturaError

      setFaturaAberta(faturaData)

      if (!faturaData) {
        setDadosCartaoCategorizados([])
        setLoadingCartao(false)
        return
      }

      // Buscar lançamentos com categorias
      const { data: lancamentosData, error: lancamentosError } = await supabase
        .from('lancamentos_cartao')
        .select(`
          *,
          categorias(id, nome, icone, cor, tipo),
          subcategorias(id, nome)
        `)
        .eq('fatura_id', faturaData.id)

      if (lancamentosError) throw lancamentosError

      // Filtrar apenas despesas
      const lancamentosDespesas = lancamentosData.filter(l => l.categorias?.tipo === 'despesa')

      // Agrupar por categoria e subcategoria
      const agrupado = {}

      lancamentosDespesas.forEach(lanc => {
        const catId = lanc.categoria_id
        const catNome = lanc.categorias.nome
        const catIcone = lanc.categorias.icone
        const catCor = lanc.categorias.cor

        if (!agrupado[catId]) {
          agrupado[catId] = {
            id: catId,
            nome: catNome,
            icone: catIcone,
            cor: catCor,
            total: 0,
            subcategorias: {}
          }
        }

        agrupado[catId].total += parseFloat(lanc.valor || 0)

        const subId = lanc.subcategoria_id || 'sem_sub'
        const subNome = lanc.subcategorias?.nome || 'Sem subcategoria'

        if (!agrupado[catId].subcategorias[subId]) {
          agrupado[catId].subcategorias[subId] = {
            id: subId,
            nome: subNome,
            total: 0,
            lancamentos: []
          }
        }

        agrupado[catId].subcategorias[subId].total += parseFloat(lanc.valor || 0)
        agrupado[catId].subcategorias[subId].lancamentos.push(lanc)
      })

      // Converter para array e ordenar
      const categorias = Object.values(agrupado)
        .map(cat => ({
          ...cat,
          subcategorias: Object.values(cat.subcategorias).sort((a, b) => b.total - a.total)
        }))
        .sort((a, b) => b.total - a.total)

      setDadosCartaoCategorizados(categorias)
    } catch (error) {
      console.error('Erro ao carregar dados do cartão:', error)
    } finally {
      setLoadingCartao(false)
    }
  }

  const toggleCategoriaCartao = (categoriaId) => {
    setCategoriasExpandidas(prev => ({
      ...prev,
      [categoriaId]: !prev[categoriaId]
    }))
  }

  const getMesNome = (mes) => {
    const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
                   'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
    return meses[mes - 1]
  }
  // ========== FIM FUNÇÕES CARTÕES ==========

  // Dados para gráfico de pizza - Despesas por Categoria
  const getDadosPizzaCategorias = () => {
    const despesas = dados.transacoes.filter(t => t.tipo === 'despesa' && !t.is_transferencia)
    const categoriasSoma = {}

    despesas.forEach(t => {
      const catNome = t.categorias?.nome || 'Sem categoria'
      if (!categoriasSoma[catNome]) {
        categoriasSoma[catNome] = 0
      }
      categoriasSoma[catNome] += t.valor
    })

    return Object.entries(categoriasSoma)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
  }

  // Processar despesas por categoria e subcategoria
  const getDespesasPorCategoriaSubcategoria = () => {
    const despesas = dados.transacoes.filter(t => t.tipo === 'despesa' && !t.is_transferencia)
    const categorias = {}

    despesas.forEach(t => {
      const catNome = t.categorias?.nome || 'Sem categoria'
      const catCor = t.categorias?.cor || '#999'
      const catIcone = t.categorias?.icone || '📦'
      const subNome = t.subcategorias?.nome || 'Sem subcategoria'

      if (!categorias[catNome]) {
        categorias[catNome] = {
          nome: catNome,
          cor: catCor,
          icone: catIcone,
          total: 0,
          subcategorias: {}
        }
      }

      categorias[catNome].total += t.valor

      if (!categorias[catNome].subcategorias[subNome]) {
        categorias[catNome].subcategorias[subNome] = 0
      }
      categorias[catNome].subcategorias[subNome] += t.valor
    })

    // Converter para array e ordenar
    return Object.values(categorias)
      .map(cat => ({
        ...cat,
        subcategorias: Object.entries(cat.subcategorias)
          .map(([nome, valor]) => ({ nome, valor }))
          .sort((a, b) => b.valor - a.valor)
      }))
      .sort((a, b) => b.total - a.total)
  }

  // Processar receitas por categoria e subcategoria
  const getReceitasPorCategoriaSubcategoria = () => {
    const receitas = dados.transacoes.filter(t => t.tipo === 'receita' && !t.is_transferencia)
    const categorias = {}

    receitas.forEach(t => {
      const catNome = t.categorias?.nome || 'Sem categoria'
      const catCor = t.categorias?.cor || '#48bb78'
      const catIcone = t.categorias?.icone || '💰'
      const subNome = t.subcategorias?.nome || 'Sem subcategoria'

      if (!categorias[catNome]) {
        categorias[catNome] = {
          nome: catNome,
          cor: catCor,
          icone: catIcone,
          total: 0,
          subcategorias: {}
        }
      }

      categorias[catNome].total += t.valor

      if (!categorias[catNome].subcategorias[subNome]) {
        categorias[catNome].subcategorias[subNome] = 0
      }
      categorias[catNome].subcategorias[subNome] += t.valor
    })

    // Converter para array e ordenar
    return Object.values(categorias)
      .map(cat => ({
        ...cat,
        subcategorias: Object.entries(cat.subcategorias)
          .map(([nome, valor]) => ({ nome, valor }))
          .sort((a, b) => b.valor - a.valor)
      }))
      .sort((a, b) => b.total - a.total)
  }

  // Toggle expansão de categoria
  const toggleCategoria = (tipo, catNome) => {
    const key = `${tipo}-${catNome}`
    setCategoriasExpandidas(prev => ({
      ...prev,
      [key]: !prev[key]
    }))
  }

  // Dados para gráfico de barras - Receitas vs Despesas por Mês
  const getDadosBarrasMensal = () => {
    const meses = {}
    
    dados.transacoes
      .filter(t => !t.is_transferencia) // EXCLUIR TRANSFERÊNCIAS
      .forEach(t => {
        const data = new Date(t.data_transacao + 'T00:00:00')
        const mesAno = data.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
        
        if (!meses[mesAno]) {
          meses[mesAno] = { mes: mesAno, receitas: 0, despesas: 0 }
        }

        if (t.tipo === 'receita') {
          meses[mesAno].receitas += t.valor
        } else {
          meses[mesAno].despesas += t.valor
        }
      })

    return Object.values(meses)
  }

  // Dados para gráfico de linha - Evolução do Saldo
  const getDadosLinhaEvolucao = () => {
    const dadosMensais = getDadosBarrasMensal()
    let saldoAcumulado = 0

    return dadosMensais.map(item => {
      saldoAcumulado += (item.receitas - item.despesas)
      return {
        mes: item.mes,
        saldo: saldoAcumulado
      }
    })
  }

  // Dados para gráfico de pizza - Banco vs Dinheiro
  const getDadosPizzaFormaPagamento = () => {
    return [
      { name: 'Banco (Receitas)', value: resumo.receitasBanco, color: '#48bb78' },
      { name: 'Dinheiro (Receitas)', value: resumo.receitasDinheiro, color: '#38b2ac' },
      { name: 'Banco (Despesas)', value: resumo.despesasBanco, color: '#f56565' },
      { name: 'Dinheiro (Despesas)', value: resumo.despesasDinheiro, color: '#ed8936' }
    ].filter(item => item.value > 0)
  }

  // Dados para gráfico de barras - Top 10 Transações
  const getTop10Transacoes = () => {
    return [...dados.transacoes]
      .filter(t => t.tipo === 'despesa' && !t.is_transferencia)
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 10)
      .map(t => ({
        descricao: t.descricao.length > 20 ? t.descricao.substring(0, 20) + '...' : t.descricao,
        valor: t.valor,
        categoria: t.categorias?.nome || 'Sem categoria'
      }))
  }

  // Despesas agrupadas por subcategoria
  const getDespesasPorSubcategoria = () => {
    const despesas = dados.transacoes.filter(t => t.tipo === 'despesa' && !t.is_transferencia)
    
    const agrupado = despesas.reduce((acc, t) => {
      // Se tem subcategoria, usa ela. Senão usa a categoria
      const subKey = t.subcategorias?.nome || t.categorias?.nome || 'Sem categoria'
      const catNome = t.categorias?.nome || 'Sem categoria'
      
      if (!acc[subKey]) {
        acc[subKey] = {
          nome: subKey,
          categoriaNome: catNome,
          valor: 0
        }
      }
      acc[subKey].valor += t.valor
      return acc
    }, {})

    return Object.values(agrupado)
      .sort((a, b) => b.valor - a.valor)
  }

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const exportarCSV = () => {
    const csv = [
      ['Data', 'Tipo', 'Descrição', 'Categoria', 'Valor', 'Conta', 'Forma'],
      ...dados.transacoes.map(t => [
        t.data_transacao,
        t.tipo,
        t.descricao,
        t.categorias?.nome || 'Sem categoria',
        t.valor,
        t.contas_bancarias?.nome || 'Dinheiro',
        t.conta_id ? 'Banco' : 'Dinheiro'
      ])
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `relatorio_${periodo}_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading">Carregando relatórios...</div>
      </div>
    )
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Relatórios</h1>
          <p>Análise detalhada das suas finanças</p>
        </div>
        <div className="header-actions">
          <button className="btn-secondary" onClick={exportarCSV}>
            <Download size={20} />
            Exportar CSV
          </button>
        </div>
      </div>

      {/* Abas */}
      <div className="relatorio-tabs">
        <button 
          className={`tab-btn ${abaAtiva === 'transacoes' ? 'active' : ''}`}
          onClick={() => setAbaAtiva('transacoes')}
        >
          <BarChart3 size={20} />
          Transações Bancárias
        </button>
        <button 
          className={`tab-btn ${abaAtiva === 'cartoes' ? 'active' : ''}`}
          onClick={() => setAbaAtiva('cartoes')}
        >
          <CreditCard size={20} />
          Faturas de Cartão
        </button>
      </div>

      {/* Filtro de Período - Apenas para transações */}
      {abaAtiva === 'transacoes' && (
        <div className="filtro-periodo">
        <Filter size={20} />
        <select value={periodo} onChange={(e) => setPeriodo(e.target.value)}>
          <option value="mes_atual">Mês Atual</option>
          <option value="ultimos_3_meses">Últimos 3 Meses</option>
          <option value="ultimos_6_meses">Últimos 6 Meses</option>
          <option value="ano_atual">Ano Atual</option>
        </select>
      </div>
      )}

      {/* Conteúdo - Transações */}
      {abaAtiva === 'transacoes' && (
        <>
      {/* Cards de Resumo */}
      <div className="resumo-cards">
        <div className="resumo-card card-receita">
          <TrendingUp size={32} />
          <div className="resumo-info">
            <span className="resumo-label">Total Receitas</span>
            <span className="resumo-valor">{formatCurrency(resumo.totalReceitas)}</span>
            <span className="resumo-detalhe">
              Banco: {formatCurrency(resumo.receitasBanco)} | 
              Dinheiro: {formatCurrency(resumo.receitasDinheiro)}
            </span>
          </div>
        </div>

        <div className="resumo-card card-despesa">
          <TrendingDown size={32} />
          <div className="resumo-info">
            <span className="resumo-label">Total Despesas</span>
            <span className="resumo-valor">{formatCurrency(resumo.totalDespesas)}</span>
            <span className="resumo-detalhe">
              Banco: {formatCurrency(resumo.despesasBanco)} | 
              Dinheiro: {formatCurrency(resumo.despesasDinheiro)}
            </span>
          </div>
        </div>

        <div className={`resumo-card ${resumo.saldo >= 0 ? 'card-saldo-positivo' : 'card-saldo-negativo'}`}>
          <Calendar size={32} />
          <div className="resumo-info">
            <span className="resumo-label">Saldo do Período</span>
            <span className="resumo-valor">{formatCurrency(resumo.saldo)}</span>
            <span className="resumo-detalhe">
              {resumo.saldo >= 0 ? 'Superávit' : 'Déficit'}
            </span>
          </div>
        </div>
      </div>

      {/* Gráficos */}
      <div className="graficos-grid">

        {/* Categorias e Subcategorias - Despesas e Receitas */}
        <div className="categorias-container categorias-destaque">
          {/* Despesas */}
          <div className="categorias-card">
            <div className="categorias-header">
              <h3>
                <TrendingDown size={20} />
                Despesas por Categoria
              </h3>
              <span className="categorias-total despesas">
                {formatCurrency(resumo.totalDespesas)}
              </span>
            </div>
            <div className="categorias-content">
              {getDespesasPorCategoriaSubcategoria().length === 0 ? (
                <div className="categorias-empty">Nenhuma despesa no período</div>
              ) : (
                getDespesasPorCategoriaSubcategoria().map((cat, index) => {
                  const key = `despesa-${cat.nome}`
                  const isExpanded = categoriasExpandidas[key]
                  
                  return (
                    <div key={index} className="categoria-group">
                      <div 
                        className="categoria-header-item"
                        onClick={() => toggleCategoria('despesa', cat.nome)}
                      >
                        <div className="categoria-info-item">
                          <span className="categoria-toggle">{isExpanded ? '▼' : '▶'}</span>
                          <div 
                            className="categoria-icon-box"
                            style={{ backgroundColor: cat.cor }}
                          >
                            {cat.icone}
                          </div>
                          <span className="categoria-nome-item">{cat.nome}</span>
                          <span className="categoria-count">({cat.subcategorias.length})</span>
                        </div>
                        <span className="categoria-valor-item">
                          {formatCurrency(cat.total)}
                        </span>
                      </div>
                      
                      {isExpanded && (
                        <div className="subcategorias-expandidas">
                          {cat.subcategorias.map((sub, subIndex) => (
                            <div key={subIndex} className="subcategoria-row">
                              <span className="subcategoria-nome-item">{sub.nome}</span>
                              <span className="subcategoria-valor-item">
                                {formatCurrency(sub.valor)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* Receitas */}
          <div className="categorias-card">
            <div className="categorias-header">
              <h3>
                <TrendingUp size={20} />
                Receitas por Categoria
              </h3>
              <span className="categorias-total receitas">
                {formatCurrency(resumo.totalReceitas)}
              </span>
            </div>
            <div className="categorias-content">
              {getReceitasPorCategoriaSubcategoria().length === 0 ? (
                <div className="categorias-empty">Nenhuma receita no período</div>
              ) : (
                getReceitasPorCategoriaSubcategoria().map((cat, index) => {
                  const key = `receita-${cat.nome}`
                  const isExpanded = categoriasExpandidas[key]
                  
                  return (
                    <div key={index} className="categoria-group">
                      <div 
                        className="categoria-header-item"
                        onClick={() => toggleCategoria('receita', cat.nome)}
                      >
                        <div className="categoria-info-item">
                          <span className="categoria-toggle">{isExpanded ? '▼' : '▶'}</span>
                          <div 
                            className="categoria-icon-box"
                            style={{ backgroundColor: cat.cor }}
                          >
                            {cat.icone}
                          </div>
                          <span className="categoria-nome-item">{cat.nome}</span>
                          <span className="categoria-count">({cat.subcategorias.length})</span>
                        </div>
                        <span className="categoria-valor-item receita-valor">
                          {formatCurrency(cat.total)}
                        </span>
                      </div>
                      
                      {isExpanded && (
                        <div className="subcategorias-expandidas">
                          {cat.subcategorias.map((sub, subIndex) => (
                            <div key={subIndex} className="subcategoria-row">
                              <span className="subcategoria-nome-item">{sub.nome}</span>
                              <span className="subcategoria-valor-item receita-valor">
                                {formatCurrency(sub.valor)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>

        {/* Comparação Receitas vs Despesas - Gráfico Vertical Bonito */}
        <div className="grafico-card">
          <div className="grafico-header">
            <h3>
              <BarChart3 size={20} />
              Comparação: Receitas vs Despesas
            </h3>
          </div>
          <div className="grafico-content">
            <ResponsiveContainer width="100%" height={400}>
              <BarChart 
                data={[
                  { categoria: 'Receitas', valor: resumo.totalReceitas, fill: '#48bb78' },
                  { categoria: 'Despesas', valor: resumo.totalDespesas, fill: '#f56565' }
                ]}
                margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="categoria" 
                  tick={{ fill: '#666', fontSize: 14, fontWeight: 600 }}
                  axisLine={{ stroke: '#e0e0e0' }}
                />
                <YAxis 
                  tick={{ fill: '#666', fontSize: 12 }}
                  axisLine={{ stroke: '#e0e0e0' }}
                  tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip 
                  formatter={(value) => formatCurrency(value)}
                  contentStyle={{ 
                    background: 'white', 
                    border: '2px solid #e0e0e0', 
                    borderRadius: '12px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                  }}
                  labelStyle={{ fontWeight: 700, color: '#333', marginBottom: 8 }}
                />
                <Bar 
                  dataKey="valor" 
                  fill="#8884d8" 
                  radius={[12, 12, 0, 0]}
                  maxBarSize={150}
                >
                  {[
                    { categoria: 'Receitas', valor: resumo.totalReceitas, fill: '#48bb78' },
                    { categoria: 'Despesas', valor: resumo.totalDespesas, fill: '#f56565' }
                  ].map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Despesas por Subcategoria */}
        <div className="grafico-card">
          <div className="grafico-header">
            <div className="header-left">
              <h3>
                <BarChart3 size={20} />
                Despesas por Subcategoria
              </h3>
            </div>
            <div className="header-right">
              <div className="total-despesas-badge">
                <span className="total-label">Total:</span>
                <span className="total-valor-badge">{formatCurrency(resumo.totalDespesas)}</span>
              </div>
              <select 
                value={periodo}
                onChange={(e) => setPeriodo(e.target.value)}
                className="filtro-periodo-small"
              >
                <option value="mes_atual">Mês Atual</option>
                <option value="ultimos_3_meses">Últimos 3 Meses</option>
                <option value="ultimos_6_meses">Últimos 6 Meses</option>
                <option value="ano_atual">Ano Atual</option>
              </select>
            </div>
          </div>
          <div className="grafico-content">
            {getDespesasPorSubcategoria().length === 0 ? (
              <div className="grafico-empty">Nenhuma despesa no período</div>
            ) : (
              <div style={{ width: '100%', height: '500px', overflowY: 'auto', overflowX: 'hidden' }}>
                <ResponsiveContainer width="100%" height={Math.max(500, getDespesasPorSubcategoria().length * 40)}>
                  <BarChart
                    data={getDespesasPorSubcategoria()}
                    layout="vertical"
                    margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                  >
                    <defs>
                      <linearGradient id="colorDespesas" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#f56565" />
                        <stop offset="100%" stopColor="#fc8181" />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={true} vertical={false} />
                    <XAxis
                      type="number"
                      tick={{ fill: '#666', fontSize: 12 }}
                      axisLine={{ stroke: '#e0e0e0' }}
                      tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
                    />
                    <YAxis
                      type="category"
                      dataKey="nome"
                      width={180}
                      tick={{ fill: '#333', fontSize: 13, fontWeight: 600 }}
                      axisLine={{ stroke: '#e0e0e0' }}
                    />
                    <Tooltip
                      formatter={(value) => formatCurrency(value)}
                      contentStyle={{
                        background: 'white',
                        border: '2px solid #f56565',
                        borderRadius: '12px',
                        boxShadow: '0 4px 12px rgba(245, 101, 101, 0.2)'
                      }}
                      labelStyle={{ fontWeight: 700, color: '#333', marginBottom: 8 }}
                    />
                    <Bar
                      dataKey="valor"
                      fill="url(#colorDespesas)"
                      radius={[0, 8, 8, 0]}
                      maxBarSize={30}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      </div>
        </>
      )}

      {/* Conteúdo - Cartões */}
      {abaAtiva === 'cartoes' && (
        <div className="relatorio-cartoes-container">
          {/* Seletor de Cartão */}
          {cartoes.length > 0 && (
            <div className="cartao-selector-relatorio">
              {cartoes.map(cartao => (
                <button
                  key={cartao.id}
                  className={`cartao-btn-relatorio ${cartaoSelecionado === cartao.id ? 'active' : ''}`}
                  onClick={() => setCartaoSelecionado(cartao.id)}
                >
                  <CreditCard size={20} />
                  <span>{cartao.nome}</span>
                </button>
              ))}
            </div>
          )}

          {/* Header com Info do Cartão */}
          {cartoes.find(c => c.id === cartaoSelecionado) && faturaAberta && (
            <div className="relatorio-header-card">
              <div className="header-info-cartao">
                <div className="cartao-info-section">
                  <CreditCard size={32} />
                  <div>
                    <h2>{cartoes.find(c => c.id === cartaoSelecionado).nome}</h2>
                    <p className="cartao-bandeira">{cartoes.find(c => c.id === cartaoSelecionado).bandeira}</p>
                  </div>
                </div>
                <div className="fatura-info-section">
                  <div className="info-item-cartao">
                    <Calendar size={20} />
                    <div>
                      <span className="label">Fatura</span>
                      <span className="value">
                        {getMesNome(faturaAberta.mes_referencia)}/{faturaAberta.ano_referencia}
                      </span>
                    </div>
                  </div>
                  <div className="info-item-cartao">
                    <TrendingDown size={20} />
                    <div>
                      <span className="label">Total Gasto</span>
                      <span className="value total">
                        {valoresVisiveis ? formatCurrency(dadosCartaoCategorizados.reduce((sum, cat) => sum + cat.total, 0)) : '••••••'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Conteúdo */}
          {loadingCartao ? (
            <div className="loading-state">Carregando dados...</div>
          ) : !faturaAberta ? (
            <div className="empty-state-cartao">
              <CreditCard size={48} />
              <p>Nenhuma fatura aberta para este cartão</p>
            </div>
          ) : dadosCartaoCategorizados.length === 0 ? (
            <div className="empty-state-cartao">
              <TrendingDown size={48} />
              <p>Nenhum lançamento nesta fatura</p>
            </div>
          ) : (
            <div className="relatorio-content-cartao">
              <div className="categorias-scroll-container">
                {dadosCartaoCategorizados.map(categoria => {
                  const isExpanded = categoriasExpandidas[categoria.id]
                  const totalFatura = dadosCartaoCategorizados.reduce((sum, cat) => sum + cat.total, 0)
                  const percentual = (categoria.total / totalFatura) * 100

                  return (
                    <div key={categoria.id} className="categoria-grupo-cartao">
                      <div 
                        className="categoria-header-cartao"
                        onClick={() => toggleCategoriaCartao(categoria.id)}
                      >
                        <div className="categoria-left-cartao">
                          <button className="expand-btn">
                            {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                          </button>
                          <div 
                            className="categoria-icon-cartao"
                            style={{ backgroundColor: categoria.cor }}
                          >
                            {categoria.icone}
                          </div>
                          <div className="categoria-info-cartao">
                            <span className="categoria-nome-cartao">{categoria.nome}</span>
                            <span className="categoria-percentual-cartao">{percentual.toFixed(1)}% do total</span>
                          </div>
                        </div>
                        <span className="categoria-total-cartao">
                          {valoresVisiveis ? formatCurrency(categoria.total) : '••••••'}
                        </span>
                      </div>

                      {isExpanded && (
                        <div className="subcategorias-container-cartao">
                          {categoria.subcategorias.map(sub => {
                            const subPercentual = (sub.total / categoria.total) * 100

                            return (
                              <div key={sub.id} className="subcategoria-item-cartao">
                                <div className="subcategoria-header-cartao">
                                  <div className="subcategoria-info-cartao">
                                    <span className="subcategoria-nome-cartao">{sub.nome}</span>
                                    <span className="subcategoria-count-cartao">
                                      {sub.lancamentos.length} lançamento{sub.lancamentos.length !== 1 ? 's' : ''}
                                    </span>
                                  </div>
                                  <div className="subcategoria-valores-cartao">
                                    <span className="subcategoria-percentual-cartao">
                                      {subPercentual.toFixed(1)}%
                                    </span>
                                    <span className="subcategoria-total-cartao">
                                      {valoresVisiveis ? formatCurrency(sub.total) : '••••••'}
                                    </span>
                                  </div>
                                </div>
                                
                                <div className="lancamentos-lista-cartao">
                                  {sub.lancamentos.map(lanc => (
                                    <div key={lanc.id} className="lancamento-mini-cartao">
                                      <span className="lancamento-descricao-cartao">{lanc.descricao}</span>
                                      <span className="lancamento-valor-cartao">
                                        {valoresVisiveis ? formatCurrency(lanc.valor) : '••••••'}
                                      </span>
                                    </div>
                                  ))}
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
            </div>
          )}
        </div>
      )}
    </div>
  )
}
