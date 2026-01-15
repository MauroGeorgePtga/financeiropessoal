// api/yahoo-finance.js
// Vercel Serverless Function

export default async function handler(req, res) {
  const { ticker, from } = req.query

  if (!ticker) {
    return res.status(400).json({ error: 'Ticker obrigatório' })
  }

  try {
    const period1 = Math.floor(new Date(from || '2024-01-01').getTime() / 1000)
    const period2 = Math.floor(Date.now() / 1000)
    
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?period1=${period1}&period2=${period2}&events=div`

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0'
      }
    })

    if (!response.ok) {
      throw new Error('Yahoo Finance error')
    }

    const data = await response.json()
    
    const dividends = data?.chart?.result?.[0]?.events?.dividends || {}

    res.setHeader('Cache-Control', 's-maxage=3600')
    res.status(200).json({ dividends })

  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}
