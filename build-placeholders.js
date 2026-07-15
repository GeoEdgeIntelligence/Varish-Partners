// Builds structural placeholder pages for the 16 pages that have zero
// recoverable content from Wayback: Services hub, 8 service sub-pages,
// Our Story, Insights index, and 14 blog posts. Reuses the REAL recovered
// head/nav/footer/popup so these look identical to the real theme.
// Body copy is intentionally minimal and clearly labeled — not invented
// tax/legal advice — since fabricating specifics on that topic would be
// actively misleading if left unedited.

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const SITE = path.join(ROOT, 'site');

const head = fs.readFileSync(path.join(ROOT, 'tpl-head.html'), 'utf8');
const header = fs.readFileSync(path.join(ROOT, 'site-header-block.html'), 'utf8');
const between = fs.readFileSync(path.join(ROOT, 'tpl-between.html'), 'utf8');
const popup = fs.readFileSync(path.join(ROOT, 'tpl-popup.html'), 'utf8');
const tail = fs.readFileSync(path.join(ROOT, 'tpl-tail.html'), 'utf8');
const footer = fs.readFileSync(path.join(ROOT, 'site-footer-block.html'), 'utf8');

const NOTICE = `
<div style="max-width:960px;margin:32px auto 0;padding:14px 20px;background:#fff3cd;border:1px solid #ffe69c;border-radius:8px;font-family:inherit;">
  <p style="margin:0;font-weight:600;color:#664d03;">This page could not be recovered from the Wayback Machine — the original was never archived. This is a structural placeholder using the site's real theme; copy below is generic and awaits the real content.</p>
</div>`;

function pageShell({ title, slug, bodyHtml, bodyClass = '' }) {
  const thisHead = head.replace(/<title>.*?<\/title>/, `<title>${title} &#8211; Varish Partners</title>`);
  return `<!doctype html>
<html lang="en-US">
${thisHead}
<body class="page-template-default page wp-theme-hello-elementor elementor-default elementor-kit-6 elementor-page ${bodyClass}">
<a class="skip-link screen-reader-text" href="#content">Skip to content</a>
${header}
<main id="content" class="site-main page type-page status-publish hentry">
	<div class="page-content">
		<div class="elementor elementor-placeholder-${slug}" data-elementor-post-type="page">
			${NOTICE}
			<div class="elementor-element elementor-widget elementor-widget-heading" style="max-width:960px;margin:32px auto 0;padding:0 24px;">
				<h1 class="elementor-heading-title elementor-size-default">${title}</h1>
			</div>
			<div class="elementor-element elementor-widget elementor-widget-text-editor" style="max-width:960px;margin:0 auto 64px;padding:0 24px;font-size:17px;line-height:1.7;">
				${bodyHtml}
			</div>
		</div>
	</div>
</main>
${footer}
${between}
${popup}
${tail}`;
}

function write(slug, html) {
  const outDir = path.join(SITE, slug);
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'index.html'), html);
  console.log(`  [OK] /${slug}/`);
}

// --- Services hub ---
const SERVICES = [
  { slug: 'tax-consultancy-compliances', title: 'Tax Consultancy & Compliances' },
  { slug: 'business-registration-services', title: 'Business Registration Services' },
  { slug: 'financial-planning', title: 'Financial Planning' },
  { slug: 'start-up-advisory-and-consultancy-services', title: 'Start-Up Advisory & Consultancy Services' },
  { slug: 'gst-consultancy-compliance', title: 'GST Consultancy & Compliance' },
  { slug: 'fractional-cfo-services', title: 'Fractional CFO Services' },
  { slug: 'business-advisory-services', title: 'Business Advisory Services' },
  { slug: 'strategic-consulting-impact', title: 'Strategic Consulting Impact' },
];

console.log('=== Services hub ===');
const servicesListHtml = SERVICES.map(s => `<li style="margin-bottom:10px;"><a href="/${s.slug}/">${s.title}</a></li>`).join('\n');
write('services', pageShell({
  title: 'Services',
  slug: 'services',
  bodyHtml: `<p>Varish Partners offers the following services:</p><ul>${servicesListHtml}</ul><p>Select a service above to learn more.</p>`,
}));

console.log('\n=== Individual service pages ===');
for (const s of SERVICES) {
  write(s.slug, pageShell({
    title: s.title,
    slug: s.slug,
    bodyHtml: `<p>Details for <strong>${s.title}</strong> are being restored. Please check back soon, or <a href="/contact-us/">contact us</a> directly for information on this service.</p>`,
  }));
}

// --- Our Story ---
console.log('\n=== Our Story ===');
write('our-story', pageShell({
  title: 'Our Story',
  slug: 'our-story',
  bodyHtml: `<p>The story of Varish Partners is being restored. Please check back soon.</p>`,
}));

// --- Insights index ---
console.log('\n=== Insights index ===');
const KNOWN_POSTS = [
  { slug: 'mastering-cash-flow-essential-strategies-to-keep-your-business-thriving', title: 'Mastering Cash Flow: Essential Strategies to Keep Your Business Thriving', recovered: true },
  { slug: 'optimizing-pricing-strategy-for-a-wholesaler', title: 'Optimizing Pricing Strategy for a Wholesaler', recovered: true },
  { slug: 'tds-on-rent-sec-194i-of-income-tax-act-1961', title: 'TDS on Rent (Sec 194I) of Income Tax Act 1961', recovered: false },
  { slug: 'indexation-in-capital-gains-budget-2024-amendments-and-their-impact', title: 'Indexation in Capital Gains: Budget 2024 Amendments and Their Impact', recovered: false },
  { slug: 'claiming-relief-under-section-891-on-salary-arrears-with-example', title: 'Claiming Relief Under Section 89(1) on Salary Arrears (With Example)', recovered: false },
  { slug: 'understanding-section-192-tds-on-salary', title: 'Understanding Section 192: TDS on Salary', recovered: false },
  { slug: 'a-step-by-step-guide-for-casual-taxable-persons-ctp-under-gst', title: 'A Step-by-Step Guide for Casual Taxable Persons (CTP) Under GST', recovered: false },
  { slug: 'understanding-gst-a-comprehensive-guide', title: 'Understanding GST: A Comprehensive Guide', recovered: false },
  { slug: 'gst-simplified-step-by-step-guide-to-vertical-registrations-uins-and-deemed-registration', title: 'GST Simplified: Step-by-Step Guide to Vertical Registrations, UINs, and Deemed Registration', recovered: false },
  { slug: 'complete-guide-to-non-resident-taxable-persons-nrtp-under-gst-registration-compliance-and-reverse-charge-mechanism', title: 'Complete Guide to Non-Resident Taxable Persons (NRTP) Under GST: Registration, Compliance, and Reverse Charge Mechanism', recovered: false },
  { slug: 'filing-tds-returns', title: 'Filing TDS Returns', recovered: false },
  { slug: 'this-is-tds', title: 'This is TDS', recovered: false },
  { slug: 'startup-due-diligence-red-flags-key-areas', title: 'Startup Due Diligence: Red Flags & Key Areas', recovered: false },
  { slug: 'gst-invoice-management-system-guide', title: 'GST Invoice Management System Guide', recovered: false },
  { slug: 'input-tax-credit-demo-vehicles-gst-clarification', title: 'Input Tax Credit on Demo Vehicles: GST Clarification', recovered: false },
  { slug: 'igst-refund-on-export', title: 'IGST Refund on Export', recovered: false },
  { slug: 'income-tax-on-buyback-of-shares-and-changes-in-buyback-taxation-as-per-budget-2024', title: 'Income Tax on Buyback of Shares and Changes in Buyback Taxation as per Budget 2024', recovered: false },
];

const insightsListHtml = KNOWN_POSTS.map(p =>
  `<li style="margin-bottom:10px;"><a href="/${p.slug}/">${p.title}</a>${p.recovered ? ' <em>(full article recovered)</em>' : ' <em>(title only — article pending)</em>'}</li>`
).join('\n');
write('insights', pageShell({
  title: 'Insights',
  slug: 'insights',
  bodyHtml: `<p>All known blog post titles, recovered from the site's archived sitemap:</p><ul>${insightsListHtml}</ul>`,
}));

console.log('\n=== Placeholder blog posts (14 title-only) ===');
for (const p of KNOWN_POSTS.filter(p => !p.recovered)) {
  write(p.slug, pageShell({
    title: p.title,
    slug: p.slug,
    bodyHtml: `<p>This article's original text was never archived — only its title survived (recovered from the site's sitemap). The full article is pending from the site owner. We won't fabricate tax/legal specifics here since getting it wrong would be actively misleading.</p>`,
    bodyClass: 'single-post',
  }));
}

console.log('\nDone. All placeholder pages written under site/.');
