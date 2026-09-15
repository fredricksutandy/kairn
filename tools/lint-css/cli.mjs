#!/usr/bin/env node
import { readdir, readFile } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';
import { lintCss } from './index.mjs';

const SKIP = new Set(['node_modules', '.next', 'dist', '.git']);

async function cssFilesIn(root) {
  const found = [];
  let entries;
  try {
    entries = await readdir(root, { withFileTypes: true });
  } catch {
    return found; // A workspace package with no stylesheets yet is not an error.
  }
  for (const entry of entries) {
    const path = join(root, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP.has(entry.name)) found.push(...(await cssFilesIn(path)));
    } else if (entry.name.endsWith('.css')) {
      found.push(path);
    }
  }
  return found;
}

const roots = process.argv.slice(2);
if (roots.length === 0) {
  console.error('usage: lint-css <dir> [dir…]');
  process.exit(2);
}

const cwd = process.cwd();
let total = 0;
let scanned = 0;

for (const root of roots) {
  for (const file of await cssFilesIn(resolve(cwd, root))) {
    scanned += 1;
    const display = relative(cwd, file);
    const findings = lintCss(await readFile(file, 'utf8'), display);
    if (findings.length === 0) continue;

    console.error(`\n${display}`);
    for (const finding of findings) {
      console.error(
        `  ${finding.line}:${finding.column}  error  ${finding.message}  kairn/${finding.rule}`,
      );
    }
    total += findings.length;
  }
}

if (total > 0) {
  console.error(`\n✖ ${total} problem${total === 1 ? '' : 's'} in ${scanned} stylesheet${scanned === 1 ? '' : 's'}\n`);
  process.exit(1);
}

console.log(`lint-css: ${scanned} stylesheet${scanned === 1 ? '' : 's'} clean`);
