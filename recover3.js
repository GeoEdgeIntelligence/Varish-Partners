// Third pass: theme + CSS recovery (site-wide Elementor/theme assets,
// plus per-page custom CSS which holds the site's actual colors/fonts/layout).

const fs = require('fs');
const path = require('path');

const OUT = __dirname;
const THEME_DIR = path.join(OUT, 'assets', 'theme');
const PAGE_CSS_DIR = path.join(OUT, 'assets', 'page-css');

for (const d of [THEME_DIR, PAGE_CSS_DIR]) fs.mkdirSync(d, { recursive: true });

// Site-wide theme + page-builder CSS (defines fonts, colors, buttons, header/footer, widgets)
const THEME_CSS = [
  'https://varishpartners.com/wp-content/themes/hello-elementor/theme.min.css',
  'https://varishpartners.com/wp-content/themes/hello-elementor/style.min.css',
  'https://varishpartners.com/wp-content/themes/hello-elementor/header-footer.min.css',
  'https://varishpartners.com/wp-content/plugins/elementor/assets/css/frontend.min.css',
  'https://varishpartners.com/wp-content/plugins/elementor/assets/css/frontend-lite.min.css',
  'https://varishpartners.com/wp-content/plugins/elementor/assets/css/widget-counter.min.css',
  'https://varishpartners.com/wp-content/plugins/elementor/assets/css/widget-heading.min.css',
  'https://varishpartners.com/wp-content/plugins/elementor/assets/css/widget-icon-box.min.css',
  'https://varishpartners.com/wp-content/plugins/elementor/assets/css/widget-icon-list.min.css',
  'https://varishpartners.com/wp-content/plugins/elementor/assets/css/widget-image-box.min.css',
  'https://varishpartners.com/wp-content/plugins/elementor/assets/css/widget-image.min.css',
  'https://varishpartners.com/wp-content/plugins/elementor/assets/css/widget-social-icons.min.css',
  'https://varishpartners.com/wp-content/plugins/elementor/assets/css/widget-spacer.min.css',
  'https://varishpartners.com/wp-content/plugins/elementor/assets/css/widget-tabs.min.css',
  'https://varishpartners.com/wp-content/plugins/elementor/assets/css/widget-text-editor.min.css',
  'https://varishpartners.com/wp-content/plugins/elementor/assets/lib/animations/animations.min.css',
  'https://varishpartners.com/wp-content/plugins/elementor/assets/lib/swiper/v8/css/swiper.min.css',
  'https://varishpartners.com/wp-content/plugins/elementor-pro/assets/css/frontend.min.css',
  'https://varishpartners.com/wp-content/plugins/elementor-pro/assets/css/frontend-lite.min.css',
  'https://varishpartners.com/wp-content/plugins/elementor-pro/assets/css/widget-form.min.css',
  'https://varishpartners.com/wp-content/plugins/elementor-pro/assets/css/widget-forms.min.css',
  'https://varishpartners.com/wp-content/plugins/elementor-pro/assets/css/widget-nav-menu.min.css',
  'https://varishpartners.com/wp-content/plugins/elementor-pro/assets/css/widget-nested-carousel.min.css',
  'https://varishpartners.com/wp-content/plugins/elementor-pro/assets/css/widget-theme-elements.min.css',
  'https://varishpartners.com/wp-content/plugins/elementor-pro/assets/css/modules/sticky.min.css',
];

// Per-page custom CSS (colors/spacing Elementor generated specifically for each page)
const PAGE_CSS_IDS = [3, 6, 9, 41, 51, 54, 55, 68, 413, 416, 422, 426, 430, 434, 444, 493, 717, 1282, 1451, 1556];
const PAGE_CSS = PAGE_CSS_IDS.map(id => `https://varishpartners.com/wp-content/uploads/elementor/css/post-${id}.css`);

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
      console.log(`  [MISS] ${url}`);
      return { url, status: 'missing' };
    }
    const buf = await fetchRaw(snap.timestamp, snap.original);
    const outPath = path.join(outDir, key);
    fs.writeFileSync(outPath, buf);
    console.log(`  [OK]   ${url} -> ${path.relative(OUT, outPath)} (${buf.length} bytes)`);
    return { url, status: 'ok', file: path.relative(OUT, outPath), bytes: buf.length };
  } catch (e) {
    console.log(`  [FAIL] ${url} — ${e.message}`);
    return { url, status: 'fail', error: e.message };
  }
}

function baseName(url) {
  const u = new URL(url);
  return path.basename(u.pathname);
}

(async () => {
  console.log('=== Theme & Elementor core CSS ===');
  const themeResults = [];
  for (const url of THEME_CSS) {
    themeResults.push(await processOne(url, baseName(url), THEME_DIR));
    await new Promise(r => setTimeout(r, 400));
  }

  console.log('\n=== Per-page custom CSS ===');
  const pageCssResults = [];
  for (const url of PAGE_CSS) {
    pageCssResults.push(await processOne(url, baseName(url), PAGE_CSS_DIR));
    await new Promise(r => setTimeout(r, 400));
  }

  fs.writeFileSync(path.join(OUT, 'manifest3.json'), JSON.stringify({ theme: themeResults, pageCss: pageCssResults }, null, 2));
  console.log('\nDone. Manifest written to manifest3.json');
})();
