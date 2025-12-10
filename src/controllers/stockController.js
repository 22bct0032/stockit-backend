const stockService = require('../services/stockService');

exports.getStock = async (req, res) => {
  try {
    const { symbol } = req.params;
    const result = await stockService.getStockQuote(symbol);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch stock' });
  }
};

exports.getTrending = async (req, res) => {
  try {
    const result = await stockService.getTrendingStocks();
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch trending stocks' });
  }
};

exports.searchStocks = async (req, res) => {
  try {
    const { q } = req.query;
    const result = await stockService.searchStocks(q || '');
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to search stocks' });
  }
};
