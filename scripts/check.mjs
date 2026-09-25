// Fails if any page refers to a local file or #fragment that does not exist.
// Run with: node scripts/check.mjs
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname, normalize } from 'node:path';

const SITE = 'site';
const pages = readdirSync(SITE).filter((f) => f.endsWith('.html'));
const sprite = readFileSync(join(SITE, 'assets/icons.svg'), 'utf8');
const symbols = new Set([...sprite.matchAll(/<symbol id="([\w-]+)"/g)].map((m) => m[1]));
const problems = [];

for (const page of pages) {
  const html = readFileSync(join(SITE, page), 'utf8');
  const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
  for (const [, attr] of html.matchAll(/\s(?:href|src)="([^"]+)"/g)) {
    if (/^(https?:|mailto:|data:|sidestore:|altstore:)/.test(attr)) continue;
    const [path, frag] = attr.split('#');
    if (!path) {
      if (frag && !ids.has(frag)) problems.push(`${page}: no element with id "${frag}"`);
      continue;
    }
    const target = normalize(path.startsWith('/') ? join(SITE, path) : join(SITE, dirname(page), path));
    const file = target.endsWith('/') || path === './' ? join(target, 'index.html') : target;
    if (!existsSync(file)) {
      problems.push(`${page}: missing file ${attr}`);
    } else if (frag && path.endsWith('icons.svg') && !symbols.has(frag)) {
      problems.push(`${page}: no icon "${frag}" in the sprite`);
    } else if (frag && file.endsWith('.html')) {
      const other = readFileSync(file, 'utf8');
      if (!other.includes(`id="${frag}"`)) problems.push(`${page}: ${path} has no id "${frag}"`);
    }
  }
}

if (problems.length) {
  console.error(problems.join('\n'));
  process.exit(1);
}
console.log(`Checked ${pages.length} pages: every local link resolves.`);
