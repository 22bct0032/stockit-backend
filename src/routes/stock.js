const express = require('express');
const router = express.Router();
const stockController = require('../controllers/stockController');

router.get('/stock/:symbol', stockController.getStock);
router.get('/stock/:symbol/quote', stockController.getStock);
router.get('/stock/:symbol/details', stockController.getStock);
router.get('/trending', stockController.getTrending);
router.get('/search', stockController.searchStocks);

module.exports = router;
