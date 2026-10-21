/* Reference checker for the FiOON Studio page.
   Run from the store folder:  node verify-studio.js
   Checks that every local reference in studio.html and studio.css resolves to a
   real file in this folder, and that the page obeys the house rules. */

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const TARGETS = ['studio.html', 'studio.css'];
const ALLOWED_PRICES = new Set(['$49', '$149', '$399']);

const errors = [];
const checked = [];

const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');
const html = read('studio.html');
const css = read('studio.css');

/* 1. Local references resolve to a real file in this folder. */
const references = [];
const tag = /<(?:link|img|script|a|source|iframe)\b[^>]*>/gi;
let match;
while ((match = tag.exec(html))) {
  const element = match[0];
  const ref = element.match(/\b(?:href|src)\s*=\s*"([^"]+)"/i);
  if (!ref) continue;
  /* A canonical URL is metadata, not a loaded resource, so it is not a local file. */
  if (/^<link\b/i.test(element) && /rel\s*=\s*"[^"]*canonical/i.test(element)) continue;
  references.push({ from: 'studio.html', value: ref[1] });
}
const cssUrl = /url\(\s*['"]?([^'")]+)['"]?\s*\)/gi;
while ((match = cssUrl.exec(css))) references.push({ from: 'studio.css', value: match[1] });

for (const ref of references) {
  const value = ref.value.trim();
  if (/^(https?:)?\/\//i.test(value)) { errors.push(`${ref.from}: external resource ${value}`); continue; }
  if (/^(mailto:|tel:|data:|javascript:|#)/i.test(value)) continue;
  const target = path.resolve(ROOT, value.split('#')[0].split('?')[0]);
  if (!fs.existsSync(target)) errors.push(`${ref.from}: missing local file ${value}`);
  else checked.push(value);
}

/* 2. No Chinese characters anywhere in the two files. */
const cjk = /[\u2e80-\u303f\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uff00-\uffef]/;
for (const file of TARGETS) if (cjk.test(read(file))) errors.push(`${file}: contains Chinese characters`);

/* 3. Semantic markup: one h1, alt text on every image, no inline style block. */
const headings = (html.match(/<h1[\s>]/gi) || []).length;
if (headings !== 1) errors.push(`expected exactly one h1, found ${headings}`);
const images = html.match(/<img\b[^>]*>/gi) || [];
for (const image of images) {
  const alt = image.match(/\balt\s*=\s*"([^"]*)"/i);
  if (!alt || !alt[1].trim()) errors.push(`image without alt text: ${image.slice(0, 70)}`);
}
if (/<style[\s>]/i.test(html)) errors.push('inline <style> block found');

/* 4. No external fonts, CDNs or remote assets. */
if (/@import/i.test(css)) errors.push('css @import found');
if (/fonts\.(googleapis|gstatic)|cdn\./i.test(html + css)) errors.push('external font or CDN reference found');

/* 5. Only the three published prices may appear. */
const prices = html.match(/[$¥€£]\s?[\d][\d.,]*/g) || [];
for (const price of prices) {
  const normalised = price.replace(/\s/g, '');
  if (!ALLOWED_PRICES.has(normalised)) errors.push(`unexpected price on the page: ${price}`);
}

/* 6. No invented proof: no testimonials, counts, ratings or revenue claims. */
const proofPatterns = [
  /trusted by/i, /testimonial/i, /as seen in/i, /best-?seller/i, /customer[s]?\s+(say|love)/i,
  /\b\d[\d,]*\+?\s+(orders|clients|customers|brands|products sold)\b/i, /\b\d+(\.\d+)?\s*%/, /\b\d(\.\d)?\s*stars?\b/i,
  /\b(rated|reviews from|revenue of|turnover of)\b/i, /\b\d[\d,]*\+?\s*(clients|customers)\s+(trust|love)/i
];
for (const pattern of proofPatterns) if (pattern.test(html)) errors.push(`possible invented proof: ${pattern}`);

/* 7. No emoji. */
if (/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/u.test(html + css)) errors.push('emoji found');

console.log(`checked ${references.length} references (${checked.length} local files resolved)`);
console.log(`prices found: ${[...new Set(prices)].join(' ')}`);
console.log(`headings: ${headings} h1, ${images.length} images with alt text`);
if (errors.length) {
  console.error(`FAIL ${errors.length} problem(s):`);
  errors.forEach((e) => console.error(` - ${e}`));
  process.exit(1);
}
console.log('OK studio.html and studio.css pass the reference and house-rule checks');
