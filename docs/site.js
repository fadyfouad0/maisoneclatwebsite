/* Maison Éclat — the site's own script.
 *
 * The pages ship as finished markup; this gives them back the behaviour the design
 * had: the menu, the saved list, search, filters and sorting, the two sliders on the
 * home page, and the piece pages, which are one design filled from catalog.json.
 * Replace that one file (or point loadCatalogue at a CMS) and every page follows.
 */
(function () {
  'use strict';

  var BASE = window.BASE || '';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var root = $('[data-page]');
  var PAGE = root ? root.getAttribute('data-page') : '';
  var WA = 'https://wa.me/201111863064';
  var DATA = { pieces: [], by: {} };

  function on(el, ev, fn) { if (el) el.addEventListener(ev, fn); }
  function txt(el, s) { if (el) el.textContent = s == null ? '' : String(s); }
  function show(el, yes, cls) { if (el) el.classList.toggle(cls || 'on', !!yes); }

  /* ---------------------------------------------------------------- the saved list */
  var KEY = 'maison-eclat.saved';
  var saved = [];
  try { saved = JSON.parse(localStorage.getItem(KEY) || '[]') || []; } catch (e) { saved = []; }
  if (!Array.isArray(saved)) saved = [];

  function persist() {
    try { localStorage.setItem(KEY, JSON.stringify(saved)); } catch (e) {}
  }
  function isSaved(slug) { return saved.indexOf(slug) > -1; }
  function toggleSaved(slug) {
    var i = saved.indexOf(slug);
    if (i > -1) saved.splice(i, 1); else saved.push(slug);
    persist(); paintSaved();
  }
  function slugInHref(href) {
    if (!href) return '';
    var m = href.match(/[?&]p=([^&#]+)/);
    if (m) { try { return decodeURIComponent(m[1]); } catch (e) { return m[1]; } }
    m = href.match(/pieces\/([^./]+)\.html/);
    return m ? m[1] : '';
  }
  function slugOf(el) {
    /* the card the heart belongs to, however that card is built */
    var box = el.closest('[data-slug]');
    if (box && box.getAttribute('data-slug')) return box.getAttribute('data-slug');
    box = el.closest('.pc-w, .d3-cw, .pc, .pb-st, .gal, figure, li') || el.parentNode;
    while (box && box !== document.body) {
      var link = box.matches && box.matches('a[href]') ? box : (box.querySelector && box.querySelector('a[href]'));
      var s = slugInHref(link && link.getAttribute('href'));
      if (s) return s;
      box = box.parentNode;
    }
    if (window.PIECE) return window.PIECE;
    try { return new URLSearchParams(location.search).get('p') || ''; } catch (e) { return ''; }
  }

  function paintSaved() {
    $$('.sv-b, .pc-sv, .pdp-sv').forEach(function (b) {
      var s = b.getAttribute('data-slug') || slugOf(b);
      var yes = isSaved(s);
      b.classList.toggle('on', yes);
      b.setAttribute('aria-pressed', yes ? 'true' : 'false');
      var nm = (DATA.by[s] && DATA.by[s].name) || 'this piece';
      b.setAttribute('aria-label', (yes ? 'Remove ' : 'Save ') + nm);
      if (b.classList.contains('btn')) { var bt = $('span', b); if (bt) txt(bt, yes ? 'Saved to your list' : 'Save this piece'); }
    });
    var n = saved.length;
    $$('.nb-sv sup, .sv-head b span, [data-saved-count]').forEach(function (e) { txt(e, n); });
    $$('.nb-sv').forEach(function (b) { b.classList.toggle('on', n > 0); });
    var word = $('.sv-head .sv-tog span:not(.sc-interp) span, .sv-head .sv-tog > span > span');
    if (word) txt(word, n === 1 ? 'Saved piece' : 'Saved pieces');
    renderTray();
    if (PAGE === 'saved') savedPage();
  }

  function renderTray() {
    var bar = $('.sv-bar'); if (!bar) return;
    var list = $('.sv-list', bar), empty = $('.sv-empty', bar), foot = $('.sv-foot', bar);
    if (!list) return;
    $$('.sv-row', list).forEach(function (r) { r.remove(); });
    bar.classList.toggle('none', saved.length === 0);
    if (empty) empty.style.display = saved.length ? 'none' : '';
    if (foot) foot.style.display = saved.length ? '' : 'none';
    saved.forEach(function (s) {
      var p = DATA.by[s]; if (!p) return;
      var row = document.createElement('a');
      row.className = 'sv-row';
      row.href = BASE + p.href;
      row.innerHTML = '<span class="sv-th"><img alt="" src="' + BASE + p.img + '"></span>'
        + '<span class="sv-tt"><b></b><em></em></span><span class="sv-pp"></span>';
      txt($('b', row), p.name); txt($('em', row), p.mat); txt($('.sv-pp', row), p.price);
      list.insertBefore(row, foot || null);
    });
    if (foot && !$('.sv-all', bar) && PAGE !== 'saved') {
      var all = document.createElement('a');
      all.className = 'sv-all'; all.href = BASE + 'saved.html';
      all.innerHTML = '<span>See the full list</span><svg aria-hidden="true" fill="none" height="10" stroke="currentColor" viewBox="0 0 16 10" width="16"><path d="M0 5h15M11 1l4 4-4 4"></path></svg>';
      foot.insertBefore(all, foot.firstChild);
    }
    var go = $('.sv-go', bar);
    if (go) {
      var names = saved.map(function (s) { return DATA.by[s] ? DATA.by[s].name : s; });
      go.href = WA + '?text=' + encodeURIComponent(
        names.length ? 'Hello Maison Éclat, I am interested in: ' + names.join(', ') + '.'
                     : 'Hello Maison Éclat, I would like to ask about a piece.');
    }
  }

  document.addEventListener('click', function (e) {
    var b = e.target.closest ? e.target.closest('.sv-b, .pc-sv, .pdp-sv') : null;
    if (!b) return;
    e.preventDefault(); e.stopPropagation();
    var s = b.getAttribute('data-slug') || slugOf(b);
    if (s) toggleSaved(s);
  });


  /* ---------------------------------------------------------------- the saved page */
  /* a list sent as a link (saved.html?l=a,b) is shown as it was sent, until it is kept */
  var SHARED = null;
  if (PAGE === 'saved') {
    try {
      var lq = new URLSearchParams(location.search).get('l');
      if (lq) SHARED = lq.split(',').map(function (x) { return x.trim(); }).filter(Boolean);
    } catch (e) { SHARED = null; }
  }
  function savedPage() {
    var pg = $('.svp'); if (!pg) return;
    var list = SHARED || saved;
    var pieces = list.map(function (s) { return DATA.by[s]; }).filter(Boolean);
    var ol = $('.svp-list', pg), empty = $('.svp-empty', pg), act = $('.svp-act', pg);
    pg.classList.toggle('none', !pieces.length);
    if (empty) empty.hidden = pieces.length > 0;
    if (act) act.hidden = pieces.length === 0;
    $$('.svp-c', pg).forEach(function (e) { txt(e, pieces.length); });
    var sh = $('.svp-shared', pg); if (sh) sh.hidden = !SHARED;
    txt($('.svp-ti', pg), SHARED ? 'A shared list' : 'Saved');
    txt($('.svp-note', pg), SHARED ? 'Sent to you as a link. Keep it and these pieces join your own list on this device.'
      : 'Kept on this device. Send it over and we reply on WhatsApp with sizes, finishes and what is on the floor.');
    var clr = $('.svp-clear', pg); if (clr) clr.hidden = !!SHARED;
    ol.innerHTML = '';
    pieces.forEach(function (p, i) {
      var li = document.createElement('li');
      li.className = 'svp-row'; li.setAttribute('data-slug', p.slug);
      li.innerHTML = '<span class="svp-n"></span>'
        + '<a class="svp-im" tabindex="-1" aria-hidden="true"><img alt="" loading="lazy" decoding="async"></a>'
        + '<div class="svp-t"><a class="svp-nm"></a><span class="svp-m"></span></div>'
        + '<span class="svp-p"></span>'
        + (SHARED ? '' : '<button class="svp-x" type="button">Remove</button>');
      txt($('.svp-n', li), (i < 9 ? '0' : '') + (i + 1));
      $('.svp-im', li).href = BASE + p.href; $('.svp-nm', li).href = BASE + p.href;
      $('img', li).src = BASE + p.img;
      txt($('.svp-nm', li), p.name);
      txt($('.svp-m', li), p.cat + ' · ' + p.mat);
      txt($('.svp-p', li), p.price);
      var x = $('.svp-x', li);
      if (x) {
        x.setAttribute('aria-label', 'Remove ' + p.name);
        on(x, 'click', function () {
          li.style.height = li.offsetHeight + 'px';
          li.classList.add('gone');
          requestAnimationFrame(function () { li.style.height = '0px'; });
          setTimeout(function () { var k = saved.indexOf(p.slug); if (k > -1) { saved.splice(k, 1); persist(); } paintSaved(); }, REDUCED ? 0 : 420);
        });
      }
      ol.appendChild(li);
    });
    var wa = $('.svp-wa', pg);
    if (wa) wa.href = WA + '?text=' + encodeURIComponent('Hello Maison Éclat, I am interested in: '
      + pieces.map(function (p) { return p.name; }).join(', ') + '. Could you send me sizes, finishes and what is on the floor?');
  }
  function savedPageWire() {
    var pg = $('.svp'); if (!pg || pg.getAttribute('data-wired')) return;
    pg.setAttribute('data-wired', '1');
    var say = $('.svp-copied', pg);
    function note(m) { txt(say, m); clearTimeout(note.t); note.t = setTimeout(function () { txt(say, ''); }, 3200); }
    on($('.svp-clear', pg), 'click', function () { saved = []; persist(); paintSaved(); window.scrollTo({ top: 0, behavior: REDUCED ? 'auto' : 'smooth' }); });
    on($('.svp-keep', pg), 'click', function () {
      (SHARED || []).forEach(function (s) { if (DATA.by[s] && saved.indexOf(s) < 0) saved.push(s); });
      persist(); SHARED = null;
      try { history.replaceState(null, '', location.pathname); } catch (e) {}
      paintSaved(); note('Saved to your list.');
    });
    on($('.svp-share', pg), 'click', function () {
      var l = (SHARED || saved).join(',');
      var url = location.origin + location.pathname + '?l=' + encodeURIComponent(l).replace(/%2C/g, ',');
      function shown() { note('Copy this link: ' + url); }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(function () { note('Link copied. Anyone who opens it sees this list.'); }, shown);
      } else shown();
    });
  }

  /* ---------------------------------------------------------------- menu and tray */
  function closeAll() {
    if (typeof closeSheet === 'function') closeSheet();
    show($('.mn'), false); show($('.sv-bar'), false, 'open');
    document.documentElement.style.overflow = '';
  }
  $$('.nb-mb, [data-open-menu], .ph .bar .ic[aria-label*="menu"]').forEach(function (b) {
    on(b, 'click', function (e) {
      e.preventDefault();
      var mn = $('.mn'); if (!mn) return;
      var open = !mn.classList.contains('on');
      show($('.sv-bar'), false, 'open');
      show(mn, open);
      b.setAttribute('aria-expanded', open ? 'true' : 'false');
      document.documentElement.style.overflow = open ? 'hidden' : '';
    });
  });
  $$('.mn-x').forEach(function (b) { on(b, 'click', function () { closeAll(); }); });
  $$('.mn a').forEach(function (a) { on(a, 'click', function () { closeAll(); }); });
  $$('.nb-sv, [data-open-saved], .ph .bar .ic[aria-label*="Saved"]').forEach(function (b) {
    /* marked so the click that opens the tray is not also read as a click outside it */
    b.setAttribute('data-open-saved', '');
    on(b, 'click', function (e) {
      e.preventDefault();
      if (PAGE === 'saved') { window.scrollTo({ top: 0, behavior: REDUCED ? 'auto' : 'smooth' }); return; }
      var bar = $('.sv-bar'); if (!bar) return;
      var open = !bar.classList.contains('open');
      show($('.mn'), false);
      bar.classList.toggle('open', open);
      b.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  });
  on($('.sv-tog'), 'click', function () {
    var bar = $('.sv-bar'); if (bar) bar.classList.toggle('open');
  });
  on($('.sv-clear'), 'click', function () { saved = []; persist(); paintSaved(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeAll(); });
  document.addEventListener('click', function (e) {
    var bar = $('.sv-bar');
    if (bar && bar.classList.contains('open') && !e.target.closest('.sv-bar')
        && !e.target.closest('[data-open-saved]')) {
      bar.classList.remove('open');
    }
  });

  /* search: the collection page is where searching happens, so that is where it goes */
  $$('.nv-si, .ph .bar .ic[aria-label*="Search"], [data-open-search]').forEach(function (b) {
    on(b, 'click', function (e) {
      e.preventDefault();
      var q = $('#sh-q');
      if (phoneView() && hasGrid()) { openSheet(true); return; }
      if (q && q.offsetParent) { q.scrollIntoView({ behavior: 'smooth', block: 'center' }); setTimeout(function () { q.focus(); }, 320); }
      else window.location.href = BASE + 'collection.html#search';
    });
  });

  /* ---------------------------------------------------------------- the grids */
  var CAT_OF_PAGE = {
    'Chandelier': 'Chandelier', 'Pendant': 'Pendant', 'Wall light': 'Wall light',
    'Table lamp': 'Table lamp', 'Floor lamp': 'Floor lamp', 'Outdoor': 'Outdoor', 'Accessories': 'Accessory'
  };
  function phoneView() { var p = $('.ph'); return !!(p && p.offsetParent !== null && getComputedStyle(p).display !== 'none'); }
  function hasGrid() { return PAGE === 'collection' || !!CAT_OF_PAGE[PAGE]; }
  var REDUCED = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var LB = { 'new': ['New', 'lb-new'], 'show': ['In the showroom', 'lb-show'],
             'order': ['Made to order', 'lb-order'], 'last': ['Last piece', 'lb-last'] };
  var state = { q: '', av: 'All', mat: 'All', sort: 'feat', col: '' };

  function priceOf(p) {
    var m = String(p.price || '').replace(/,/g, '').match(/\d+/);
    return m ? +m[0] : null;
  }
  function pool() {
    var cat = CAT_OF_PAGE[PAGE];
    return DATA.pieces.filter(function (p) { return !cat || p.cat === cat; });
  }
  function matches(p) {
    var q = state.q.trim().toLowerCase();
    if (q) {
      var hay = [p.name, p.cat, p.mat, p.maker, p.collection].join(' ').toLowerCase();
      if (hay.indexOf(q) === -1) return false;
    }
    if (state.av !== 'All') {
      var want = { 'New': 'new', 'In the showroom': 'show', 'Made to order': 'order', 'Last piece': 'last' }[state.av];
      if (want && p.label !== want) return false;
    }
    if (state.mat !== 'All') {
      if (String(p.mat).toLowerCase().indexOf(state.mat.toLowerCase()) === -1) return false;
    }
    if (state.col && String(p.collection || '').toLowerCase() !== state.col) return false;
    return true;
  }
  function sorted(list) {
    var l = list.slice();
    if (state.sort === 'az') l.sort(function (a, b) { return a.name.localeCompare(b.name); });
    else if (state.sort === 'lo' || state.sort === 'hi') {
      l.sort(function (a, b) {
        var x = priceOf(a), y = priceOf(b);
        if (x == null && y == null) return 0;
        if (x == null) return 1;
        if (y == null) return -1;
        return state.sort === 'lo' ? x - y : y - x;
      });
    }
    return l;
  }

  function fillCardD(node, p) {
    node.setAttribute('data-slug', p.slug);
    var a = $('.d3-cell', node); if (a) a.href = BASE + p.href;
    var lb = $('.t .lb', node);
    if (lb) {
      var d = LB[p.label];
      lb.className = 'lb ' + (d ? d[1] : 'lb-none');
      txt($('span span', lb) || $('span', lb), d ? d[0] : '');
    }
    var right = $('.t > span:last-child', node);
    if (right && right !== lb) txt(right, p.cat);
    var im = $('img', node); if (im) { im.src = BASE + p.img; im.alt = p.name; }
    txt($('.b b', node), p.name); txt($('.b small', node), p.mat); txt($('.b em', node), p.price);
    var sv = $('.sv-b', node); if (sv) sv.setAttribute('data-slug', p.slug);
    return node;
  }
  function fillCardP(node, p) {
    node.setAttribute('data-slug', p.slug);
    node.href = BASE + p.href;
    var lb = $('.pc-lb', node);
    var d = LB[p.label];
    if (lb) { if (d) txt(lb, d[0]); else lb.remove(); }
    var im = $('img', node); if (im) { im.src = BASE + p.img; im.alt = p.name; }
    txt($('.pc-t b', node), p.name); txt($('.pc-t em', node), p.cat); txt($('.pc-p', node), p.price);
    var sv = $('.pc-sv', node); if (sv) sv.setAttribute('data-slug', p.slug);
    return node;
  }

  function tplNode(id) {
    var t = document.getElementById(id);
    return t ? t.content.firstElementChild : null;
  }

  function renderGrids() {
    var list = sorted(pool().filter(matches));
    var dGrid = $('.d3 .d3-grid'), pGrid = $('.ph .g2');
    var td = tplNode('t-card-d'), tp = tplNode('t-card-p');
    if (dGrid && td) {
      dGrid.innerHTML = '';
      list.forEach(function (p) { dGrid.appendChild(fillCardD(td.cloneNode(true), p)); });
      dGrid.classList.add('seen');
      dGrid.classList.toggle('off', list.length === 0);
    }
    if (pGrid && tp) {
      pGrid.innerHTML = '';
      list.forEach(function (p) { pGrid.appendChild(fillCardP(tp.cloneNode(true), p)); });
    }
    var none = $('.sh-none'); show(none, list.length === 0 && pool().length > 0);
    emptyCategory(pool().length === 0);
    syncSheet(list.length);
    var meta = $('.sh-meta'), count = meta && $('[aria-live]', meta);
    var dirty = state.q || state.av !== 'All' || state.mat !== 'All' || state.col;
    show(meta, !!dirty);
    if (count) txt(count, 'Showing ' + list.length + ' of ' + pool().length + (pool().length === 1 ? ' piece' : ' pieces'));
    show($('.sh-clear'), !!dirty);
    show($('.cf-x'), !!dirty);
    show($('.sh-x'), !!state.q);
    paintSaved();
  }

  function wireFilters() {
    var q = $('#sh-q');
    on(q, 'input', function () { state.q = q.value; renderGrids(); });
    on($('.sh-x'), 'click', function () { if (q) { q.value = ''; state.q = ''; renderGrids(); q.focus(); } });
    $$('.sh-av button').forEach(function (b) {
      on(b, 'click', function () {
        state.av = b.textContent.trim();
        $$('.sh-av button').forEach(function (o) {
          o.classList.toggle('on', o === b);
          o.setAttribute('aria-pressed', o === b ? 'true' : 'false');
        });
        renderGrids();
      });
    });
    $$('.cf-g').forEach(function (g) {
      var kind = (($('.cf-k', g) || {}).textContent || '').trim().toLowerCase();
      $$('.cf-c', g).forEach(function (b) {
        on(b, 'click', function () {
          var v = b.textContent.trim();
          if (kind.indexOf('material') > -1) state.mat = (state.mat === v ? 'All' : v);
          else state.av = (state.av === v ? 'All' : v);
          $$('.cf-c', g).forEach(function (o) {
            var active = (kind.indexOf('material') > -1 ? state.mat : state.av) === o.textContent.trim();
            o.classList.toggle('on', active);
            o.setAttribute('aria-pressed', active ? 'true' : 'false');
          });
          renderGrids();
        });
      });
    });
    on($('.cf-b'), 'click', function () {
      var p = $('.cf-p'); if (p) p.classList.toggle('on');
      var b = $('.cf-b'); if (b) b.classList.toggle('on');
    });
    on($('.cf-x'), 'click', clearAll);
    on($('.sh-clear'), 'click', clearAll);
    /* the two filter bars label the same sorts differently */
    var SORT = { featured: 'feat', feat: 'feat', low: 'lo', lo: 'lo', high: 'hi', hi: 'hi', az: 'az' };
    $$('select').forEach(function (s) {
      on(s, 'change', function () { state.sort = SORT[s.value] || 'feat'; renderGrids(); });
    });
    /* the phone has its own sheet for search, filters and sorting */
    on($('.fl-b'), 'click', function (e) { e.preventDefault(); openSheet(false); });
    on($('.fl-s'), 'click', function (e) { e.preventDefault(); openSheet(false, 'sort'); });
    /* chandelier collections: tabs on the page, and links from the menu (chandeliers.html#modern) */
    $$('.ct-tabs a[href^="#"]').forEach(function (a) {
      on(a, 'click', function (e) {
        e.preventDefault();
        var k = a.getAttribute('href').slice(1);
        state.col = k === 'all' ? '' : k;
        try { history.replaceState(null, '', k === 'all' ? location.pathname + location.search : '#' + k); } catch (er) {}
        paintTabs(); renderGrids();
      });
    });
    /* a link can arrive with a filter already chosen */
    var h = (location.hash || '').slice(1);
    if (/^(classic|modern|glass)$/.test(h) && $('.ct-tabs a[href="#' + h + '"]')) state.col = h;
    var AV = { 'new': 'New', 'in-the-showroom': 'In the showroom', 'made-to-order': 'Made to order', 'last-piece': 'Last piece' };
    if (AV[h]) {
      state.av = AV[h];
      $$('.sh-av button, .cf-c').forEach(function (o) {
        var yes = o.textContent.trim() === state.av;
        if (o.closest('.cf-g') && !/availab/i.test(((o.closest('.cf-g').querySelector('.cf-k')) || {}).textContent || '')) return;
        o.classList.toggle('on', yes); o.setAttribute('aria-pressed', yes ? 'true' : 'false');
      });
    }
    paintTabs();
    window.addEventListener('hashchange', function () {
      var k = (location.hash || '').slice(1);
      if (/^(classic|modern|glass|all)$/.test(k)) { state.col = k === 'all' ? '' : k; paintTabs(); renderGrids(); }
    });
  }
  function paintTabs() {
    $$('.ct-tabs a[href^="#"]').forEach(function (a) {
      var k = a.getAttribute('href').slice(1), yes = (k === 'all' ? '' : k) === state.col;
      a.classList.toggle('on', yes); a.setAttribute('aria-current', yes ? 'page' : 'false');
    });
  }

  /* a category with nothing listed yet says so, and says how to ask */
  function emptyCategory(yes) {
    var name = (($('.d3 h1') || {}).textContent || 'This category').trim();
    [['.d3 .d3-grid', 'd3'], ['.ph .g2', 'ph']].forEach(function (pair) {
      var grid = $(pair[0]); if (!grid) return;
      var box = grid.parentNode.querySelector('.ac-none');
      if (!yes) { if (box) box.remove(); return; }
      if (box) return;
      box = document.createElement('div'); box.className = 'ac-none';
      box.innerHTML = '<small></small><h2></h2><p></p><div class="ac-r"><a class="ac-a" target="_blank" rel="noopener"></a><a class="ac-b"></a></div>';
      txt($('small', box), name);
      txt($('h2', box), 'Ask us what we carry.');
      txt($('p', box), 'We do not list these online yet. Tell us what you need, the fitting or the size, and we will send you what we have.');
      var a = $('.ac-a', box); a.href = WA + '?text=' + encodeURIComponent('Hello Maison Éclat, I am looking for ' + name.toLowerCase() + '.'); txt(a, 'Ask on WhatsApp');
      var b = $('.ac-b', box); b.href = BASE + 'collection.html'; txt(b, 'See all pieces');
      grid.parentNode.insertBefore(box, grid.nextSibling);
    });
    $$('.ph .fl, .d3 .cf').forEach(function (f) { f.style.display = yes ? 'none' : ''; });
  }

  /* ---------------------------------------------------------------- the phone sheet */
  var sheet = null;
  var SORTS = [['feat', 'Featured'], ['lo', 'Price, low to high'], ['hi', 'Price, high to low'], ['az', 'A to Z']];
  function chips(list, cur, set) {
    var w = document.createElement('div'); w.className = 'fs-cs';
    list.forEach(function (v) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'fs-c';
      txt(b, v[1]); b.setAttribute('aria-pressed', v[0] === cur ? 'true' : 'false');
      on(b, 'click', function () { set(v[0]); });
      w.appendChild(b);
    });
    return w;
  }
  function buildSheet() {
    if (sheet) return sheet;
    sheet = document.createElement('div'); sheet.className = 'fs';
    sheet.setAttribute('role', 'dialog'); sheet.setAttribute('aria-modal', 'true'); sheet.setAttribute('aria-label', 'Search, filter and sort');
    sheet.innerHTML = '<div class="fs-sc"></div><div class="fs-p"><div class="fs-h"><b>Search and filter</b>'
      + '<button type="button" class="fs-x" aria-label="Close"><svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><path d="M2 2l12 12M14 2L2 14"/></svg></button></div>'
      + '<div class="fs-b"><span class="fs-k">Search</span><label class="fs-q"><svg width="16" height="16" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.3" aria-hidden="true"><circle cx="8" cy="8" r="5.2"/><path d="M12 12l4 4"/></svg>'
      + '<input type="search" enterkeyhint="search" placeholder="A name, a material, a maker" aria-label="Search the collection"></label>'
      + '<div class="fs-s"></div></div>'
      + '<div class="fs-f"><button type="button" class="fs-cl">Clear</button><button type="button" class="fs-go"></button></div></div>';
    document.body.appendChild(sheet);
    var input = $('input', sheet);
    on(input, 'input', function () { state.q = input.value; var dq = $('#sh-q'); if (dq) dq.value = input.value; renderGrids(); });
    on(input, 'keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); closeSheet(); } });
    on($('.fs-sc', sheet), 'click', closeSheet);
    on($('.fs-x', sheet), 'click', closeSheet);
    on($('.fs-go', sheet), 'click', closeSheet);
    on($('.fs-cl', sheet), 'click', function () { clearAll(); input.value = ''; fillSheet(); });
    on(sheet, 'keydown', function (e) { if (e.key === 'Escape') closeSheet(); });
    return sheet;
  }
  function fillSheet() {
    if (!sheet) return;
    var box = $('.fs-s', sheet); box.innerHTML = '';
    var add = function (label, node, key) { var k = document.createElement('span'); k.className = 'fs-k'; txt(k, label); if (key) k.setAttribute('data-k', key); box.appendChild(k); box.appendChild(node); };
    add('Sort', chips(SORTS, state.sort, function (v) { state.sort = v; syncSelects(); renderGrids(); fillSheet(); }), 'sort');
    var have = pool(), avs = [['All', 'All']];
    ['New', 'In the showroom', 'Made to order', 'Last piece'].forEach(function (a) {
      var code = { 'New': 'new', 'In the showroom': 'show', 'Made to order': 'order', 'Last piece': 'last' }[a];
      if (have.some(function (p) { return p.label === code; })) avs.push([a, a]);
    });
    add('Availability', chips(avs, state.av, function (v) { state.av = v; renderGrids(); fillSheet(); }));
    var mats = {}; have.forEach(function (p) { String(p.mat || '').split(',').forEach(function (m) { m = m.trim(); if (m) mats[m.charAt(0).toUpperCase() + m.slice(1)] = 1; }); });
    var ml = [['All', 'All']].concat(Object.keys(mats).sort().map(function (m) { return [m, m]; }));
    add('Material', chips(ml, state.mat, function (v) { state.mat = v; renderGrids(); fillSheet(); }));
    if ($('.ct-tabs a[href^="#"]')) {
      var cols = $$('.ct-tabs a[href^="#"]').map(function (a) { var k = a.getAttribute('href').slice(1); return [k === 'all' ? '' : k, a.textContent.trim()]; });
      add('Collection', chips(cols, state.col, function (v) { state.col = v; paintTabs(); renderGrids(); fillSheet(); }));
    }
  }
  function syncSelects() {
    var back = { feat: ['featured', 'feat'], lo: ['low', 'lo'], hi: ['high', 'hi'], az: ['az'] }[state.sort] || ['featured'];
    $$('select').forEach(function (s) { [].some.call(s.options, function (o) { if (back.indexOf(o.value) > -1) { s.value = o.value; return true; } }); });
  }
  function syncSheet(n) {
    var lab = SORTS.filter(function (x) { return x[0] === state.sort; })[0];
    var fs = $('.ph .fl-s span'); if (fs && lab) txt(fs, lab[0] === 'feat' ? 'Featured' : lab[1]);
    var dirty = (state.q ? 1 : 0) + (state.av !== 'All' ? 1 : 0) + (state.mat !== 'All' ? 1 : 0) + (state.col ? 1 : 0);
    var fb = $('.ph .fl-b span'); if (fb) txt(fb, dirty ? 'Filter (' + dirty + ')' : 'Filter');
    if (sheet) txt($('.fs-go', sheet), 'Show ' + n + (n === 1 ? ' piece' : ' pieces'));
  }
  var sheetFrom = null;
  function openSheet(focusSearch, part) {
    buildSheet(); fillSheet(); syncSheet(sorted(pool().filter(matches)).length);
    $('input', sheet).value = state.q;
    sheetFrom = document.activeElement;
    sheet.classList.add('on'); document.documentElement.style.overflow = 'hidden';
    setTimeout(function () {
      if (focusSearch) $('input', sheet).focus();
      else if (part === 'sort') { var k = $('[data-k="sort"]', sheet); if (k && k.nextSibling) k.nextSibling.querySelector('button').focus(); }
      else $('.fs-x', sheet).focus();
    }, 60);
  }
  function closeSheet() {
    if (!sheet) return;
    sheet.classList.remove('on'); document.documentElement.style.overflow = '';
    if (sheetFrom && sheetFrom.focus) try { sheetFrom.focus(); } catch (e) {}
    var g = $('.ph .g2'); if (g && g.getBoundingClientRect().top < 0) g.scrollIntoView({ block: 'start' });
  }
  function clearAll() {
    state.q = ''; state.av = 'All'; state.mat = 'All'; state.col = '';
    var q = $('#sh-q'); if (q) q.value = '';
    paintTabs();
    $$('.sh-av button').forEach(function (o, i) {
      o.classList.toggle('on', i === 0); o.setAttribute('aria-pressed', i === 0 ? 'true' : 'false');
    });
    $$('.cf-c').forEach(function (o) { o.classList.remove('on'); o.setAttribute('aria-pressed', 'false'); });
    renderGrids();
  }

  /* ---------------------------------------------------------------- the home sliders */
  function slider(opts) {
    var dots = $$(opts.dots);
    if (!dots.length) return;
    var i = 0, n = dots.length, timer = null;
    function go(k) {
      i = (k + n) % n;
      opts.apply(i);
      dots.forEach(function (d, j) {
        d.setAttribute('aria-pressed', j === i ? 'true' : 'false');
        d.classList.toggle('on', j === i);
      });
    }
    dots.forEach(function (d, j) { on(d, 'click', function () { go(j); rest(); }); });
    if (opts.prev) on($(opts.prev), 'click', function () { go(i - 1); rest(); });
    if (opts.next) on($(opts.next), 'click', function () { go(i + 1); rest(); });
    function rest() { if (timer) { clearInterval(timer); timer = null; } start(); }
    function start() { if (opts.every && !REDUCED) timer = setInterval(function () { go(i + 1); }, opts.every); }
    go(0); start();
    return { go: go };
  }

  function setOnly(nodes, i) {
    nodes.forEach(function (el, j) {
      el.classList.toggle('on', j === i);
      el.classList.toggle('out', j < i);
    });
  }

  function homeSliders() {
    /* statement pieces */
    var lamps = $$('.d3 .sp-l'), words = $$('.d3 .sp-w'), metas = $$('.d3 .sp-s'), cards = $$('.d3 .sp-card');
    if (lamps.length) {
      slider({
        dots: '.d3 .sp-dots .sp-dot', every: 5200,
        apply: function (i) { setOnly(lamps, i); setOnly(words, i); setOnly(metas, i); setOnly(cards, i); }
      });
    }
    /* see them in a room */
    var ims = $$('.d3 .lk-im'), cap = $('.d3 .lk-cap'), lcards = $$('.d3 .lk-card');
    var hs = $$('.d3 .lk-hs');
    var ROOMS = (window.SITE && window.SITE.rooms) || [];
    if (ims.length) {
      slider({
        dots: '.d3 .lk-dots .lk-dot', prev: '.d3 .lk-pv', next: '.d3 .lk-nx', every: 6000,
        apply: function (i) {
          ims.forEach(function (im, j) { im.classList.toggle('on', j === i); });
          var room = ROOMS[i] || {};
          if (cap && room.title) txt($('span', cap) || cap, room.title);
          var want = room.pins || [];
          hs.forEach(function (b, j) {
            var mine = want.indexOf(j) > -1;
            b.classList.toggle('in', mine);
            b.style.display = mine ? '' : 'none';
          });
          lcards.forEach(function (c, j) {
            var mine = want.indexOf(j) > -1;
            c.classList.toggle('on', mine);
            c.style.display = mine ? '' : 'none';
          });
        }
      });
      hs.forEach(function (b, j) {
        on(b, 'mouseenter', function () { lcards.forEach(function (c, k) { c.classList.toggle('lit', k === j); }); });
        on(b, 'mouseleave', function () { lcards.forEach(function (c) { c.classList.remove('lit'); }); });
      });
    }
    /* the phone has the same two, with its own markup */
    var pl = $$('.ph .sp-l'), pw = $$('.ph .sp-w'), ps = $$('.ph .sp-s'), pc = $$('.ph .sp-card');
    if (pl.length) {
      slider({ dots: '.ph .sp-dots .sp-dot', every: 5200,
        apply: function (i) { setOnly(pl, i); setOnly(pw, i); setOnly(ps, i); setOnly(pc, i); } });
    }
    var rim = $$('.ph .rm-im'), rcap = $$('.ph .rm-cap b'), rset = $$('.ph .rm-set');
    if (rim.length) {
      slider({ dots: '.ph .rm-dots .rm-dot', every: 6000,
        apply: function (i) {
          rim.forEach(function (e, j) { e.classList.toggle('on', j === i); });
          rcap.forEach(function (e, j) { e.classList.toggle('on', j === i); });
          rset.forEach(function (e, j) { e.classList.toggle('on', j === i); });
        } });
    }
  }

  /* ---------------------------------------------------------------- a piece page */
  function piecePage() {
    /* one page serves every piece: the address says which */
    var slug = window.PIECE;
    if (!slug) {
      try { slug = new URLSearchParams(location.search).get('p'); } catch (e) {}
    }
    var p = slug && DATA.by[slug];
    if (!p) { missingPiece(); return; }
    document.title = p.name + ' | Maison Éclat';
    var md = $('meta[name="description"]');
    if (md) md.setAttribute('content', p.name + ', ' + p.cat.toLowerCase() + ' in ' + p.mat.toLowerCase() + '. ' + p.price + '. See it lit at Maison Éclat, Cairo.');

    $$('.pb-st, .ph .pd').forEach(function (h) { h.setAttribute('data-slug', slug); });

    /* the head of the page */
    txt($('.d3 .pb-w'), p.name);
    var cordI = $('.d3 .pb-w i'); if (cordI) $('.d3 .pb-w').appendChild(cordI);
    var hero = $('.d3 img.pb-l');
    if (hero) { hero.src = BASE + p.img; hero.alt = p.name + ' ' + p.cat.toLowerCase(); }

    var lb = $('.d3 .pb-s .lb');
    if (lb) {
      var d = LB[p.label];
      lb.className = 'lb ' + (d ? d[1] : 'lb-none');
      txt($('span', lb), d ? d[0] : '');
    }
    var catLine = $('.d3 .pb-s span:not(.lb)');
    if (catLine) txt(catLine, p.cat + (p.maker ? ' · ' + p.maker : ''));
    txt($('.d3 .pb-s b'), p.mat);

    var price = $$('.d3 .pb-s')[1];
    if (price) {
      var from = $('span', price), amount = $('b', price);
      var isFrom = /^from/i.test(p.price);
      if (from) { from.style.display = isFrom ? '' : 'none'; txt(from, 'From'); }
      txt(amount, p.price.replace(/^from\s*/i, ''));
    }

    /* the breadcrumb */
    var crumb = $('.d3 .crumb');
    if (crumb) {
      var as = $$('a', crumb), b = $('b', crumb);
      var catHref = { 'Chandelier': 'chandeliers.html', 'Pendant': 'pendants.html',
        'Wall light': 'wall-lights.html', 'Table lamp': 'table-lamps.html',
        'Floor lamp': 'floor-lamps.html', 'Outdoor': 'outdoor.html' }[p.cat] || 'collection.html';
      if (as[0]) as[0].href = BASE + 'index.html';
      if (as[1]) as[1].href = BASE + 'collection.html';
      if (as[2]) { as[2].href = BASE + catHref; txt(as[2], p.cat + 's'); }
      txt(b, p.name);
    }

    /* the availability line said "On our floor now, lit" for every piece */
    var AVL = { show: ['On our floor now, lit', ''], last: ['The last one, on our floor now', ''], 'new': ['New in. Ask us when it is on the floor', 'ask'],
                order: ['Made to order. Ask us for the lead time', 'order'] }[p.label] || ['Ask us whether it is on the floor', 'ask'];
    $$('.d3 .fl-k, .ph .pfl-k').forEach(function (k) {
      var dot = $('i', k);
      k.textContent = AVL[0]; if (dot) k.insertBefore(dot, k.firstChild);
      k.classList.remove('order', 'ask'); if (AVL[1]) k.classList.add(AVL[1]);
    });

    /* the description */
    txt($('.d3 .ds'), p.blurb || (p.mat + '.'));

    /* sizes and finishes exist only where we have them; nothing is invented */
    var szw = $('.d3 .szw');
    if (szw) {
      if (!p.sizes || !p.sizes.length) { szw.remove(); }
      else {
        var btns = $$('.sz', szw), dm = $('.dm', szw);
        btns.forEach(function (b, j) {
          var s = p.sizes[j];
          if (!s) { b.remove(); return; }
          txt($('span span', b) || $('span', b), s.label);
          on(b, 'click', function () {
            btns.forEach(function (o) { o.setAttribute('aria-pressed', o === b ? 'true' : 'false'); o.classList.toggle('on', o === b); });
            txt(dm, s.detail);
            var v = $('.d3 .c5 .v'); if (v) txt(v, s.price);
            var sline = $('.d3 .c5 .s'); if (sline) txt(sline, s.label);
          });
        });
        if (btns[0]) btns[0].click();
      }
    }
    var fins = $('.d3 .fins');
    if (fins && (!p.finishes || !p.finishes.length)) {
      var lbl = $('.d3 .finlbl'); if (lbl) lbl.remove();
      var fn = $('.d3 .finN'); if (fn) fn.remove();
      fins.remove();
    } else if (fins) {
      var fb = $$('.fin', fins), fname = $('.d3 .finN');
      fb.forEach(function (b, j) {
        var f = p.finishes[j];
        if (!f) { b.remove(); return; }
        b.setAttribute('aria-label', f.name);
        var sw = $('i', b); if (sw) sw.style.background = f.hex;
        on(b, 'click', function () {
          fb.forEach(function (o) { o.setAttribute('aria-pressed', o === b ? 'true' : 'false'); });
          txt(fname, f.name);
        });
      });
      if (fb[0]) fb[0].click();
    }

    /* the specification table: only the rows we can answer */
    var specs = $('.d3 .specs');
    if (specs) {
      specs.innerHTML = '';
      var rows = (p.specs || []).slice();
      if (!rows.length) rows = [{ k: 'Material', v: p.mat }];
      if (p.maker) rows.push({ k: 'Maker', v: p.maker });
      if (p.collection) rows.push({ k: 'Collection', v: p.collection + ' collection' });
      rows.push({ k: 'Availability', v: p.label ? (LB[p.label] || ['On request'])[0] : 'Ask us' });
      rows.forEach(function (r) {
        var d = document.createElement('div');
        d.innerHTML = '<span></span><span></span>';
        txt(d.children[0], r.k); txt(d.children[1], r.v);
        specs.appendChild(d);
      });
    }

    /* the pictures */
    var pics = $('.d3 .pb-pics');
    if (pics) {
      pics.innerHTML = '';
      (p.imgs || [p.img]).forEach(function (u, j) {
        var g = document.createElement('div');
        g.className = 'gal';
        g.innerHTML = '<img class="pd-cut" alt="">';
        var im = $('img', g);
        im.src = BASE + u; im.alt = p.name + (j ? ', another view' : '');
        pics.appendChild(g);
      });
    }

    /* the phone copy of the same piece */
    txt($('.ph .pk h1'), p.name);
    txt($('.ph .pk-mat'), p.mat);
    txt($('.ph .pk-pr b'), p.price);
    txt($('.ph .pk p'), p.blurb || (p.mat + '.'));
    var pcat = $('.ph .pk-k span:not(.pk-lb)');
    if (pcat) txt(pcat, p.cat + (p.maker ? ' \u00b7 ' + p.maker : ''));
    var plb = $('.ph .pk-lb');
    if (plb) { var pd = LB[p.label]; if (pd) txt(plb, pd[0]); else plb.remove(); }
    var pcb = $('.ph .cb b'); if (pcb) txt(pcb, p.name);
    $$('.ph .cb a').forEach(function (a2, j) {
      if (j === 0) a2.href = BASE + 'index.html';
      if (j === 1) a2.href = BASE + 'collection.html';
      if (j === 2) {
        a2.href = BASE + ({ 'Chandelier': 'chandeliers.html', 'Pendant': 'pendants.html',
          'Wall light': 'wall-lights.html', 'Table lamp': 'table-lamps.html',
          'Floor lamp': 'floor-lamps.html', 'Outdoor': 'outdoor.html' }[p.cat] || 'collection.html');
        txt(a2, p.cat + 's');
      }
    });
    /* the phone gallery: one frame per photograph, with its own dots */
    var pgal = $('.ph .gal');
    if (pgal) {
      $$('img', pgal).forEach(function (x) { x.remove(); });
      var shots = p.imgs && p.imgs.length ? p.imgs : [p.img];
      shots.forEach(function (u, j) {
        var im = document.createElement('img');
        im.className = 'cut' + (j === 0 ? ' on' : '');
        im.src = BASE + u; im.alt = p.name + (j ? ', another view' : '');
        pgal.insertBefore(im, pgal.firstChild);
      });
      var gd = $('.gal-d', pgal);
      if (gd) {
        gd.innerHTML = '';
        shots.forEach(function (_, j) {
          var d = document.createElement('button');
          d.type = 'button'; d.className = 'gal-dot'; d.setAttribute('aria-label', 'Photograph ' + (j + 1));
          gd.appendChild(d);
        });
        var shown = $$('img.cut', pgal);
        $$('.gal-dot', gd).forEach(function (d, j) {
          on(d, 'click', function () {
            shown.forEach(function (x, k) { x.classList.toggle('on', k === j); });
            $$('.gal-dot', gd).forEach(function (o, k) { o.setAttribute('aria-pressed', k === j ? 'true' : 'false'); });
          });
        });
        if ($('.gal-dot', gd)) $('.gal-dot', gd).setAttribute('aria-pressed', 'true');
      }
      var gsv = $('.gal-sv', pgal); if (gsv) { gsv.classList.add('pc-sv'); gsv.setAttribute('data-slug', p.slug); }
    }
    /* sizes and finishes on the phone follow the same rule: only where we have them */
    $$('.ph .opt').forEach(function (block) {
      var k = (($('.opt-k span', block) || {}).textContent || '').toLowerCase();
      var want = k.indexOf('size') > -1 ? p.sizes : (k.indexOf('finish') > -1 ? p.finishes : null);
      if (want && !want.length) { block.remove(); return; }
      if (!want) return;
      if (k.indexOf('size') > -1) {
        var bs = $$('.sz', block), dims = $('.dims', block);
        bs.forEach(function (bb, j) {
          var s = p.sizes[j];
          if (!s) { bb.remove(); return; }
          txt($('span', bb), s.label);
          on(bb, 'click', function () {
            bs.forEach(function (o) { o.setAttribute('aria-pressed', o === bb ? 'true' : 'false'); });
            txt(dims, s.detail);
            txt($('.ph .pk-pr b'), s.price);
          });
        });
        if (bs[0]) bs[0].click();
      } else {
        var fs = $$('.fin', block);
        fs.forEach(function (bb, j) {
          var f = p.finishes[j];
          if (!f) { bb.remove(); return; }
          bb.setAttribute('aria-label', f.name);
          var sw = $('i', bb); if (sw) sw.style.background = f.hex;
        });
      }
    });
    var pspx = $('.ph .spx');
    if (pspx && !(p.specs || []).length) pspx.remove();

    /* enquiring is the only call to action we can honour */
    $$('a[href*="wa.me"]').forEach(function (a) {
      a.href = WA + '?text=' + encodeURIComponent('Hello Maison Éclat, I am interested in the ' + p.name + ' (' + p.cat.toLowerCase() + ').');
    });

    /* pieces alongside it: the same category, this one left out */
    var row = $('.d3 .pr-g');
    var td = tplNode('t-card-d');
    if (row && td) {
      var near = DATA.pieces.filter(function (o) { return o.cat === p.cat && o.slug !== p.slug; }).slice(0, 4);
      if (!near.length) near = DATA.pieces.filter(function (o) { return o.slug !== p.slug; }).slice(0, 4);
      row.innerHTML = '';
      near.forEach(function (o) { row.appendChild(fillCardD(td.cloneNode(true), o)); });
      row.classList.add('seen');
    }
    paintSaved();
  }

  function missingPiece() {
    document.title = 'Piece not found | Maison Éclat';
    var rb = document.createElement('meta'); rb.name = 'robots'; rb.content = 'noindex'; document.head.appendChild(rb);
    document.documentElement.classList.add('pp-missing');
    /* hide the template piece, keep the bar, the related row, the showroom and the footer */
    $$('.d3 section[aria-labelledby="pb-h"]').forEach(function (s0) {
      s0.classList.add('pp-hide'); var nx = s0.nextElementSibling; if (nx && nx.tagName === 'SECTION' && !nx.id) nx.classList.add('pp-hide');
    });
    $$('.ph .cb, .ph .gal, .ph .pk, .ph .opt, .ph .pbuy, .ph .spx').forEach(function (e) { e.classList.add('pp-hide'); });
    [['.d3 #pp-rel', 'px'], ['.ph .gal', '']].forEach(function (pair) {
      var at = $(pair[0]); if (!at) return;
      var box = document.createElement('section'); box.className = 'ac-none' + (pair[1] ? ' ' + pair[1] : '');
      box.innerHTML = '<small>Maison Éclat</small><h1></h1><p></p><div class="ac-r"><a class="ac-a"></a><a class="ac-b" target="_blank" rel="noopener"></a></div>';
      txt($('h1', box), 'This piece is no longer listed.');
      txt($('p', box), 'It may have sold, or its name may have changed. Everything we carry is in the collection, and we can tell you about anything that is not.');
      var a = $('.ac-a', box); a.href = BASE + 'collection.html'; txt(a, 'See all pieces');
      var b = $('.ac-b', box); b.href = WA + '?text=' + encodeURIComponent('Hello Maison Éclat, I am looking for a piece I saw on your site.'); txt(b, 'Ask on WhatsApp');
      if (pair[1]) box.style.paddingTop = '150px';
      at.parentNode.insertBefore(box, at);
    });
    var hs = $$('.ac-none h1'); hs.forEach(function (h, j) { if (j) { var h2 = document.createElement('h2'); h2.textContent = h.textContent; h.replaceWith(h2); } });
    $$('.d3 .pb-w, .ph .pk h1').forEach(function (h) { if (h.tagName === 'H1') { var d = document.createElement('p'); d.className = h.className; d.innerHTML = h.innerHTML; h.replaceWith(d); } });
    /* the row below offers real pieces instead of the template's */
    var row = $('.d3 .pr-g'), td = tplNode('t-card-d');
    if (row && td) { row.innerHTML = ''; DATA.pieces.slice(0, 4).forEach(function (o) { row.appendChild(fillCardD(td.cloneNode(true), o)); }); row.classList.add('seen'); }
    var prow = $('.ph .g2'), tp = tplNode('t-card-p');
    if (prow && tp) { prow.innerHTML = ''; DATA.pieces.slice(0, 4).forEach(function (o) { prow.appendChild(fillCardP(tp.cloneNode(true), o)); }); }
    paintSaved();
  }

  /* ---------------------------------------------------------------- statement pieces, from the catalogue */
  function statementCards() {
    /* the cards beside the slider were typed in by hand and had drifted from the catalogue (Evette's price, Mira's link) */
    ['.d3', '.ph'].forEach(function (R) {
      var names = $$(R + ' .sp-l').map(function (im) { return (im.getAttribute('alt') || '').replace(/\s+(chandelier|pendant|wall light|table lamp|floor lamp)$/i, ''); });
      $$(R + ' .sp-card').forEach(function (c, i) {
        var p = null; DATA.pieces.some(function (o) { if (o.name === names[i]) { p = o; return true; } });
        if (!p) return;
        c.href = BASE + p.href; c.setAttribute('aria-label', p.name + ', ' + p.price);
        var d = LB[p.label];
        var lb = $('.lb', c); if (lb) { lb.className = 'lb ' + (d ? d[1] : 'lb-none'); var dot = $('i', lb); lb.textContent = d ? d[0] : ''; if (dot) lb.insertBefore(dot, lb.firstChild); }
        var clb = $('.sp-clb', c); if (clb) { if (d) txt(clb, d[0]); else clb.style.display = 'none'; }
        var catS = $('.sp-cl > span:last-child', c); if (catS && catS !== lb && catS !== clb) txt(catS, p.cat);
        var pr = $('.sp-cp b', c) || $('.sp-cp > span:first-child', c); if (pr) txt(pr, p.price);
      });
    });
  }

  /* ---------------------------------------------------------------- is the showroom open */
  function openSign() {
    var signs = $$('.vs-open'); if (!signs.length) return;
    var now; try {
      var parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Cairo', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date());
      var g = function (t) { return (parts.filter(function (x) { return x.type === t; })[0] || {}).value; };
      now = { d: g('weekday'), m: +g('hour') * 60 + +g('minute') };
    } catch (e) { return; }
    /* Saturday to Thursday, 11:00 to 21:00; Friday by appointment */
    var open = now.d !== 'Fri' && now.m >= 660 && now.m < 1260, line;
    if (open) line = 'Open now, until 21:00';
    else if (now.d !== 'Fri' && now.m < 660) line = 'Opens today at 11:00';
    else if (now.d === 'Thu' || now.d === 'Fri') line = 'Closed now. Opens Saturday at 11:00';
    else line = 'Closed now. Opens tomorrow at 11:00';
    signs.forEach(function (s0) { var dot = $('i', s0); s0.textContent = line; if (dot) s0.insertBefore(dot, s0.firstChild); s0.classList.toggle('closed', !open); });
  }

  /* ---------------------------------------------------------------- reveal on scroll */
  function reveals() {
    var els = $$('.rv, .d3-sec, .seen');
    if (!('IntersectionObserver' in window)) { els.forEach(function (e) { e.classList.add('seen', 'in'); }); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('seen', 'in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px' });
    els.forEach(function (e) { io.observe(e); });
  }

  /* ------------------------------------------------- the hero film and the top bar */
  function playFilms() {
    var vids = $$('video');
    if (!vids.length) return;
    function nudge() {
      vids.forEach(function (v) {
        v.muted = true; v.defaultMuted = true; v.playsInline = true;
        v.setAttribute('muted', ''); v.setAttribute('playsinline', '');
        var p = v.play();
        if (p && p.catch) p.catch(function () {});
      });
    }
    nudge();
    vids.forEach(function (v) {
      on(v, 'loadeddata', nudge);
      on(v, 'canplay', nudge);
    });
    on(document, 'visibilitychange', function () { if (!document.hidden) nudge(); });
    /* a phone that still holds off starts on the first touch */
    function once() {
      nudge();
      document.removeEventListener('touchstart', once);
      document.removeEventListener('click', once);
    }
    document.addEventListener('touchstart', once, { passive: true });
    document.addEventListener('click', once);
  }

  function stickyBar() {
    var bar = $('.d3-bar');
    if (!bar) return;
    /* the export froze the bar in its hidden state; the class carries it now */
    bar.style.transform = ''; bar.style.opacity = '';
    var hero = $('#d3-hero') || $('.hero3');
    function at() {
      var past = hero ? hero.getBoundingClientRect().bottom <= 2
                      : (window.pageYOffset || document.documentElement.scrollTop) > 80;
      bar.classList.toggle('on', past);
      bar.setAttribute('aria-hidden', past ? 'false' : 'true');
    }
    at();
    window.addEventListener('scroll', at, { passive: true });
    window.addEventListener('resize', at);
  }

  /* ------------------------------------------------ the desktop menu panels */
  function navPanels() {
    /* the page was published with its menu held shut (nv-cold) and nothing ever let it go, so no panel opened.
       As in the design: hold the panels until the pointer moves, and keep the one just clicked shut until the pointer leaves it */
    var navs = $$('.nv'); if (!navs.length) return;
    var from = null;
    try { from = sessionStorage.getItem('me.navFrom'); sessionStorage.removeItem('me.navFrom'); } catch (e) {}
    navs.forEach(function (n) { n.classList.add('nv-cold'); });
    if (from) $$('.nv-i').forEach(function (it) { var b = $('.nv-b', it); if (b && b.textContent.trim() === from) it.classList.add('nv-shut'); });
    $$('.nv-i').forEach(function (it) {
      on(it, 'click', function (e) {
        if (!e.target.closest('a')) return;
        var b = $('.nv-b', it); try { if (b) sessionStorage.setItem('me.navFrom', b.textContent.trim()); } catch (er) {}
      });
    });
    function warm(e) {
      window.removeEventListener('pointermove', warm);
      navs.forEach(function (n) { n.classList.remove('nv-cold'); });
      var here = e && e.target && e.target.closest ? e.target.closest('.nv-i') : null;
      $$('.nv-i.nv-shut').forEach(function (it) {
        if (it !== here) { it.classList.remove('nv-shut'); return; }
        function off() { it.classList.remove('nv-shut'); it.removeEventListener('pointerleave', off); }
        it.addEventListener('pointerleave', off);
      });
    }
    window.addEventListener('pointermove', warm, { passive: true });
    /* a keyboard reaches the panels too */
    $$('.nv-i').forEach(function (it) {
      on(it, 'focusin', function () { navs.forEach(function (n) { n.classList.remove('nv-cold'); }); it.classList.add('nv-kb'); });
      on(it, 'focusout', function (e) { if (!it.contains(e.relatedTarget)) it.classList.remove('nv-kb'); });
    });
  }

  /* ------------------------------------------- every page opens at the top */
  function topOfPage() {
    /* the browser otherwise restores where you were on this page last time */
    try { if ('scrollRestoration' in history) history.scrollRestoration = 'manual'; } catch (e) {}
    if (location.hash) return;   /* an anchor still wins */
    function top() {
      try { window.scrollTo(0, 0); } catch (e) {}
      [document.scrollingElement, document.documentElement, document.body].forEach(function (n) {
        if (n && n.scrollTop) n.scrollTop = 0;
      });
      /* the page may sit in a scrolling wrapper rather than scrolling the window */
      var n = $('.d3') || $('.ph') || document.body;
      while (n) { if (n.scrollTop) n.scrollTop = 0; n = n.parentNode; }
    }
    top();
    /* a browser that restores the old offset does it just after load, so go again */
    if (window.requestAnimationFrame) window.requestAnimationFrame(top);
    window.setTimeout(top, 90);
    on(window, 'load', top);
    on(window, 'pageshow', function (e) { if (e && e.persisted && !location.hash) top(); });
  }

  /* ---------------------------------------------------------------- boot */
  function loadCatalogue() {
    return fetch(BASE + 'catalog.json', { cache: 'no-cache' })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        DATA.pieces = j.pieces || [];
        DATA.by = {};
        DATA.pieces.forEach(function (p) { DATA.by[p.slug] = p; });
        if (j.whatsapp) WA = j.whatsapp;
      })
      .catch(function () { /* the page still reads; only the live parts go quiet */ });
  }

  function start() {
    topOfPage();
    reveals();
    playFilms();
    stickyBar();
    navPanels();
    homeSliders();
    openSign();
    loadCatalogue().then(function () {
      if (PAGE === 'saved') savedPageWire();
      paintSaved();
      statementCards();
      if (PAGE === 'piece') piecePage();
      else if (hasGrid() && ($('.d3-grid') || $('.ph .g2'))) { wireFilters(); renderGrids(); }
      if (location.hash === '#search' && hasGrid()) {
        if (phoneView()) openSheet(true);
        else { var q = $('#sh-q'); if (q) q.focus(); }
      }
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
