#!/usr/bin/env node
/**
 * Automatisches CSS-Minify-Skript für Pixel-Forge.ai
 * Nutzt clean-css-cli um style.css → style.min.css zu erzeugen.
 *
 * Usage:
 *   node scripts/minify.js        # einmalig minifizieren
 *   node scripts/minify.js --watch  # im Watch-Modus laufen lassen
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const CSS_DIR = path.join(__dirname, '..', 'css');
const INPUT = path.join(CSS_DIR, 'style.css');
const OUTPUT = path.join(CSS_DIR, 'style.min.css');

function minify() {
  try {
    execSync(`npx cleancss -o "${OUTPUT}" "${INPUT}"`, { stdio: 'inherit' });
    const before = fs.statSync(INPUT).size;
    const after = fs.statSync(OUTPUT).size;
    const saved = ((1 - after / before) * 100).toFixed(1);
    console.log(`✅ Minified: ${before} B → ${after} B (${saved}% saved)`);
  } catch (err) {
    console.error('❌ Minify fehlgeschlagen:', err.message);
    process.exit(1);
  }
}

function watch() {
  console.log(`👀 Watching ${INPUT} for changes...`);
  fs.watchFile(INPUT, { interval: 300 }, () => {
    console.log(`📝 ${path.basename(INPUT)} changed — re-minifying...`);
    minify();
  });
}

// Hauptlogik
if (process.argv.includes('--watch')) {
  minify();
  watch();
} else {
  minify();
}
