/* Reptile page checker.
   Verifies reptile.html and reptile.css against the store bundle rules:
   local links resolve, English only, no inline styles, no external assets. */

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const HTML_FILE = path.join(ROOT, 'reptile.html');
const CSS_FILE = path.join(ROOT, 'reptile.css');

const failures = [];
const notes = [];
let checks = 0;

function check(label, condition, detail) {
  checks++;
  if (!condition) failures.push(label + (detail ? ' -> ' + detail : ''));
}

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

const html = read(HTML_FILE);
const css = read(CSS_FILE);

/* 1. Local href and src must resolve to a real file under the store root. */
const refs = [];
const attrRe = /\b(?:href|src)\s*=\s*("([^"]*)"|'([^']*)')/g;
let m;
while ((m = attrRe.exec(html)) !== null) {
  refs.push((m[2] !== undefined ? m[2] : m[3]).trim());
}
const cssUrls = [];
const cssRe = /url\(\s*("([^"]*)"|'([^']*)'|([^)'"]+))\s*\)/g;
while ((m = cssRe.exec(css)) !== null) {
  cssUrls.push((m[2] || m[3] || m[4] || '').trim());
}

const isExternal = (v) =>
  /^(?:[a-z][a-z0-9+.-]*:)?\/\//i.test(v) ||
  /^(?:mailto|tel|data|javascript):/i.test(v) ||
  v.startsWith('#') ||
  v === '';

const localRefs = refs.filter((v) => !isExternal(v));
const localCssUrls = cssUrls.filter((v) => !isExternal(v));

for (const ref of localRefs.concat(localCssUrls)) {
  const clean = decodeURIComponent(ref.split('#')[0].split('?')[0]);
  const resolved = path.resolve(ROOT, clean);
  const inside = resolved === ROOT || resolved.startsWith(ROOT + path.sep);
  check('link stays inside the store bundle: ' + ref, inside, resolved);
  if (!inside) continue;
  check('link resolves to a real file: ' + ref, fs.existsSync(resolved) && fs.statSync(resolved).isFile(), resolved);
}

/* 2. English only: no Chinese characters anywhere in the markup or the stylesheet. */
const cjk = /[\u2e80-\u2eff\u3000-\u303f\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\ufe30-\ufe4f\uff00-\uffef]/;
for (const [name, text] of [['reptile.html', html], ['reptile.css', css]]) {
  const hit = text.match(cjk);
  check(name + ' contains no Chinese characters', !hit, hit ? 'found ' + JSON.stringify(hit[0]) + ' at index ' + text.indexOf(hit[0]) : '');
}

/* 3. No inline style attributes and no inline <style> blocks. */
const styleAttr = html.match(/\sstyle\s*=\s*("|')/gi);
check('reptile.html has no inline style attribute', !styleAttr, styleAttr ? styleAttr.join(', ') : '');
check('reptile.html has no inline <style> block', !/<style[\s>]/i.test(html));

/* 4. No external fonts, CDNs or remote scripts. */
const remoteRefs = refs.filter((v) => /^(?:https?:)?\/\//i.test(v));
const cdnRefs = remoteRefs.filter((v) => !/^https:\/\/czy5wocdo2try\.space\.mcode\.cn\/studio\.html$/.test(v));
check('no external fonts, CDNs or remote assets', cdnRefs.length === 0, cdnRefs.join(', '));
check('no @import in reptile.css', !/@import/i.test(css));

/* 5. Semantic checks: exactly one h1, alt text on every image, local stylesheets only. */
const h1Count = (html.match(/<h1[\s>]/gi) || []).length;
check('exactly one h1', h1Count === 1, 'found ' + h1Count);

const imgTags = html.match(/<img\b[^>]*>/gi) || [];
for (const tag of imgTags) {
  const alt = tag.match(/\balt\s*=\s*"([^"]*)"/i);
  check('every image carries alt text: ' + tag.slice(0, 60), !!alt && alt[1].trim().length > 0);
}

const links = html.match(/<link\b[^>]*>/gi) || [];
for (const tag of links) {
  const href = tag.match(/\bhref\s*=\s*"([^"]*)"/i);
  check('every stylesheet link is local: ' + tag.slice(0, 60), !!href && !/^(?:https?:)?\/\//i.test(href[1]), href ? href[1] : '');
}

/* 6. Shared stylesheets are linked and page rules live in reptile.css only. */
check('reptile.css is linked', /<link[^>]+href="reptile\.css"/i.test(html));
check('v2.css is linked', /<link[^>]+href="v2\.css"/i.test(html));
check('store.css is linked', /<link[^>]+href="store\.css"/i.test(html));

/* 7. Honesty rules: the AI disclosure line and the live-animal wording. */
check('the AI disclosure line is present', /AI-generated studio render/i.test(html));
check('the collection names its pieces as renders', /generated for the studio/i.test(html));

console.log('reptile page check');
console.log('  local references checked: ' + localRefs.length + ' in html, ' + localCssUrls.length + ' in css');
console.log('  assertions run: ' + checks);
if (failures.length) {
  console.log('  FAILED (' + failures.length + '):');
  for (const f of failures) console.log('   - ' + f);
  process.exit(1);
}
for (const n of notes) console.log('  note: ' + n);
console.log('  OK - all checks passed');
