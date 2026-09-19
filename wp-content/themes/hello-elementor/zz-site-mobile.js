/* Site-wide fixes for phones and tablets, loaded on every page.
   The recovered site is missing Elementor's JS chunks, so its hamburger menu
   never opened and its pop-up buttons did nothing. This replaces both. */
(function () {
  'use strict';

  /* ----- Pop-up buttons ("Free Consultation", "Contact Us", ...) pointed at an
     Elementor pop-up that no longer exists; send them to the Contact page. ----- */
  Array.prototype.forEach.call(document.querySelectorAll('a[href^="#elementor-action"]'), function (a) {
    a.setAttribute('href', '/contact-us/');
  });

  /* ----- Mobile menu ----- */
  var header = document.querySelector('.elementor-location-header');
  if (!header) return;
  var toggle = header.querySelector('.elementor-menu-toggle');
  var panel = header.querySelector('.elementor-nav-menu--dropdown.elementor-nav-menu__container');
  if (!toggle || !panel) return;
  var widget = toggle.closest('.elementor-widget') || header;
  var CLOSE = '<svg aria-hidden="true" class="vp-menu-close" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>';
  toggle.insertAdjacentHTML('beforeend', CLOSE);
  toggle.setAttribute('aria-controls', panel.id || (panel.id = 'vp-mobile-menu'));
  toggle.setAttribute('aria-label', 'Open menu');
  var links = Array.prototype.slice.call(panel.querySelectorAll('a'));

  function syncHeader() {
    document.documentElement.style.setProperty('--vp-hdr', Math.round(header.getBoundingClientRect().bottom) + 'px');
  }
  function setOpen(open) {
    widget.classList.toggle('vp-menu-open', open);
    document.documentElement.classList.toggle('vp-menu-lock', open);
    toggle.classList.toggle('elementor-active', open);
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    panel.setAttribute('aria-hidden', open ? 'false' : 'true');
    links.forEach(function (a) { a.setAttribute('tabindex', open ? '0' : '-1'); });
    if (open) syncHeader();
  }
  function isOpen() { return widget.classList.contains('vp-menu-open'); }

  toggle.addEventListener('click', function (e) {
    e.preventDefault();
    e.stopPropagation();
    setOpen(!isOpen());
  });
  toggle.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(!isOpen()); }
  });
  links.forEach(function (a) { a.addEventListener('click', function () { setOpen(false); }); });
  document.addEventListener('click', function (e) {
    if (isOpen() && !panel.contains(e.target) && !toggle.contains(e.target)) setOpen(false);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && isOpen()) { setOpen(false); toggle.focus(); }
  });
  window.addEventListener('resize', function () {
    if (window.innerWidth > 1024 && isOpen()) setOpen(false);
    syncHeader();
  });
  syncHeader();
  setOpen(false);
})();
