#!/usr/bin/env node
/**
 * Bulk image import script for stock-photo-shop-v2 backend.
 *
 * Usage:
 *   node scripts/bulk-import.js --input ./import-data.json [--batch-size 100] [--dry-run]
 *
 * Expected input JSON structure:
 * [
 *   {
 *     "source_path": "/path/to/image1.jpg",
 *     "filename": "image1.jpg",
 *     "title": "Morgennebel über Bergen",
 *     "category": "natur",
 *     "score": 87.5
 *   }
 * ]
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const sqlite3 = require('sqlite3').verbose();

const BACKEND_HOST = 'localhost';
const BACKEND_PORT = 3001;
const API_UPLOAD = '/api/upload';
const UPLOADS_DIR = path.resolve(__dirname, '..', '..', 'uploads');
const DB_PATH = path.resolve(__dirname, '..', 'database.sqlite');
const LOG_FILE = path.resolve(__dirname, 'import-errors.log');

const VALID_IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp']);

function parseArgs(argv) {
  const args = {
    input: './import-data.json',
    batchSize: 100,
    dryRun: false,
  };

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--input') {
      args.input = argv[++i];
    } else if (arg === '--batch-size') {
      args.batchSize = parseInt(argv[++i], 10) || 100;
    } else if (arg === '--dry-run') {
      args.dryRun = true;
    }
  }

  return args;
}

async function checkBackend() {
  return new Promise((resolve, reject) => {
    const req = http.request({ hostname: BACKEND_HOST, port: BACKEND_PORT, path: '/api/health', method: 'GET', timeout: 3000 }, (res) => {
      let body = '';
      res.on('data', chunk => (body += chunk));
      res.on('end', () => {
        try {
          const data = JSON.parse(body);
          if (data.status === 'ok') resolve(true);
          else reject(new Error(`Backend health check failed: ${body}`));
        } catch {
          resolve(true); // assume ok if we got any response
        }
      });
    });

    req.on('error', (err) => reject(new Error(`Backend not reachable on port ${BACKEND_PORT}: ${err.message}`)));
    req.on('timeout', () => reject(new Error(`Backend health check timed out on port ${BACKEND_PORT}`)));
    req.end();
  });
}

function isImageFile(filepath) {
  const ext = path.extname(filepath).toLowerCase();
  return VALID_IMAGE_EXTENSIONS.has(ext);
}

function validateScore(score) {
  const num = parseFloat(score);
  return !Number.isNaN(num) && num >= 0 && num <= 100;
}

function loadExistingFilenames(db) {
  return new Promise((resolve, reject) => {
    db.all('SELECT filename FROM images', (err, rows) => {
      if (err) return reject(err);
      const set = new Set();
      for (const row of rows) {
        if (row.filename) set.add(row.filename.toLowerCase());
      }
      resolve(set);
    });
  });
}

function appendErrorLog(message) {
  const timestamp = new Date().toISOString();
  fs.appendFileSync(LOG_FILE, `[${timestamp}] ${message}\n`);
}

function copyFile(source, dest) {
  return new Promise((resolve, reject) => {
    const readStream = fs.createReadStream(source);
    const writeStream = fs.createWriteStream(dest);
    readStream.on('error', reject);
    writeStream.on('error', reject);
    writeStream.on('finish', resolve);
    readStream.pipe(writeStream);
  });
}

function apiUpload(metadata) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(metadata);
    const options = {
      hostname: BACKEND_HOST,
      port: BACKEND_PORT,
      path: API_UPLOAD,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
      },
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => (body += chunk));
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(body));
          } catch {
            resolve(body);
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${body}`));
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function drawProgressBar(current, total, width = 40) {
  const pct = total > 0 ? current / total : 0;
  const filled = Math.round(width * pct);
  const empty = width - filled;
  const bar = '█'.repeat(filled) + '░'.repeat(empty);
  const pctStr = `${(pct * 100).toFixed(1)}%`;
  process.stdout.write(`\r[${bar}] ${pctStr} (${current}/${total})`);
}

async function main() {
  const args = parseArgs(process.argv);

  // Clear previous error log
  if (fs.existsSync(LOG_FILE)) {
    fs.unlinkSync(LOG_FILE);
  }

  if (!fs.existsSync(args.input)) {
    console.error(`❌ Input file not found: ${args.input}`);
    process.exit(1);
  }

  // Ensure uploads directory exists
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }

  // Check backend
  try {
    await checkBackend();
    console.log(`✅ Backend is running on port ${BACKEND_PORT}`);
  } catch (err) {
    console.error(`❌ ${err.message}`);
    process.exit(1);
  }

  // Open database for duplicate checking
  const db = new sqlite3.Database(DB_PATH);
  let existingFilenames;
  try {
    existingFilenames = await loadExistingFilenames(db);
  } catch (err) {
    console.error('❌ Failed to load existing filenames from DB:', err.message);
    db.close();
    process.exit(1);
  }

  // Load all items to know total count; the array itself is small metadata.
  // If memory is a concern for extremely large metadata files, a streaming JSON
  // parser would be needed, but 50k small objects is fine for the metadata list.
  const items = JSON.parse(fs.readFileSync(args.input, 'utf-8'));
  if (!Array.isArray(items)) {
    console.error('❌ JSON root must be an array');
    process.exit(1);
  }

  const total = items.length;
  console.log(`📦 Total images in import file: ${total}`);
  console.log(`🔧 Batch size: ${args.batchSize}`);
  console.log(`🧪 Dry run: ${args.dryRun ? 'YES' : 'NO'}`);
  console.log('');

  let processed = 0;
  let successful = 0;
  let failed = 0;
  let skipped = 0;

  // Process in batches
  for (let idx = 0; idx < total; idx += args.batchSize) {
    const batch = items.slice(idx, idx + args.batchSize);

    for (const item of batch) {
      processed++;
      const filename = item.filename;
      const sourcePath = item.source_path;

      // Validation
      if (!sourcePath || !fs.existsSync(sourcePath)) {
        const msg = `Skipped: source_path does not exist: ${sourcePath || '(missing)'}`;
        appendErrorLog(msg);
        console.log(`\n⚠️  ${msg}`);
        skipped++;
        drawProgressBar(processed, total);
        continue;
      }

      if (!isImageFile(sourcePath)) {
        const msg = `Skipped: not an image file: ${sourcePath}`;
        appendErrorLog(msg);
        console.log(`\n⚠️  ${msg}`);
        skipped++;
        drawProgressBar(processed, total);
        continue;
      }

      if (!filename) {
        const msg = `Skipped: missing filename for ${sourcePath}`;
        appendErrorLog(msg);
        console.log(`\n⚠️  ${msg}`);
        skipped++;
        drawProgressBar(processed, total);
        continue;
      }

      if (existingFilenames.has(filename.toLowerCase())) {
        const msg = `Skipped: duplicate filename already in DB: ${filename}`;
        appendErrorLog(msg);
        console.log(`\n⚠️  ${msg}`);
        skipped++;
        drawProgressBar(processed, total);
        continue;
      }

      if (!validateScore(item.score)) {
        const msg = `Skipped: invalid score for ${filename}: ${item.score} (must be 0-100)`;
        appendErrorLog(msg);
        console.log(`\n⚠️  ${msg}`);
        skipped++;
        drawProgressBar(processed, total);
        continue;
      }

      const destPath = path.join(UPLOADS_DIR, filename);

      if (args.dryRun) {
        console.log(`\n📝 Would import: ${filename} (${item.title || 'no title'}) [score=${item.score}]`);
        successful++;
        drawProgressBar(processed, total);
        await sleep(10); // tiny delay so UI is responsive
        continue;
      }

      // Actual import
      try {
        await copyFile(sourcePath, destPath);
      } catch (err) {
        const msg = `Failed to copy ${sourcePath} -> ${destPath}: ${err.message}`;
        appendErrorLog(msg);
        console.log(`\n❌ ${msg}`);
        failed++;
        drawProgressBar(processed, total);
        continue;
      }

      try {
        const result = await apiUpload({
          filename,
          path: '/uploads/' + filename,
          title: item.title || null,
          category: item.category || null,
          score: parseFloat(item.score) || 0,
        });

        existingFilenames.add(filename.toLowerCase());
        successful++;
        console.log(`\n✅ Imported ${processed}/${total}: ${filename} (id=${result.id || 'n/a'})`);
      } catch (err) {
        const msg = `API error for ${filename}: ${err.message}`;
        appendErrorLog(msg);
        console.log(`\n❌ ${msg}`);
        failed++;
        // Try to clean up copied file if API failed
        try {
          if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
        } catch {}
      }

      drawProgressBar(processed, total);
      await sleep(50); // 50ms delay between requests
    }
  }

  db.close();

  console.log('\n');
  console.log('═══════════════════════════════════════════');
  console.log('           IMPORT SUMMARY');
  console.log('═══════════════════════════════════════════');
  console.log(`Total processed : ${processed}`);
  console.log(`Successful      : ${successful}`);
  console.log(`Failed          : ${failed}`);
  console.log(`Skipped         : ${skipped}`);
  console.log('═══════════════════════════════════════════');
  if (fs.existsSync(LOG_FILE)) {
    console.log(`Error log       : ${LOG_FILE}`);
  }
}

main().catch(err => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
