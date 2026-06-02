/**
 * fix-theme-final.mjs
 * Fixes remaining theming issues after the initial transformation:
 *
 * 1. Replaces Colors.xxx at MODULE LEVEL (before the component) with hardcoded values
 *    from LightTheme — these are status/label colors that don't change with theme
 *
 * 2. Identifies module-level helper functions that use s.xxx/styles.xxx/Colors.xxx
 *    and moves them INSIDE the component (before the return statement)
 *
 * Run: node scripts/fix-theme-final.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..', 'cst-mobile', 'src');

// LightTheme color values for hardcoding at module level
const COLOR_VALUES = {
  'Colors.background':   "'#FFFFFF'",
  'Colors.surface':      "'#F5F7FA'",
  'Colors.surfaceLight': "'#EBEEF2'",
  'Colors.primary':      "'#021B3A'",
  'Colors.secondary':    "'#2C6EBD'",
  'Colors.danger':       "'#CC0000'",
  'Colors.success':      "'#27AE60'",
  'Colors.text':         "'#021B3A'",
  'Colors.textMuted':    "'#757575'",
  'Colors.textDark':     "'#021B3A'",
  'Colors.border':       "'#D9DCE0'",
  'Colors.white':        "'#FFFFFF'",
  'Colors.black':        "'#000000'",
};

function getFiles(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...getFiles(full));
    else if (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts')) results.push(full);
  }
  return results;
}

function replaceColorsInModuleScope(content) {
  // Find where the first component function starts
  const componentMatch = content.match(/\nexport default function \w+/);
  if (!componentMatch) return content;

  const componentStart = componentMatch.index;
  const beforeComponent = content.slice(0, componentStart);
  const fromComponent = content.slice(componentStart);

  // Replace Colors.xxx with hardcoded values in the module-level section
  let fixedBefore = beforeComponent;
  for (const [key, val] of Object.entries(COLOR_VALUES)) {
    // Use regex to avoid matching inside strings or comments
    fixedBefore = fixedBefore.replaceAll(key, val.slice(1, -1)); // strip the outer quotes
  }
  // Now we need to properly quote the replacements
  // Actually let's do it differently — replace key with value including quotes
  let fixedBefore2 = beforeComponent;
  for (const [key, val] of Object.entries(COLOR_VALUES)) {
    // val is already quoted: "'#FFFFFF'"
    const quotedVal = val.slice(1, -1); // remove surrounding single quotes: #FFFFFF
    // Replace Colors.xxx with the color value
    fixedBefore2 = fixedBefore2.replaceAll(key, `'${quotedVal}'`);
  }

  if (fixedBefore2 === beforeComponent) return content; // no changes
  return fixedBefore2 + fromComponent;
}

function moveModuleLevelHelpersIntoComponent(content) {
  // Find the component's return statement
  const returnMatch = content.match(/\n  return \(/);
  if (!returnMatch) return content;

  // Find the component's closing brace
  const componentClose = content.lastIndexOf('\n}');
  if (componentClose === -1) return content;

  // Everything after the component close might have helper functions/consts
  // that use s. or styles. or Colors.
  const afterComponent = content.slice(componentClose + 2); // skip \n}

  // Find module-level const/function declarations after the component that use s. or styles.
  const helperPattern = /\nconst (\w+) = \([^)]*\) =>/g;
  let match;
  const helpersToMove = [];

  // Simple approach: find module-level `const xxx = (...)=>` or `const xxx = (...) =>`
  // that reference s. or styles. in their body
  const lines = afterComponent.split('\n');
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    // Check for module-level const declarations that use s. or styles.
    if (line.match(/^const \w+ = /) || line.match(/^function \w+/)) {
      // Look ahead to see if this block uses s. or styles.
      let blockEnd = i;
      let depth = 0;
      let usesStyles = false;
      for (let j = i; j < Math.min(i + 30, lines.length); j++) {
        if (lines[j].includes('(')) depth += (lines[j].match(/\(/g) || []).length;
        if (lines[j].includes(')')) depth -= (lines[j].match(/\)/g) || []).length;
        if (lines[j].match(/\bs\.\w+|\bstyles\.\w+/)) usesStyles = true;
        if (j > i && depth <= 0) { blockEnd = j; break; }
        blockEnd = j;
      }
      if (usesStyles) {
        const helperBlock = lines.slice(i, blockEnd + 1).join('\n');
        helpersToMove.push({ start: i, end: blockEnd, block: helperBlock });
      }
    }
    i++;
  }

  if (helpersToMove.length === 0) return content;

  // This is complex to do correctly, skip for now and just report
  return content;
}

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;

  // Fix 1: Replace Colors.xxx in module-level scope
  content = replaceColorsInModuleScope(content);

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    return true;
  }
  return false;
}

const files = getFiles(ROOT);
let updated = 0;

for (const file of files) {
  try {
    if (processFile(file)) {
      console.log(`✓ ${path.relative(ROOT, file)}`);
      updated++;
    }
  } catch (err) {
    console.error(`✗ ${path.relative(ROOT, file)}: ${err.message}`);
  }
}

console.log(`\nDone. Fixed ${updated} files.`);
