// Recovers varishpartners.com content from the Wayback Machine.
// Fetches the best (latest 200 OK) snapshot for real content pages,
// wp-json page/post data, and content images — skips WP/plugin cruft.

const fs = require('fs');
const path = require('path');

const OUT = __dirname;
const PAGES_DIR = path.join(OUT, 'pages');
const JSON_DIR = path.join(OUT, 'wp-json');
const IMG_DIR = path.join(OUT, 'assets', 'images');

for (const d of [PAGES_DIR, JSON_DIR, IMG_DIR]) fs.mkdirSync(d, { recursive: true });

const CONTENT_PAGES = [
  { name: 'home', url: 'https://varishpartners.com/' },
  { name: 'about-us', url: 'https://varishpartners.com/about-us/' },
  { name: 'careers-page', url: 'https://varishpartners.com/careers-page/' },
  { name: 'contact-us', url: 'https://varishpartners.com/contact-us/' },
  { name: 'privacy-policy', url: 'https://varishpartners.com/privacy-policy/' },
  { name: 'privacy-policy-2', url: 'https://varishpartners.com/privacy-policy-2/' },
  { name: 'blog-mastering-cash-flow', url: 'https://varishpartners.com/mastering-cash-flow-essential-strategies-to-keep-your-business-thriving/' },
  { name: 'blog-optimizing-pricing-strategy', url: 'https://varishpartners.com/optimizing-pricing-strategy-for-a-wholesaler/' },
];

const WPJSON_ENDPOINTS = [
  'https://varishpartners.com/wp-json/wp/v2/pages/1282',
  'https://varishpartners.com/wp-json/wp/v2/pages/1451',
  'https://varishpartners.com/wp-json/wp/v2/pages/3',
  'https://varishpartners.com/wp-json/wp/v2/pages/54',
  'https://varishpartners.com/wp-json/wp/v2/pages/55',
  'https://varishpartners.com/wp-json/wp/v2/pages/68',
  'https://varishpartners.com/wp-json/wp/v2/pages/9',
  'https://varishpartners.com/wp-json/wp/v2/posts/1313',
];

const IMAGE_URLS = [
  'https://varishpartners.com/wp-content/uploads/2024/08/Add-a-heading-1500-x-500-px.svg',
  'https://varishpartners.com/wp-content/uploads/2024/08/DALL%C2%B7E-2024-08-30-15.57.45-A-white-man-standing-in-a-queue-for-registration-at-a-counter-in-an-Indian-government-setup.-The-scene-includes-a-typical-Indian-government-office-set.webp',
  'https://varishpartners.com/wp-content/uploads/2024/08/Logo-Ipsum-1.png',
  'https://varishpartners.com/wp-content/uploads/2024/08/Logo-Ipsum-2.png',
  'https://varishpartners.com/wp-content/uploads/2024/08/Logo-Ipsum-3.png',
  'https://varishpartners.com/wp-content/uploads/2024/08/Logo-Ipsum-4.png',
  'https://varishpartners.com/wp-content/uploads/2024/08/VS_Professional.png',
  'https://varishpartners.com/wp-content/uploads/2024/08/cropped-Varish-Partners-Logo-HD1-1-192x192.png',
  'https://varishpartners.com/wp-content/uploads/2024/08/icons8-combo-chart-100.png',
  'https://varishpartners.com/wp-content/uploads/2024/08/icons8-council-tax-100.png',
  'https://varishpartners.com/wp-content/uploads/2024/08/rupee.png',
  'https://varishpartners.com/wp-content/uploads/2024/09/7da0e9e5-65ee-4aea-8d1e-3c72ad2d8eb6.jpeg',
  'https://varishpartners.com/wp-content/uploads/2024/09/DALL%C2%B7E-2024-09-04-17.52.55-A-professional-featured-image-for-a-blog-about-due-diligence-in-startup-investments.-The-image-should-depict-key-elements-of-due-diligence-such-as-fi.webp',
  'https://varishpartners.com/wp-content/uploads/2024/09/DALL%C2%B7E-2024-09-13-15.39.14-A-car-dealership-showroom-in-India-where-a-car-dealer-is-selling-a-car-to-an-Indian-customer.-The-scene-includes-a-couple-of-demo-cars-displayed-in-th.webp',
  'https://varishpartners.com/wp-content/uploads/2024/09/DALL%C2%B7E-2024-09-25-17.41.58-A-detailed-image-depicting-a-big-Indian-corporate-company-in-the-background-symbolizing-wealth-and-power-with-the-concept-of-Buyback-of-Shares-sub.webp',
  'https://varishpartners.com/wp-content/uploads/2024/09/Designer-6.png',
  'https://varishpartners.com/wp-content/uploads/2024/09/Designer-7.png',
  'https://varishpartners.com/wp-content/uploads/2024/09/Designer-8.png',
  'https://varishpartners.com/wp-content/uploads/2024/09/Designer-9.png',
];

async function getBestSnapshot(url) {
  const cdxUrl = `http://web.archive.org/cdx/search/cdx?url=${encodeURIComponent(url)}&output=json&filter=statuscode:200&fl=timestamp,original&limit=-1`;
  const res = await fetch(cdxUrl);
  const rows = await res.json();
  if (!rows || rows.length < 2) return null;
  const data = rows.slice(1); // first row is header
  data.sort((a, b) => a[0].localeCompare(b[0])); // ascending by timestamp
  const [timestamp, original] = data[data.length - 1]; // latest
  return { timestamp, original };
}

async function fetchRaw(timestamp, original) {
  const waybackUrl = `http://web.archive.org/web/${timestamp}id_/${original}`;
  const res = await fetch(waybackUrl);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${waybackUrl}`);
  return res;
}

async function processList(list, getKey, outDir, isBinary) {
  const results = [];
  for (const item of list) {
    const url = typeof item === 'string' ? item : item.url;
    const key = typeof item === 'string' ? getKey(item) : item.name;
    try {
      const snap = await getBestSnapshot(url);
      if (!snap) {
        console.log(`  [MISS] ${url} — no 200 snapshot found`);
        results.push({ url, status: 'missing' });
        continue;
      }
      const res = await fetchRaw(snap.timestamp, snap.original);
      const buf = Buffer.from(await res.arrayBuffer());
      const outPath = path.join(outDir, key);
      fs.writeFileSync(outPath, buf);
      console.log(`  [OK]   ${url} -> ${path.relative(OUT, outPath)} (snapshot ${snap.timestamp}, ${buf.length} bytes)`);
      results.push({ url, status: 'ok', timestamp: snap.timestamp, file: path.relative(OUT, outPath), bytes: buf.length });
    } catch (e) {
      console.log(`  [FAIL] ${url} — ${e.message}`);
      results.push({ url, status: 'fail', error: e.message });
    }
    await new Promise(r => setTimeout(r, 300)); // be polite to archive.org
  }
  return results;
}

function imgFileName(url) {
  const u = new URL(url);
  return decodeURIComponent(path.basename(u.pathname));
}

function jsonFileName(url) {
  const u = new URL(url);
  return u.pathname.replace(/^\/wp-json\//, '').replace(/\//g, '_') + '.json';
}

(async () => {
  console.log('=== Content pages ===');
  const pageResults = await processList(
    CONTENT_PAGES.map(p => ({ url: p.url, name: p.name + '.html' })),
    null, PAGES_DIR
  );

  console.log('\n=== wp-json page/post data ===');
  const jsonResults = await processList(
    WPJSON_ENDPOINTS.map(u => ({ url: u, name: jsonFileName(u) })),
    null, JSON_DIR
  );

  console.log('\n=== Content images ===');
  const imgResults = await processList(
    IMAGE_URLS.map(u => ({ url: u, name: imgFileName(u) })),
    null, IMG_DIR
  );

  const manifest = { pages: pageResults, wpjson: jsonResults, images: imgResults };
  fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log('\nDone. Manifest written to manifest.json');
})();
