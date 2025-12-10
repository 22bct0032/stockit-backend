const db = require('../config/database');
const stockService = require('../services/stockService');

exports.getWatchlist = async (req, res) => {
  try {
    const userId = req.userId;

    const watchlist = await db.all(
      'SELECT * FROM watchlists WHERE userId = $1 ORDER BY addedAt DESC',
      [userId]
    );

    // Enrich with current prices
    const enrichedWatchlist = await Promise.all(
      watchlist.map(async (item) => {
        const stockData = await stockService.getStockQuote(item.symbol);
        return {
          symbol: item.symbol,
          companyName: item.companyname || item.companyName,
          price: stockData.data.currentPrice,
          change: stockData.data.change,
          changePercent: stockData.data.changePercent,
          high: stockData.data.high,
          low: stockData.data.low,
          volume: stockData.data.volume,
          addedAt: item.addedat || item.addedAt,
          inWatchlist: true
        };
      })
    );

    res.json({
      success: true,
      totalStocks: enrichedWatchlist.length,
      stocks: enrichedWatchlist,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Get watchlist error:', error);
    res.status(500).json({ success: false, message: 'Database error' });
  }
};

exports.addToWatchlist = async (req, res) => {
  try {
    const userId = req.userId;
    const { symbol } = req.body;

    if (!symbol) {
      return res.status(400).json({ success: false, message: 'Symbol is required' });
    }

    const stockData = await stockService.getStockQuote(symbol);

    await db.run(
      'INSERT INTO watchlists (userId, symbol, companyName) VALUES ($1, $2, $3)',
      [userId, symbol.toUpperCase(), stockData.data.companyName]
    );

    res.json({
      success: true,
      added: true,
      symbol: symbol.toUpperCase(),
      companyName: stockData.data.companyName,
      message: 'Added to watchlist',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Add to watchlist error:', error);
    if (error.message && error.message.includes('unique')) {
      return res.status(409).json({ success: false, message: 'Stock already in watchlist' });
    }
    res.status(500).json({ success: false, message: 'Failed to add to watchlist' });
  }
};

exports.removeFromWatchlist = async (req, res) => {
  try {
    const userId = req.userId;
    const { symbol } = req.params;

    const result = await db.run(
      'DELETE FROM watchlists WHERE userId = $1 AND symbol = $2',
      [userId, symbol.toUpperCase()]
    );

    const changes = result.rowCount || result.changes || 0;

    if (changes === 0) {
      return res.status(404).json({ success: false, message: 'Stock not in watchlist' });
    }

    res.json({
      success: true,
      removed: true,
      symbol: symbol.toUpperCase(),
      message: 'Removed from watchlist',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Remove from watchlist error:', error);
    res.status(500).json({ success: false, message: 'Database error' });
  }
};

exports.checkWatchlistStatus = async (req, res) => {
  try {
    const userId = req.userId;
    const { symbol } = req.params;

    const item = await db.get(
      'SELECT * FROM watchlists WHERE userId = $1 AND symbol = $2',
      [userId, symbol.toUpperCase()]
    );

    res.json({
      success: true,
      inWatchlist: !!item,
      symbol: symbol.toUpperCase(),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Check watchlist status error:', error);
    res.status(500).json({ success: false, message: 'Database error' });
  }
};
