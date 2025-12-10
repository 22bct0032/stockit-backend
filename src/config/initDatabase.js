const db = require('./database');

// Create tables
const initDatabase = () => {
  // Users table
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fullName TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Wallets table
  db.run(`
    CREATE TABLE IF NOT EXISTS wallets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER UNIQUE NOT NULL,
      balance REAL DEFAULT 100000,
      totalInvested REAL DEFAULT 0,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Portfolios table
  db.run(`
    CREATE TABLE IF NOT EXISTS portfolios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      symbol TEXT NOT NULL,
      companyName TEXT,
      quantity INTEGER NOT NULL,
      avgPrice REAL NOT NULL,
      firstBuyDate DATETIME DEFAULT CURRENT_TIMESTAMP,
      lastUpdated DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(userId, symbol)
    )
  `);

  // Transactions table
  db.run(`
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      symbol TEXT NOT NULL,
      companyName TEXT,
      transactionType TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      price REAL NOT NULL,
      totalAmount REAL NOT NULL,
      transactionDate DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Watchlists table
  db.run(`
    CREATE TABLE IF NOT EXISTS watchlists (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      symbol TEXT NOT NULL,
      companyName TEXT,
      addedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(userId, symbol)
    )
  `, (err) => {
    if (err) {
      console.error('Error creating tables:', err.message);
    } else {
      console.log('✅ Database tables created successfully');
    }
  });
};

// Run initialization
initDatabase();

module.exports = initDatabase;
