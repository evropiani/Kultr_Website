// Fails if any page refers to a local file or #fragment that does not exist.
// Run with: node scripts/check.mjs
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, normalize } from 'node:path';

const SITE = 'site';
const pages = readdirSync(SITE).filter((f) => f.endsWith('.html'));
const problems = [];

for (const page of pages) {
  const html = readFileSync(join(SITE, page), 'utf8');
  const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
  for (const [, ref] of html.matchAll(/\s(?:href|src)="([^"]+)"/g)) {
    if (/^[a-z]+:/.test(ref)) continue; // https:, mailto:, sidestore: …
    const [path, frag] = ref.split('#');
    if (!path) {
      if (frag && !ids.has(frag)) problems.push(`${page}: no element with id "${frag}"`);
      continue;
    }
    const file = normalize(join(SITE, path === './' || path === '/' ? 'index.html' : path));
    if (!existsSync(file)) problems.push(`${page}: missing file ${ref}`);
  }
}

if (problems.length) {
  console.error(problems.join('\n'));
  process.exit(1);
}
console.log(`Checked ${pages.length} pages: every local link resolves.`);
