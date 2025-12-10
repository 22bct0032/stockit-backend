const express = require('express');
const router = express.Router();
const portfolioController = require('../controllers/portfolioController');
const watchlistController = require('../controllers/watchlistController');
const authMiddleware = require('../middleware/auth');

// All routes require authentication
router.use(authMiddleware);

// Wallet routes
router.get('/wallet', portfolioController.getWallet);

// Portfolio routes
router.get('/portfolio', portfolioController.getPortfolio);
router.post('/stocks/buy', portfolioController.buyStock);
router.post('/stocks/sell', portfolioController.sellStock);
router.get('/transactions', portfolioController.getTransactions);

// Watchlist routes
router.get('/watchlist', watchlistController.getWatchlist);
router.post('/watchlist', watchlistController.addToWatchlist);
router.delete('/watchlist/:symbol', watchlistController.removeFromWatchlist);
router.get('/watchlist/check/:symbol', watchlistController.checkWatchlistStatus);

module.exports = router;
