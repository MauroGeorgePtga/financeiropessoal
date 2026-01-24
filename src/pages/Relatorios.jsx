import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { 
  Calendar,
  TrendingUp,
  TrendingDown,
  PieChart as PieChartIcon,
  BarChart3,
  Download,
  Filter
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
  const [loading, setLoading] = useState(true)
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

      {/* Filtro de Período */}
      <div className="filtro-periodo">
        <Filter size={20} />
        <select value={periodo} onChange={(e) => setPeriodo(e.target.value)}>
          <option value="mes_atual">Mês Atual</option>
          <option value="ultimos_3_meses">Últimos 3 Meses</option>
          <option value="ultimos_6_meses">Últimos 6 Meses</option>
          <option value="ano_atual">Ano Atual</option>
        </select>
      </div>

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
              <>
               





                
                <div className="subcategorias-list-scroll">
                  <div className="subcategorias-list">
                    {getDespesasPorSubcategoria().map((item, index) => {
                      const percentual = resumo.totalDespesas > 0 
                        ? (item.valor / resumo.totalDespesas) * 100 
                        : 0
                      
                      return (
                        <div key={index} className="subcategoria-item">
                          <div className="subcategoria-info">
                            <span className="subcategoria-nome">{item.nome}</span>
                            <span className="subcategoria-categoria-parent">{item.categoriaNome}</span>
                          </div>
                          <div className="subcategoria-valores">
                            <span className="subcategoria-valor">{formatCurrency(item.valor)}</span>
                            <div className="subcategoria-barra-container">
                              <div 
                                className="subcategoria-barra"
                                style={{ width: `${percentual}%` }}
                              ></div>
                            </div>
                            <span className="subcategoria-percentual">{percentual.toFixed(1)}%</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
