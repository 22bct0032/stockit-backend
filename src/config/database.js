const { Pool } = require('pg');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Use PostgreSQL in production, SQLite in development
const isProduction = process.env.NODE_ENV === 'production';
const DATABASE_URL = process.env.DATABASE_URL;

let db;

if (isProduction && DATABASE_URL) {
  // PostgreSQL for production
  console.log('Using PostgreSQL database');
  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });
  
  db = {
    query: (text, params) => pool.query(text, params),
    get: async (text, params) => {
      const result = await pool.query(text, params);
      return result.rows[0];
    },
    all: async (text, params) => {
      const result = await pool.query(text, params);
      return result.rows;
    },
    run: async (text, params) => {
      const result = await pool.query(text, params);
      return result;
    }
  };
} else {
  // SQLite for development
  console.log('Using SQLite database');
  const dbPath = path.resolve(__dirname, '../../database.sqlite');
  const sqliteDb = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('Error opening database:', err.message);
    } else {
      console.log('Connected to SQLite database');
    }
  });
  
  sqliteDb.run('PRAGMA foreign_keys = ON');
  
  // Wrap SQLite in promise-based interface
  db = {
    query: (text, params) => {
      return new Promise((resolve, reject) => {
        sqliteDb.all(text, params, (err, rows) => {
          if (err) reject(err);
          else resolve({ rows });
        });
      });
    },
    get: (text, params) => {
      return new Promise((resolve, reject) => {
        sqliteDb.get(text, params, (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });
    },
    all: (text, params) => {
      return new Promise((resolve, reject) => {
        sqliteDb.all(text, params, (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });
    },
    run: (text, params) => {
      return new Promise((resolve, reject) => {
        sqliteDb.run(text, params, function(err) {
          if (err) reject(err);
          else resolve({ lastID: this.lastID, changes: this.changes });
        });
      });
    }
  };
}

module.exports = db;
