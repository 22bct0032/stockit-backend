const db = require('./database');

// Create tables for PostgreSQL
const initDatabase = async () => {
  const isProduction = process.env.NODE_ENV === 'production';
  
  if (isProduction) {
    // PostgreSQL table creation - create tables first, then add foreign keys
    try {
      console.log('Creating PostgreSQL tables...');
      
      // Users table (no foreign keys)
      await db.query(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          fullName VARCHAR(255) NOT NULL,
          email VARCHAR(255) UNIQUE NOT NULL,
          password VARCHAR(255) NOT NULL,
          createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Wallets table (no foreign keys yet)
      await db.query(`
        CREATE TABLE IF NOT EXISTS wallets (
          id SERIAL PRIMARY KEY,
          userId INTEGER UNIQUE NOT NULL,
          balance DECIMAL(15,2) DEFAULT 100000,
          totalInvested DECIMAL(15,2) DEFAULT 0,
          updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Portfolios table (no foreign keys yet)
      await db.query(`
        CREATE TABLE IF NOT EXISTS portfolios (
          id SERIAL PRIMARY KEY,
          userId INTEGER NOT NULL,
          symbol VARCHAR(10) NOT NULL,
          companyName VARCHAR(255),
          quantity INTEGER NOT NULL,
          avgPrice DECIMAL(15,2) NOT NULL,
          firstBuyDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          lastUpdated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(userId, symbol)
        )
      `);

      // Transactions table (no foreign keys yet)
      await db.query(`
        CREATE TABLE IF NOT EXISTS transactions (
          id SERIAL PRIMARY KEY,
          userId INTEGER NOT NULL,
          symbol VARCHAR(10) NOT NULL,
          companyName VARCHAR(255),
          transactionType VARCHAR(10) NOT NULL,
          quantity INTEGER NOT NULL,
          price DECIMAL(15,2) NOT NULL,
          totalAmount DECIMAL(15,2) NOT NULL,
          transactionDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Watchlists table (no foreign keys yet)
      await db.query(`
        CREATE TABLE IF NOT EXISTS watchlists (
          id SERIAL PRIMARY KEY,
          userId INTEGER NOT NULL,
          symbol VARCHAR(10) NOT NULL,
          companyName VARCHAR(255),
          addedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(userId, symbol)
        )
      `);

      console.log('✅ PostgreSQL database tables created successfully');
    } catch (error) {
      console.error('Error creating PostgreSQL tables:', error);
      throw error;
    }
  } else {
    // SQLite table creation (existing code)
    try {
      await db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          fullName TEXT NOT NULL,
          email TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await db.run(`
        CREATE TABLE IF NOT EXISTS wallets (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          userId INTEGER UNIQUE NOT NULL,
          balance REAL DEFAULT 100000,
          totalInvested REAL DEFAULT 0,
          updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
        )
      `);

      await db.run(`
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

      await db.run(`
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

      await db.run(`
        CREATE TABLE IF NOT EXISTS watchlists (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          userId INTEGER NOT NULL,
          symbol TEXT NOT NULL,
          companyName TEXT,
          addedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
          UNIQUE(userId, symbol)
        )
      `);

      console.log('✅ SQLite database tables created successfully');
    } catch (error) {
      console.error('Error creating SQLite tables:', error);
    }
  }
};

// Run initialization
initDatabase();

module.exports = initDatabase;
