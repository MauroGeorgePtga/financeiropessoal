import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useVisibility } from '../contexts/VisibilityContext'
import { ValorOculto } from '../components/ValorOculto'
import { 
  TrendingUp,
  DollarSign,
  Calendar,
  RefreshCw,
  Filter,
  Download,
  Clock,
  CheckCircle,
  AlertCircle,
  Info,
  Percent
} from 'lucide-react'
import './Proventos.css'

export default function Proventos() {
  const { user } = useAuth()
  const { valoresVisiveis } = useVisibility()
  const [loading, setLoading] = useState(true)
  const [atualizando, setAtualizando] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  
  const [anoSelecionado, setAnoSelecionado] = useState(new Date().getFullYear())
  const [filtroTipo, setFiltroTipo] = useState('TODOS')
  const [filtroStatus, setFiltroStatus] = useState('TODOS')
  
  const [proventos, setProventos] = useState([])
  const [resumo, setResumo] = useState({
    totalRecebido: 0,
    totalPrevisto: 0,
    totalBruto: 0,
    totalIR: 0,
    totalLiquido: 0,
    quantidade: 0
  })
  const [porTicker, setPorTicker] = useState([])
  const [ultimaSync, setUltimaSync] = useState(null)
  const [proximaSync, setProximaSync] = useState(null)

  useEffect(() => {
    if (user) {
      carregarDados()
    }
  }, [user, anoSelecionado])

  const carregarDados = async () => {
    try {
      setLoading(true)

      const { data: proventosData, error: proventosError } = await supabase
        .from('investimentos_proventos')
        .select('*')
        .eq('user_id', user.id)
        .gte('data_pagamento', `${anoSelecionado}-01-01`)
        .lte('data_pagamento', `${anoSelecionado}-12-31`)
        .order('data_pagamento', { ascending: false })

      if (proventosError) throw proventosError

      setProventos(proventosData || [])

      const recebidos = (proventosData || []).filter(p => p.status === 'RECEBIDO')
      const previstos = (proventosData || []).filter(p => p.status === 'PREVISTO')
      
      setResumo({
        totalRecebido: recebidos.reduce((sum, p) => sum + parseFloat(p.valor_liquido), 0),
        totalPrevisto: previstos.reduce((sum, p) => sum + parseFloat(p.valor_liquido), 0),
        totalBruto: (proventosData || []).reduce((sum, p) => sum + parseFloat(p.valor_bruto), 0),
        totalIR: (proventosData || []).reduce((sum, p) => sum + parseFloat(p.valor_ir), 0),
        totalLiquido: (proventosData || []).reduce((sum, p) => sum + parseFloat(p.valor_liquido), 0),
        quantidade: (proventosData || []).length
      })

      const agrupado = {}
      ;(proventosData || []).forEach(p => {
        if (!agrupado[p.ticker]) {
          agrupado[p.ticker] = {
            ticker: p.ticker,
            totalBruto: 0,
            totalIR: 0,
            totalLiquido: 0,
            quantidade: 0
          }
        }
        agrupado[p.ticker].totalBruto += parseFloat(p.valor_bruto)
        agrupado[p.ticker].totalIR += parseFloat(p.valor_ir)
        agrupado[p.ticker].totalLiquido += parseFloat(p.valor_liquido)
        agrupado[p.ticker].quantidade++
      })

      const tickersArray = Object.values(agrupado).sort((a, b) => b.totalLiquido - a.totalLiquido)
      setPorTicker(tickersArray)

      const { data: syncData } = await supabase
        .from('investimentos_proventos_sync')
        .select('*')
        .eq('user_id', user.id)
        .order('ultima_sincronizacao', { ascending: false })
        .limit(1)
        .single()

      if (syncData) {
        setUltimaSync(syncData.ultima_sincronizacao)
        setProximaSync(syncData.proxima_sincronizacao)
      }

    } catch (error) {
      console.error('Erro:', error)
      showMessage('error', 'Erro ao carregar proventos')
    } finally {
      setLoading(false)
    }
  }

  const handleAtualizarProventos = async () => {
    try {
      setAtualizando(true)
      showMessage('success', 'Buscando proventos...')

      console.log('=== ATUALIZAR INICIO ===')

      const { data: operacoes } = await supabase
        .from('investimentos_operacoes')
        .select('ticker')
        .eq('user_id', user.id)

      console.log('Operações:', operacoes?.length)

      const tickersUnicos = [...new Set(operacoes?.map(o => o.ticker) || [])]

      console.log('Tickers únicos:', tickersUnicos)

      if (tickersUnicos.length === 0) {
        showMessage('error', 'Cadastre operações primeiro')
        return
      }

      let totalNovos = 0

      for (const ticker of tickersUnicos) {
        console.log(`Buscando ${ticker}...`)
        const novos = await buscarProventosTicker(ticker)
        console.log(`${ticker}: ${novos} novos`)
        totalNovos += novos
      }

      console.log('Total novos:', totalNovos)
      console.log('=== ATUALIZAR FIM ===')

      showMessage('success', totalNovos > 0 ? `✅ ${totalNovos} novos!` : '✅ Nenhum novo encontrado')
      carregarDados()

    } catch (error) {
      console.error('Erro:', error)
      showMessage('error', 'Erro: ' + error.message)
    } finally {
      setAtualizando(false)
    }
  }

  const gerarDadosTeste = async () => {
    try {
      setAtualizando(true)
      showMessage('success', 'Gerando dados de teste...')
      
      console.log('=== DEBUG INICIO ===')
      console.log('User do contexto:', user)
      console.log('User ID:', user.id)
      console.log('User email:', user.email)
      
      const { data: ops, error } = await supabase
        .from('investimentos_operacoes')
        .select('ticker, quantidade, tipo_operacao, user_id')
        .eq('user_id', user.id)
      
      console.log('Query error:', error)
      console.log('Operações retornadas:', ops)
      console.log('Quantidade:', ops?.length)
      console.log('=== DEBUG FIM ===')
      
      if (!ops || ops.length === 0) {
        showMessage('error', 'Nenhuma operação encontrada. Veja console (F12)')
        return
      }
      
      const tickers = {}
      ops.forEach(op => {
        if (!tickers[op.ticker]) tickers[op.ticker] = 0
        tickers[op.ticker] += op.tipo_operacao === 'compra' ? op.quantidade : -op.quantidade
      })
      
      let inseridos = 0
      const hoje = new Date()
      
      for (const [ticker, qtd] of Object.entries(tickers)) {
        if (qtd <= 0) continue
        
        // Provento recebido
        const { error: err1 } = await supabase.from('investimentos_proventos').insert({
          user_id: user.id,
          ticker,
          tipo: 'DIVIDENDO',
          data_com: new Date(hoje - 30*86400000).toISOString().split('T')[0],
          data_pagamento: new Date(hoje - 15*86400000).toISOString().split('T')[0],
          valor_por_cota: 0.50,
          quantidade_cotas: qtd,
          valor_bruto: qtd * 0.50,
          percentual_ir: 0,
          valor_ir: 0,
          valor_liquido: qtd * 0.50,
          status: 'RECEBIDO',
          fonte: 'exemplo'
        })
        
        if (!err1) inseridos++
        
        // Provento previsto
        const { error: err2 } = await supabase.from('investimentos_proventos').insert({
          user_id: user.id,
          ticker,
          tipo: 'DIVIDENDO',
          data_com: new Date(hoje).toISOString().split('T')[0],
          data_pagamento: new Date(hoje.getTime() + 15*86400000).toISOString().split('T')[0],
          valor_por_cota: 0.60,
          quantidade_cotas: qtd,
          valor_bruto: qtd * 0.60,
          percentual_ir: 0,
          valor_ir: 0,
          valor_liquido: qtd * 0.60,
          status: 'PREVISTO',
          fonte: 'exemplo'
        })
        
        if (!err2) inseridos++
      }
      
      showMessage('success', `✅ ${inseridos} proventos criados!`)
      carregarDados()
      
    } catch (error) {
      console.error(error)
      showMessage('error', 'Erro: ' + error.message)
    } finally {
      setAtualizando(false)
    }
  }

  const buscarProventosTicker = async (ticker) => {
    try {
      const { data: syncData } = await supabase
        .from('investimentos_proventos_sync')
        .select('*')
        .eq('user_id', user.id)
        .eq('ticker', ticker)
        .single()

      let dataInicial
      if (syncData?.ultima_sincronizacao) {
        const ultima = new Date(syncData.ultima_sincronizacao)
        ultima.setDate(ultima.getDate() - 1)
        dataInicial = ultima.toISOString().split('T')[0]
      } else {
        const { data: primeiraOp } = await supabase
          .from('investimentos_operacoes')
          .select('data_operacao')
          .eq('user_id', user.id)
          .eq('ticker', ticker)
          .order('data_operacao', { ascending: true })
          .limit(1)
          .single()

        dataInicial = primeiraOp?.data_operacao || '2024-01-01'
      }

      const proventos = await buscarAPI(ticker, dataInicial)

      let novos = 0
      for (const prov of proventos) {
        const inseriu = await processarProvento(ticker, prov)
        if (inseriu) novos++
      }

      await supabase
        .from('investimentos_proventos_sync')
        .upsert({
          user_id: user.id,
          ticker: ticker,
          ultima_sincronizacao: new Date().toISOString(),
          proxima_sincronizacao: new Date(Date.now() + 86400000).toISOString(),
          data_inicial_busca: dataInicial,
          status_ultima_sync: 'SUCESSO',
          total_proventos_encontrados: proventos.length
        }, { onConflict: 'user_id,ticker' })

      return novos

    } catch (error) {
      console.error(`Erro ${ticker}:`, error)
      return 0
    }
  }

  const buscarAPI = async (ticker, dataInicial) => {
    try {
      // Tentar BrAPI primeiro (melhor para Brasil)
      const brapi = await buscarBrAPI(ticker, dataInicial)
      if (brapi.length > 0) {
        console.log(`${ticker}: ${brapi.length} via BrAPI`)
        return brapi
      }

      // Fallback: Yahoo Finance
      const yahoo = await buscarYahoo(ticker, dataInicial)
      if (yahoo.length > 0) {
        console.log(`${ticker}: ${yahoo.length} via Yahoo`)
        return yahoo
      }

      console.log(`${ticker}: nenhum provento encontrado`)
      return []
      
    } catch (error) {
      console.error(`Erro API ${ticker}:`, error)
      return []
    }
  }

  const buscarBrAPI = async (ticker, dataInicial) => {
    try {
      const tickerClean = ticker.replace('.SA', '')
      const res = await fetch(`/api/dividendos-br?ticker=${tickerClean}`)
      
      if (!res.ok) return []
      
      const data = await res.json()
      
      if (!data.success || !data.dividends) return []
      
      const proventos = []
      
      data.dividends.forEach(div => {
        const dataCom = div.date || div.paymentDate
        
        if (new Date(dataCom) >= new Date(dataInicial)) {
          proventos.push({
            tipo: div.type === 'JCP' ? 'JCP' : 'DIVIDENDO',
            data_com: dataCom,
            data_pagamento: div.paymentDate || dataCom,
            valor_por_cota: parseFloat(div.rate || div.value),
            fonte: 'brapi'
          })
        }
      })
      
      return proventos
    } catch (error) {
      return []
    }
  }

  const buscarYahoo = async (ticker, dataInicial) => {
    try {
      const tickerYahoo = ticker.includes('.SA') ? ticker : `${ticker}.SA`
      const res = await fetch(`/api/yahoo-finance?ticker=${tickerYahoo}&from=${dataInicial}`)
      
      if (!res.ok) return []
      
      const data = await res.json()
      
      if (!data.success || !data.dividends) return []
      
      const proventos = []
      
      Object.entries(data.dividends).forEach(([timestamp, info]) => {
        const date = new Date(parseInt(timestamp) * 1000).toISOString().split('T')[0]
        
        if (new Date(date) >= new Date(dataInicial)) {
          proventos.push({
            tipo: 'DIVIDENDO',
            data_com: date,
            data_pagamento: date,
            valor_por_cota: parseFloat(info.amount),
            fonte: 'yahoo_finance'
          })
        }
      })
      
      return proventos
    } catch (error) {
      return []
    }
  }

  const processarProvento = async (ticker, provento) => {
    try {
      const { data: cotasData } = await supabase
        .rpc('calcular_cotas_na_data', {
          p_user_id: user.id,
          p_ticker: ticker,
          p_data_com: provento.data_com
        })

      const qtd = parseFloat(cotasData || 0)
      if (qtd <= 0) return false

      const valorBruto = qtd * parseFloat(provento.valor_por_cota)
      
      const { data: irData } = await supabase
        .rpc('calcular_ir_provento', {
          p_tipo: provento.tipo,
          p_valor_bruto: valorBruto
        })

      const ir = irData?.[0] || { percentual_ir: 0, valor_ir: 0, valor_liquido: valorBruto }

      const { data: existente } = await supabase
        .from('investimentos_proventos')
        .select('id')
        .eq('user_id', user.id)
        .eq('ticker', ticker)
        .eq('data_com', provento.data_com)
        .eq('tipo', provento.tipo)
        .single()

      if (existente) return false

      await supabase
        .from('investimentos_proventos')
        .insert({
          user_id: user.id,
          ticker: ticker,
          tipo: provento.tipo,
          data_com: provento.data_com,
          data_pagamento: provento.data_pagamento,
          valor_por_cota: provento.valor_por_cota,
          quantidade_cotas: qtd,
          valor_bruto: valorBruto,
          percentual_ir: ir.percentual_ir,
          valor_ir: ir.valor_ir,
          valor_liquido: ir.valor_liquido,
          status: new Date(provento.data_pagamento) <= new Date() ? 'RECEBIDO' : 'PREVISTO',
          fonte: provento.fonte
        })

      return true
    } catch (error) {
      console.error('Erro processar:', error)
      return false
    }
  }

  const handleExportar = () => {
    const dados = proventosFiltrados.map(p => ({
      Ticker: p.ticker,
      Tipo: p.tipo,
      'Data COM': formatarData(p.data_com),
      'Data Pagamento': formatarData(p.data_pagamento),
      'Valor/Cota': p.valor_por_cota,
      Cotas: p.quantidade_cotas,
      'Valor Bruto': p.valor_bruto,
      'IR': p.valor_ir,
      'Valor Líquido': p.valor_liquido,
      Status: p.status
    }))

    const csv = [
      Object.keys(dados[0]).join(','),
      ...dados.map(row => Object.values(row).join(','))
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `proventos_${anoSelecionado}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    showMessage('success', 'Exportado!')
  }

  const showMessage = (type, text) => {
    setMessage({ type, text })
    setTimeout(() => setMessage({ type: '', text: '' }), 5000)
  }

  const formatarMoeda = (valor) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor || 0)
  }

  const formatarData = (data) => {
    if (!data) return '-'
    return new Date(data + 'T00:00:00').toLocaleDateString('pt-BR')
  }

  const getTipoLabel = (tipo) => {
    const labels = {
      'DIVIDENDO': 'Dividendo',
      'JCP': 'JCP',
      'RENDIMENTO': 'Rendimento'
    }
    return labels[tipo] || tipo
  }

  const getTipoClass = (tipo) => {
    const classes = {
      'DIVIDENDO': 'tipo-dividendo',
      'JCP': 'tipo-jcp',
      'RENDIMENTO': 'tipo-rendimento'
    }
    return classes[tipo] || ''
  }

  const proventosFiltrados = proventos.filter(p => {
    if (filtroTipo !== 'TODOS' && p.tipo !== filtroTipo) return false
    if (filtroStatus !== 'TODOS' && p.status !== filtroStatus) return false
    return true
  })

  const anos = []
  for (let ano = 2020; ano <= new Date().getFullYear() + 1; ano++) {
    anos.push(ano)
  }

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading">Carregando...</div>
      </div>
    )
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>💰 Proventos</h1>
          <p>Dividendos, JCP e rendimentos</p>
        </div>
        <div className="header-actions">
          <button 
            className="btn-secondary"
            onClick={gerarDadosTeste}
            disabled={atualizando}
          >
            <TrendingUp size={18} />
            Gerar Teste
          </button>
          <button 
            className="btn-primary"
            onClick={handleAtualizarProventos}
            disabled={atualizando}
          >
            <RefreshCw size={18} className={atualizando ? 'spinning' : ''} />
            {atualizando ? 'Buscando...' : 'Atualizar'}
          </button>
        </div>
      </div>

      {message.text && (
        <div className={`alert alert-${message.type}`}>
          {message.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
          {message.text}
          <button onClick={() => setMessage({ type: '', text: '' })}>×</button>
        </div>
      )}

      {ultimaSync && (
        <div className="sync-info">
          <div className="sync-item">
            <Clock size={16} />
            <span>Última: {new Date(ultimaSync).toLocaleString('pt-BR')}</span>
          </div>
        </div>
      )}

      <div className="resumo-container">
        <div className="resumo-card card-recebido">
          <div className="resumo-icon">
            <CheckCircle size={24} />
          </div>
          <div className="resumo-info">
            <span className="resumo-label">Recebidos ({anoSelecionado})</span>
            <span className="resumo-valor">
              <ValorOculto valor={resumo.totalRecebido} />
            </span>
          </div>
        </div>

        <div className="resumo-card card-previsto">
          <div className="resumo-icon">
            <Clock size={24} />
          </div>
          <div className="resumo-info">
            <span className="resumo-label">Previstos ({anoSelecionado})</span>
            <span className="resumo-valor">
              <ValorOculto valor={resumo.totalPrevisto} />
            </span>
          </div>
        </div>

        <div className="resumo-card card-total">
          <div className="resumo-icon">
            <DollarSign size={24} />
          </div>
          <div className="resumo-info">
            <span className="resumo-label">Total ({anoSelecionado})</span>
            <span className="resumo-valor">
              <ValorOculto valor={resumo.totalLiquido} />
            </span>
          </div>
        </div>

        <div className="resumo-card card-ir">
          <div className="resumo-icon">
            <Percent size={24} />
          </div>
          <div className="resumo-info">
            <span className="resumo-label">IR Retido ({anoSelecionado})</span>
            <span className="resumo-valor">
              <ValorOculto valor={resumo.totalIR} />
            </span>
          </div>
        </div>
      </div>

      <div className="filtros-container">
        <div className="filtro-group">
          <label><Calendar size={16} /> Ano</label>
          <select value={anoSelecionado} onChange={(e) => setAnoSelecionado(parseInt(e.target.value))}>
            {anos.map(ano => <option key={ano} value={ano}>{ano}</option>)}
          </select>
        </div>

        <div className="filtro-group">
          <label><Filter size={16} /> Tipo</label>
          <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)}>
            <option value="TODOS">Todos</option>
            <option value="DIVIDENDO">Dividendos</option>
            <option value="JCP">JCP</option>
            <option value="RENDIMENTO">Rendimentos</option>
          </select>
        </div>

        <div className="filtro-group">
          <label><Filter size={16} /> Status</label>
          <select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)}>
            <option value="TODOS">Todos</option>
            <option value="RECEBIDO">Recebidos</option>
            <option value="PREVISTO">Previstos</option>
          </select>
        </div>

        <button className="btn-secondary" onClick={handleExportar}>
          <Download size={18} />
          Exportar
        </button>
      </div>

      <div className="proventos-section">
        <h2>
          Histórico
          <span className="count-badge">{proventosFiltrados.length}</span>
        </h2>
        
        {proventosFiltrados.length === 0 ? (
          <div className="empty-state">
            <Info size={48} />
            <h3>Nenhum provento</h3>
            <p>Clique em "Atualizar"</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="proventos-table">
              <thead>
                <tr>
                  <th>Ticker</th>
                  <th>Tipo</th>
                  <th>Data COM</th>
                  <th>Pagamento</th>
                  <th>R$/Cota</th>
                  <th>Cotas</th>
                  <th>Líquido</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {proventosFiltrados.map(p => (
                  <tr key={p.id}>
                    <td className="ticker-cell">{p.ticker}</td>
                    <td>
                      <span className={`tipo-badge ${getTipoClass(p.tipo)}`}>
                        {getTipoLabel(p.tipo)}
                      </span>
                    </td>
                    <td>{formatarData(p.data_com)}</td>
                    <td>{formatarData(p.data_pagamento)}</td>
                    <td className="valor-cell">
                      {valoresVisiveis ? formatarMoeda(p.valor_por_cota) : '****'}
                    </td>
                    <td className="quantidade-cell">{p.quantidade_cotas.toFixed(2)}</td>
                    <td className="valor-cell valor-liquido">
                      <ValorOculto valor={p.valor_liquido} />
                    </td>
                    <td>
                      <span className={`status-badge status-${p.status.toLowerCase()}`}>
                        {p.status === 'RECEBIDO' ? (
                          <>
                            <CheckCircle size={14} />
                            Recebido
                          </>
                        ) : (
                          <>
                            <Clock size={14} />
                            Previsto
                          </>
                        )}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {porTicker.length > 0 && (
        <div className="ticker-resumo-section">
          <h2>Por Ativo ({anoSelecionado})</h2>
          <div className="ticker-resumo-grid">
            {porTicker.map(t => (
              <div key={t.ticker} className="ticker-resumo-card">
                <div className="ticker-header">
                  <span className="ticker-name">{t.ticker}</span>
                  <span className="ticker-count">{t.quantidade}</span>
                </div>
                <div className="ticker-valores">
                  <div className="ticker-valor-item">
                    <span className="label">Total:</span>
                    <span className="valor">
                      <ValorOculto valor={t.totalLiquido} />
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
