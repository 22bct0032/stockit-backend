const db = require('../config/database');
const stockService = require('../services/stockService');

// Get user wallet
exports.getWallet = async (req, res) => {
  try {
    const userId = req.userId;

    const wallet = await db.get(
      `SELECT w.*, 
       (SELECT COALESCE(SUM(quantity * avgPrice), 0) FROM portfolios WHERE userId = $1) as totalInvested,
       (SELECT COALESCE(SUM(quantity * avgPrice), 0) FROM portfolios WHERE userId = $2) + w.balance as totalNetWorth
       FROM wallets w WHERE w.userId = $3`,
      [userId, userId, userId]
    );

    if (!wallet) {
      return res.status(404).json({ success: false, message: 'Wallet not found' });
    }

    res.json({
      success: true,
      userId: userId,
      balance: wallet.balance,
      totalInvested: wallet.totalinvested || wallet.totalInvested,
      totalNetWorth: wallet.totalnetworth || wallet.totalNetWorth,
      updatedAt: wallet.updatedat || wallet.updatedAt
    });
  } catch (error) {
    console.error('Get wallet error:', error);
    res.status(500).json({ success: false, message: 'Database error' });
  }
};

// Buy stock
exports.buyStock = async (req, res) => {
  try {
    const userId = req.userId;
    const { symbol, quantity, pricePerShare } = req.body;

    if (!symbol || !quantity || quantity <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid request' });
    }

    // Get current stock price
    const stockData = await stockService.getStockQuote(symbol);
    const currentPrice = pricePerShare || stockData.data.currentPrice;
    const totalAmount = currentPrice * quantity;

    // Check wallet balance
    const wallet = await db.get('SELECT balance FROM wallets WHERE userId = $1', [userId]);
    
    if (!wallet) {
      return res.status(500).json({ success: false, message: 'Wallet not found' });
    }

    if (wallet.balance < totalAmount) {
      return res.status(400).json({ success: false, message: 'Insufficient balance' });
    }

    // Update wallet
    await db.run(
      'UPDATE wallets SET balance = balance - $1, updatedAt = CURRENT_TIMESTAMP WHERE userId = $2',
      [totalAmount, userId]
    );

    // Check if portfolio entry exists
    const portfolio = await db.get(
      'SELECT * FROM portfolios WHERE userId = $1 AND symbol = $2',
      [userId, symbol]
    );

    if (portfolio) {
      // Update existing
      const newQuantity = portfolio.quantity + quantity;
      const newAvgPrice = ((portfolio.avgprice * portfolio.quantity) + (currentPrice * quantity)) / newQuantity;

      await db.run(
        'UPDATE portfolios SET quantity = $1, avgPrice = $2, lastUpdated = CURRENT_TIMESTAMP WHERE userId = $3 AND symbol = $4',
        [newQuantity, newAvgPrice, userId, symbol]
      );
    } else {
      // Create new
      await db.run(
        'INSERT INTO portfolios (userId, symbol, companyName, quantity, avgPrice) VALUES ($1, $2, $3, $4, $5)',
        [userId, symbol, stockData.data.companyName, quantity, currentPrice]
      );
    }

    // Record transaction
    const result = await db.run(
      'INSERT INTO transactions (userId, symbol, companyName, transactionType, quantity, price, totalAmount) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id',
      [userId, symbol, stockData.data.companyName, 'BUY', quantity, currentPrice, totalAmount]
    );

    const transactionId = result.rows ? result.rows[0].id : result.lastID;

    res.json({
      success: true,
      message: 'Stock purchased successfully',
      data: {
        transactionId,
        symbol,
        quantity,
        price: currentPrice,
        totalAmount,
        type: 'BUY',
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Buy stock error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Sell stock
exports.sellStock = async (req, res) => {
  try {
    const userId = req.userId;
    const { symbol, quantity, pricePerShare } = req.body;

    if (!symbol || !quantity || quantity <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid request' });
    }

    // Get current stock price
    const stockData = await stockService.getStockQuote(symbol);
    const currentPrice = pricePerShare || stockData.data.currentPrice;
    const totalAmount = currentPrice * quantity;

    // Check portfolio
    const portfolio = await db.get(
      'SELECT * FROM portfolios WHERE userId = $1 AND symbol = $2',
      [userId, symbol]
    );

    if (!portfolio) {
      return res.status(404).json({ success: false, message: 'Stock not found in portfolio' });
    }

    if (portfolio.quantity < quantity) {
      return res.status(400).json({ success: false, message: 'Insufficient stock quantity' });
    }

    // Update wallet
    await db.run(
      'UPDATE wallets SET balance = balance + $1, updatedAt = CURRENT_TIMESTAMP WHERE userId = $2',
      [totalAmount, userId]
    );

    // Update portfolio
    const newQuantity = portfolio.quantity - quantity;
    if (newQuantity === 0) {
      await db.run('DELETE FROM portfolios WHERE userId = $1 AND symbol = $2', [userId, symbol]);
    } else {
      await db.run(
        'UPDATE portfolios SET quantity = $1, lastUpdated = CURRENT_TIMESTAMP WHERE userId = $2 AND symbol = $3',
        [newQuantity, userId, symbol]
      );
    }

    // Record transaction
    const result = await db.run(
      'INSERT INTO transactions (userId, symbol, companyName, transactionType, quantity, price, totalAmount) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id',
      [userId, symbol, portfolio.companyname || portfolio.companyName, 'SELL', quantity, currentPrice, totalAmount]
    );

    const transactionId = result.rows ? result.rows[0].id : result.lastID;

    res.json({
      success: true,
      message: 'Stock sold successfully',
      data: {
        transactionId,
        symbol,
        quantity,
        price: currentPrice,
        totalAmount,
        type: 'SELL',
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Sell stock error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Get portfolio
exports.getPortfolio = async (req, res) => {
  try {
    const userId = req.userId;

    const holdings = await db.all(
      'SELECT * FROM portfolios WHERE userId = $1',
      [userId]
    );

    // Get current prices and calculate P&L
    const enrichedHoldings = await Promise.all(
      holdings.map(async (holding) => {
        const stockData = await stockService.getStockQuote(holding.symbol);
        const currentPrice = stockData.data.currentPrice;
        const avgPrice = holding.avgprice || holding.avgPrice;
        const investedAmount = avgPrice * holding.quantity;
        const currentValue = currentPrice * holding.quantity;
        const pnl = currentValue - investedAmount;
        const pnlPercent = (pnl / investedAmount) * 100;

        return {
          symbol: holding.symbol,
          companyName: holding.companyname || holding.companyName,
          quantity: holding.quantity,
          avgPrice: avgPrice,
          currentPrice,
          investedAmount,
          currentValue,
          pnl,
          pnlPercent,
          firstBuyDate: holding.firstbuydate || holding.firstBuyDate,
          lastUpdated: holding.lastupdated || holding.lastUpdated
        };
      })
    );

    const totalInvested = enrichedHoldings.reduce((sum, h) => sum + h.investedAmount, 0);
    const totalCurrentValue = enrichedHoldings.reduce((sum, h) => sum + h.currentValue, 0);
    const totalPnL = totalCurrentValue - totalInvested;
    const totalPnLPercent = totalInvested > 0 ? (totalPnL / totalInvested) * 100 : 0;

    res.json({
      success: true,
      totalHoldings: enrichedHoldings.length,
      totalInvested,
      totalCurrentValue,
      totalPnL,
      totalPnLPercent,
      holdings: enrichedHoldings,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Get portfolio error:', error);
    res.status(500).json({ success: false, message: 'Database error' });
  }
};

// Get transactions
exports.getTransactions = async (req, res) => {
  try {
    const userId = req.userId;
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;

    const transactions = await db.all(
      'SELECT * FROM transactions WHERE userId = $1 ORDER BY transactionDate DESC LIMIT $2 OFFSET $3',
      [userId, limit, offset]
    );

    const countResult = await db.get(
      'SELECT COUNT(*) as total FROM transactions WHERE userId = $1',
      [userId]
    );

    res.json({
      success: true,
      totalTransactions: countResult ? countResult.total : 0,
      limit,
      offset,
      transactions,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ success: false, message: 'Database error' });
  }
};
