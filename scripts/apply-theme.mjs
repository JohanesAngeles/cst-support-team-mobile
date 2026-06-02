/**
 * apply-theme.mjs
 * Transforms all screen files from static Colors import to dynamic useColors hook.
 *
 * For each file that imports { Colors } from constants/colors:
 *  1. Replaces the import with useColors
 *  2. Adds `const Colors = useColors();` as the first line in the component
 *  3. Adds useMemo to React imports
 *  4. Moves StyleSheet.create inside the component, wrapped in useMemo
 *
 * Run: node scripts/apply-theme.mjs
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

function relImport(fromFile, toFile) {
  let rel = path.relative(path.dirname(fromFile), toFile).replace(/\\/g, '/');
  if (!rel.startsWith('.')) rel = './' + rel;
  return rel;
}

function addUseMemoToReactImport(content) {
  // Already has it
  if (/\buseMemo\b/.test(content)) return content;

  // import React, { ...X... } from 'react';
  if (/import React, \{([^}]+)\} from 'react'/.test(content)) {
    return content.replace(
      /import React, \{([^}]+)\} from 'react'/,
      (_, imports) => `import React, { ${imports.trim()}, useMemo } from 'react'`
    );
  }
  // import { ...X... } from 'react';
  if (/import \{([^}]+)\} from 'react'/.test(content)) {
    return content.replace(
      /import \{([^}]+)\} from 'react'/,
      (_, imports) => `import { ${imports.trim()}, useMemo } from 'react'`
    );
  }
  // import React from 'react';
  if (/import React from 'react'/.test(content)) {
    return content.replace(
      /import React from 'react'/,
      `import React, { useMemo } from 'react'`
    );
  }
  return content;
}

function findStyleSheetStart(content) {
  // Find last occurrence of "const s = StyleSheet.create({" or "const styles = StyleSheet.create({"
  const matches = [...content.matchAll(/\nconst (s|styles) = StyleSheet\.create\(\{/g)];
  if (matches.length === 0) return -1;
  return matches[matches.length - 1].index;
}

function wrapStylesInUseMemo(stylesBlock, varName) {
  // Replace: const s = StyleSheet.create({
  // With:      const s = useMemo(() => StyleSheet.create({
  let result = stylesBlock.replace(
    `const ${varName} = StyleSheet.create({`,
    `const ${varName} = useMemo(() => StyleSheet.create({`
  );
  // Replace the closing }); with }), [Colors]);
  // Find the last }); in the block
  const lastClose = result.lastIndexOf('});');
  if (lastClose !== -1) {
    result = result.slice(0, lastClose) + '}), [Colors]);' + result.slice(lastClose + 3);
  }
  return result;
}

function injectColorsHook(content) {
  // Add const Colors = useColors(); after the opening brace of the default export function
  // Matches: export default function Foo(...) {
  return content.replace(
    /(export default function \w+\s*\([^)]*\)\s*\{)/,
    `$1\n  const Colors = useColors();`
  );
}

function insertStylesBeforeReturn(componentSection, stylesBlock, varName) {
  // Indent the styles block (add 2 spaces to each line)
  const indented = stylesBlock
    .split('\n')
    .map(line => (line.trim() ? '  ' + line : ''))
    .join('\n')
    .trimEnd();

  // Find the LAST "  return (" in the component section
  const returnRegex = /\n( {2}|\t)return \(/g;
  let lastMatch = null;
  let m;
  while ((m = returnRegex.exec(componentSection)) !== null) lastMatch = m;

  if (lastMatch) {
    const insertAt = lastMatch.index;
    return (
      componentSection.slice(0, insertAt) +
      '\n' + indented + '\n' +
      componentSection.slice(insertAt)
    );
  }

  // Fallback: insert before the last closing brace of the component
  const lastBrace = componentSection.lastIndexOf('\n}');
  if (lastBrace !== -1) {
    return (
      componentSection.slice(0, lastBrace) +
      '\n' + indented + '\n' +
      componentSection.slice(lastBrace)
    );
  }

  return componentSection + '\n' + indented;
}

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  // Skip if already uses useColors
  if (content.includes('useColors')) return false;

  // Find Colors import
  const colorsImportMatch = content.match(/import \{ Colors \} from '([^']+)';/);
  if (!colorsImportMatch) return false;

  const existingPath = colorsImportMatch[1];

  // 1. Replace import
  content = content.replace(
    /import \{ Colors \} from '([^']+)';/,
    `import { useColors } from '${existingPath}';`
  );

  // 2. Add useMemo to React import
  content = addUseMemoToReactImport(content);

  // 3. Inject const Colors = useColors() into the component
  content = injectColorsHook(content);

  // 4. Find and move StyleSheet.create
  const styleStart = findStyleSheetStart(content);
  if (styleStart !== -1) {
    const styleVarMatch = content.slice(styleStart).match(/const (s|styles) = StyleSheet\.create/);
    const varName = styleVarMatch ? styleVarMatch[1] : 's';

    const componentSection = content.slice(0, styleStart);
    const stylesSection = content.slice(styleStart + 1).trimEnd(); // +1 to skip leading \n

    const wrappedStyles = wrapStylesInUseMemo(stylesSection, varName);
    content = insertStylesBeforeReturn(componentSection, wrappedStyles, varName);
  }

  fs.writeFileSync(filePath, content, 'utf8');
  return true;
}

const files = getFiles(ROOT);
let updated = 0;
let skipped = 0;

for (const file of files) {
  try {
    const changed = processFile(file);
    if (changed) {
      console.log(`✓ ${path.relative(ROOT, file)}`);
      updated++;
    } else {
      skipped++;
    }
  } catch (err) {
    console.error(`✗ ${path.relative(ROOT, file)}: ${err.message}`);
  }
}

console.log(`\nDone. Updated: ${updated}  Skipped: ${skipped}`);
