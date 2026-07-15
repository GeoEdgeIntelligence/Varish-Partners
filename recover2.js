// Second pass: newly-discovered blog posts (from wp-sitemap-posts-post-1.xml)
// plus retries for the two transient 504 failures from pass 1.

const fs = require('fs');
const path = require('path');

const OUT = __dirname;
const PAGES_DIR = path.join(OUT, 'pages');
const JSON_DIR = path.join(OUT, 'wp-json');

const NEW_POSTS = [
  'tds-on-rent-sec-194i-of-income-tax-act-1961',
  'indexation-in-capital-gains-budget-2024-amendments-and-their-impact',
  'claiming-relief-under-section-891-on-salary-arrears-with-example',
  'understanding-section-192-tds-on-salary',
  'a-step-by-step-guide-for-casual-taxable-persons-ctp-under-gst',
  'understanding-gst-a-comprehensive-guide',
  'gst-simplified-step-by-step-guide-to-vertical-registrations-uins-and-deemed-registration',
  'complete-guide-to-non-resident-taxable-persons-nrtp-under-gst-registration-compliance-and-reverse-charge-mechanism',
  'filing-tds-returns',
  'this-is-tds',
  'startup-due-diligence-red-flags-key-areas',
  'gst-invoice-management-system-guide',
  'input-tax-credit-demo-vehicles-gst-clarification',
  'igst-refund-on-export',
  'income-tax-on-buyback-of-shares-and-changes-in-buyback-taxation-as-per-budget-2024',
];

const RETRY_PAGES = [
  { name: 'about-us.html', url: 'https://varishpartners.com/about-us/' },
];
const RETRY_JSON = [
  { name: 'wp_v2_pages_1451.json', url: 'https://varishpartners.com/wp-json/wp/v2/pages/1451' },
];

async function getBestSnapshot(url, retries = 3) {
  const cdxUrl = `http://web.archive.org/cdx/search/cdx?url=${encodeURIComponent(url)}&output=json&filter=statuscode:200&fl=timestamp,original&limit=-1`;
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(cdxUrl, { signal: AbortSignal.timeout(30000) });
      const text = await res.text();
      const rows = JSON.parse(text);
      if (!rows || rows.length < 2) return null;
      const data = rows.slice(1);
      data.sort((a, b) => a[0].localeCompare(b[0]));
      const [timestamp, original] = data[data.length - 1];
      return { timestamp, original };
    } catch (e) {
      if (i === retries - 1) throw e;
      await new Promise(r => setTimeout(r, 2000));
    }
  }
}

async function fetchRaw(timestamp, original, retries = 3) {
  const waybackUrl = `http://web.archive.org/web/${timestamp}id_/${original}`;
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(waybackUrl, { signal: AbortSignal.timeout(30000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return Buffer.from(await res.arrayBuffer());
    } catch (e) {
      if (i === retries - 1) throw e;
      await new Promise(r => setTimeout(r, 2000));
    }
  }
}

async function processOne(url, key, outDir) {
  try {
    const snap = await getBestSnapshot(url);
    if (!snap) {
      console.log(`  [MISS] ${url} — no 200 snapshot found`);
      return { url, status: 'missing' };
    }
    const buf = await fetchRaw(snap.timestamp, snap.original);
    const outPath = path.join(outDir, key);
    fs.writeFileSync(outPath, buf);
    console.log(`  [OK]   ${url} -> ${path.relative(OUT, outPath)} (snapshot ${snap.timestamp}, ${buf.length} bytes)`);
    return { url, status: 'ok', timestamp: snap.timestamp, file: path.relative(OUT, outPath), bytes: buf.length };
  } catch (e) {
    console.log(`  [FAIL] ${url} — ${e.message}`);
    return { url, status: 'fail', error: e.message };
  }
}

(async () => {
  console.log('=== Retry: about-us page ===');
  const retryResults = [];
  for (const r of RETRY_PAGES) {
    retryResults.push(await processOne(r.url, r.name, PAGES_DIR));
    await new Promise(res => setTimeout(res, 500));
  }

  console.log('\n=== Retry: wp-json pages/1451 ===');
  for (const r of RETRY_JSON) {
    retryResults.push(await processOne(r.url, r.name, JSON_DIR));
    await new Promise(res => setTimeout(res, 500));
  }

  console.log('\n=== Newly discovered blog posts ===');
  const postResults = [];
  for (const slug of NEW_POSTS) {
    const url = `https://varishpartners.com/${slug}/`;
    const key = `blog-${slug}.html`;
    postResults.push(await processOne(url, key, PAGES_DIR));
    await new Promise(res => setTimeout(res, 500));
  }

  fs.writeFileSync(path.join(OUT, 'manifest2.json'), JSON.stringify({ retries: retryResults, newPosts: postResults }, null, 2));
  console.log('\nDone. Manifest written to manifest2.json');
})();
