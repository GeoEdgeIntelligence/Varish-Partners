// Assembles the final local site: fetches CSS/JS fresh into their real
// wp-content paths (avoids elementor vs elementor-pro basename collisions),
// copies already-recovered images/page-css, and rewrites HTML to be
// root-relative so it works under any local static server.

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const SITE = path.join(ROOT, 'site');

function ensureDirFor(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

// --- 1. Fetch CSS/JS fresh, straight into their real relative paths ---
const ASSET_PATHS = [
  'wp-content/themes/hello-elementor/theme.min.css',
  'wp-content/themes/hello-elementor/style.min.css',
  'wp-content/themes/hello-elementor/header-footer.min.css',
  'wp-content/themes/hello-elementor/assets/js/hello-frontend.min.js',
  'wp-content/plugins/elementor/assets/css/frontend.min.css',
  'wp-content/plugins/elementor/assets/css/widget-counter.min.css',
  'wp-content/plugins/elementor/assets/css/widget-heading.min.css',
  'wp-content/plugins/elementor/assets/css/widget-icon-box.min.css',
  'wp-content/plugins/elementor/assets/css/widget-icon-list.min.css',
  'wp-content/plugins/elementor/assets/css/widget-image-box.min.css',
  'wp-content/plugins/elementor/assets/css/widget-image.min.css',
  'wp-content/plugins/elementor/assets/css/widget-social-icons.min.css',
  'wp-content/plugins/elementor/assets/css/widget-spacer.min.css',
  'wp-content/plugins/elementor/assets/css/widget-tabs.min.css',
  'wp-content/plugins/elementor/assets/css/widget-text-editor.min.css',
  'wp-content/plugins/elementor/assets/css/conditionals/apple-webkit.min.css',
  'wp-content/plugins/elementor/assets/css/conditionals/e-swiper.min.css',
  'wp-content/plugins/elementor/assets/lib/animations/animations.min.css',
  'wp-content/plugins/elementor/assets/lib/animations/styles/e-animation-float.min.css',
  'wp-content/plugins/elementor/assets/lib/animations/styles/e-animation-shrink.min.css',
  'wp-content/plugins/elementor/assets/lib/animations/styles/fadeIn.min.css',
  'wp-content/plugins/elementor/assets/lib/animations/styles/fadeInDown.min.css',
  'wp-content/plugins/elementor/assets/lib/animations/styles/fadeInLeft.min.css',
  'wp-content/plugins/elementor/assets/lib/animations/styles/fadeInRight.min.css',
  'wp-content/plugins/elementor/assets/lib/animations/styles/fadeInUp.min.css',
  'wp-content/plugins/elementor/assets/lib/flatpickr/flatpickr.min.css',
  'wp-content/plugins/elementor/assets/lib/swiper/v8/css/swiper.min.css',
  'wp-content/plugins/elementor/assets/lib/jquery-numerator/jquery-numerator.min.js',
  'wp-content/plugins/elementor/assets/lib/waypoints/waypoints.min.js',
  'wp-content/plugins/elementor/assets/js/frontend-modules.min.js',
  'wp-content/plugins/elementor/assets/js/frontend.min.js',
  'wp-content/plugins/elementor/assets/js/webpack.runtime.min.js',
  'wp-content/plugins/elementor-pro/assets/css/frontend.min.css',
  'wp-content/plugins/elementor-pro/assets/css/widget-form.min.css',
  'wp-content/plugins/elementor-pro/assets/css/widget-forms.min.css',
  'wp-content/plugins/elementor-pro/assets/css/widget-nav-menu.min.css',
  'wp-content/plugins/elementor-pro/assets/css/widget-nested-carousel.min.css',
  'wp-content/plugins/elementor-pro/assets/css/widget-theme-elements.min.css',
  'wp-content/plugins/elementor-pro/assets/css/widget-loop-builder.min.css',
  'wp-content/plugins/elementor-pro/assets/css/conditionals/popup.min.css',
  'wp-content/plugins/elementor-pro/assets/css/modules/sticky.min.css',
  'wp-content/plugins/elementor-pro/assets/js/elements-handlers.min.js',
  'wp-content/plugins/elementor-pro/assets/js/webpack-pro.runtime.min.js',
  'wp-content/plugins/elementor-pro/assets/lib/smartmenus/jquery.smartmenus.min.js',
  'wp-content/plugins/elementor-pro/assets/lib/sticky/jquery.sticky.min.js',
  'wp-includes/js/jquery/jquery.min.js',
  'wp-includes/js/jquery/jquery-migrate.min.js',
  'wp-includes/js/jquery/ui/core.min.js',
  'wp-includes/js/imagesloaded.min.js',
  'wp-includes/js/dist/hooks.min.js',
  'wp-includes/js/dist/i18n.min.js',
];

async function getBestSnapshot(url, retries = 3) {
  const cdxUrl = `http://web.archive.org/cdx/search/cdx?url=${encodeURIComponent(url)}&output=json&filter=statuscode:200&fl=timestamp,original&limit=-1`;
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(cdxUrl, { signal: AbortSignal.timeout(30000) });
      const rows = JSON.parse(await res.text());
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

async function fetchAssetsIntoSite() {
  console.log('=== Fetching CSS/JS into real wp-content paths ===');
  const results = [];
  for (const relPath of ASSET_PATHS) {
    const url = `https://varishpartners.com/${relPath}`;
    const outPath = path.join(SITE, relPath);
    try {
      const snap = await getBestSnapshot(url);
      if (!snap) {
        console.log(`  [MISS] ${relPath}`);
        results.push({ relPath, status: 'missing' });
        continue;
      }
      const buf = await fetchRaw(snap.timestamp, snap.original);
      ensureDirFor(outPath);
      fs.writeFileSync(outPath, buf);
      console.log(`  [OK]   ${relPath} (${buf.length} bytes)`);
      results.push({ relPath, status: 'ok', bytes: buf.length });
    } catch (e) {
      console.log(`  [FAIL] ${relPath} — ${e.message}`);
      results.push({ relPath, status: 'fail', error: e.message });
    }
    await new Promise(r => setTimeout(r, 350));
  }
  return results;
}

// --- 2. Copy already-recovered images and page-css (no basename collisions there) ---
function copyImages() {
  console.log('\n=== Copying images ===');
  const srcDir = path.join(ROOT, 'assets', 'images');
  const files = fs.readdirSync(srcDir);
  // Map each image to its real upload path based on known month folders.
  const month08 = new Set([
    'Add-a-heading-1500-x-500-px.svg',
    'DALL·E-2024-08-30-15.57.45-A-white-man-standing-in-a-queue-for-registration-at-a-counter-in-an-Indian-government-setup.-The-scene-includes-a-typical-Indian-government-office-set.webp',
    'Logo-Ipsum-1.png', 'Logo-Ipsum-2.png', 'Logo-Ipsum-3.png', 'Logo-Ipsum-4.png',
    'VS_Professional.png',
    'cropped-Varish-Partners-Logo-HD1-1-180x180.png',
    'cropped-Varish-Partners-Logo-HD1-1-192x192.png',
    'cropped-Varish-Partners-Logo-HD1-1-32x32.png',
    'icons8-combo-chart-100.png', 'icons8-council-tax-100.png', 'rupee.png',
  ]);
  for (const f of files) {
    const destSub = month08.has(f) ? '2024/08' : '2024/09';
    const dest = path.join(SITE, 'wp-content', 'uploads', destSub, f);
    ensureDirFor(dest);
    fs.copyFileSync(path.join(srcDir, f), dest);
  }
  console.log(`  Copied ${files.length} images.`);
}

function copyPageCss() {
  console.log('\n=== Copying per-page CSS ===');
  const srcDir = path.join(ROOT, 'assets', 'page-css');
  const destDir = path.join(SITE, 'wp-content', 'uploads', 'elementor', 'css');
  fs.mkdirSync(destDir, { recursive: true });
  const files = fs.readdirSync(srcDir);
  for (const f of files) fs.copyFileSync(path.join(srcDir, f), path.join(destDir, f));
  console.log(`  Copied ${files.length} page CSS files.`);
}

function copyElementorThumbs() {
  console.log('\n=== Copying elementor thumbs (already in images via recover4, re-split) ===');
  // These were saved into assets/images by recover4.js; move the *-thumbs-looking* ones out.
  const srcDir = path.join(ROOT, 'assets', 'images');
  const destDir = path.join(SITE, 'wp-content', 'uploads', 'elementor', 'thumbs');
  fs.mkdirSync(destDir, { recursive: true });
  const thumbNames = fs.readdirSync(srcDir).filter(f => /qtbbg1p|qtdbbg|qudvdo|qtbiiik|qtbijfg/.test(f));
  for (const f of thumbNames) {
    fs.copyFileSync(path.join(srcDir, f), path.join(destDir, f));
  }
  console.log(`  Copied ${thumbNames.length} thumb files.`);
}

// --- 3. Rewrite + place HTML pages ---
const PAGE_MAP = {
  'home.html': '',
  'about-us.html': 'about-us',
  'careers-page.html': 'careers-page',
  'contact-us.html': 'contact-us',
  'privacy-policy.html': 'privacy-policy',
  'privacy-policy-2.html': 'privacy-policy-2',
  'blog-mastering-cash-flow.html': 'mastering-cash-flow-essential-strategies-to-keep-your-business-thriving',
  'blog-optimizing-pricing-strategy.html': 'optimizing-pricing-strategy-for-a-wholesaler',
};

function rewriteAndPlacePages() {
  console.log('\n=== Rewriting & placing HTML pages ===');
  const pagesDir = path.join(ROOT, 'pages');
  for (const [file, slug] of Object.entries(PAGE_MAP)) {
    const srcPath = path.join(pagesDir, file);
    if (!fs.existsSync(srcPath)) {
      console.log(`  [SKIP] ${file} not found`);
      continue;
    }
    let html = fs.readFileSync(srcPath, 'utf8');

    // Strip srcset/sizes (we only kept single best-size images, not every responsive variant)
    html = html.replace(/\s+srcset="[^"]*"/g, '');
    html = html.replace(/\s+srcset='[^']*'/g, '');

    // Root-relative the domain (handles both plain and JSON-escaped slashes)
    html = html.replace(/https?:\/\/varishpartners\.com/g, '');
    html = html.replace(/https?:\\\/\\\/varishpartners\.com/g, '');

    const outDir = slug === '' ? SITE : path.join(SITE, slug);
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, 'index.html'), html);
    console.log(`  [OK] ${file} -> ${slug === '' ? '/index.html' : '/' + slug + '/index.html'}`);
  }
}

(async () => {
  fs.mkdirSync(SITE, { recursive: true });
  const assetResults = await fetchAssetsIntoSite();
  copyImages();
  copyPageCss();
  copyElementorThumbs();
  rewriteAndPlacePages();
  fs.writeFileSync(path.join(ROOT, 'manifest-build.json'), JSON.stringify({ assets: assetResults }, null, 2));
  console.log('\nSite assembled at:', SITE);
})();
