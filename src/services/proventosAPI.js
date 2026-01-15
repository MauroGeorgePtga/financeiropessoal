// Serviço de APIs de Proventos - Múltiplas Fontes
// Status Invest, Brasil API, Alpha Vantage

const CACHE_TIMEOUT = 3600000 // 1 hora

class ProventosAPIService {
  constructor() {
    this.cache = new Map()
  }

  // ============================================
  // STATUS INVEST - Principal (Brasil)
  // ============================================
  async buscarStatusInvest(ticker, dataInicial) {
    const cacheKey = `si_${ticker}_${dataInicial}`
    
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey)
      if (Date.now() - cached.timestamp < CACHE_TIMEOUT) {
        return cached.data
      }
    }

    try {
      // Status Invest não tem API oficial pública
      // Usando scraping via proxy/backend ou API não oficial
      const url = `https://statusinvest.com.br/acao/getearnings?ticker=${ticker}`
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0',
          'Accept': 'application/json'
        }
      })

      if (!response.ok) throw new Error('Status Invest indisponível')

      const data = await response.json()
      
      const proventos = this.parseStatusInvest(data, ticker, dataInicial)
      
      this.cache.set(cacheKey, { data: proventos, timestamp: Date.now() })
      return proventos

    } catch (error) {
      console.error('Erro Status Invest:', error)
      return []
    }
  }

  parseStatusInvest(data, ticker, dataInicial) {
    const proventos = []
    
    if (!data || !data.earningsValues) return proventos

    data.earningsValues.forEach(item => {
      const dataCom = new Date(item.dataCom)
      const dataInicio = new Date(dataInicial)
      
      if (dataCom >= dataInicio) {
        proventos.push({
          ticker: ticker,
          tipo: this.detectarTipo(item.descricao || item.tipo),
          data_com: item.dataCom,
          data_pagamento: item.dataPagamento,
          valor_por_cota: parseFloat(item.valor),
          fonte: 'status_invest'
        })
      }
    })

    return proventos
  }

  // ============================================
  // BRASIL API - Fallback
  // ============================================
  async buscarBrasilAPI(ticker, dataInicial) {
    const cacheKey = `ba_${ticker}_${dataInicial}`
    
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey)
      if (Date.now() - cached.timestamp < CACHE_TIMEOUT) {
        return cached.data
      }
    }

    try {
      // Brasil API tem endpoint de cotações mas não de dividendos completo
      // Usando como fallback para verificar se ativo existe
      const url = `https://brasilapi.com.br/api/quote/${ticker}`
      
      const response = await fetch(url)
      
      if (!response.ok) throw new Error('Brasil API indisponível')

      // Brasil API não retorna dividendos diretamente
      // Retorna vazio, serve apenas para validação
      return []

    } catch (error) {
      console.error('Erro Brasil API:', error)
      return []
    }
  }

  // ============================================
  // ALPHA VANTAGE - Internacional
  // ============================================
  async buscarAlphaVantage(ticker, dataInicial) {
    const cacheKey = `av_${ticker}_${dataInicial}`
    
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey)
      if (Date.now() - cached.timestamp < CACHE_TIMEOUT) {
        return cached.data
      }
    }

    try {
      // Remover .SA do ticker para Alpha Vantage
      const tickerClean = ticker.replace('.SA', '')
      
      // Alpha Vantage requer API Key (free tier: 25 req/dia)
      const apiKey = import.meta.env.VITE_ALPHA_VANTAGE_KEY || 'demo'
      const url = `https://www.alphavantage.co/query?function=DIVIDENDS&symbol=${tickerClean}&apikey=${apiKey}`
      
      const response = await fetch(url)
      
      if (!response.ok) throw new Error('Alpha Vantage indisponível')

      const data = await response.json()
      
      if (data.Note) {
        console.warn('Alpha Vantage: Limite de API atingido')
        return []
      }

      const proventos = this.parseAlphaVantage(data, ticker, dataInicial)
      
      this.cache.set(cacheKey, { data: proventos, timestamp: Date.now() })
      return proventos

    } catch (error) {
      console.error('Erro Alpha Vantage:', error)
      return []
    }
  }

  parseAlphaVantage(data, ticker, dataInicial) {
    const proventos = []
    
    if (!data || !data.data) return proventos

    data.data.forEach(item => {
      const dataPagamento = new Date(item.payment_date)
      const dataInicio = new Date(dataInicial)
      
      if (dataPagamento >= dataInicio) {
        proventos.push({
          ticker: ticker,
          tipo: 'DIVIDENDO',
          data_com: item.ex_dividend_date,
          data_pagamento: item.payment_date,
          valor_por_cota: parseFloat(item.amount),
          fonte: 'alpha_vantage'
        })
      }
    })

    return proventos
  }

  // ============================================
  // YFinance via Proxy - Backup
  // ============================================
  async buscarYahooFinance(ticker, dataInicial) {
    try {
      // Adicionar .SA para ativos brasileiros se não tiver
      const tickerYahoo = ticker.includes('.SA') ? ticker : `${ticker}.SA`
      
      // Usar proxy ou backend para evitar CORS
      const url = `/api/yahoo-finance?ticker=${tickerYahoo}&from=${dataInicial}`
      
      const response = await fetch(url)
      
      if (!response.ok) throw new Error('Yahoo Finance indisponível')

      const data = await response.json()
      
      return this.parseYahooFinance(data, ticker, dataInicial)

    } catch (error) {
      console.error('Erro Yahoo Finance:', error)
      return []
    }
  }

  parseYahooFinance(data, ticker, dataInicial) {
    const proventos = []
    
    if (!data || !data.dividends) return proventos

    Object.entries(data.dividends).forEach(([date, value]) => {
      const dataPagamento = new Date(date)
      const dataInicio = new Date(dataInicial)
      
      if (dataPagamento >= dataInicio) {
        proventos.push({
          ticker: ticker,
          tipo: 'DIVIDENDO',
          data_com: date,
          data_pagamento: date,
          valor_por_cota: parseFloat(value),
          fonte: 'yahoo_finance'
        })
      }
    })

    return proventos
  }

  // ============================================
  // BUSCA COM FALLBACK AUTOMÁTICO
  // ============================================
  async buscarProventos(ticker, dataInicial) {
    const fontes = [
      { nome: 'status_invest', fn: () => this.buscarStatusInvest(ticker, dataInicial) },
      { nome: 'yahoo_finance', fn: () => this.buscarYahooFinance(ticker, dataInicial) },
      { nome: 'alpha_vantage', fn: () => this.buscarAlphaVantage(ticker, dataInicial) },
      { nome: 'brasil_api', fn: () => this.buscarBrasilAPI(ticker, dataInicial) }
    ]

    for (const fonte of fontes) {
      try {
        const proventos = await fonte.fn()
        
        if (proventos && proventos.length > 0) {
          console.log(`✅ ${ticker}: ${proventos.length} proventos de ${fonte.nome}`)
          return proventos
        }
      } catch (error) {
        console.warn(`❌ ${fonte.nome} falhou para ${ticker}`)
        continue
      }
    }

    console.warn(`⚠️ Nenhuma fonte retornou proventos para ${ticker}`)
    return []
  }

  // ============================================
  // UTILITÁRIOS
  // ============================================
  detectarTipo(descricao) {
    const desc = descricao?.toLowerCase() || ''
    
    if (desc.includes('jcp') || desc.includes('juros')) return 'JCP'
    if (desc.includes('dividendo')) return 'DIVIDENDO'
    if (desc.includes('rendimento')) return 'RENDIMENTO'
    
    return 'DIVIDENDO' // Padrão
  }

  limparCache() {
    this.cache.clear()
  }
}

export const proventosAPI = new ProventosAPIService()
