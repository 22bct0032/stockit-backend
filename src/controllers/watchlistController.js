const db = require('../config/database');
const stockService = require('../services/stockService');

exports.getWatchlist = async (req, res) => {
  const userId = req.userId;

  db.all(
    'SELECT * FROM watchlists WHERE userId = ? ORDER BY addedAt DESC',
    [userId],
    async (err, watchlist) => {
      if (err) {
        return res.status(500).json({ success: false, message: 'Database error' });
      }

      // Enrich with current prices
      const enrichedWatchlist = await Promise.all(
        watchlist.map(async (item) => {
          const stockData = await stockService.getStockQuote(item.symbol);
          return {
            symbol: item.symbol,
            companyName: item.companyName,
            price: stockData.data.currentPrice,
            change: stockData.data.change,
            changePercent: stockData.data.changePercent,
            high: stockData.data.high,
            low: stockData.data.low,
            volume: stockData.data.volume,
            addedAt: item.addedAt,
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
    }
  );
};

exports.addToWatchlist = async (req, res) => {
  const userId = req.userId;
  const { symbol } = req.body;

  if (!symbol) {
    return res.status(400).json({ success: false, message: 'Symbol is required' });
  }

  try {
    const stockData = await stockService.getStockQuote(symbol);

    db.run(
      'INSERT INTO watchlists (userId, symbol, companyName) VALUES (?, ?, ?)',
      [userId, symbol.toUpperCase(), stockData.data.companyName],
      function(err) {
        if (err) {
          if (err.message.includes('UNIQUE')) {
            return res.status(409).json({ success: false, message: 'Stock already in watchlist' });
          }
          return res.status(500).json({ success: false, message: 'Database error' });
        }

        res.json({
          success: true,
          added: true,
          symbol: symbol.toUpperCase(),
          companyName: stockData.data.companyName,
          message: 'Added to watchlist',
          timestamp: new Date().toISOString()
        });
      }
    );
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to add to watchlist' });
  }
};

exports.removeFromWatchlist = (req, res) => {
  const userId = req.userId;
  const { symbol } = req.params;

  db.run(
    'DELETE FROM watchlists WHERE userId = ? AND symbol = ?',
    [userId, symbol.toUpperCase()],
    function(err) {
      if (err) {
        return res.status(500).json({ success: false, message: 'Database error' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ success: false, message: 'Stock not in watchlist' });
      }

      res.json({
        success: true,
        removed: true,
        symbol: symbol.toUpperCase(),
        message: 'Removed from watchlist',
        timestamp: new Date().toISOString()
      });
    }
  );
};

exports.checkWatchlistStatus = (req, res) => {
  const userId = req.userId;
  const { symbol } = req.params;

  db.get(
    'SELECT * FROM watchlists WHERE userId = ? AND symbol = ?',
    [userId, symbol.toUpperCase()],
    (err, item) => {
      if (err) {
        return res.status(500).json({ success: false, message: 'Database error' });
      }

      res.json({
        success: true,
        inWatchlist: !!item,
        symbol: symbol.toUpperCase(),
        timestamp: new Date().toISOString()
      });
    }
  );
};
