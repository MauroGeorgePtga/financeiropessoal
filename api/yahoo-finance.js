// api/yahoo-finance.js
// Vercel Serverless - busca dividendos Yahoo Finance

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  const { ticker, interval = '1mo', range = '10y', events = 'div,split' } = req.query

  if (!ticker) {
    return res.status(400).json({ error: 'Ticker obrigatório' })
  }

  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=${interval}&range=${range}&events=${events}`

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0'
      }
    })

    if (!response.ok) {
      throw new Error(`Yahoo: ${response.status}`)
    }

    const data = await response.json()
    
    const result = data?.chart?.result?.[0]
    const dividends = result?.events?.dividends || {}

    res.setHeader('Cache-Control', 's-maxage=3600')
    res.status(200).json({ 
      success: true,
      ticker,
      dividends
    })

  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: error.message 
    })
  }
}
