// api/dividendos-br.js
// BrAPI - API brasileira com dados de dividendos

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  const { ticker } = req.query

  if (!ticker) {
    return res.status(400).json({ error: 'Ticker obrigatório' })
  }

  try {
    // BrAPI - API brasileira gratuita
    const tickerClean = ticker.replace('.SA', '')
    const url = `https://brapi.dev/api/quote/${tickerClean}?dividends=true`

    const response = await fetch(url)

    if (!response.ok) {
      throw new Error('BrAPI indisponível')
    }

    const data = await response.json()
    
    const stock = data.results?.[0]
    const dividends = stock?.dividendsData?.cashDividends || []

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
