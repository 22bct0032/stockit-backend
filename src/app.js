require('dotenv').config();
const express = require('express');
const cors = require('cors');
const initDatabase = require('./config/initDatabase');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api', require('./routes/stock'));
app.use('/api/user', require('./routes/user'));

// Health check
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'StockIt API Server',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

app.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found'
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server
app.listen(PORT, () => {
  console.log('');
  console.log('='.repeat(50));
  console.log('🚀 StockIt API Server Started!');
  console.log('='.repeat(50));
  console.log(`📡 Server running on: http://localhost:${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`💾 Database: SQLite (${process.env.DB_PATH || 'database.sqlite'})`);
  console.log('');
  console.log('Available endpoints:');
  console.log('  POST   /api/auth/signup-simple');
  console.log('  POST   /api/auth/signin-simple');
  console.log('  GET    /api/stock/:symbol');
  console.log('  GET    /api/trending');
  console.log('  GET    /api/search?q=query');
  console.log('  GET    /api/user/wallet');
  console.log('  GET    /api/user/portfolio');
  console.log('  POST   /api/user/stocks/buy');
  console.log('  POST   /api/user/stocks/sell');
  console.log('  GET    /api/user/watchlist');
  console.log('='.repeat(50));
  console.log('');
});

module.exports = app;
