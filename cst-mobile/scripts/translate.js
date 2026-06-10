#!/usr/bin/env node
/**
 * translate.js — Auto-fill missing i18n keys using DeepL
 *
 * Usage:
 *   node scripts/translate.js          → translate all missing keys in all locales
 *   node scripts/translate.js --check  → show missing counts without translating
 *
 * Workflow:
 *   1. Add new English strings to src/i18n/locales/en.json
 *   2. Run: node scripts/translate.js
 *   3. All other locale files are auto-filled via DeepL
 */

const fs    = require('fs');
const path  = require('path');
const https = require('https');

const DEEPL_KEY  = process.env.DEEPL_API_KEY;
const DEEPL_HOST = 'api-free.deepl.com';
const DEEPL_PATH = '/v2/translate';

const LOCALES_DIR = path.resolve(__dirname, '../src/i18n/locales');

const TARGETS = { es: 'ES', fr: 'FR', de: 'DE', it: 'IT', zh: 'ZH', ru: 'RU' };

// ── Helpers ───────────────────────────────────────────────────────────────────

function flatten(obj, prefix = '') {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      Object.assign(out, flatten(v, key));
    } else {
      out[key] = v;
    }
  }
  return out;
}

function setDeep(obj, dotPath, value) {
  const parts = dotPath.split('.');
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!cur[parts[i]] || typeof cur[parts[i]] !== 'object') cur[parts[i]] = {};
    cur = cur[parts[i]];
  }
  cur[parts[parts.length - 1]] = value;
}

function readJson(filePath) {
  try { return JSON.parse(fs.readFileSync(filePath, 'utf8')); }
  catch { return {}; }
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

function deepLTranslate(texts, targetLang) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ text: texts, source_lang: 'EN', target_lang: targetLang });
    const opts = {
      hostname: DEEPL_HOST,
      path: DEEPL_PATH,
      method: 'POST',
      headers: {
        'Authorization': `DeepL-Auth-Key ${DEEPL_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    };
    const req = https.request(opts, res => {
      let raw = '';
      res.on('data', c => (raw += c));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(raw);
          if (!parsed.translations) throw new Error(raw);
          resolve(parsed.translations.map(t => t.text));
        } catch {
          reject(new Error(`DeepL error (${res.statusCode}): ${raw}`));
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  if (!DEEPL_KEY) {
    console.error('Error: DEEPL_API_KEY environment variable is not set.');
    console.error('Usage: DEEPL_API_KEY=your-key node scripts/translate.js');
    process.exit(1);
  }

  const checkOnly = process.argv.includes('--check');

  const enPath = path.join(LOCALES_DIR, 'en.json');
  if (!fs.existsSync(enPath)) {
    console.error('en.json not found at', enPath);
    process.exit(1);
  }

  const enData = readJson(enPath);
  const enFlat = flatten(enData);
  const total  = Object.keys(enFlat).length;

  console.log(`\nen.json: ${total} keys\n`);

  let grandTotal = 0;

  for (const [locale, deeplLang] of Object.entries(TARGETS)) {
    const filePath   = path.join(LOCALES_DIR, `${locale}.json`);
    const existing   = readJson(filePath);
    const existFlat  = flatten(existing);
    const missing    = Object.entries(enFlat).filter(([key]) => !existFlat[key]);

    if (missing.length === 0) {
      console.log(`✓ ${locale}: all ${total} keys present`);
      continue;
    }

    if (checkOnly) {
      console.log(`✗ ${locale}: ${missing.length} missing keys`);
      missing.slice(0, 10).forEach(([k]) => console.log(`    ${k}`));
      if (missing.length > 10) console.log(`    ... and ${missing.length - 10} more`);
      continue;
    }

    console.log(`→ ${locale} (${deeplLang}): translating ${missing.length} keys...`);

    const BATCH  = 50;
    const merged = JSON.parse(JSON.stringify(existing));
    let translated = 0;

    for (let i = 0; i < missing.length; i += BATCH) {
      const batch  = missing.slice(i, i + BATCH);
      const keys   = batch.map(([k]) => k);
      const values = batch.map(([, v]) => String(v));

      try {
        const results = await deepLTranslate(values, deeplLang);
        keys.forEach((key, idx) => { setDeep(merged, key, results[idx]); translated++; });
        process.stdout.write(`  ${translated}/${missing.length}\r`);
        if (i + BATCH < missing.length) await sleep(250);
      } catch (err) {
        console.error(`\n  Batch ${Math.floor(i / BATCH) + 1} failed: ${err.message}`);
      }
    }

    writeJson(filePath, merged);
    console.log(`  ✓ ${translated} translations written → ${locale}.json`);
    grandTotal += translated;
  }

  if (!checkOnly) {
    console.log(`\n✓ Done. ${grandTotal} total keys translated across all locales.\n`);
  }
}

main().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
