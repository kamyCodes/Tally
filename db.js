const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'tasks.db');

let db = null;

/**
 * Initialize the SQLite database using sql.js (WASM-based, no native build needed).
 * The DB is persisted to disk after every write so data survives restarts.
 */
async function initDb() {
  const SQL = await initSqlJs();

  // Load existing DB file if it exists, otherwise create a fresh database
  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'in-progress', 'done')),
      due_date TEXT,
      created_date TEXT DEFAULT (datetime('now'))
    )
  `);

  saveDb();
  return db;
}

// Write the in-memory DB to disk
function saveDb() {
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

function getDb() {
  if (!db) throw new Error('Database not initialized. Call initDb() first.');
  return db;
}

module.exports = { initDb, getDb, saveDb };
