/**
 * fix-theme-position.mjs
 * Moves `const s/styles = useMemo(() => StyleSheet.create(...), [Colors]);`
 * to immediately after `const Colors = useColors();` in every screen file.
 *
 * This fixes the Rules of Hooks violation caused by the previous script placing
 * the useMemo BEFORE the final return but AFTER early conditional returns.
 *
 * Run: node scripts/fix-theme-position.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..', 'cst-mobile', 'src');

function getFiles(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...getFiles(full));
    else if (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts')) results.push(full);
  }
  return results;
}

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  // Only touch files that have useColors
  if (!content.includes('useColors')) return false;

  // Find `const Colors = useColors();`
  const hookLine = '  const Colors = useColors();';
  const hookIdx = content.indexOf(hookLine);
  if (hookIdx === -1) return false;

  // Find useMemo StyleSheet block — could be named `s` or `styles`
  // Pattern:   const s = useMemo(() => StyleSheet.create({
  // or:        const styles = useMemo(() => StyleSheet.create({
  const memoPattern = /\n(  const (?:s|styles) = useMemo\(\(\) => StyleSheet\.create\(\{[\s\S]*?\}\), \[Colors\]\);)/;
  const memoMatch = memoPattern.exec(content);
  if (!memoMatch) return false;

  const memoBlock = memoMatch[1]; // the full useMemo block (without leading \n)
  const memoFullMatch = memoMatch[0]; // includes leading \n

  // Check if it's already right after the hook line
  const afterHook = content.slice(hookIdx + hookLine.length);
  if (afterHook.trimStart().startsWith(memoBlock.trimStart())) return false;

  // Remove the useMemo block from its current position
  content = content.replace(memoFullMatch, '');

  // Insert it right after `const Colors = useColors();`
  content = content.replace(
    hookLine,
    hookLine + '\n' + memoBlock
  );

  fs.writeFileSync(filePath, content, 'utf8');
  return true;
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

console.log(`\nDone. Repositioned styles in ${updated} files.`);
