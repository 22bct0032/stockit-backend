const express = require('express');
const router = express.Router();
const db = require('../config/database');

// Admin middleware - simple password protection
const adminAuth = (req, res, next) => {
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
  const providedPassword = req.query.password || req.headers['x-admin-password'];
  
  if (providedPassword === adminPassword) {
    next();
  } else {
    res.status(401).json({ 
      success: false, 
      message: 'Unauthorized. Add ?password=admin123 to URL' 
    });
  }
};

// Get all users
router.get('/users', adminAuth, async (req, res) => {
  try {
    const users = await db.all(`
      SELECT 
        u.id,
        u.fullName,
        u.email,
        u.createdAt,
        w.balance,
        w.totalInvested,
        (SELECT COUNT(*) FROM portfolios WHERE userId = u.id) as totalHoldings,
        (SELECT COUNT(*) FROM transactions WHERE userId = u.id) as totalTransactions,
        (SELECT COUNT(*) FROM watchlists WHERE userId = u.id) as watchlistCount
      FROM users u
      LEFT JOIN wallets w ON u.id = w.userId
      ORDER BY u.createdAt DESC
    `);

    res.json({
      success: true,
      totalUsers: users.length,
      users: users.map(u => ({
        id: u.id,
        fullName: u.fullname || u.fullName,
        email: u.email,
        createdAt: u.createdat || u.createdAt,
        balance: u.balance || 0,
        totalInvested: u.totalinvested || u.totalInvested || 0,
        totalHoldings: u.totalholdings || u.totalHoldings || 0,
        totalTransactions: u.totaltransactions || u.totalTransactions || 0,
        watchlistCount: u.watchlistcount || u.watchlistCount || 0
      }))
    });
  } catch (error) {
    console.error('Admin get users error:', error);
    res.status(500).json({ success: false, message: 'Database error' });
  }
});

// Get user details by ID
router.get('/users/:userId', adminAuth, async (req, res) => {
  try {
    const userId = req.params.userId;

    const user = await db.get('SELECT * FROM users WHERE id = $1', [userId]);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const wallet = await db.get('SELECT * FROM wallets WHERE userId = $1', [userId]);
    const portfolio = await db.all('SELECT * FROM portfolios WHERE userId = $1', [userId]);
    const transactions = await db.all('SELECT * FROM transactions WHERE userId = $1 ORDER BY transactionDate DESC LIMIT 20', [userId]);
    const watchlist = await db.all('SELECT * FROM watchlists WHERE userId = $1', [userId]);

    res.json({
      success: true,
      user: {
        id: user.id,
        fullName: user.fullname || user.fullName,
        email: user.email,
        createdAt: user.createdat || user.createdAt
      },
      wallet: wallet || {},
      portfolio: portfolio || [],
      recentTransactions: transactions || [],
      watchlist: watchlist || []
    });
  } catch (error) {
    console.error('Admin get user details error:', error);
    res.status(500).json({ success: false, message: 'Database error' });
  }
});

// Get database stats
router.get('/stats', adminAuth, async (req, res) => {
  try {
    const userCount = await db.get('SELECT COUNT(*) as count FROM users');
    const transactionCount = await db.get('SELECT COUNT(*) as count FROM transactions');
    const portfolioCount = await db.get('SELECT COUNT(*) as count FROM portfolios');
    const watchlistCount = await db.get('SELECT COUNT(*) as count FROM watchlists');
    
    const totalInvested = await db.get('SELECT SUM(balance) as total FROM wallets');
    const totalVolume = await db.get('SELECT SUM(totalAmount) as total FROM transactions');

    res.json({
      success: true,
      stats: {
        totalUsers: userCount.count,
        totalTransactions: transactionCount.count,
        totalPortfolioHoldings: portfolioCount.count,
        totalWatchlistItems: watchlistCount.count,
        totalWalletBalance: totalInvested.total || 0,
        totalTransactionVolume: totalVolume.total || 0
      }
    });
  } catch (error) {
    console.error('Admin get stats error:', error);
    res.status(500).json({ success: false, message: 'Database error' });
  }
});

module.exports = router;
