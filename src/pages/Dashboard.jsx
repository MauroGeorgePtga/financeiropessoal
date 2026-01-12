import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Link } from 'react-router-dom'
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet,
  Calendar,
  AlertCircle,
  CheckCircle,
  Clock,
  ArrowUpCircle,
  ArrowDownCircle,
  Landmark,
  Banknote
} from 'lucide-react'
import './Dashboard.css'

export default function Dashboard() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [dados, setDados] = useState({
    contas: [],
    transacoes: [],
    categorias: [],
    totalContas: 0,
    saldoTotal: 0,
    saldoPositivo: 0,
    saldoNegativo: 0,
    // Receitas
    receitasMes: 0,
    receitasBanco: 0,
    receitasDinheiro: 0,
    // Despesas
    despesasMes: 0,
    despesasBanco: 0,
    despesasDinheiro: 0,
    // Saldo
    saldoMes: 0,
    transacoesPendentes: 0,
    valorPendente: 0,
    proximosVencimentos: []
  })

  const [investimentos, setInvestimentos] = useState({
    totalInvestido: 0,
    valorAtual: 0,
    rentabilidade: 0,
    qtdAtivos: 0
  })
  const [loadingInvestimentos, setLoadingInvestimentos] = useState(true)
  const [anoSelecionado, setAnoSelecionado] = useState(new Date().getFullYear())
  
  // Filtros para análise de categorias
  const [filtroReceitasPor, setFiltroReceitasPor] = useState('categoria') // 'categoria' ou 'subcategoria'
  const [filtroReceitasMes, setFiltroReceitasMes] = useState(new Date().getMonth() + 1)
  const [filtroReceitasAno, setFiltroReceitasAno] = useState(new Date().getFullYear())
  
  const [filtroDespesasPor, setFiltroDespesasPor] = useState('categoria')
  const [filtroDespesasMes, setFiltroDespesasMes] = useState(new Date().getMonth() + 1)
  const [filtroDespesasAno, setFiltroDespesasAno] = useState(new Date().getFullYear())

  useEffect(() => {
    if (user) {
      carregarDados()
      carregarInvestimentos()
    }
  }, [user])

  const carregarInvestimentos = async () => {
    try {
      setLoadingInvestimentos(true)
      
      // Buscar operações
      const { data: operacoes, error: opError } = await supabase
        .from('investimentos_operacoes')
        .select('*')
        .eq('user_id', user.id)

      if (opError) throw opError

      // Buscar cotações
      const { data: cotacoes, error: cotError } = await supabase
        .from('investimentos_cotacoes')
        .select('*')
        .eq('user_id', user.id)

      if (cotError) throw cotError

      // Calcular carteira
      const carteira = {}
      
      operacoes?.forEach(op => {
        if (!carteira[op.ticker]) {
          carteira[op.ticker] = {
            ticker: op.ticker,
            quantidade: 0,
            total_investido: 0
          }
        }

        const custoTotal = (op.taxa_corretagem || 0) + (op.emolumentos || 0) + (op.outros_custos || 0)

        if (op.tipo_operacao === 'compra') {
          carteira[op.ticker].quantidade += op.quantidade
          carteira[op.ticker].total_investido += (op.quantidade * op.preco_unitario) + custoTotal
        } else if (op.tipo_operacao === 'venda') {
          carteira[op.ticker].quantidade -= op.quantidade
          carteira[op.ticker].total_investido -= (op.quantidade * op.preco_unitario) - custoTotal
        }
      })

      // Calcular totais
      let totalInvestido = 0
      let valorAtual = 0
      let qtdAtivos = 0

      Object.keys(carteira).forEach(ticker => {
        if (carteira[ticker].quantidade > 0) {
          totalInvestido += carteira[ticker].total_investido
          qtdAtivos++

          const cotacao = cotacoes?.find(c => c.ticker === ticker)
          if (cotacao) {
            valorAtual += carteira[ticker].quantidade * cotacao.cotacao_atual
          }
        }
      })

      const rentabilidade = totalInvestido > 0 
        ? ((valorAtual - totalInvestido) / totalInvestido) * 100 
        : 0

      setInvestimentos({
        totalInvestido,
        valorAtual,
        rentabilidade,
        qtdAtivos
      })
    } catch (error) {
      console.error('Erro ao carregar investimentos:', error)
    } finally {
      setLoadingInvestimentos(false)
    }
  }

  const carregarDados = async () => {
    try {
      setLoading(true)

      // Data atual
      const hoje = new Date()
      const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().split('T')[0]
      const ultimoDiaMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).toISOString().split('T')[0]
      const daquiA7Dias = new Date(hoje.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

      // Carregar contas
      const { data: contasData } = await supabase
        .from('contas_bancarias')
        .select('*')
        .eq('user_id', user.id)
        .eq('ativo', true)

      // Carregar transações
      const { data: transacoesData } = await supabase
        .from('transacoes')
        .select(`
          *,
          contas_bancarias(nome, cor),
          categorias(nome, cor, icone)
        `)
        .eq('user_id', user.id)

      // Carregar categorias
      const { data: categoriasData } = await supabase
        .from('categorias')
        .select('*')
        .eq('user_id', user.id)
        .eq('ativo', true)

      const contas = contasData || []
      const transacoes = transacoesData || []
      const categorias = categoriasData || []

      // Calcular saldos das contas (positivos e negativos separados)
      const saldoPositivo = contas
        .filter(conta => (conta.saldo_atual || 0) > 0)
        .reduce((acc, conta) => acc + conta.saldo_atual, 0)
      
      const saldoNegativo = contas
        .filter(conta => (conta.saldo_atual || 0) < 0)
        .reduce((acc, conta) => acc + conta.saldo_atual, 0)
      
      const saldoTotal = contas.reduce((acc, conta) => acc + (conta.saldo_atual || 0), 0)

      // Transações do mês atual PAGAS (excluindo transferências)
      const transacoesMes = transacoes.filter(t => 
        t.data_transacao >= primeiroDiaMes && 
        t.data_transacao <= ultimoDiaMes &&
        t.pago &&
        !t.is_transferencia  // EXCLUIR TRANSFERÊNCIAS
      )

      // RECEITAS do mês (sem transferências)
      const receitasMes = transacoesMes.filter(t => t.tipo === 'receita')
      const receitasBanco = receitasMes
        .filter(t => t.conta_id !== null)
        .reduce((acc, t) => acc + t.valor, 0)
      const receitasDinheiro = receitasMes
        .filter(t => t.conta_id === null)
        .reduce((acc, t) => acc + t.valor, 0)
      const receitasTotal = receitasBanco + receitasDinheiro

      // DESPESAS do mês (sem transferências)
      const despesasMes = transacoesMes.filter(t => t.tipo === 'despesa')
      const despesasBanco = despesasMes
        .filter(t => t.conta_id !== null)
        .reduce((acc, t) => acc + t.valor, 0)
      const despesasDinheiro = despesasMes
        .filter(t => t.conta_id === null)
        .reduce((acc, t) => acc + t.valor, 0)
      const despesasTotal = despesasBanco + despesasDinheiro

      const saldoMes = receitasTotal - despesasTotal

      // Transações pendentes (excluindo transferências)
      const pendentes = transacoes.filter(t => !t.pago && !t.is_transferencia)
      const transacoesPendentes = pendentes.length
      const valorPendente = pendentes.reduce((acc, t) => {
        return acc + (t.tipo === 'receita' ? t.valor : -t.valor)
      }, 0)

      // Próximos vencimentos (7 dias) - excluindo transferências
      const proximosVencimentos = transacoes
        .filter(t => 
          !t.pago && 
          !t.is_transferencia &&  // EXCLUIR TRANSFERÊNCIAS
          t.data_vencimento && 
          t.data_vencimento <= daquiA7Dias &&
          t.data_vencimento >= hoje.toISOString().split('T')[0]
        )
        .sort((a, b) => new Date(a.data_vencimento) - new Date(b.data_vencimento))
        .slice(0, 5)

      setDados({
        contas,
        transacoes,
        categorias,
        totalContas: contas.length,
        saldoTotal,
        saldoPositivo,      // NOVO
        saldoNegativo,      // NOVO
        receitasMes: receitasTotal,
        receitasBanco,
        receitasDinheiro,
        despesasMes: despesasTotal,
        despesasBanco,
        despesasDinheiro,
        saldoMes,
        transacoesPendentes,
        valorPendente,
        proximosVencimentos
      })
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    } finally {
      setLoading(false)
    }
  }

  // Top 5 categorias mais usadas no mês
  const topCategorias = () => {
    const hoje = new Date()
    const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().split('T')[0]
    const ultimoDiaMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).toISOString().split('T')[0]

    const transacoesMes = dados.transacoes.filter(t => 
      t.data_transacao >= primeiroDiaMes && 
      t.data_transacao <= ultimoDiaMes &&
      t.pago &&
      t.tipo === 'despesa' &&
      !t.is_transferencia  // EXCLUIR TRANSFERÊNCIAS
    )

    const categoriasSoma = {}
    transacoesMes.forEach(t => {
      const catNome = t.categorias?.nome || 'Sem categoria'
      if (!categoriasSoma[catNome]) {
        categoriasSoma[catNome] = {
          nome: catNome,
          valor: 0,
          cor: t.categorias?.cor || '#999',
          icone: t.categorias?.icone || '📦'
        }
      }
      categoriasSoma[catNome].valor += t.valor
    })

    return Object.values(categoriasSoma)
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 5)
  }

  // Obter anos disponíveis nas transações
  const getAnosDisponiveis = () => {
    const anos = new Set()
    dados.transacoes.forEach(t => {
      const ano = new Date(t.data_transacao).getFullYear()
      anos.add(ano)
    })
    return Array.from(anos).sort((a, b) => b - a) // Mais recente primeiro
  }

  // Calcular dados mensais do ano selecionado
  const calcularDadosMensais = () => {
    const meses = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ]

    return meses.map((nome, index) => {
      const mesNumero = index + 1
      const primeiroDia = `${anoSelecionado}-${String(mesNumero).padStart(2, '0')}-01`
      const ultimoDia = new Date(anoSelecionado, mesNumero, 0).toISOString().split('T')[0]

      const transacoesMes = dados.transacoes.filter(t =>
        t.data_transacao >= primeiroDia &&
        t.data_transacao <= ultimoDia &&
        t.pago &&
        !t.is_transferencia // SEM TRANSFERÊNCIAS
      )

      const receitas = transacoesMes
        .filter(t => t.tipo === 'receita')
        .reduce((acc, t) => acc + t.valor, 0)

      const despesas = transacoesMes
        .filter(t => t.tipo === 'despesa')
        .reduce((acc, t) => acc + t.valor, 0)

      const resultado = receitas - despesas

      return {
        mes: nome,
        receitas,
        despesas,
        resultado
      }
    })
  }

  const anosDisponiveis = getAnosDisponiveis()
  const dadosMensais = calcularDadosMensais()

  // Calcular receitas por categoria ou subcategoria
  const calcularReceitasPorCategoria = () => {
    const primeiroDia = `${filtroReceitasAno}-${String(filtroReceitasMes).padStart(2, '0')}-01`
    const ultimoDia = new Date(filtroReceitasAno, filtroReceitasMes, 0).toISOString().split('T')[0]

    const transacoesFiltradas = dados.transacoes.filter(t =>
      t.data_transacao >= primeiroDia &&
      t.data_transacao <= ultimoDia &&
      t.tipo === 'receita' &&
      t.pago &&
      !t.is_transferencia
    )

    const agrupamento = {}

    transacoesFiltradas.forEach(t => {
      let chave, nome

      if (filtroReceitasPor === 'categoria') {
        chave = t.categoria_id
        nome = t.categorias?.nome || 'Sem categoria'
      } else {
        chave = t.subcategoria_id || 'sem_subcategoria'
        nome = t.subcategorias?.nome || 'Sem subcategoria'
      }

      if (!agrupamento[chave]) {
        agrupamento[chave] = {
          nome,
          valor: 0,
          cor: t.categorias?.cor || '#999',
          icone: t.categorias?.icone || '📦'
        }
      }
      agrupamento[chave].valor += t.valor
    })

    return Object.values(agrupamento).sort((a, b) => b.valor - a.valor)
  }

  // Calcular despesas por categoria ou subcategoria
  const calcularDespesasPorCategoria = () => {
    const primeiroDia = `${filtroDespesasAno}-${String(filtroDespesasMes).padStart(2, '0')}-01`
    const ultimoDia = new Date(filtroDespesasAno, filtroDespesasMes, 0).toISOString().split('T')[0]

    const transacoesFiltradas = dados.transacoes.filter(t =>
      t.data_transacao >= primeiroDia &&
      t.data_transacao <= ultimoDia &&
      t.tipo === 'despesa' &&
      t.pago &&
      !t.is_transferencia
    )

    const agrupamento = {}

    transacoesFiltradas.forEach(t => {
      let chave, nome

      if (filtroDespesasPor === 'categoria') {
        chave = t.categoria_id
        nome = t.categorias?.nome || 'Sem categoria'
      } else {
        chave = t.subcategoria_id || 'sem_subcategoria'
        nome = t.subcategorias?.nome || 'Sem subcategoria'
      }

      if (!agrupamento[chave]) {
        agrupamento[chave] = {
          nome,
          valor: 0,
          cor: t.categorias?.cor || '#999',
          icone: t.categorias?.icone || '📦'
        }
      }
      agrupamento[chave].valor += t.valor
    })

    return Object.values(agrupamento).sort((a, b) => b.valor - a.valor)
  }

  const receitasPorCategoria = calcularReceitasPorCategoria()
  const despesasPorCategoria = calcularDespesasPorCategoria()
  const totalReceitas = receitasPorCategoria.reduce((acc, c) => acc + c.valor, 0)
  const totalDespesas = despesasPorCategoria.reduce((acc, c) => acc + c.valor, 0)

  const mesesOptions = [
    { value: 1, label: 'Janeiro' },
    { value: 2, label: 'Fevereiro' },
    { value: 3, label: 'Março' },
    { value: 4, label: 'Abril' },
    { value: 5, label: 'Maio' },
    { value: 6, label: 'Junho' },
    { value: 7, label: 'Julho' },
    { value: 8, label: 'Agosto' },
    { value: 9, label: 'Setembro' },
    { value: 10, label: 'Outubro' },
    { value: 11, label: 'Novembro' },
    { value: 12, label: 'Dezembro' }
  ]

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading">Carregando dashboard...</div>
      </div>
    )
  }

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const formatDate = (date) => {
    return new Date(date + 'T00:00:00').toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short'
    })
  }

  return (
    <div className="page-container">
      <div className="dashboard-header">
        <div>
          <h1>Dashboard</h1>
          <p>Visão geral das suas finanças</p>
        </div>
        <div className="dashboard-date">
          <Calendar size={20} />
          <span>{new Date().toLocaleDateString('pt-BR', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}</span>
        </div>
      </div>

      {/* Cards Principais */}
      <div className="dashboard-cards">
        <div className="dashboard-card card-saldo-total">
          <div className="card-header">
            <span className="card-title">Saldo Total em Contas</span>
            <Wallet size={24} className="card-icon" />
          </div>
          <div className="card-value">
            <span className={dados.saldoTotal >= 0 ? 'positivo' : 'negativo'}>
              {formatCurrency(dados.saldoTotal)}
            </span>
          </div>
          <div className="card-footer-split">
            <div className="footer-item">
              <TrendingUp size={14} />
              <span className="footer-label">Positivo:</span>
              <span className="footer-value positivo">{formatCurrency(dados.saldoPositivo || 0)}</span>
            </div>
            <div className="footer-item">
              <TrendingDown size={14} />
              <span className="footer-label">Negativo:</span>
              <span className="footer-value negativo">{formatCurrency(dados.saldoNegativo || 0)}</span>
            </div>
          </div>
        </div>

        <div className="dashboard-card card-receitas">
          <div className="card-header">
            <span className="card-title">Receitas do Mês</span>
            <ArrowUpCircle size={24} className="card-icon" />
          </div>
          <div className="card-value">
            <span className="positivo">{formatCurrency(dados.receitasMes)}</span>
          </div>
          <div className="card-footer-split">
            <div className="footer-item">
              <Landmark size={14} />
              <span className="footer-label">Banco:</span>
              <span className="footer-value">{formatCurrency(dados.receitasBanco)}</span>
            </div>
            <div className="footer-item">
              <Banknote size={14} />
              <span className="footer-label">Dinheiro:</span>
              <span className="footer-value">{formatCurrency(dados.receitasDinheiro)}</span>
            </div>
          </div>
        </div>

        <div className="dashboard-card card-despesas">
          <div className="card-header">
            <span className="card-title">Despesas do Mês</span>
            <ArrowDownCircle size={24} className="card-icon" />
          </div>
          <div className="card-value">
            <span className="negativo">{formatCurrency(dados.despesasMes)}</span>
          </div>
          <div className="card-footer-split">
            <div className="footer-item">
              <Landmark size={14} />
              <span className="footer-label">Banco:</span>
              <span className="footer-value">{formatCurrency(dados.despesasBanco)}</span>
            </div>
            <div className="footer-item">
              <Banknote size={14} />
              <span className="footer-label">Dinheiro:</span>
              <span className="footer-value">{formatCurrency(dados.despesasDinheiro)}</span>
            </div>
          </div>
        </div>

        <div className="dashboard-card card-saldo-mes">
          <div className="card-header">
            <span className="card-title">Saldo do Mês</span>
            {dados.saldoMes >= 0 ? (
              <TrendingUp size={24} className="card-icon" />
            ) : (
              <TrendingDown size={24} className="card-icon" />
            )}
          </div>
          <div className="card-value">
            <span className={dados.saldoMes >= 0 ? 'positivo' : 'negativo'}>
              {formatCurrency(dados.saldoMes)}
            </span>
          </div>
          <div className="card-footer">
            <span>
              {dados.saldoMes >= 0 ? 'Superávit' : 'Déficit'} mensal
            </span>
          </div>
        </div>
      </div>

      {/* Cards Secundários */}
      <div className="dashboard-secondary-cards">
        {/* Card Investimentos - NOVO */}
        <div className="secondary-card card-investimentos">
          <div className="secondary-header">
            <span>💰 Investimentos</span>
          </div>
          {loadingInvestimentos ? (
            <div className="loading-invest">Carregando...</div>
          ) : (
            <>
              <div className="secondary-value">
                <strong>{formatCurrency(investimentos.valorAtual)}</strong>
                <span className="invest-subtitle">
                  Investido: {formatCurrency(investimentos.totalInvestido)}
                </span>
              </div>
              <div className={`invest-rentabilidade ${investimentos.rentabilidade >= 0 ? 'positivo' : 'negativo'}`}>
                {investimentos.rentabilidade >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                <span>
                  {investimentos.rentabilidade >= 0 ? '+' : ''}{investimentos.rentabilidade.toFixed(2)}%
                </span>
              </div>
              <Link to="/investimentos" className="secondary-link">
                {investimentos.qtdAtivos} ativo(s) →
              </Link>
            </>
          )}
        </div>

        <div className="secondary-card card-pendentes">
          <div className="secondary-header">
            <Clock size={20} />
            <span>Transações Pendentes</span>
          </div>
          <div className="secondary-value">
            <strong>{dados.transacoesPendentes}</strong>
            <span className={dados.valorPendente >= 0 ? 'positivo' : 'negativo'}>
              {formatCurrency(Math.abs(dados.valorPendente))}
            </span>
          </div>
          <Link to="/transacoes" className="secondary-link">
            Ver pendentes →
          </Link>
        </div>

        <div className="secondary-card card-categorias">
          <div className="secondary-header">
            <CheckCircle size={20} />
            <span>Categorias Ativas</span>
          </div>
          <div className="secondary-value">
            <strong>{dados.categorias.length}</strong>
            <span className="subtitle">
              {dados.categorias.filter(c => c.tipo === 'receita').length} receitas / {' '}
              {dados.categorias.filter(c => c.tipo === 'despesa').length} despesas
            </span>
          </div>
          <Link to="/categorias" className="secondary-link">
            Gerenciar →
          </Link>
        </div>
      </div>

      {/* Visão Anual - Tabela e Gráfico */}
      <div className="visao-anual-container">
        <div className="visao-anual-header">
          <h2>📊 Visão Anual</h2>
          <select
            value={anoSelecionado}
            onChange={(e) => setAnoSelecionado(Number(e.target.value))}
            className="ano-select"
          >
            {anosDisponiveis.length > 0 ? (
              anosDisponiveis.map(ano => (
                <option key={ano} value={ano}>{ano}</option>
              ))
            ) : (
              <option value={new Date().getFullYear()}>{new Date().getFullYear()}</option>
            )}
          </select>
        </div>

        <div className="visao-anual-content">
          {/* Tabela de Meses */}
          <div className="tabela-meses">
            <table className="tabela-mensal">
              <thead>
                <tr>
                  <th>Mês</th>
                  <th>Receitas</th>
                  <th>Despesas</th>
                  <th>Resultado</th>
                </tr>
              </thead>
              <tbody>
                {dadosMensais.map((dados, index) => (
                  <tr key={index}>
                    <td className="mes-nome">{dados.mes}</td>
                    <td className="valor receita">{formatCurrency(dados.receitas)}</td>
                    <td className="valor despesa">{formatCurrency(dados.despesas)}</td>
                    <td className={`valor resultado ${dados.resultado >= 0 ? 'positivo' : 'negativo'}`}>
                      {formatCurrency(dados.resultado)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="total-row">
                  <td><strong>TOTAL</strong></td>
                  <td className="valor receita">
                    <strong>{formatCurrency(dadosMensais.reduce((acc, m) => acc + m.receitas, 0))}</strong>
                  </td>
                  <td className="valor despesa">
                    <strong>{formatCurrency(dadosMensais.reduce((acc, m) => acc + m.despesas, 0))}</strong>
                  </td>
                  <td className={`valor resultado ${dadosMensais.reduce((acc, m) => acc + m.resultado, 0) >= 0 ? 'positivo' : 'negativo'}`}>
                    <strong>{formatCurrency(dadosMensais.reduce((acc, m) => acc + m.resultado, 0))}</strong>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Gráfico de Barras */}
          <div className="grafico-barras">
            <div className="grafico-container">
              {dadosMensais.map((dados, index) => {
                const maxValor = Math.max(...dadosMensais.map(m => Math.max(m.receitas, m.despesas)))
                const alturaReceita = maxValor > 0 ? (dados.receitas / maxValor) * 100 : 0
                const alturaDespesa = maxValor > 0 ? (dados.despesas / maxValor) * 100 : 0

                return (
                  <div key={index} className="barra-grupo">
                    <div className="barras">
                      <div
                        className="barra barra-receita"
                        style={{ height: `${alturaReceita}%` }}
                        title={`Receitas: ${formatCurrency(dados.receitas)}`}
                      >
                        {dados.receitas > 0 && <span className="barra-valor">{formatCurrency(dados.receitas)}</span>}
                      </div>
                      <div
                        className="barra barra-despesa"
                        style={{ height: `${alturaDespesa}%` }}
                        title={`Despesas: ${formatCurrency(dados.despesas)}`}
                      >
                        {dados.despesas > 0 && <span className="barra-valor">{formatCurrency(dados.despesas)}</span>}
                      </div>
                    </div>
                    <span className="barra-mes">{dados.mes.substring(0, 3)}</span>
                  </div>
                )
              })}
            </div>
            <div className="grafico-legenda">
              <div className="legenda-item">
                <span className="legenda-cor receita"></span>
                <span>Receitas</span>
              </div>
              <div className="legenda-item">
                <span className="legenda-cor despesa"></span>
                <span>Despesas</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Análise por Categorias */}
      <div className="analise-categorias-container">
        <h2 className="secao-titulo">📊 Análise por Categoria</h2>
        
        <div className="analise-categorias-grid">
          {/* Card Receitas */}
          <div className="analise-card card-receitas-analise">
            <div className="analise-card-header">
              <h3>💰 Receitas</h3>
              <div className="analise-filtros">
                <select
                  value={filtroReceitasPor}
                  onChange={(e) => setFiltroReceitasPor(e.target.value)}
                  className="filtro-select-small"
                >
                  <option value="categoria">Por Categoria</option>
                  <option value="subcategoria">Por Subcategoria</option>
                </select>
                <select
                  value={filtroReceitasMes}
                  onChange={(e) => setFiltroReceitasMes(Number(e.target.value))}
                  className="filtro-select-small"
                >
                  {mesesOptions.map(m => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
                <select
                  value={filtroReceitasAno}
                  onChange={(e) => setFiltroReceitasAno(Number(e.target.value))}
                  className="filtro-select-small"
                >
                  {anosDisponiveis.length > 0 ? (
                    anosDisponiveis.map(ano => (
                      <option key={ano} value={ano}>{ano}</option>
                    ))
                  ) : (
                    <option value={new Date().getFullYear()}>{new Date().getFullYear()}</option>
                  )}
                </select>
              </div>
            </div>

            <div className="analise-card-content">
              {receitasPorCategoria.length === 0 ? (
                <div className="analise-empty">
                  <span>Nenhuma receita neste período</span>
                </div>
              ) : (
                <>
                  <div className="categorias-analise-list">
                    {receitasPorCategoria.map((item, index) => {
                      const percentual = totalReceitas > 0 ? (item.valor / totalReceitas) * 100 : 0
                      return (
                        <div key={index} className="categoria-analise-item">
                          <div className="categoria-analise-info">
                            <div 
                              className="categoria-analise-icon"
                              style={{ backgroundColor: item.cor }}
                            >
                              {item.icone}
                            </div>
                            <span className="categoria-analise-nome">{item.nome}</span>
                          </div>
                          <div className="categoria-analise-valores">
                            <span className="categoria-analise-valor receita">{formatCurrency(item.valor)}</span>
                            <div className="categoria-barra-wrapper">
                              <div 
                                className="categoria-barra barra-receita"
                                style={{ width: `${percentual}%` }}
                              ></div>
                            </div>
                            <span className="categoria-analise-percent">{percentual.toFixed(1)}%</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  <div className="analise-total-footer">
                    <span>Total:</span>
                    <strong className="receita">{formatCurrency(totalReceitas)}</strong>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Card Despesas */}
          <div className="analise-card card-despesas-analise">
            <div className="analise-card-header">
              <h3>💳 Despesas</h3>
              <div className="analise-filtros">
                <select
                  value={filtroDespesasPor}
                  onChange={(e) => setFiltroDespesasPor(e.target.value)}
                  className="filtro-select-small"
                >
                  <option value="categoria">Por Categoria</option>
                  <option value="subcategoria">Por Subcategoria</option>
                </select>
                <select
                  value={filtroDespesasMes}
                  onChange={(e) => setFiltroDespesasMes(Number(e.target.value))}
                  className="filtro-select-small"
                >
                  {mesesOptions.map(m => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
                <select
                  value={filtroDespesasAno}
                  onChange={(e) => setFiltroDespesasAno(Number(e.target.value))}
                  className="filtro-select-small"
                >
                  {anosDisponiveis.length > 0 ? (
                    anosDisponiveis.map(ano => (
                      <option key={ano} value={ano}>{ano}</option>
                    ))
                  ) : (
                    <option value={new Date().getFullYear()}>{new Date().getFullYear()}</option>
                  )}
                </select>
              </div>
            </div>

            <div className="analise-card-content">
              {despesasPorCategoria.length === 0 ? (
                <div className="analise-empty">
                  <span>Nenhuma despesa neste período</span>
                </div>
              ) : (
                <>
                  <div className="categorias-analise-list">
                    {despesasPorCategoria.map((item, index) => {
                      const percentual = totalDespesas > 0 ? (item.valor / totalDespesas) * 100 : 0
                      return (
                        <div key={index} className="categoria-analise-item">
                          <div className="categoria-analise-info">
                            <div 
                              className="categoria-analise-icon"
                              style={{ backgroundColor: item.cor }}
                            >
                              {item.icone}
                            </div>
                            <span className="categoria-analise-nome">{item.nome}</span>
                          </div>
                          <div className="categoria-analise-valores">
                            <span className="categoria-analise-valor despesa">{formatCurrency(item.valor)}</span>
                            <div className="categoria-barra-wrapper">
                              <div 
                                className="categoria-barra barra-despesa"
                                style={{ width: `${percentual}%` }}
                              ></div>
                            </div>
                            <span className="categoria-analise-percent">{percentual.toFixed(1)}%</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  <div className="analise-total-footer">
                    <span>Total:</span>
                    <strong className="despesa">{formatCurrency(totalDespesas)}</strong>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
      {/* Conteúdo em Grid */}
      <div className="dashboard-grid">
        {/* Próximos Vencimentos */}
        <div className="dashboard-widget">
          <div className="widget-header">
            <h3>
              <AlertCircle size={20} />
              Próximos Vencimentos (7 dias)
            </h3>
          </div>
          <div className="widget-content">
            {dados.proximosVencimentos.length === 0 ? (
              <div className="widget-empty">
                <span>Nenhum vencimento próximo</span>
              </div>
            ) : (
              <div className="vencimentos-list">
                {dados.proximosVencimentos.map((trans) => (
                  <div key={trans.id} className="vencimento-item">
                    <div className="vencimento-info">
                      <div 
                        className="vencimento-icon"
                        style={{ backgroundColor: trans.categorias?.cor }}
                      >
                        {trans.categorias?.icone}
                      </div>
                      <div className="vencimento-detalhes">
                        <strong>{trans.descricao}</strong>
                        <span className="vencimento-data">
                          Vence em {formatDate(trans.data_vencimento)}
                        </span>
                      </div>
                    </div>
                    <span className={`vencimento-valor ${trans.tipo}`}>
                      {formatCurrency(trans.valor)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Top Categorias */}
        <div className="dashboard-widget">
          <div className="widget-header">
            <h3>
              <TrendingDown size={20} />
              Maiores Despesas do Mês
            </h3>
          </div>
          <div className="widget-content">
            {topCategorias().length === 0 ? (
              <div className="widget-empty">
                <span>Nenhuma despesa no mês</span>
              </div>
            ) : (
              <div className="categorias-list">
                {topCategorias().map((cat, index) => (
                  <div key={index} className="categoria-item">
                    <div className="categoria-info">
                      <span className="categoria-posicao">{index + 1}º</span>
                      <div 
                        className="categoria-icon"
                        style={{ backgroundColor: cat.cor }}
                      >
                        {cat.icone}
                      </div>
                      <span className="categoria-nome">{cat.nome}</span>
                    </div>
                    <span className="categoria-valor">
                      {formatCurrency(cat.valor)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Minhas Contas */}
        <div className="dashboard-widget widget-full">
          <div className="widget-header">
            <h3>
              <Wallet size={20} />
              Minhas Contas
            </h3>
            <Link to="/contas" className="widget-link">Ver todas</Link>
          </div>
          <div className="widget-content">
            {dados.contas.length === 0 ? (
              <div className="widget-empty">
                <span>Nenhuma conta cadastrada</span>
                <Link to="/contas" className="btn-secondary">
                  Cadastrar Conta
                </Link>
              </div>
            ) : (
              <div className="contas-grid">
                {dados.contas.slice(0, 4).map((conta) => (
                  <div key={conta.id} className="conta-mini">
                    <div 
                      className="conta-mini-icon"
                      style={{ backgroundColor: conta.cor }}
                    >
                      💳
                    </div>
                    <div className="conta-mini-info">
                      <strong>{conta.nome}</strong>
                      <span className={conta.saldo_atual >= 0 ? 'positivo' : 'negativo'}>
                        {formatCurrency(conta.saldo_atual || 0)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Dicas Rápidas */}
      <div className="dashboard-tips">
        <h3>💡 Dicas Rápidas</h3>
        <div className="tips-grid">
          <div className="tip-card">
            <strong>Organize-se</strong>
            <p>Cadastre todas as suas contas e categorias para ter um controle completo</p>
          </div>
          <div className="tip-card">
            <strong>Lance diariamente</strong>
            <p>Registre suas transações todos os dias para não perder o controle</p>
          </div>
          <div className="tip-card">
            <strong>Fique de olho</strong>
            <p>Acompanhe seus vencimentos e não deixe contas atrasarem</p>
          </div>
        </div>
      </div>
    </div>
  )
}
