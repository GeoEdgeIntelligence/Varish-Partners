/* Site-wide script, loaded on every page.
   The recovered site is missing Elementor's JS chunks, so its hamburger menu
   never opened, its pop-up buttons did nothing and its forms went nowhere.
   This replaces all three. */

/* ----- Forms -> Google Sheet -----
   Every form posts to one Google Apps Script web app that appends a row to a
   tab of the firm's Google Sheet (Homepage / Contact / Careers) and saves
   résumés to Google Drive. Paste the web app's /exec URL below. */
window.VP_FORM_ENDPOINT = 'https://script.google.com/macros/s/AKfycbz13jWXiYu9IF_DbyPFdAkV0dOrYR9x7_lz3f2dJJqmEN9cHfVxIZp5iB1Ohtd1IXqE7g/exec';

/* Send one submission. `form` names the Sheet tab; `fields` is {Label: value}.
   Apps Script can't return CORS headers, so the response can't be read: a
   request that reaches Google counts as sent. */
window.vpSendForm = function (form, fields) {
  var url = window.VP_FORM_ENDPOINT;
  if (!url) return Promise.reject(new Error('Form endpoint not set'));
  var body = new URLSearchParams();
  body.append('form', form);
  body.append('Page', location.pathname);
  Object.keys(fields).forEach(function (k) { body.append(k, fields[k] == null ? '' : String(fields[k])); });
  return fetch(url, { method: 'POST', mode: 'no-cors', body: body });
};

/* Read a chosen file as base64 for the résumé upload (max 5 MB). */
window.vpReadFile = function (file) {
  return new Promise(function (resolve, reject) {
    if (!file) return resolve(null);
    if (file.size > 5 * 1024 * 1024) return reject(new Error('too big'));
    var r = new FileReader();
    r.onload = function () { resolve({ name: file.name, type: file.type || 'application/octet-stream', data: String(r.result).split(',')[1] }); };
    r.onerror = reject;
    r.readAsDataURL(file);
  });
};

(function () {
  'use strict';

  /* ----- Homepage "Get in Touch" form (Elementor markup, no working handler) ----- */
  var ef = document.querySelector('form.elementor-form');
  if (ef && ef.querySelector('[name="form_fields[name]"]')) {
    var btn = ef.querySelector('button[type="submit"]');
    var msg = document.createElement('p');
    msg.className = 'vp-form-msg';
    msg.setAttribute('role', 'status');
    msg.setAttribute('aria-live', 'polite');
    ef.appendChild(msg);
    var get = function (n) { var f = ef.querySelector('[name="form_fields[' + n + ']"]'); return f ? f.value.trim() : ''; };
    ef.setAttribute('novalidate', '');
    ef.addEventListener('submit', function (e) {
      e.preventDefault();
      e.stopImmediatePropagation();
      var name = get('name'), email = get('email'), mobile = get('field_48db529');
      var bad = [];
      if (!name) bad.push('name');
      if (!/^[+\d][\d\s-]{7,}$/.test(mobile)) bad.push('field_48db529');
      if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) bad.push('email');
      Array.prototype.forEach.call(ef.querySelectorAll('input,select,textarea'), function (f) {
        var key = (f.name.match(/form_fields\[(.+)\]/) || [])[1];
        f.setAttribute('aria-invalid', bad.indexOf(key) >= 0 ? 'true' : 'false');
      });
      if (bad.length) {
        msg.className = 'vp-form-msg is-alert';
        msg.textContent = 'Please add your name and a valid mobile number' + (bad.indexOf('email') >= 0 ? ', and check your email address.' : '.');
        return;
      }
      if (btn) btn.disabled = true;
      msg.className = 'vp-form-msg';
      msg.textContent = 'Sending…';
      window.vpSendForm('home', {
        Name: name, Mobile: mobile, Email: email,
        Service: get('field_0a242d9'), Message: get('message'),
      }).then(function () {
        ef.reset();
        msg.textContent = 'Thank you, ' + name.split(' ')[0] + '. We have received your details and will call you shortly.';
      }).catch(function () {
        msg.className = 'vp-form-msg is-alert';
        msg.textContent = 'Sorry, that did not go through. Please call us on +91 87480 20569 or +91 99721 56327.';
      }).then(function () { if (btn) btn.disabled = false; });
    }, true);
  }

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
