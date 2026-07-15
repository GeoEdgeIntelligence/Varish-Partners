// Fourth pass: remaining theme JS/CSS (menus, sliders, forms) and the
// real (non-srcset-duplicate) images still missing.

const fs = require('fs');
const path = require('path');

const OUT = __dirname;
const THEME_DIR = path.join(OUT, 'assets', 'theme');
const IMG_DIR = path.join(OUT, 'assets', 'images');
fs.mkdirSync(THEME_DIR, { recursive: true });
fs.mkdirSync(IMG_DIR, { recursive: true });

const THEME_FILES = [
  'https://varishpartners.com/wp-content/plugins/elementor-pro/assets/css/conditionals/popup.min.css',
  'https://varishpartners.com/wp-content/plugins/elementor-pro/assets/css/widget-loop-builder.min.css',
  'https://varishpartners.com/wp-content/plugins/elementor-pro/assets/js/elements-handlers.min.js',
  'https://varishpartners.com/wp-content/plugins/elementor-pro/assets/js/frontend.min.js',
  'https://varishpartners.com/wp-content/plugins/elementor-pro/assets/js/webpack-pro.runtime.min.js',
  'https://varishpartners.com/wp-content/plugins/elementor-pro/assets/lib/smartmenus/jquery.smartmenus.min.js',
  'https://varishpartners.com/wp-content/plugins/elementor-pro/assets/lib/sticky/jquery.sticky.min.js',
  'https://varishpartners.com/wp-content/plugins/elementor/assets/css/conditionals/apple-webkit.min.css',
  'https://varishpartners.com/wp-content/plugins/elementor/assets/css/conditionals/e-swiper.min.css',
  'https://varishpartners.com/wp-content/plugins/elementor/assets/js/frontend-modules.min.js',
  'https://varishpartners.com/wp-content/plugins/elementor/assets/js/frontend.min.js',
  'https://varishpartners.com/wp-content/plugins/elementor/assets/js/webpack.runtime.min.js',
  'https://varishpartners.com/wp-content/plugins/elementor/assets/lib/animations/styles/e-animation-float.min.css',
  'https://varishpartners.com/wp-content/plugins/elementor/assets/lib/animations/styles/e-animation-shrink.min.css',
  'https://varishpartners.com/wp-content/plugins/elementor/assets/lib/animations/styles/fadeIn.min.css',
  'https://varishpartners.com/wp-content/plugins/elementor/assets/lib/animations/styles/fadeInDown.min.css',
  'https://varishpartners.com/wp-content/plugins/elementor/assets/lib/animations/styles/fadeInLeft.min.css',
  'https://varishpartners.com/wp-content/plugins/elementor/assets/lib/animations/styles/fadeInRight.min.css',
  'https://varishpartners.com/wp-content/plugins/elementor/assets/lib/animations/styles/fadeInUp.min.css',
  'https://varishpartners.com/wp-content/plugins/elementor/assets/lib/flatpickr/flatpickr.min.css',
  'https://varishpartners.com/wp-content/plugins/elementor/assets/lib/jquery-numerator/jquery-numerator.min.js',
  'https://varishpartners.com/wp-content/plugins/elementor/assets/lib/waypoints/waypoints.min.js',
  'https://varishpartners.com/wp-content/themes/hello-elementor/assets/js/hello-frontend.min.js',
  'https://varishpartners.com/wp-includes/js/dist/hooks.min.js',
  'https://varishpartners.com/wp-includes/js/dist/i18n.min.js',
  'https://varishpartners.com/wp-includes/js/imagesloaded.min.js',
  'https://varishpartners.com/wp-includes/js/jquery/jquery-migrate.min.js',
  'https://varishpartners.com/wp-includes/js/jquery/jquery.min.js',
  'https://varishpartners.com/wp-includes/js/jquery/ui/core.min.js',
];

const IMAGE_FILES = [
  'https://varishpartners.com/wp-content/uploads/2024/08/VS_Professional.png',
  'https://varishpartners.com/wp-content/uploads/2024/08/icons8-combo-chart-100.png',
  'https://varishpartners.com/wp-content/uploads/2024/08/cropped-Varish-Partners-Logo-HD1-1-192x192.png',
  'https://varishpartners.com/wp-content/uploads/2024/08/cropped-Varish-Partners-Logo-HD1-1-180x180.png',
  'https://varishpartners.com/wp-content/uploads/2024/08/cropped-Varish-Partners-Logo-HD1-1-32x32.png',
  'https://varishpartners.com/wp-content/uploads/elementor/thumbs/2_-removebg-preview-qtbbg1p63rnbangntz5sxv1iihz37zz4dsdxblw8i8.png',
  'https://varishpartners.com/wp-content/uploads/elementor/thumbs/VS_Professional-qtbbg1p63rnbangntz5sxv1iihz37zz4dsdxblw8i8.png',
  'https://varishpartners.com/wp-content/uploads/elementor/thumbs/confirming-deal-4WLR4N5-qtbbg1p6cjfumr8u94fg4pn7kfenrayv9te70ecmeo.jpg',
  'https://varishpartners.com/wp-content/uploads/elementor/thumbs/corporate-teamworking-colleagues-in-modern-office-KTXS67W-qtbbg1pdno3lztht28865njbv8ffced9l5g1s0l3dk.jpg',
  'https://varishpartners.com/wp-content/uploads/elementor/thumbs/corporate-teamworking-colleagues-in-modern-office-YXAS2LN-qtbbg1p6cjfumr8u94fg4pn7kfenrayv9te70ecmeo.jpg',
  'https://varishpartners.com/wp-content/uploads/elementor/thumbs/legal-advisor-is-explaining-the-offense-under-the-ZV8KUQ4-qtbbg1phb8e2iv9kmlfducwd20tay84i93qe3fdw94.jpg',
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

async function processOne(url, outDir) {
  const key = decodeURIComponent(path.basename(new URL(url).pathname));
  try {
    const snap = await getBestSnapshot(url);
    if (!snap) {
      console.log(`  [MISS] ${url}`);
      return { url, status: 'missing' };
    }
    const buf = await fetchRaw(snap.timestamp, snap.original);
    fs.writeFileSync(path.join(outDir, key), buf);
    console.log(`  [OK]   ${url} (${buf.length} bytes)`);
    return { url, status: 'ok', bytes: buf.length };
  } catch (e) {
    console.log(`  [FAIL] ${url} — ${e.message}`);
    return { url, status: 'fail', error: e.message };
  }
}

(async () => {
  console.log('=== Theme JS/CSS ===');
  const themeResults = [];
  for (const url of THEME_FILES) {
    themeResults.push(await processOne(url, THEME_DIR));
    await new Promise(r => setTimeout(r, 400));
  }

  console.log('\n=== Real images ===');
  const imgResults = [];
  for (const url of IMAGE_FILES) {
    imgResults.push(await processOne(url, IMG_DIR));
    await new Promise(r => setTimeout(r, 400));
  }

  fs.writeFileSync(path.join(OUT, 'manifest4.json'), JSON.stringify({ theme: themeResults, images: imgResults }, null, 2));
  console.log('\nDone.');
})();
