#!/usr/bin/env node
/**
 * Bulk import script for stock-photo-shop-v2
 * Reads a JSON file with image data and inserts into SQLite.
 *
 * Example JSON structure:
 * [
 *   { "filename": "cat_01.jpg", "score": 45, "category": "animals", "title": "Cute cat" },
 *   { "filename": "sunset_01.jpg", "score": 88, "category": "nature", "title": "Golden sunset" }
 * ]
 *
 * Usage:
 *   node scripts/import-images.js <path-to-json>
 */

const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const DB_PATH = path.resolve(__dirname, '..', 'database.sqlite');
const UPLOADS_DIR = '/uploads/'; // served path

function priceFromScore(score) {
  // 0-10 -> 0.09 EUR, 10-20 -> 0.19 EUR, ..., 90-100 -> 0.99 EUR
  const clamped = Math.max(0, Math.min(100, score || 0));
  const bucket = Math.floor(clamped / 10); // 0-9
  const euros = 0.09 + bucket * 0.10;
  return Math.round(euros * 100);
}

function main() {
  const inputFile = process.argv[2];
  if (!inputFile) {
    console.error('Usage: node import-images.js <path-to-json>');
    process.exit(1);
  }

  if (!fs.existsSync(inputFile)) {
    console.error('File not found:', inputFile);
    process.exit(1);
  }

  let images;
  try {
    images = JSON.parse(fs.readFileSync(inputFile, 'utf-8'));
  } catch (err) {
    console.error('Error parsing JSON:', err.message);
    process.exit(1);
  }

  if (!Array.isArray(images)) {
    console.error('JSON root must be an array of image objects.');
    process.exit(1);
  }

  const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
      console.error('Error opening database:', err.message);
      process.exit(1);
    }
  });

  const stmt = db.prepare(
    'INSERT INTO images (filename, path, title, category, score, price_cents) VALUES (?, ?, ?, ?, ?, ?)'
  );

  let inserted = 0;
  let skipped = 0;

  db.serialize(() => {
    for (const item of images) {
      const filename = item.filename;
      const score = parseFloat(item.score) || 0;
      const category = item.category || null;
      const title = item.title || null;
      const imagePath = UPLOADS_DIR + filename;
      const priceCents = priceFromScore(score);

      if (!filename) {
        console.warn('Skipping item without filename:', JSON.stringify(item));
        skipped++;
        continue;
      }

      stmt.run(filename, imagePath, title, category, score, priceCents, function (err) {
        if (err) {
          console.error('Insert error for', filename, ':', err.message);
          skipped++;
        } else {
          inserted++;
          console.log(`Inserted ${filename} (score=${score}, price=${(priceCents / 100).toFixed(2)} EUR)`);
        }
      });
    }

    stmt.finalize((err) => {
      if (err) {
        console.error('Finalize error:', err.message);
      }
      db.close(() => {
        console.log(`\nDone. Inserted: ${inserted}, Skipped: ${skipped}`);
        process.exit(0);
      });
    });
  });
}

main();
