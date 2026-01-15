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
  Eye,
  EyeOff,
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
  const [filtroTipo, setFiltroTipo] = useState('TODOS') // TODOS, DIVIDENDO, JCP, RENDIMENTO
  const [filtroStatus, setFiltroStatus] = useState('TODOS') // TODOS, RECEBIDO, PREVISTO
  
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

      // Buscar proventos do ano selecionado
      const { data: proventosData, error: proventosError } = await supabase
        .from('investimentos_proventos')
        .select('*')
        .eq('user_id', user.id)
        .gte('data_pagamento', `${anoSelecionado}-01-01`)
        .lte('data_pagamento', `${anoSelecionado}-12-31`)
        .order('data_pagamento', { ascending: false })

      if (proventosError) throw proventosError

      setProventos(proventosData || [])

      // Calcular resumo
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

      // Agrupar por ticker
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

      // Buscar informação de sync
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
      console.error('Erro ao carregar proventos:', error)
      showMessage('error', 'Erro ao carregar proventos')
    } finally {
      setLoading(false)
    }
  }

  const handleAtualizarProventos = async () => {
    try {
      setAtualizando(true)
      showMessage('success', 'Iniciando atualização de proventos...')

      // Buscar todos os tickers do usuário
      const { data: operacoes } = await supabase
        .from('investimentos_operacoes')
        .select('ticker')
        .eq('user_id', user.id)

      const tickersUnicos = [...new Set(operacoes?.map(o => o.ticker) || [])]

      // Para cada ticker, buscar proventos
      for (const ticker of tickersUnicos) {
        await buscarProventosTicker(ticker)
      }

      showMessage('success', 'Proventos atualizados com sucesso!')
      carregarDados()

    } catch (error) {
      console.error('Erro ao atualizar proventos:', error)
      showMessage('error', 'Erro ao atualizar proventos')
    } finally {
      setAtualizando(false)
    }
  }

  const buscarProventosTicker = async (ticker) => {
    try {
      // Verificar última sincronização
      const { data: syncData } = await supabase
        .from('investimentos_proventos_sync')
        .select('*')
        .eq('user_id', user.id)
        .eq('ticker', ticker)
        .single()

      // Definir data inicial de busca
      let dataInicial
      if (syncData?.ultima_sincronizacao) {
        // Buscar desde 1 dia antes da última sync
        const ultimaSync = new Date(syncData.ultima_sincronizacao)
        ultimaSync.setDate(ultimaSync.getDate() - 1)
        dataInicial = ultimaSync.toISOString().split('T')[0]
      } else {
        // Primeira vez: buscar desde a primeira operação
        const { data: primeiraOp } = await supabase
          .from('investimentos_operacoes')
          .select('data')
          .eq('user_id', user.id)
          .eq('ticker', ticker)
          .order('data', { ascending: true })
          .limit(1)
          .single()

        dataInicial = primeiraOp?.data || new Date().toISOString().split('T')[0]
      }

      // Buscar proventos da API (aqui vamos integrar múltiplas fontes)
      const proventosAPI = await buscarProventosAPI(ticker, dataInicial)

      // Processar e salvar cada provento
      for (const prov of proventosAPI) {
        await processarProvento(ticker, prov)
      }

      // Atualizar registro de sync
      await supabase
        .from('investimentos_proventos_sync')
        .upsert({
          user_id: user.id,
          ticker: ticker,
          ultima_sincronizacao: new Date().toISOString(),
          proxima_sincronizacao: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          data_inicial_busca: dataInicial,
          status_ultima_sync: 'SUCESSO',
          total_proventos_encontrados: proventosAPI.length
        }, {
          onConflict: 'user_id,ticker'
        })

    } catch (error) {
      console.error(`Erro ao buscar proventos de ${ticker}:`, error)
      
      // Registrar erro no sync
      await supabase
        .from('investimentos_proventos_sync')
        .upsert({
          user_id: user.id,
          ticker: ticker,
          ultima_sincronizacao: new Date().toISOString(),
          status_ultima_sync: 'ERRO',
          erro_ultima_sync: error.message
        }, {
          onConflict: 'user_id,ticker'
        })
    }
  }

  const buscarProventosAPI = async (ticker, dataInicial) => {
    // Esta função vai tentar múltiplas fontes
    const fontes = ['status_invest', 'brasil_api', 'alpha_vantage']
    
    for (const fonte of fontes) {
      try {
        let proventos = []
        
        switch (fonte) {
          case 'status_invest':
            // TODO: Implementar scraping ou API do Status Invest
            proventos = await buscarStatusInvest(ticker, dataInicial)
            break
            
          case 'brasil_api':
            // TODO: Implementar Brasil API
            proventos = await buscarBrasilAPI(ticker, dataInicial)
            break
            
          case 'alpha_vantage':
            // TODO: Implementar Alpha Vantage
            proventos = await buscarAlphaVantage(ticker, dataInicial)
            break
        }

        if (proventos.length > 0) {
          return proventos.map(p => ({ ...p, fonte }))
        }
        
      } catch (error) {
        console.error(`Erro na fonte ${fonte}:`, error)
        continue
      }
    }

    return []
  }

  const buscarStatusInvest = async (ticker, dataInicial) => {
    // Implementação futura
    // Por enquanto retorna array vazio
    return []
  }

  const buscarBrasilAPI = async (ticker, dataInicial) => {
    // Implementação futura
    return []
  }

  const buscarAlphaVantage = async (ticker, dataInicial) => {
    // Implementação futura
    return []
  }

  const processarProvento = async (ticker, provento) => {
    try {
      // Calcular quantas cotas o usuário tinha na data COM
      const { data: cotasData, error: cotasError } = await supabase
        .rpc('calcular_cotas_na_data', {
          p_user_id: user.id,
          p_ticker: ticker,
          p_data_com: provento.data_com
        })

      if (cotasError) throw cotasError

      const quantidadeCotas = parseFloat(cotasData || 0)

      // Se não tinha cotas, não processar
      if (quantidadeCotas <= 0) return

      // Calcular valores
      const valorBruto = quantidadeCotas * parseFloat(provento.valor_por_cota)
      
      // Calcular IR
      const { data: irData } = await supabase
        .rpc('calcular_ir_provento', {
          p_tipo: provento.tipo,
          p_valor_bruto: valorBruto
        })

      const ir = irData?.[0] || { percentual_ir: 0, valor_ir: 0, valor_liquido: valorBruto }

      // Verificar se já existe
      const { data: existente } = await supabase
        .from('investimentos_proventos')
        .select('id')
        .eq('user_id', user.id)
        .eq('ticker', ticker)
        .eq('data_com', provento.data_com)
        .eq('tipo', provento.tipo)
        .single()

      if (existente) {
        // Atualizar
        await supabase
          .from('investimentos_proventos')
          .update({
            valor_por_cota: provento.valor_por_cota,
            quantidade_cotas: quantidadeCotas,
            valor_bruto: valorBruto,
            percentual_ir: ir.percentual_ir,
            valor_ir: ir.valor_ir,
            valor_liquido: ir.valor_liquido,
            fonte: provento.fonte
          })
          .eq('id', existente.id)
      } else {
        // Inserir novo
        await supabase
          .from('investimentos_proventos')
          .insert({
            user_id: user.id,
            ticker: ticker,
            tipo: provento.tipo,
            data_com: provento.data_com,
            data_pagamento: provento.data_pagamento,
            valor_por_cota: provento.valor_por_cota,
            quantidade_cotas: quantidadeCotas,
            valor_bruto: valorBruto,
            percentual_ir: ir.percentual_ir,
            valor_ir: ir.valor_ir,
            valor_liquido: ir.valor_liquido,
            status: new Date(provento.data_pagamento) <= new Date() ? 'RECEBIDO' : 'PREVISTO',
            fonte: provento.fonte
          })
      }

      // Registrar log da fonte
      await supabase
        .from('investimentos_proventos_fontes')
        .insert({
          fonte: provento.fonte,
          data_consulta: new Date().toISOString(),
          sucesso: true,
          dados_brutos: provento
        })

    } catch (error) {
      console.error('Erro ao processar provento:', error)
      
      // Registrar erro
      await supabase
        .from('investimentos_proventos_fontes')
        .insert({
          fonte: provento.fonte,
          data_consulta: new Date().toISOString(),
          sucesso: false,
          erro: error.message
        })
    }
  }

  const handleExportar = () => {
    const dados = proventosFiltrados.map(p => ({
      Ticker: p.ticker,
      Tipo: p.tipo,
      'Data COM': formatarData(p.data_com),
      'Data Pagamento': formatarData(p.data_pagamento),
      'Valor/Cota': formatarMoeda(p.valor_por_cota),
      Cotas: p.quantidade_cotas,
      'Valor Bruto': formatarMoeda(p.valor_bruto),
      'IR (%)': p.percentual_ir,
      'Valor IR': formatarMoeda(p.valor_ir),
      'Valor Líquido': formatarMoeda(p.valor_liquido),
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

    showMessage('success', 'Dados exportados com sucesso!')
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
      'RENDIMENTO': 'Rendimento',
      'BONIFICACAO': 'Bonificação'
    }
    return labels[tipo] || tipo
  }

  const getTipoClass = (tipo) => {
    const classes = {
      'DIVIDENDO': 'tipo-dividendo',
      'JCP': 'tipo-jcp',
      'RENDIMENTO': 'tipo-rendimento',
      'BONIFICACAO': 'tipo-bonificacao'
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
        <div className="loading">Carregando proventos...</div>
      </div>
    )
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>💰 Proventos</h1>
          <p>Acompanhe seus dividendos, JCP e rendimentos</p>
        </div>
        <div className="header-actions">
          <button 
            className="btn-primary"
            onClick={handleAtualizarProventos}
            disabled={atualizando}
          >
            <RefreshCw size={18} className={atualizando ? 'spinning' : ''} />
            {atualizando ? 'Atualizando...' : 'Atualizar Proventos'}
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

      {/* Status de Sincronização */}
      {ultimaSync && (
        <div className="sync-info">
          <div className="sync-item">
            <Clock size={16} />
            <span>Última atualização: {new Date(ultimaSync).toLocaleString('pt-BR')}</span>
          </div>
          {proximaSync && (
            <div className="sync-item">
              <Calendar size={16} />
              <span>Próxima atualização: {new Date(proximaSync).toLocaleString('pt-BR')}</span>
            </div>
          )}
        </div>
      )}

      {/* Resumo */}
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

      {/* Filtros */}
      <div className="filtros-container">
        <div className="filtro-group">
          <label>
            <Calendar size={16} />
            Ano
          </label>
          <select 
            value={anoSelecionado} 
            onChange={(e) => setAnoSelecionado(parseInt(e.target.value))}
          >
            {anos.map(ano => (
              <option key={ano} value={ano}>{ano}</option>
            ))}
          </select>
        </div>

        <div className="filtro-group">
          <label>
            <Filter size={16} />
            Tipo
          </label>
          <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)}>
            <option value="TODOS">Todos</option>
            <option value="DIVIDENDO">Dividendos</option>
            <option value="JCP">JCP</option>
            <option value="RENDIMENTO">Rendimentos</option>
          </select>
        </div>

        <div className="filtro-group">
          <label>
            <Filter size={16} />
            Status
          </label>
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

      {/* Tabela de Proventos */}
      <div className="proventos-section">
        <h2>
          Histórico de Proventos
          <span className="count-badge">{proventosFiltrados.length}</span>
        </h2>
        
        {proventosFiltrados.length === 0 ? (
          <div className="empty-state">
            <Info size={48} />
            <h3>Nenhum provento encontrado</h3>
            <p>Clique em "Atualizar Proventos" para buscar dados</p>
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
                  <th>Bruto</th>
                  <th>IR</th>
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
                    <td className="valor-cell">
                      <ValorOculto valor={p.valor_bruto} />
                    </td>
                    <td className="valor-cell ir-cell">
                      <ValorOculto valor={p.valor_ir} />
                    </td>
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

      {/* Resumo por Ticker */}
      {porTicker.length > 0 && (
        <div className="ticker-resumo-section">
          <h2>Proventos por Ativo ({anoSelecionado})</h2>
          <div className="ticker-resumo-grid">
            {porTicker.map(t => (
              <div key={t.ticker} className="ticker-resumo-card">
                <div className="ticker-header">
                  <span className="ticker-name">{t.ticker}</span>
                  <span className="ticker-count">{t.quantidade} provento{t.quantidade > 1 ? 's' : ''}</span>
                </div>
                <div className="ticker-valores">
                  <div className="ticker-valor-item">
                    <span className="label">Total Líquido:</span>
                    <span className="valor">
                      <ValorOculto valor={t.totalLiquido} />
                    </span>
                  </div>
                  {t.totalIR > 0 && (
                    <div className="ticker-valor-item ticker-ir">
                      <span className="label">IR Retido:</span>
                      <span className="valor">
                        <ValorOculto valor={t.totalIR} />
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
