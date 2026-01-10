// api/cotacoes.js
// Função serverless para Vercel que contorna CORS
// Deploy: Adicione este arquivo em /api/cotacoes.js no projeto

export default async function handler(req, res) {
  // Habilitar CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  // Handle OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  // Pegar ticker da query string
  const { ticker } = req.query

  if (!ticker) {
    return res.status(400).json({ error: 'Ticker é obrigatório' })
  }

  try {
    // Adicionar .SA para ações brasileiras
    const tickerYahoo = ticker.includes('.') ? ticker : `${ticker}.SA`

    // Buscar no Yahoo Finance
    const response = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${tickerYahoo}`
    )

    if (!response.ok) {
      throw new Error(`Yahoo Finance API retornou ${response.status}`)
    }

    const data = await response.json()

    if (data.chart && data.chart.result && data.chart.result.length > 0) {
      const info = data.chart.result[0].meta

      return res.status(200).json({
        success: true,
        ticker: ticker,
        nome: info.longName || info.shortName || '',
        cotacao: info.regularMarketPrice,
        variacao: info.regularMarketChange,
        variacaoPercent: info.regularMarketChangePercent,
        timestamp: new Date().toISOString()
      })
    } else {
      return res.status(404).json({
        success: false,
        error: 'Ticker não encontrado'
      })
    }
  } catch (error) {
    console.error('Erro ao buscar cotação:', error)
    return res.status(500).json({
      success: false,
      error: error.message
    })
  }
}
