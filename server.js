const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Initialize SQLite Database
const db = new sqlite3.Database(path.join(__dirname, 'food.db'), (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database.');
    initializeDatabase();
  }
});

// Create table and seed 4 random foods if empty
function initializeDatabase() {
  db.run(`
    CREATE TABLE IF NOT EXISTS meals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      price REAL NOT NULL
    )
  `, (err) => {
    if (err) {
      console.error('Error creating table:', err.message);
      return;
    }

    db.get(`SELECT COUNT(*) AS count FROM meals`, (err, row) => {
      if (err) {
        console.error('Error checking row count:', err.message);
        return;
      }

      if (row.count === 0) {
        const seedFoods = [
          ['Cheeseburger', 'Fast Food', 5.99],
          ['Chicken Rice', 'Asian', 6.50],
          ['Pepperoni Pizza', 'Italian', 7.25],
          ['Caesar Salad', 'Healthy', 4.50]
        ];

        const stmt = db.prepare(`INSERT INTO meals (name, category, price) VALUES (?, ?, ?)`);
        seedFoods.forEach((food) => stmt.run(food));
        stmt.finalize(() => {
          console.log('Seeded 4 initial meals into database.');
        });
      }
    });
  });
}

// 1. Retrieve all food
app.get('/api/meals', (req, res) => {
  db.all(`SELECT * FROM meals`, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// 2. Search and display specific food
app.get('/api/meals/search', (req, res) => {
  const query = req.query.q || '';
  if (!query.trim()) {
    db.all(`SELECT * FROM meals`, [], (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    });
    return;
  }

  const searchTerm = `%${query}%`;
  const sql = `
    SELECT * FROM meals 
    WHERE name LIKE ? OR category LIKE ? OR CAST(id AS TEXT) = ?
  `;
  db.all(sql, [searchTerm, searchTerm, query.trim()], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// Get total count of meals
app.get('/api/meals/count', (req, res) => {
  db.get(`SELECT COUNT(*) AS count FROM meals`, [], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ count: row.count });
  });
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
