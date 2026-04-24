const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
require('dotenv').config();

// Stripe SDK for payments (TEST MODE)
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';

// E-Mail-Modul für Kauf-Bestätigungen
const { sendPurchaseEmail, verifyDownloadToken } = require('./routes/email');

const app = express();
const PORT = parseInt(process.env.SERVER_PORT || process.env.API_PORT, 10) || 3001;
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'database.sqlite');

// ── Middleware ──
// IMPORTANT: Stripe webhook must use RAW body, so it comes BEFORE express.json()
app.use('/api/webhook', express.raw({ type: 'application/json' }));

// Standard JSON parser for all other routes
app.use(cors());
app.use(express.json());

// Serve uploaded images statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
// Serve frontend static files (success.html, cancel.html, css, js)
app.use(express.static(path.join(__dirname, '..')));

// Initialize SQLite database
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
    process.exit(1);
  }
  console.log('Connected to SQLite database at', DB_PATH);
  initTables();
  migratePurchasesTable(); // Neue Spalten für E-Mail-Tracking hinzufügen
});

/**
 * Migration: Fügt fehlende Spalten zur purchases-Tabelle hinzu (SQLite-safe).
 */
function migratePurchasesTable() {
  // Prüfe, ob Spalten existieren (SQLite hat kein ALTER ADD COLUMN IF NOT EXISTS)
  db.all("PRAGMA table_info(purchases)", [], (err, cols) => {
    if (err) {
      console.error('Migration error (table_info):', err.message);
      return;
    }
    const names = new Set(cols.map((c) => c.name));
    if (!names.has('email_sent')) {
      db.run('ALTER TABLE purchases ADD COLUMN email_sent INTEGER NOT NULL DEFAULT 0', (err) => {
        if (err) console.error('Migration error (email_sent):', err.message);
        else console.log('[MIGRATION] Spalte email_sent hinzugefügt.');
      });
    }
    if (!names.has('invoice_number')) {
      db.run('ALTER TABLE purchases ADD COLUMN invoice_number TEXT', (err) => {
        if (err) console.error('Migration error (invoice_number):', err.message);
        else console.log('[MIGRATION] Spalte invoice_number hinzugefügt.');
      });
    }
  });
}

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
      user_id TEXT NOT NULL,
      image_id INTEGER NOT NULL,
      amount_cents INTEGER NOT NULL DEFAULT 0,
      purchased_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      email_sent INTEGER NOT NULL DEFAULT 0,  -- 0 = ungesendet, 1 = gesendet
      invoice_number TEXT,                  -- Rechnungsnummer aus Bestätigungsmail
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
  res.json({ status: 'ok', stripe_mode: stripe ? 'test' : 'disabled' });
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

// ── STRIPE CHECKOUT ──

/**
 * POST /api/create-checkout-session
 * Creates a Stripe Checkout Session with line_items from cart image_ids.
 * Supports both single-image and multi-image (cart) purchases.
 * Returns { sessionId, url } for redirecting to Stripe.
 */
app.post('/api/create-checkout-session', async (req, res) => {
  try {
    const { image_ids, success_url, cancel_url, user_id = 'anonymous' } = req.body;

    // Validation
    if (!Array.isArray(image_ids) || image_ids.length === 0) {
      return res.status(400).json({ error: 'image_ids must be a non-empty array' });
    }

    // Lookup images from SQLite
    const placeholders = image_ids.map(() => '?').join(',');
    const images = await new Promise((resolve, reject) => {
      db.all(`SELECT id, title, category, filename, price_cents FROM images WHERE id IN (${placeholders})`, image_ids, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    if (images.length === 0) {
      return res.status(404).json({ error: 'No images found' });
    }

    if (images.length !== image_ids.length) {
      const foundIds = new Set(images.map((r) => r.id));
      const missing = image_ids.filter((id) => !foundIds.has(id));
      return res.status(400).json({ error: 'Some images not found', missing });
    }

    // Build Stripe line_items
    const lineItems = images.map((img) => ({
      price_data: {
        currency: 'eur',
        product_data: {
          name: img.title || `Bild #${img.id}`,
          description: `Kategorie: ${img.category || 'Stock-Foto'}`,
        },
        unit_amount: img.price_cents, // Stripe expects integer cents
      },
      quantity: 1,
    }));

    const totalCents = images.reduce((sum, r) => sum + r.price_cents, 0);

    // Create Stripe Checkout Session (TEST MODE)
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: success_url || `http://187.124.22.6:3001/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancel_url || `http://187.124.22.6:3001/cancel.html`,
      metadata: {
        image_ids: JSON.stringify(image_ids),
        user_id: user_id,
        total_cents: String(totalCents),
      },
      // Show test card hint in Stripe hosted checkout
      custom_text: {
        submit: { message: 'Test-Karte: 4242 4242 4242 4242 — Beliebiges Datum in Zukunft — Beliebige CVC' },
      },
    });

    console.log(`Checkout Session created: ${session.id} (${images.length} items, ${(totalCents/100).toFixed(2)} EUR)`);

    res.json({
      sessionId: session.id,
      url: session.url,
    });

  } catch (error) {
    console.error('Error creating checkout session:', error.message);
    res.status(500).json({ error: 'Failed to create checkout session', details: error.message });
  }
});

// ── STRIPE WEBHOOK ──

/**
 * POST /api/webhook
 * Stripe webhook endpoint. Verifies signature when secret is configured.
 * Records purchases in DB on checkout.session.completed.
 */
app.post('/api/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    if (STRIPE_WEBHOOK_SECRET && sig) {
      event = stripe.webhooks.constructEvent(req.body, sig, STRIPE_WEBHOOK_SECRET);
    } else {
      // Test mode: parse raw JSON directly (no signature verification)
      event = JSON.parse(req.body);
      console.log('Webhook received without signature verification (TEST MODE)');
    }
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log(`Webhook event: ${event.type}`);

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      await recordPurchase(session);
      // E-Mail-Bestätigung nach erfolgreichem Checkout senden
      await sendPurchaseConfirmation(session);
      break;
    }
    case 'payment_intent.succeeded': {
      console.log(`PaymentIntent succeeded: ${event.data.object.id}`);
      break;
    }
    default:
      console.log(`Unhandled webhook event: ${event.type}`);
  }

  res.json({ received: true });
});

/**
 * Records a purchase into the purchases table after Stripe checkout completes.
 */
async function recordPurchase(session) {
  try {
    const imageIds = JSON.parse(session.metadata?.image_ids || '[]');
    const userId = session.metadata?.user_id || 'anonymous';
    const totalCents = parseInt(session.metadata?.total_cents || '0', 10);

    if (!Array.isArray(imageIds) || imageIds.length === 0) {
      console.warn('No image_ids in session metadata');
      return;
    }

    // Lookup image prices to distribute per-image amounts
    const placeholders = imageIds.map(() => '?').join(',');
    const images = await new Promise((resolve, reject) => {
      db.all(`SELECT id, price_cents FROM images WHERE id IN (${placeholders})`, imageIds, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    // Insert one purchase row per image
    for (const img of images) {
      const amount = img.price_cents || Math.round(totalCents / images.length);
      await new Promise((resolve, reject) => {
        db.run(
          'INSERT INTO purchases (user_id, image_id, amount_cents) VALUES (?, ?, ?)',
          [userId, img.id, amount],
          function (err) {
            if (err) reject(err);
            else resolve(this.lastID);
          }
        );
      });
    }

    console.log(`Purchase recorded: Session ${session.id}, User ${userId}, ${images.length} images, ${(totalCents/100).toFixed(2)} EUR`);

  } catch (error) {
    console.error('Error recording purchase:', error.message);
  }
}

/**
 * Sendet E-Mail-Bestätigung nach erfolgreichem Checkout.
 * Verhindert Doppel-E-Mails durch Prüfung von email_sent.
 */
async function sendPurchaseConfirmation(session) {
  try {
    const imageIds = JSON.parse(session.metadata?.image_ids || '[]');
    const userId = session.metadata?.user_id || 'anonymous';
    const totalCents = parseInt(session.metadata?.total_cents || '0', 10);
    const customerEmail = session.customer_details?.email || session.customer_email;

    if (!customerEmail) {
      console.warn('[EMAIL] Keine Kunden-E-Mail in Session vorhanden, überspringe Bestätigung.');
      return;
    }
    if (!Array.isArray(imageIds) || imageIds.length === 0) {
      console.warn('[EMAIL] Keine image_ids vorhanden, überspringe Bestätigung.');
      return;
    }

    // Prüfe, ob E-Mail bereits gesendet wurde (keine Doppel-E-Mails)
    const alreadySent = await new Promise((resolve, reject) => {
      db.get(
        'SELECT COUNT(*) AS cnt FROM purchases WHERE user_id = ? AND image_id IN (' + imageIds.map(() => '?').join(',') + ') AND email_sent = 1',
        [userId, ...imageIds],
        (err, row) => {
          if (err) reject(err);
          else resolve(row?.cnt || 0);
        }
      );
    });

    if (alreadySent > 0) {
      console.log(`[EMAIL] Bestätigung wurde bereits gesendet (Session: ${session.id}), überspringe.`);
      return;
    }

    // Bild-Details laden (inkl. Titel und Preis)
    const placeholders = imageIds.map(() => '?').join(',');
    const images = await new Promise((resolve, reject) => {
      db.all(`SELECT id, title, price_cents FROM images WHERE id IN (${placeholders})`, imageIds, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    const result = await sendPurchaseEmail(customerEmail, {
      userId,
      images,
      totalCents,
      sessionId: session.id,
      purchasedAt: new Date().toISOString(),
    });

    if (result.success) {
      // Markiere alle gekauften Bilder als "E-Mail gesendet"
      const invoiceNumber = result.info?.invoiceNumber || null;
      await new Promise((resolve, reject) => {
        db.run(
          'UPDATE purchases SET email_sent = 1, invoice_number = ? WHERE user_id = ? AND image_id IN (' + placeholders + ')',
          [invoiceNumber, userId, ...imageIds],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });
      console.log(`[EMAIL] Bestätigung für Session ${session.id} verarbeitet. Rechnung: ${invoiceNumber}`);
    } else {
      console.error(`[EMAIL] Versand fehlgeschlagen für Session ${session.id}:`, result.error);
    }

  } catch (err) {
    console.error('[EMAIL] Fehler in sendPurchaseConfirmation:', err.message);
  }
}

// ── PURCHASE HISTORY ──

/**
 * GET /api/purchases/:userId
 * Returns purchase history for a given user.
 */
app.get('/api/purchases/:userId', (req, res) => {
  const userId = req.params.userId;

  db.all(
    `SELECT p.*, i.title, i.filename, i.path
     FROM purchases p
     JOIN images i ON p.image_id = i.id
     WHERE p.user_id = ?
     ORDER BY p.purchased_at DESC`,
    [userId],
    (err, rows) => {
      if (err) {
        console.error('Error fetching purchases:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      res.json({ purchases: rows });
    }
  );
});

/**
 * GET /api/download/:token
 * Signierter Download-Link für gekaufte Bilder (24h gültig).
 */
app.get('/api/download/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const payload = verifyDownloadToken(token);

    if (!payload) {
      return res.status(403).json({ error: 'Ungültiger oder abgelaufener Download-Link.' });
    }

    const { imageId, userId } = payload;

    // Prüfe, ob der Nutzer das Bild tatsächlich gekauft hat
    const purchase = await new Promise((resolve, reject) => {
      db.get(
        'SELECT 1 FROM purchases WHERE user_id = ? AND image_id = ?',
        [userId, imageId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!purchase) {
      return res.status(403).json({ error: 'Zugriff verweigert — Bild nicht gekauft.' });
    }

    // Bild-Datei-Pfad ermitteln
    const image = await new Promise((resolve, reject) => {
      db.get('SELECT path, filename FROM images WHERE id = ?', [imageId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!image || !image.path) {
      return res.status(404).json({ error: 'Bild nicht gefunden.' });
    }

    const filePath = path.join(__dirname, image.path);
    res.download(filePath, image.filename || `bild-${imageId}.jpg`);

  } catch (err) {
    console.error('[DOWNLOAD] Fehler:', err.message);
    res.status(500).json({ error: 'Download-Fehler.' });
  }
});

// Legacy cart checkout (simulated) — kept for backward compatibility
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

    res.json({
      total_cents: totalCents,
      total_eur: (totalCents / 100).toFixed(2),
      item_count: rows.length,
      note: 'Simulated checkout — use POST /api/create-checkout-session for real payments',
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
  console.log(`Stripe Test Mode: ${stripe ? 'Active' : 'Disabled'}`);
  console.log(`Test Card: 4242 4242 4242 4242 | Any future date | Any CVC`);
});

module.exports = app;
