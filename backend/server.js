const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
require('dotenv').config();

const app = express();
// Use SERVER_PORT to avoid conflict with system PORT env var
const PORT = parseInt(process.env.SERVER_PORT || process.env.API_PORT, 10) || 3001;
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'database.sqlite');

// Middleware
app.use(cors());
app.use(express.json());

// Serve uploaded images statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Initialize SQLite database
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
    process.exit(1);
  }
  console.log('Connected to SQLite database at', DB_PATH);
  initTables();
});

function initTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS images (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT NOT NULL,
      path TEXT NOT NULL,
      title TEXT,
      category TEXT,
      score REAL,
      price_cents INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      credits_cents INTEGER NOT NULL DEFAULT 0,
      subscription_tier TEXT DEFAULT 'free',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS purchases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      image_id INTEGER NOT NULL,
      amount_cents INTEGER NOT NULL DEFAULT 0,
      purchased_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (image_id) REFERENCES images(id)
    );
  `, (err) => {
    if (err) {
      console.error('Error creating tables:', err.message);
    } else {
      console.log('Database tables initialized.');
    }
  });
}

// Helper: price from score in cents
function priceFromScore(score) {
  // 0-10 -> 0.09 EUR, 10-20 -> 0.19 EUR, ..., 90-100 -> 0.99 EUR
  const clamped = Math.max(0, Math.min(100, score || 0));
  const bucket = Math.floor(clamped / 10); // 0-9
  const euros = 0.09 + bucket * 0.10; // 0.09, 0.19, 0.29 ... 0.99
  return Math.round(euros * 100); // convert to cents
}

// ── API Endpoints ──

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// GET /api/images — list all images with optional filters
app.get('/api/images', (req, res) => {
  const { category, min_score, max_price } = req.query;
  let sql = 'SELECT * FROM images WHERE 1=1';
  const params = [];

  if (category) {
    sql += ' AND category = ?';
    params.push(category);
  }
  if (min_score !== undefined) {
    sql += ' AND score >= ?';
    params.push(parseFloat(min_score));
  }
  if (max_price !== undefined) {
    sql += ' AND price_cents <= ?';
    params.push(parseInt(max_price, 10));
  }

  sql += ' ORDER BY created_at DESC';

  db.all(sql, params, (err, rows) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ images: rows });
  });
});

// GET /api/images/:id — single image details
app.get('/api/images/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    return res.status(400).json({ error: 'Invalid image id' });
  }

  db.get('SELECT * FROM images WHERE id = ?', [id], (err, row) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Database error' });
    }
    if (!row) {
      return res.status(404).json({ error: 'Image not found' });
    }
    res.json({ image: row });
  });
});

// POST /api/upload — receive image metadata (for bulk import or single insert)
app.post('/api/upload', (req, res) => {
  const { filename, path: imagePath, title, category, score } = req.body;

  if (!filename || !imagePath) {
    return res.status(400).json({ error: 'filename and path are required' });
  }

  const priceCents = priceFromScore(parseFloat(score) || 0);

  db.run(
    'INSERT INTO images (filename, path, title, category, score, price_cents) VALUES (?, ?, ?, ?, ?, ?)',
    [filename, imagePath, title || null, category || null, score || null, priceCents],
    function (err) {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Database error' });
      }
      res.status(201).json({ id: this.lastID, price_cents: priceCents });
    }
  );
});

// POST /api/cart/checkout — process cart checkout
app.post('/api/cart/checkout', (req, res) => {
  const { image_ids } = req.body;

  if (!Array.isArray(image_ids) || image_ids.length === 0) {
    return res.status(400).json({ error: 'image_ids must be a non-empty array' });
  }

  const placeholders = image_ids.map(() => '?').join(',');
  const sql = `SELECT id, price_cents FROM images WHERE id IN (${placeholders})`;

  db.all(sql, image_ids, (err, rows) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Database error' });
    }

    if (rows.length !== image_ids.length) {
      const foundIds = new Set(rows.map((r) => r.id));
      const missing = image_ids.filter((id) => !foundIds.has(id));
      return res.status(400).json({ error: 'Some images not found', missing });
    }

    const totalCents = rows.reduce((sum, r) => sum + r.price_cents, 0);

    // In a real app you'd create a purchase record per image, tied to a user.
    // For MVP, we just return the total without persisting a purchase.
    res.json({
      total_cents: totalCents,
      total_eur: (totalCents / 100).toFixed(2),
      item_count: rows.length,
    });
  });
});

// 404 fallback
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Graceful shutdown
process.on('SIGINT', () => {
  db.close(() => {
    console.log('Database connection closed.');
    process.exit(0);
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
