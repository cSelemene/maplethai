// Cache-busting for the static site.
//
// Every relative reference to a local .js/.mjs/.css/image file in the site's
// HTML, JS and CSS gets "?v=<hash>", where the hash covers the file and,
// recursively, everything it references. Changing supabase-client.js therefore
// changes its hash, the hash of every module that imports it, and the hash in
// every page that loads those modules, so browsers never mix old and new files.
// It also means every page imports a module under one URL, so a module is never
// loaded twice under two different version strings.
//
//   node scripts/stamp-assets.mjs           rewrite references in place
//   node scripts/stamp-assets.mjs --check   exit 1 if anything is out of date (CI)
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname, relative, resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SKIP_DIRS = new Set(['.git', 'node_modules', 'scripts', 'database', 'supabase', 'vendor', 'i']);
const SOURCE_EXT = new Set(['.html', '.js', '.mjs', '.css']);
const TARGET_EXT = new Set(['.js', '.mjs', '.css', '.svg', '.png', '.webp', '.jpg', '.jpeg', '.json']);

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      if (!SKIP_DIRS.has(name)) walk(full, out);
    } else if (SOURCE_EXT.has(extname(name))) out.push(full);
  }
  return out;
}

// A reference is a quoted (or url()) path starting with ./ or ../ that points
// at a local asset, optionally already carrying ?v=... . Template literals with
// ${...} are left alone because their target is only known at runtime.
const REF =
  /(["'`(])(\.{1,2}\/[^"'`()\s?#${}]+\.(?:m?js|css|svg|png|webp|jpe?g|json))(\?v=[^"'`()\s#&]*)?(?=["'`)#])/g;

function refsOf(file, text) {
  const found = [];
  for (const m of text.matchAll(REF)) {
    const target = resolve(dirname(file), m[2]);
    if (!target.startsWith(root) || !existsSync(target) || !TARGET_EXT.has(extname(target))) continue;
    found.push({ index: m.index, match: m[0], quote: m[1], path: m[2], target });
  }
  return found;
}

const sources = walk(root);
const sourceSet = new Set(sources);
const hashes = new Map();
const visiting = new Set();

function hashOf(file) {
  if (hashes.has(file)) return hashes.get(file);
  const raw = readFileSync(file);
  if (!sourceSet.has(file) && !SOURCE_EXT.has(extname(file))) {
    const h = createHash('sha256').update(raw).digest('hex').slice(0, 10);
    hashes.set(file, h);
    return h;
  }
  if (visiting.has(file)) return 'cycle'; // a cycle still hashes deterministically from content
  visiting.add(file);
  const text = raw.toString('utf8');
  const h = createHash('sha256').update(stamp(file, text)).digest('hex').slice(0, 10);
  visiting.delete(file);
  hashes.set(file, h);
  return h;
}

function stamp(file, text) {
  let out = '',
    last = 0;
  for (const r of refsOf(file, text)) {
    out += text.slice(last, r.index) + r.quote + r.path + '?v=' + hashOf(r.target);
    last = r.index + r.match.length;
  }
  return out + text.slice(last);
}

const check = process.argv.includes('--check');
const stale = [];
for (const file of sources) {
  const before = readFileSync(file, 'utf8');
  const after = stamp(file, before);
  if (after !== before) {
    stale.push(relative(root, file));
    if (!check) writeFileSync(file, after);
  }
}
if (check && stale.length) {
  console.error(
    'Asset versions are out of date in:\n  ' + stale.join('\n  ') + '\nRun: node scripts/stamp-assets.mjs'
  );
  process.exit(1);
}
console.log(check ? 'Asset versions are up to date.' : `Updated asset versions in ${stale.length} file(s).`);
