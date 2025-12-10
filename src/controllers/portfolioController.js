const db = require('../config/database');
const stockService = require('../services/stockService');

// Get user wallet
exports.getWallet = (req, res) => {
  const userId = req.userId;

  db.get(
    `SELECT w.*, 
     (SELECT COALESCE(SUM(quantity * avgPrice), 0) FROM portfolios WHERE userId = ?) as totalInvested,
     (SELECT COALESCE(SUM(quantity * avgPrice), 0) FROM portfolios WHERE userId = ?) + w.balance as totalNetWorth
     FROM wallets w WHERE w.userId = ?`,
    [userId, userId, userId],
    (err, wallet) => {
      if (err) {
        return res.status(500).json({ success: false, message: 'Database error' });
      }

      if (!wallet) {
        return res.status(404).json({ success: false, message: 'Wallet not found' });
      }

      res.json({
        success: true,
        userId: userId,
        balance: wallet.balance,
        totalInvested: wallet.totalInvested,
        totalNetWorth: wallet.totalNetWorth,
        updatedAt: wallet.updatedAt
      });
    }
  );
};

// Buy stock
exports.buyStock = async (req, res) => {
  const userId = req.userId;
  const { symbol, quantity, pricePerShare } = req.body;

  if (!symbol || !quantity || quantity <= 0) {
    return res.status(400).json({ success: false, message: 'Invalid request' });
  }

  try {
    // Get current stock price
    const stockData = await stockService.getStockQuote(symbol);
    const currentPrice = pricePerShare || stockData.data.currentPrice;
    const totalAmount = currentPrice * quantity;

    // Check wallet balance
    db.get('SELECT balance FROM wallets WHERE userId = ?', [userId], (err, wallet) => {
      if (err || !wallet) {
        return res.status(500).json({ success: false, message: 'Wallet error' });
      }

      if (wallet.balance < totalAmount) {
        return res.status(400).json({ success: false, message: 'Insufficient balance' });
      }

      // Update wallet
      db.run(
        'UPDATE wallets SET balance = balance - ?, updatedAt = CURRENT_TIMESTAMP WHERE userId = ?',
        [totalAmount, userId],
        (err) => {
          if (err) {
            return res.status(500).json({ success: false, message: 'Failed to update wallet' });
          }

          // Update or create portfolio entry
          db.get(
            'SELECT * FROM portfolios WHERE userId = ? AND symbol = ?',
            [userId, symbol],
            (err, portfolio) => {
              if (portfolio) {
                // Update existing
                const newQuantity = portfolio.quantity + quantity;
                const newAvgPrice = ((portfolio.avgPrice * portfolio.quantity) + (currentPrice * quantity)) / newQuantity;

                db.run(
                  'UPDATE portfolios SET quantity = ?, avgPrice = ?, lastUpdated = CURRENT_TIMESTAMP WHERE userId = ? AND symbol = ?',
                  [newQuantity, newAvgPrice, userId, symbol]
                );
              } else {
                // Create new
                db.run(
                  'INSERT INTO portfolios (userId, symbol, companyName, quantity, avgPrice) VALUES (?, ?, ?, ?, ?)',
                  [userId, symbol, stockData.data.companyName, quantity, currentPrice]
                );
              }

              // Record transaction
              db.run(
                'INSERT INTO transactions (userId, symbol, companyName, transactionType, quantity, price, totalAmount) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [userId, symbol, stockData.data.companyName, 'BUY', quantity, currentPrice, totalAmount],
                function(err) {
                  if (err) {
                    return res.status(500).json({ success: false, message: 'Transaction recording failed' });
                  }

                  res.json({
                    success: true,
                    message: 'Stock purchased successfully',
                    data: {
                      transactionId: this.lastID,
                      symbol,
                      quantity,
                      price: currentPrice,
                      totalAmount,
                      type: 'BUY',
                      timestamp: new Date().toISOString()
                    }
                  });
                }
              );
            }
          );
        }
      );
    });
  } catch (error) {
    console.error('Buy stock error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Sell stock
exports.sellStock = async (req, res) => {
  const userId = req.userId;
  const { symbol, quantity, pricePerShare } = req.body;

  if (!symbol || !quantity || quantity <= 0) {
    return res.status(400).json({ success: false, message: 'Invalid request' });
  }

  try {
    // Get current stock price
    const stockData = await stockService.getStockQuote(symbol);
    const currentPrice = pricePerShare || stockData.data.currentPrice;
    const totalAmount = currentPrice * quantity;

    // Check portfolio
    db.get(
      'SELECT * FROM portfolios WHERE userId = ? AND symbol = ?',
      [userId, symbol],
      (err, portfolio) => {
        if (err || !portfolio) {
          return res.status(404).json({ success: false, message: 'Stock not found in portfolio' });
        }

        if (portfolio.quantity < quantity) {
          return res.status(400).json({ success: false, message: 'Insufficient stock quantity' });
        }

        // Update wallet
        db.run(
          'UPDATE wallets SET balance = balance + ?, updatedAt = CURRENT_TIMESTAMP WHERE userId = ?',
          [totalAmount, userId],
          (err) => {
            if (err) {
              return res.status(500).json({ success: false, message: 'Failed to update wallet' });
            }

            // Update portfolio
            const newQuantity = portfolio.quantity - quantity;
            if (newQuantity === 0) {
              db.run('DELETE FROM portfolios WHERE userId = ? AND symbol = ?', [userId, symbol]);
            } else {
              db.run(
                'UPDATE portfolios SET quantity = ?, lastUpdated = CURRENT_TIMESTAMP WHERE userId = ? AND symbol = ?',
                [newQuantity, userId, symbol]
              );
            }

            // Record transaction
            db.run(
              'INSERT INTO transactions (userId, symbol, companyName, transactionType, quantity, price, totalAmount) VALUES (?, ?, ?, ?, ?, ?, ?)',
              [userId, symbol, portfolio.companyName, 'SELL', quantity, currentPrice, totalAmount],
              function(err) {
                if (err) {
                  return res.status(500).json({ success: false, message: 'Transaction recording failed' });
                }

                res.json({
                  success: true,
                  message: 'Stock sold successfully',
                  data: {
                    transactionId: this.lastID,
                    symbol,
                    quantity,
                    price: currentPrice,
                    totalAmount,
                    type: 'SELL',
                    timestamp: new Date().toISOString()
                  }
                });
              }
            );
          }
        );
      }
    );
  } catch (error) {
    console.error('Sell stock error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Get portfolio
exports.getPortfolio = async (req, res) => {
  const userId = req.userId;

  db.all(
    'SELECT * FROM portfolios WHERE userId = ?',
    [userId],
    async (err, holdings) => {
      if (err) {
        return res.status(500).json({ success: false, message: 'Database error' });
      }

      // Get current prices and calculate P&L
      const enrichedHoldings = await Promise.all(
        holdings.map(async (holding) => {
          const stockData = await stockService.getStockQuote(holding.symbol);
          const currentPrice = stockData.data.currentPrice;
          const investedAmount = holding.avgPrice * holding.quantity;
          const currentValue = currentPrice * holding.quantity;
          const pnl = currentValue - investedAmount;
          const pnlPercent = (pnl / investedAmount) * 100;

          return {
            symbol: holding.symbol,
            companyName: holding.companyName,
            quantity: holding.quantity,
            avgPrice: holding.avgPrice,
            currentPrice,
            investedAmount,
            currentValue,
            pnl,
            pnlPercent,
            firstBuyDate: holding.firstBuyDate,
            lastUpdated: holding.lastUpdated
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
    }
  );
};

// Get transactions
exports.getTransactions = (req, res) => {
  const userId = req.userId;
  const limit = parseInt(req.query.limit) || 50;
  const offset = parseInt(req.query.offset) || 0;

  db.all(
    'SELECT * FROM transactions WHERE userId = ? ORDER BY transactionDate DESC LIMIT ? OFFSET ?',
    [userId, limit, offset],
    (err, transactions) => {
      if (err) {
        return res.status(500).json({ success: false, message: 'Database error' });
      }

      db.get(
        'SELECT COUNT(*) as total FROM transactions WHERE userId = ?',
        [userId],
        (err, count) => {
          res.json({
            success: true,
            totalTransactions: count ? count.total : 0,
            limit,
            offset,
            transactions,
            timestamp: new Date().toISOString()
          });
        }
      );
    }
  );
};
