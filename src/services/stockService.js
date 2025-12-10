const axios = require('axios');

// Mock stock data for testing (replace with real API in production)
const mockStocks = {
  'AAPL': { symbol: 'AAPL', name: 'Apple Inc.', price: 178.50, change: 2.30, changePercent: 1.31 },
  'GOOGL': { symbol: 'GOOGL', name: 'Alphabet Inc.', price: 140.25, change: -1.50, changePercent: -1.06 },
  'MSFT': { symbol: 'MSFT', name: 'Microsoft Corporation', price: 378.91, change: 3.20, changePercent: 0.85 },
  'TSLA': { symbol: 'TSLA', name: 'Tesla, Inc.', price: 242.84, change: 5.60, changePercent: 2.36 },
  'AMZN': { symbol: 'AMZN', name: 'Amazon.com Inc.', price: 151.94, change: 1.80, changePercent: 1.20 },
  'META': { symbol: 'META', name: 'Meta Platforms Inc.', price: 338.79, change: -2.10, changePercent: -0.62 },
  'NVDA': { symbol: 'NVDA', name: 'NVIDIA Corporation', price: 495.22, change: 8.40, changePercent: 1.72 },
  'NFLX': { symbol: 'NFLX', name: 'Netflix Inc.', price: 487.55, change: 4.30, changePercent: 0.89 }
};

exports.getStockQuote = async (symbol) => {
  try {
    // Return mock data for now
    const stock = mockStocks[symbol.toUpperCase()];
    if (stock) {
      return {
        success: true,
        data: {
          symbol: stock.symbol,
          companyName: stock.name,
          currentPrice: stock.price,
          change: stock.change,
          changePercent: stock.changePercent,
          high: stock.price * 1.02,
          low: stock.price * 0.98,
          volume: Math.floor(Math.random() * 10000000) + 1000000,
          timestamp: new Date().toISOString()
        }
      };
    }
    
    // Generate random data for unknown symbols
    const price = Math.random() * 500 + 50;
    return {
      success: true,
      data: {
        symbol: symbol.toUpperCase(),
        companyName: `${symbol.toUpperCase()} Company`,
        currentPrice: parseFloat(price.toFixed(2)),
        change: parseFloat((Math.random() * 10 - 5).toFixed(2)),
        changePercent: parseFloat((Math.random() * 4 - 2).toFixed(2)),
        high: parseFloat((price * 1.02).toFixed(2)),
        low: parseFloat((price * 0.98).toFixed(2)),
        volume: Math.floor(Math.random() * 10000000) + 1000000,
        timestamp: new Date().toISOString()
      }
    };
  } catch (error) {
    console.error('Error fetching stock:', error);
    return {
      success: false,
      error: 'Failed to fetch stock data'
    };
  }
};

exports.getTrendingStocks = async () => {
  const trending = Object.values(mockStocks).map((stock, index) => ({
    symbol: stock.symbol,
    name: stock.name,
    price: stock.price,
    change: stock.change,
    changePercent: stock.changePercent,
    volume: Math.floor(Math.random() * 10000000) + 1000000,
    high: stock.price * 1.02,
    low: stock.price * 0.98,
    rank: index + 1,
    positive: stock.change > 0
  }));

  return {
    success: true,
    count: trending.length,
    source: 'mock',
    lastUpdated: new Date().toISOString(),
    cached: false,
    stocks: trending,
    timestamp: new Date().toISOString()
  };
};

exports.searchStocks = async (query) => {
  const results = Object.values(mockStocks)
    .filter(stock => 
      stock.symbol.toLowerCase().includes(query.toLowerCase()) ||
      stock.name.toLowerCase().includes(query.toLowerCase())
    )
    .map(stock => ({
      symbol: stock.symbol,
      name: stock.name,
      price: stock.price,
      change: stock.change,
      changePercent: stock.changePercent
    }));

  return {
    success: true,
    data: results,
    timestamp: new Date().toISOString()
  };
};
