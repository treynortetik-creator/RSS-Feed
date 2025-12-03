const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = process.env.DATABASE_PATH || './data/feeds.db';
const dbDir = path.dirname(dbPath);

// Ensure data directory exists
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err);
  } else {
    console.log('Connected to SQLite database');
  }
});

const initDatabase = () => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Feeds table
      db.run(`
        CREATE TABLE IF NOT EXISTS feeds (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          source_url TEXT NOT NULL,
          feed_type TEXT NOT NULL,
          config TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          last_fetched DATETIME,
          status TEXT DEFAULT 'active'
        )
      `, (err) => {
        if (err) reject(err);
      });

      // Feed items table
      db.run(`
        CREATE TABLE IF NOT EXISTS feed_items (
          id TEXT PRIMARY KEY,
          feed_id TEXT NOT NULL,
          title TEXT,
          description TEXT,
          link TEXT,
          pub_date DATETIME,
          author TEXT,
          content TEXT,
          image_url TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (feed_id) REFERENCES feeds(id) ON DELETE CASCADE
        )
      `, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  });
};

const getDb = () => db;

module.exports = { initDatabase, getDb };
